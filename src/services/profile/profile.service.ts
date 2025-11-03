import { logger } from '@utils/logger';
import { Module, ModuleType } from '../module/module.service';

/**
 * AI Assistant Profile interface
 */
export interface Profile {
  id: string;
  name: string;
  description: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  modules: {
    personality?: string[];
    tools: string[];
    agents: string[];
    modalities: string[];
  };
  config: Record<string, unknown>;
  isDefault: boolean;
}

/**
 * Profile service interface
 */
export interface ProfileService {
  findAll(userId: string): Promise<Profile[]>;
  findById(id: string): Promise<Profile | null>;
  create(userId: string, profileData: Partial<Profile>): Promise<Profile>;
  update(id: string, profileData: Partial<Profile>): Promise<Profile | null>;
  delete(id: string): Promise<boolean>;
  setDefault(id: string, userId: string): Promise<boolean>;

  // Module management
  addModule(profileId: string, moduleId: string, moduleType: ModuleType): Promise<boolean>;
  removeModule(profileId: string, moduleId: string, moduleType: ModuleType): Promise<boolean>;
  getModules(profileId: string): Promise<Record<ModuleType, Module[]>>;
}

/**
 * Profile service implementation
 */
class ProfileServiceImpl implements ProfileService {
  private profiles: Profile[] = [];

  /**
   * Find all profiles for a user
   * @param userId User ID
   * @returns Array of profiles
   */
  async findAll(userId: string): Promise<Profile[]> {
    logger.debug(`Finding all profiles for user: ${userId}`);
    return this.profiles.filter(profile => profile.userId === userId);
  }

  /**
   * Find profile by ID
   * @param id Profile ID
   * @returns Profile object or null if not found
   */
  async findById(id: string): Promise<Profile | null> {
    logger.debug(`Finding profile by ID: ${id}`);
    const profile = this.profiles.find(p => p.id === id);
    return profile || null;
  }

  /**
   * Create a new profile
   * @param userId User ID
   * @param profileData Profile data
   * @returns Created profile
   */
  async create(userId: string, profileData: Partial<Profile>): Promise<Profile> {
    logger.debug(`Creating profile for user: ${userId}`);

    const now = new Date();
    const profile: Profile = {
      id: `profile-${Date.now()}`,
      name: profileData.name || 'New Assistant',
      description: profileData.description || '',
      userId,
      createdAt: now,
      updatedAt: now,
      modules: {
        personality: profileData.modules?.personality || [],
        tools: profileData.modules?.tools || [],
        agents: profileData.modules?.agents || [],
        modalities: profileData.modules?.modalities || [],
      },
      config: profileData.config || {},
      isDefault: profileData.isDefault || false,
    };

    // If this is the default profile, unset any other default profiles for this user
    if (profile.isDefault) {
      await this.unsetDefaultProfiles(userId);
    }

    this.profiles.push(profile);
    return profile;
  }

  /**
   * Update profile
   * @param id Profile ID
   * @param profileData Profile data
   * @returns Updated profile or null if not found
   */
  async update(id: string, profileData: Partial<Profile>): Promise<Profile | null> {
    logger.debug(`Updating profile: ${id}`);

    const index = this.profiles.findIndex(p => p.id === id);
    if (index === -1) {
      return null;
    }

    const profile = this.profiles[index];

    // If setting as default, unset any other default profiles for this user
    if (profileData.isDefault && !profile.isDefault) {
      await this.unsetDefaultProfiles(profile.userId);
    }

    const updatedProfile = {
      ...profile,
      ...profileData,
      updatedAt: new Date(),
      // Ensure modules structure is preserved
      modules: {
        personality: profileData.modules?.personality || profile.modules.personality,
        tools: profileData.modules?.tools || profile.modules.tools,
        agents: profileData.modules?.agents || profile.modules.agents,
        modalities: profileData.modules?.modalities || profile.modules.modalities,
      },
    };

    this.profiles[index] = updatedProfile;
    return updatedProfile;
  }

  /**
   * Delete profile
   * @param id Profile ID
   * @returns True if deleted
   */
  async delete(id: string): Promise<boolean> {
    logger.debug(`Deleting profile: ${id}`);

    const index = this.profiles.findIndex(p => p.id === id);
    if (index === -1) {
      return false;
    }

    this.profiles.splice(index, 1);
    return true;
  }

  /**
   * Set a profile as the default for a user
   * @param id Profile ID
   * @param userId User ID
   * @returns True if successful
   */
  async setDefault(id: string, userId: string): Promise<boolean> {
    logger.debug(`Setting profile ${id} as default for user: ${userId}`);

    // Unset any existing default profiles
    await this.unsetDefaultProfiles(userId);

    // Set the specified profile as default
    const profile = await this.findById(id);
    if (!profile || profile.userId !== userId) {
      return false;
    }

    return this.update(id, { isDefault: true }).then(p => !!p);
  }

  /**
   * Add a module to a profile
   * @param profileId Profile ID
   * @param moduleId Module ID
   * @param moduleType Module type
   * @returns True if added
   */
  async addModule(profileId: string, moduleId: string, moduleType: ModuleType): Promise<boolean> {
    logger.debug(`Adding module ${moduleId} to profile: ${profileId}`);

    const profile = await this.findById(profileId);
    if (!profile) {
      return false;
    }

    // Create a copy of the modules
    const modules = { ...profile.modules };

    // Add the module to the appropriate array if it doesn't already exist
    switch (moduleType) {
      case ModuleType.PERSONALITY:
        if (!modules.personality?.includes(moduleId)) {
          modules.personality = [...(modules.personality || []), moduleId];
        }
        break;
      case ModuleType.TOOL:
        if (!modules.tools.includes(moduleId)) {
          modules.tools = [...modules.tools, moduleId];
        }
        break;
      case ModuleType.AGENT:
        if (!modules.agents.includes(moduleId)) {
          modules.agents = [...modules.agents, moduleId];
        }
        break;
      case ModuleType.MODALITY:
        if (!modules.modalities.includes(moduleId)) {
          modules.modalities = [...modules.modalities, moduleId];
        }
        break;
    }

    return this.update(profileId, { modules }).then(p => !!p);
  }

  /**
   * Remove a module from a profile
   * @param profileId Profile ID
   * @param moduleId Module ID
   * @param moduleType Module type
   * @returns True if removed
   */
  async removeModule(
    profileId: string,
    moduleId: string,
    moduleType: ModuleType
  ): Promise<boolean> {
    logger.debug(`Removing module ${moduleId} from profile: ${profileId}`);

    const profile = await this.findById(profileId);
    if (!profile) {
      return false;
    }

    // Create a copy of the modules
    const modules = { ...profile.modules };

    // Remove the module from the appropriate array
    switch (moduleType) {
      case ModuleType.PERSONALITY:
        modules.personality = modules.personality?.filter(id => id !== moduleId) || [];
        break;
      case ModuleType.TOOL:
        modules.tools = modules.tools.filter(id => id !== moduleId);
        break;
      case ModuleType.AGENT:
        modules.agents = modules.agents.filter(id => id !== moduleId);
        break;
      case ModuleType.MODALITY:
        modules.modalities = modules.modalities.filter(id => id !== moduleId);
        break;
    }

    return this.update(profileId, { modules }).then(p => !!p);
  }

  /**
   * Get all modules for a profile
   * @param profileId Profile ID
   * @returns Record of modules by type
   */
  async getModules(profileId: string): Promise<Record<ModuleType, Module[]>> {
    logger.debug(`Getting modules for profile: ${profileId}`);

    // This is a placeholder implementation
    // In a real implementation, this would fetch the actual module objects
    return {
      [ModuleType.PERSONALITY]: [],
      [ModuleType.TOOL]: [],
      [ModuleType.AGENT]: [],
      [ModuleType.MODALITY]: [],
    };
  }

  /**
   * Unset all default profiles for a user
   * @param userId User ID
   * @private
   */
  private async unsetDefaultProfiles(userId: string): Promise<void> {
    const userProfiles = await this.findAll(userId);

    for (const profile of userProfiles) {
      if (profile.isDefault) {
        await this.update(profile.id, { isDefault: false });
      }
    }
  }
}

// Create singleton instance
const profileServiceInstance = new ProfileServiceImpl();

/**
 * Initialize profile service
 */
export const initProfileService = async (): Promise<void> => {
  logger.info('Initializing profile service');
  // Add initialization logic here
};

/**
 * Get profile service instance
 * @returns Profile service instance
 */
export const getProfileService = (): ProfileService => {
  return profileServiceInstance;
};
