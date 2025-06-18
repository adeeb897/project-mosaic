import { logger } from '@utils/logger';
import { EventEmitter } from 'events';
import * as semver from 'semver';
import {
  Module,
  ModuleVersion,
  ModuleInstallation,
  ModuleConflict,
  DependencyResolution,
  ModuleStatus,
  ReviewStatus,
  Dependency,
} from '../../core/models/Module';
import { ModuleType } from '../../core/types/ModuleTypes';
import {
  ModuleModel,
  ModuleVersionModel,
  ModuleInstallationModel,
  ModuleDocument,
  ModuleVersionDocument,
  ModuleInstallationDocument,
} from '../../persistence/models/module.model';

/**
 * Module search filters
 */
export interface ModuleSearchFilters {
  type?: ModuleType;
  status?: ModuleStatus;
  author?: string;
  tags?: string[];
  minRating?: number;
  searchText?: string;
  includeDeprecated?: boolean;
}

/**
 * Module registration data
 */
export interface ModuleRegistrationData {
  name: string;
  description: string;
  version: string;
  type: ModuleType;
  author: {
    id: string;
    name: string;
    website?: string;
    email?: string;
  };
  metadata: {
    schemaVersion: string;
    license: string;
    tags: string[];
    dependencies: Dependency[];
    permissions: string[];
    capabilities: Array<{
      id: string;
      version: string;
      optional: boolean;
    }>;
    compatibility: {
      minPlatformVersion: string;
      targetPlatformVersion: string;
      supportedProtocols: Array<{
        name: string;
        version: string;
      }>;
      supportedModalities: string[];
    };
    uiComponents?: Array<{
      id: string;
      type: string;
      location: string;
      component: string;
      props?: Record<string, any>;
    }>;
  };
  checksum?: string;
  downloadUrl?: string;
}

/**
 * Module update data
 */
export interface ModuleUpdateData {
  description?: string;
  status?: ModuleStatus;
  reviewStatus?: ReviewStatus;
  metadata?: Partial<Module['metadata']>;
  downloadUrl?: string;
}

/**
 * Module registry service interface
 */
export interface IModuleRegistryService {
  // Registration
  registerModule(data: ModuleRegistrationData): Promise<Module>;
  updateModule(moduleId: string, data: ModuleUpdateData): Promise<Module>;
  publishModuleVersion(moduleId: string, data: ModuleRegistrationData): Promise<ModuleVersion>;

  // Discovery
  searchModules(filters: ModuleSearchFilters): Promise<Module[]>;
  getModule(moduleId: string): Promise<Module | null>;
  getModuleByNameAndVersion(name: string, version: string): Promise<Module | null>;
  getModuleVersions(moduleId: string): Promise<ModuleVersion[]>;
  getLatestVersion(moduleId: string): Promise<ModuleVersion | null>;

  // Installation tracking
  recordInstallation(
    userId: string,
    moduleId: string,
    version: string
  ): Promise<ModuleInstallation>;
  getInstallation(userId: string, moduleId: string): Promise<ModuleInstallation | null>;
  getUserInstallations(userId: string): Promise<ModuleInstallation[]>;
  updateInstallation(
    userId: string,
    moduleId: string,
    updates: Partial<ModuleInstallation>
  ): Promise<ModuleInstallation>;

  // Dependency resolution
  resolveDependencies(moduleId: string, version?: string): Promise<DependencyResolution>;
  checkForConflicts(
    moduleId: string,
    installedModules: ModuleInstallation[]
  ): Promise<ModuleConflict[]>;

  // Version management
  compareVersions(version1: string, version2: string): number;
  isVersionCompatible(version: string, constraint: string): boolean;
  deprecateVersion(moduleId: string, version: string, reason?: string): Promise<void>;
  yankVersion(moduleId: string, version: string, reason?: string): Promise<void>;

  // Metadata management
  updateModuleMetadata(moduleId: string, metadata: Partial<Module['metadata']>): Promise<Module>;
  addModuleTags(moduleId: string, tags: string[]): Promise<Module>;
  removeModuleTags(moduleId: string, tags: string[]): Promise<Module>;

  // Statistics
  incrementInstallCount(moduleId: string): Promise<void>;
  updateModuleRating(moduleId: string, rating: number, userId: string): Promise<void>;
}

/**
 * Module registry service implementation
 */
export class ModuleRegistryService implements IModuleRegistryService {
  private eventEmitter: EventEmitter;
  private platformVersion: string = '1.0.0'; // Current platform version

  constructor() {
    this.eventEmitter = new EventEmitter();
  }

  /**
   * Register a new module
   */
  async registerModule(data: ModuleRegistrationData): Promise<Module> {
    try {
      // Check if module already exists
      const existingModule = await this.getModuleByNameAndVersion(data.name, data.version);
      if (existingModule) {
        throw new Error(`Module ${data.name}@${data.version} already exists`);
      }

      // Validate version format
      if (!semver.valid(data.version)) {
        throw new Error(`Invalid version format: ${data.version}`);
      }

      // Create module document
      const moduleDoc = new ModuleModel({
        name: data.name,
        description: data.description,
        version: data.version,
        type: data.type,
        author: data.author,
        requiresReview: true,
        reviewStatus: ReviewStatus.PENDING,
        status: ModuleStatus.INACTIVE,
        metadata: data.metadata,
        checksum: data.checksum,
        downloadUrl: data.downloadUrl,
        installCount: 0,
        rating: 0,
        ratingCount: 0,
      });

      // Save module
      const savedModule = await moduleDoc.save();

      // Create initial version record
      const versionDoc = new ModuleVersionModel({
        moduleId: savedModule._id.toString(),
        version: data.version,
        metadata: data.metadata,
        checksum: data.checksum || '',
        downloadUrl: data.downloadUrl || '',
      });

      await versionDoc.save();

      // Emit registration event
      this.eventEmitter.emit('module:registered', {
        moduleId: savedModule._id.toString(),
        name: data.name,
        version: data.version,
        type: data.type,
      });

      logger.info(`Module registered: ${data.name}@${data.version}`);

      return this.documentToModule(savedModule);
    } catch (error) {
      logger.error('Failed to register module:', error);
      throw error;
    }
  }

  /**
   * Update module information
   */
  async updateModule(moduleId: string, data: ModuleUpdateData): Promise<Module> {
    try {
      const module = await ModuleModel.findByIdAndUpdate(
        moduleId,
        {
          $set: {
            ...(data.description && { description: data.description }),
            ...(data.status && { status: data.status }),
            ...(data.reviewStatus && { reviewStatus: data.reviewStatus }),
            ...(data.metadata && { metadata: data.metadata }),
            ...(data.downloadUrl && { downloadUrl: data.downloadUrl }),
            updatedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!module) {
        throw new Error(`Module not found: ${moduleId}`);
      }

      // Emit update event
      this.eventEmitter.emit('module:updated', {
        moduleId,
        updates: data,
      });

      logger.info(`Module updated: ${moduleId}`);

      return this.documentToModule(module);
    } catch (error) {
      logger.error('Failed to update module:', error);
      throw error;
    }
  }

  /**
   * Publish a new version of a module
   */
  async publishModuleVersion(
    moduleId: string,
    data: ModuleRegistrationData
  ): Promise<ModuleVersion> {
    try {
      const module = await ModuleModel.findById(moduleId);
      if (!module) {
        throw new Error(`Module not found: ${moduleId}`);
      }

      // Validate version format
      if (!semver.valid(data.version)) {
        throw new Error(`Invalid version format: ${data.version}`);
      }

      // Check if version is greater than current version
      if (!semver.gt(data.version, module.version)) {
        throw new Error(
          `New version ${data.version} must be greater than current version ${module.version}`
        );
      }

      // Check if version already exists
      const existingVersion = await ModuleVersionModel.findOne({
        moduleId,
        version: data.version,
      });

      if (existingVersion) {
        throw new Error(`Version ${data.version} already exists for module ${moduleId}`);
      }

      // Create version record
      const versionDoc = new ModuleVersionModel({
        moduleId,
        version: data.version,
        releaseNotes: data.description,
        metadata: data.metadata,
        checksum: data.checksum || '',
        downloadUrl: data.downloadUrl || '',
      });

      const savedVersion = await versionDoc.save();

      // Update module with new version
      module.version = data.version;
      module.metadata = data.metadata;
      module.checksum = data.checksum;
      module.downloadUrl = data.downloadUrl;
      module.updatedAt = new Date();
      await module.save();

      // Emit version published event
      this.eventEmitter.emit('module:version:published', {
        moduleId,
        version: data.version,
      });

      logger.info(`Module version published: ${moduleId}@${data.version}`);

      return this.documentToModuleVersion(savedVersion);
    } catch (error) {
      logger.error('Failed to publish module version:', error);
      throw error;
    }
  }

  /**
   * Search for modules
   */
  async searchModules(filters: ModuleSearchFilters): Promise<Module[]> {
    try {
      const query: any = {};

      if (filters.type) {
        query.type = filters.type;
      }

      if (filters.status) {
        query.status = filters.status;
      } else if (!filters.includeDeprecated) {
        query.status = { $ne: ModuleStatus.DEPRECATED };
      }

      if (filters.author) {
        query['author.id'] = filters.author;
      }

      if (filters.tags && filters.tags.length > 0) {
        query['metadata.tags'] = { $in: filters.tags };
      }

      if (filters.minRating) {
        query.rating = { $gte: filters.minRating };
      }

      if (filters.searchText) {
        query.$or = [
          { name: { $regex: filters.searchText, $options: 'i' } },
          { description: { $regex: filters.searchText, $options: 'i' } },
          { 'metadata.tags': { $regex: filters.searchText, $options: 'i' } },
        ];
      }

      const modules = await ModuleModel.find(query).sort({ installCount: -1, rating: -1 }).exec();

      return modules.map(this.documentToModule);
    } catch (error) {
      logger.error('Failed to search modules:', error);
      throw error;
    }
  }

  /**
   * Get module by ID
   */
  async getModule(moduleId: string): Promise<Module | null> {
    try {
      const module = await ModuleModel.findById(moduleId);
      return module ? this.documentToModule(module) : null;
    } catch (error) {
      logger.error('Failed to get module:', error);
      throw error;
    }
  }

  /**
   * Get module by name and version
   */
  async getModuleByNameAndVersion(name: string, version: string): Promise<Module | null> {
    try {
      const module = await ModuleModel.findOne({ name, version });
      return module ? this.documentToModule(module) : null;
    } catch (error) {
      logger.error('Failed to get module by name and version:', error);
      throw error;
    }
  }

  /**
   * Get all versions of a module
   */
  async getModuleVersions(moduleId: string): Promise<ModuleVersion[]> {
    try {
      const versions = await ModuleVersionModel.find({ moduleId }).sort({ createdAt: -1 }).exec();
      return versions.map(this.documentToModuleVersion);
    } catch (error) {
      logger.error('Failed to get module versions:', error);
      throw error;
    }
  }

  /**
   * Get latest version of a module
   */
  async getLatestVersion(moduleId: string): Promise<ModuleVersion | null> {
    try {
      const versions = await ModuleVersionModel.find({
        moduleId,
        deprecated: false,
        yanked: false,
      }).sort({ createdAt: -1 });

      if (versions.length === 0) {
        return null;
      }

      // Sort by semver and return the latest
      const sorted = versions.sort((a, b) => semver.rcompare(a.version, b.version));
      return this.documentToModuleVersion(sorted[0]);
    } catch (error) {
      logger.error('Failed to get latest version:', error);
      throw error;
    }
  }

  /**
   * Record module installation
   */
  async recordInstallation(
    userId: string,
    moduleId: string,
    version: string
  ): Promise<ModuleInstallation> {
    try {
      const existingInstallation = await ModuleInstallationModel.findOne({ userId, moduleId });

      if (existingInstallation) {
        // Update existing installation
        existingInstallation.version = version;
        existingInstallation.updatedAt = new Date();
        const updated = await existingInstallation.save();
        return this.documentToModuleInstallation(updated);
      }

      // Create new installation
      const installation = new ModuleInstallationModel({
        userId,
        moduleId,
        version,
        enabled: true,
        config: {},
        profileIds: [],
      });

      const saved = await installation.save();

      // Increment install count
      await this.incrementInstallCount(moduleId);

      // Emit installation event
      this.eventEmitter.emit('module:installed', {
        userId,
        moduleId,
        version,
      });

      logger.info(`Module installed: ${moduleId}@${version} for user ${userId}`);

      return this.documentToModuleInstallation(saved);
    } catch (error) {
      logger.error('Failed to record installation:', error);
      throw error;
    }
  }

  /**
   * Get user's installation of a module
   */
  async getInstallation(userId: string, moduleId: string): Promise<ModuleInstallation | null> {
    try {
      const installation = await ModuleInstallationModel.findOne({ userId, moduleId });
      return installation ? this.documentToModuleInstallation(installation) : null;
    } catch (error) {
      logger.error('Failed to get installation:', error);
      throw error;
    }
  }

  /**
   * Get all installations for a user
   */
  async getUserInstallations(userId: string): Promise<ModuleInstallation[]> {
    try {
      const installations = await ModuleInstallationModel.find({ userId });
      return installations.map(this.documentToModuleInstallation);
    } catch (error) {
      logger.error('Failed to get user installations:', error);
      throw error;
    }
  }

  /**
   * Update installation
   */
  async updateInstallation(
    userId: string,
    moduleId: string,
    updates: Partial<ModuleInstallation>
  ): Promise<ModuleInstallation> {
    try {
      const installation = await ModuleInstallationModel.findOneAndUpdate(
        { userId, moduleId },
        {
          $set: {
            ...updates,
            updatedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!installation) {
        throw new Error(`Installation not found for user ${userId} and module ${moduleId}`);
      }

      // Emit update event
      this.eventEmitter.emit('module:installation:updated', {
        userId,
        moduleId,
        updates,
      });

      return this.documentToModuleInstallation(installation);
    } catch (error) {
      logger.error('Failed to update installation:', error);
      throw error;
    }
  }

  /**
   * Resolve module dependencies
   */
  async resolveDependencies(moduleId: string, version?: string): Promise<DependencyResolution> {
    try {
      const module = await this.getModule(moduleId);
      if (!module) {
        throw new Error(`Module not found: ${moduleId}`);
      }

      let metadata = module.metadata;

      // If specific version requested, get its metadata
      if (version && version !== module.version) {
        const versionDoc = await ModuleVersionModel.findOne({ moduleId, version });
        if (!versionDoc) {
          throw new Error(`Version ${version} not found for module ${moduleId}`);
        }
        metadata = versionDoc.metadata;
      }

      const resolution: DependencyResolution = {
        resolved: true,
        dependencies: [],
        conflicts: [],
        installOrder: [],
      };

      // Process dependencies recursively
      const processed = new Set<string>();
      const processing = new Set<string>();

      const processDependency = async (dep: Dependency, parentId: string) => {
        const depKey = `${dep.id}@${dep.version}`;

        // Check for circular dependencies
        if (processing.has(depKey)) {
          resolution.conflicts.push({
            type: 'dependency',
            moduleId: parentId,
            conflictingModuleId: dep.id,
            description: `Circular dependency detected: ${depKey}`,
          });
          resolution.resolved = false;
          return;
        }

        if (processed.has(depKey)) {
          return;
        }

        processing.add(depKey);

        // Find the dependency module
        const depModule = await this.getModuleByNameAndVersion(dep.id, dep.version);
        if (!depModule) {
          if (!dep.optional) {
            resolution.conflicts.push({
              type: 'dependency',
              moduleId: parentId,
              conflictingModuleId: dep.id,
              description: `Required dependency not found: ${depKey}`,
            });
            resolution.resolved = false;
          }
          processing.delete(depKey);
          return;
        }

        // Add to dependencies
        resolution.dependencies.push({
          moduleId: depModule.id,
          version: dep.version,
          required: !dep.optional,
        });

        // Process sub-dependencies
        for (const subDep of depModule.metadata.dependencies) {
          await processDependency(subDep, depModule.id);
        }

        processing.delete(depKey);
        processed.add(depKey);

        // Add to install order (dependencies first)
        resolution.installOrder.push(depModule.id);
      };

      // Process all dependencies
      for (const dep of metadata.dependencies) {
        await processDependency(dep, moduleId);
      }

      // Add the module itself to install order
      resolution.installOrder.push(moduleId);

      return resolution;
    } catch (error) {
      logger.error('Failed to resolve dependencies:', error);
      throw error;
    }
  }

  /**
   * Check for conflicts with installed modules
   */
  async checkForConflicts(
    moduleId: string,
    installedModules: ModuleInstallation[]
  ): Promise<ModuleConflict[]> {
    try {
      const conflicts: ModuleConflict[] = [];
      const module = await this.getModule(moduleId);

      if (!module) {
        throw new Error(`Module not found: ${moduleId}`);
      }

      // Check for version conflicts
      for (const installed of installedModules) {
        const installedModule = await this.getModule(installed.moduleId);
        if (!installedModule) continue;

        // Check if same module with different version
        if (installedModule.name === module.name && installedModule.id !== module.id) {
          conflicts.push({
            type: 'version',
            moduleId: module.id,
            conflictingModuleId: installedModule.id,
            description: `Module ${module.name} is already installed with version ${installedModule.version}`,
          });
        }

        // Check capability conflicts
        for (const capability of module.metadata.capabilities) {
          const conflictingCap = installedModule.metadata.capabilities.find(
            cap => cap.id === capability.id && !semver.satisfies(cap.version, capability.version)
          );

          if (conflictingCap) {
            conflicts.push({
              type: 'capability',
              moduleId: module.id,
              conflictingModuleId: installedModule.id,
              description: `Capability ${capability.id} version conflict: requires ${capability.version}, but ${installedModule.name} provides ${conflictingCap.version}`,
            });
          }
        }

        // Check permission conflicts
        const sharedPermissions = module.metadata.permissions.filter(perm =>
          installedModule.metadata.permissions.includes(perm)
        );

        if (sharedPermissions.length > 0) {
          conflicts.push({
            type: 'permission',
            moduleId: module.id,
            conflictingModuleId: installedModule.id,
            description: `Permission conflict: both modules request permissions: ${sharedPermissions.join(', ')}`,
            resolution: 'Review and approve permission sharing',
          });
        }
      }

      return conflicts;
    } catch (error) {
      logger.error('Failed to check for conflicts:', error);
      throw error;
    }
  }

  /**
   * Compare two versions
   */
  compareVersions(version1: string, version2: string): number {
    return semver.compare(version1, version2);
  }

  /**
   * Check if version satisfies constraint
   */
  isVersionCompatible(version: string, constraint: string): boolean {
    return semver.satisfies(version, constraint);
  }

  /**
   * Deprecate a module version
   */
  async deprecateVersion(moduleId: string, version: string, reason?: string): Promise<void> {
    try {
      // First find the version
      const existingVersion = await ModuleVersionModel.findOne({ moduleId, version });

      const versionDoc = await ModuleVersionModel.findOneAndUpdate(
        { moduleId, version },
        {
          $set: {
            deprecated: true,
            releaseNotes: reason
              ? `DEPRECATED: ${reason}\n\n${existingVersion?.releaseNotes || ''}`
              : existingVersion?.releaseNotes,
          },
        },
        { new: true }
      );

      if (!versionDoc) {
        throw new Error(`Version ${version} not found for module ${moduleId}`);
      }
      // Emit deprecation event
      this.eventEmitter.emit('module:version:deprecated', {
        moduleId,
        version,
        reason,
      });

      logger.info(`Module version deprecated: ${moduleId}@${version}`);
    } catch (error) {
      logger.error('Failed to deprecate version:', error);
      throw error;
    }
  }

  /**
   * Yank a module version (remove from registry)
   */
  async yankVersion(moduleId: string, version: string, reason?: string): Promise<void> {
    try {
      // First find the version
      const existingVersion = await ModuleVersionModel.findOne({ moduleId, version });

      const versionDoc = await ModuleVersionModel.findOneAndUpdate(
        { moduleId, version },
        {
          $set: {
            yanked: true,
            releaseNotes: reason
              ? `YANKED: ${reason}\n\n${existingVersion?.releaseNotes || ''}`
              : existingVersion?.releaseNotes,
          },
        },
        { new: true }
      );

      if (!versionDoc) {
        throw new Error(`Version ${version} not found for module ${moduleId}`);
      }

      // Emit yank event
      this.eventEmitter.emit('module:version:yanked', {
        moduleId,
        version,
        reason,
      });

      logger.info(`Module version yanked: ${moduleId}@${version}`);
    } catch (error) {
      logger.error('Failed to yank version:', error);
      throw error;
    }
  }

  /**
   * Update module metadata
   */
  async updateModuleMetadata(
    moduleId: string,
    metadata: Partial<Module['metadata']>
  ): Promise<Module> {
    try {
      const module = await ModuleModel.findById(moduleId);
      if (!module) {
        throw new Error(`Module not found: ${moduleId}`);
      }

      // Merge metadata
      module.metadata = {
        ...module.metadata,
        ...metadata,
      };

      module.updatedAt = new Date();
      const updated = await module.save();

      logger.info(`Module metadata updated: ${moduleId}`);

      return this.documentToModule(updated);
    } catch (error) {
      logger.error('Failed to update module metadata:', error);
      throw error;
    }
  }

  /**
   * Add tags to module
   */
  async addModuleTags(moduleId: string, tags: string[]): Promise<Module> {
    try {
      const module = await ModuleModel.findByIdAndUpdate(
        moduleId,
        {
          $addToSet: {
            'metadata.tags': { $each: tags },
          },
          $set: {
            updatedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!module) {
        throw new Error(`Module not found: ${moduleId}`);
      }

      logger.info(`Tags added to module ${moduleId}: ${tags.join(', ')}`);

      return this.documentToModule(module);
    } catch (error) {
      logger.error('Failed to add module tags:', error);
      throw error;
    }
  }

  /**
   * Remove tags from module
   */
  async removeModuleTags(moduleId: string, tags: string[]): Promise<Module> {
    try {
      const module = await ModuleModel.findByIdAndUpdate(
        moduleId,
        {
          $pull: {
            'metadata.tags': { $in: tags },
          },
          $set: {
            updatedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!module) {
        throw new Error(`Module not found: ${moduleId}`);
      }

      logger.info(`Tags removed from module ${moduleId}: ${tags.join(', ')}`);

      return this.documentToModule(module);
    } catch (error) {
      logger.error('Failed to remove module tags:', error);
      throw error;
    }
  }

  /**
   * Increment module install count
   */
  async incrementInstallCount(moduleId: string): Promise<void> {
    try {
      await ModuleModel.findByIdAndUpdate(moduleId, {
        $inc: { installCount: 1 },
      });

      logger.debug(`Install count incremented for module: ${moduleId}`);
    } catch (error) {
      logger.error('Failed to increment install count:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Update module rating
   */
  async updateModuleRating(moduleId: string, rating: number, userId: string): Promise<void> {
    try {
      if (rating < 0 || rating > 5) {
        throw new Error('Rating must be between 0 and 5');
      }

      const module = await ModuleModel.findById(moduleId);
      if (!module) {
        throw new Error(`Module not found: ${moduleId}`);
      }

      // Calculate new rating (simple average for now)
      const currentTotal = (module.rating || 0) * (module.ratingCount || 0);
      const newCount = (module.ratingCount || 0) + 1;
      const newRating = (currentTotal + rating) / newCount;

      module.rating = newRating;
      module.ratingCount = newCount;
      await module.save();

      // Emit rating event
      this.eventEmitter.emit('module:rated', {
        moduleId,
        rating,
        userId,
        newRating,
      });

      logger.info(`Module rated: ${moduleId} - ${rating} stars by user ${userId}`);
    } catch (error) {
      logger.error('Failed to update module rating:', error);
      throw error;
    }
  }

  /**
   * Subscribe to registry events
   */
  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  /**
   * Unsubscribe from registry events
   */
  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }

  /**
   * Convert document to Module
   */
  private documentToModule(doc: ModuleDocument): Module {
    return {
      id: doc._id.toString(),
      name: doc.name,
      description: doc.description,
      version: doc.version,
      type: doc.type,
      author: doc.author,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      publishedAt: doc.publishedAt,
      requiresReview: doc.requiresReview,
      reviewStatus: doc.reviewStatus,
      status: doc.status,
      metadata: doc.metadata,
      checksum: doc.checksum,
      downloadUrl: doc.downloadUrl,
      installCount: doc.installCount,
      rating: doc.rating,
      ratingCount: doc.ratingCount,
    };
  }

  /**
   * Convert document to ModuleVersion
   */
  private documentToModuleVersion(doc: ModuleVersionDocument): ModuleVersion {
    return {
      id: doc._id.toString(),
      moduleId: doc.moduleId,
      version: doc.version,
      releaseNotes: doc.releaseNotes,
      createdAt: doc.createdAt,
      metadata: doc.metadata,
      checksum: doc.checksum,
      downloadUrl: doc.downloadUrl,
      deprecated: doc.deprecated,
      yanked: doc.yanked,
    };
  }

  /**
   * Convert document to ModuleInstallation
   */
  private documentToModuleInstallation(doc: ModuleInstallationDocument): ModuleInstallation {
    return {
      id: doc._id.toString(),
      userId: doc.userId,
      moduleId: doc.moduleId,
      version: doc.version,
      installedAt: doc.installedAt,
      updatedAt: doc.updatedAt,
      enabled: doc.enabled,
      config: doc.config,
      profileIds: doc.profileIds,
    };
  }
}

// Singleton instance
let moduleRegistryInstance: ModuleRegistryService | null = null;

/**
 * Get module registry service instance
 */
export const getModuleRegistryService = (): ModuleRegistryService => {
  if (!moduleRegistryInstance) {
    moduleRegistryInstance = new ModuleRegistryService();
  }
  return moduleRegistryInstance;
};

/**
 * Initialize module registry service
 */
export const initModuleRegistry = async (): Promise<void> => {
  logger.info('Initializing module registry service');
  // Add any initialization logic here if needed
};
