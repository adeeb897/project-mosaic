import { ModuleType } from '../types/ModuleTypes';

/**
 * Module author information
 */
export interface Author {
  id: string;
  name: string;
  website?: string;
  email?: string;
}

/**
 * Module dependency information
 */
export interface Dependency {
  id: string;
  version: string;
  optional: boolean;
}

/**
 * Module capability information
 */
export interface Capability {
  id: string;
  version: string;
  optional: boolean;
}

/**
 * Protocol support information
 */
export interface ProtocolSupport {
  name: string;
  version: string;
}

/**
 * Module compatibility information
 */
export interface Compatibility {
  minPlatformVersion: string;
  targetPlatformVersion: string;
  supportedProtocols: ProtocolSupport[];
  supportedModalities: string[];
}

/**
 * UI component definition
 */
export interface UIComponentDefinition {
  id: string;
  type: string;
  location: string;
  component: string;
  props?: Record<string, any>;
}

/**
 * Module metadata
 */
export interface ModuleMetadata {
  schemaVersion: string;
  license: string;
  tags: string[];
  dependencies: Dependency[];
  permissions: string[];
  capabilities: Capability[];
  compatibility: Compatibility;
  uiComponents?: UIComponentDefinition[];
}

/**
 * Module review status
 */
export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEEDS_CHANGES = 'needs_changes',
}

/**
 * Module status
 */
export enum ModuleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEPRECATED = 'deprecated',
  SUSPENDED = 'suspended',
}

/**
 * Module interface
 */
export interface Module {
  id: string;
  name: string;
  description: string;
  version: string;
  type: ModuleType;
  author: Author;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  requiresReview: boolean;
  reviewStatus: ReviewStatus;
  status: ModuleStatus;
  metadata: ModuleMetadata;
  checksum?: string;
  downloadUrl?: string;
  installCount?: number;
  rating?: number;
  ratingCount?: number;
}

/**
 * Module version information
 */
export interface ModuleVersion {
  id: string;
  moduleId: string;
  version: string;
  releaseNotes?: string;
  createdAt: Date;
  metadata: ModuleMetadata;
  checksum: string;
  downloadUrl: string;
  deprecated?: boolean;
  yanked?: boolean;
}

/**
 * Module installation record
 */
export interface ModuleInstallation {
  id: string;
  userId: string;
  moduleId: string;
  version: string;
  installedAt: Date;
  updatedAt: Date;
  enabled: boolean;
  config: Record<string, any>;
  profileIds: string[];
}

/**
 * Module conflict information
 */
export interface ModuleConflict {
  type: 'dependency' | 'capability' | 'permission' | 'version';
  moduleId: string;
  conflictingModuleId: string;
  description: string;
  resolution?: string;
}

/**
 * Dependency resolution result
 */
export interface DependencyResolution {
  resolved: boolean;
  dependencies: Array<{
    moduleId: string;
    version: string;
    required: boolean;
  }>;
  conflicts: ModuleConflict[];
  installOrder: string[];
}
