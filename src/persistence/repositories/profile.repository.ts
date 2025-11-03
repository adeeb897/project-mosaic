/**
 * Profile repository for Project Mosaic
 */
import { FilterQuery, Schema } from 'mongoose';
import { BaseRepository, IBaseRepository } from './base.repository';
import { IProfileDocument, Profile, IModuleReference } from '../models/profile.model';

/**
 * Profile repository interface
 */
export interface IProfileRepository extends IBaseRepository<IProfileDocument> {
  findByUser(userId: string): Promise<IProfileDocument[]>;
  findByUserAndName(userId: string, name: string): Promise<IProfileDocument | null>;
  findDefaultForUser(userId: string): Promise<IProfileDocument | null>;
  findByShareCode(shareCode: string): Promise<IProfileDocument | null>;
  findPublicProfiles(filter?: FilterQuery<IProfileDocument>): Promise<IProfileDocument[]>;
  findPopularPublicProfiles(limit?: number): Promise<IProfileDocument[]>;
  findByTags(tags: string[], filter?: FilterQuery<IProfileDocument>): Promise<IProfileDocument[]>;
  searchProfiles(
    query: string,
    filter?: FilterQuery<IProfileDocument>
  ): Promise<IProfileDocument[]>;
  addModule(profileId: string, moduleRef: IModuleReference): Promise<IProfileDocument | null>;
  removeModule(profileId: string, moduleId: string): Promise<IProfileDocument | null>;
  updateModuleConfig(
    profileId: string,
    moduleId: string,
    config: Record<string, any>
  ): Promise<IProfileDocument | null>;
  setAsDefault(profileId: string): Promise<IProfileDocument | null>;
  generateShareCode(profileId: string): Promise<string | null>;
  cloneProfile(
    profileId: string,
    userId: string,
    newName: string
  ): Promise<IProfileDocument | null>;
  makePublic(profileId: string, isPublic: boolean): Promise<IProfileDocument | null>;
}

/**
 * Profile repository implementation
 */
export class ProfileRepository
  extends BaseRepository<IProfileDocument>
  implements IProfileRepository
{
  /**
   * Constructor
   */
  constructor() {
    super(Profile);
  }

  /**
   * Find profiles by user
   *
   * @param userId The user ID
   * @returns An array of profiles
   */
  async findByUser(userId: string): Promise<IProfileDocument[]> {
    return this.find({ userId });
  }

  /**
   * Find a profile by user and name
   *
   * @param userId The user ID
   * @param name The profile name
   * @returns The profile or null if not found
   */
  async findByUserAndName(userId: string, name: string): Promise<IProfileDocument | null> {
    return this.findOne({ userId, name });
  }

  /**
   * Find the default profile for a user
   *
   * @param userId The user ID
   * @returns The default profile or null if not found
   */
  async findDefaultForUser(userId: string): Promise<IProfileDocument | null> {
    return this.findOne({ userId, isDefault: true });
  }

  /**
   * Find a profile by share code
   *
   * @param shareCode The share code
   * @returns The profile or null if not found
   */
  async findByShareCode(shareCode: string): Promise<IProfileDocument | null> {
    return this.findOne({ shareCode });
  }

  /**
   * Find public profiles
   *
   * @param filter Additional filter criteria
   * @returns An array of public profiles
   */
  async findPublicProfiles(
    filter: FilterQuery<IProfileDocument> = {}
  ): Promise<IProfileDocument[]> {
    return this.find({
      ...filter,
      isPublic: true,
    });
  }

  /**
   * Find popular public profiles
   *
   * @param limit The maximum number of profiles to return
   * @returns An array of popular public profiles
   */
  async findPopularPublicProfiles(limit: number = 10): Promise<IProfileDocument[]> {
    const result = await this.model.find({ isPublic: true }).sort({ cloneCount: -1 }).limit(limit);
    return result;
  }

  /**
   * Find profiles by tags
   *
   * @param tags The tags to search for
   * @param filter Additional filter criteria
   * @returns An array of profiles
   */
  async findByTags(
    tags: string[],
    filter: FilterQuery<IProfileDocument> = {}
  ): Promise<IProfileDocument[]> {
    return this.find({
      ...filter,
      tags: { $in: tags },
    });
  }

  /**
   * Search profiles by text query
   *
   * @param query The search query
   * @param filter Additional filter criteria
   * @returns An array of profiles
   */
  async searchProfiles(
    query: string,
    filter: FilterQuery<IProfileDocument> = {}
  ): Promise<IProfileDocument[]> {
    return this.model.find({
      ...filter,
      $text: { $search: query },
    });
  }

  /**
   * Add a module to a profile
   *
   * @param profileId The profile ID
   * @param moduleRef The module reference
   * @returns The updated profile or null if not found
   */
  async addModule(
    profileId: string,
    moduleRef: IModuleReference
  ): Promise<IProfileDocument | null> {
    const profile = await this.findById(profileId);
    if (!profile) {
      return null;
    }

    await profile.addModule(moduleRef);
    return profile;
  }

  /**
   * Remove a module from a profile
   *
   * @param profileId The profile ID
   * @param moduleId The module ID
   * @returns The updated profile or null if not found
   */
  async removeModule(profileId: string, moduleId: string): Promise<IProfileDocument | null> {
    const profile = await this.findById(profileId);
    if (!profile) {
      return null;
    }

    await profile.removeModule(new Schema.Types.ObjectId(moduleId));
    return profile;
  }

  /**
   * Update a module's configuration in a profile
   *
   * @param profileId The profile ID
   * @param moduleId The module ID
   * @param config The module configuration
   * @returns The updated profile or null if not found
   */
  async updateModuleConfig(
    profileId: string,
    moduleId: string,
    config: Record<string, any>
  ): Promise<IProfileDocument | null> {
    const profile = await this.findById(profileId);
    if (!profile) {
      return null;
    }

    await profile.updateModuleConfig(new Schema.Types.ObjectId(moduleId), config);
    return profile;
  }

  /**
   * Set a profile as the default for a user
   *
   * @param profileId The profile ID
   * @returns The updated profile or null if not found
   */
  async setAsDefault(profileId: string): Promise<IProfileDocument | null> {
    const profile = await this.findById(profileId);
    if (!profile) {
      return null;
    }

    await profile.setAsDefault();
    return profile;
  }

  /**
   * Generate a share code for a profile
   *
   * @param profileId The profile ID
   * @returns The share code or null if the profile is not found
   */
  async generateShareCode(profileId: string): Promise<string | null> {
    const profile = await this.findById(profileId);
    if (!profile) {
      return null;
    }

    return profile.generateShareCode();
  }

  /**
   * Clone a profile for another user
   *
   * @param profileId The profile ID to clone
   * @param userId The user ID to clone for
   * @param newName The name for the cloned profile
   * @returns The cloned profile or null if the source profile is not found
   */
  async cloneProfile(
    profileId: string,
    userId: string,
    newName: string
  ): Promise<IProfileDocument | null> {
    const sourceProfile = await this.findById(profileId);
    if (!sourceProfile) {
      return null;
    }

    // Create a new profile with the same data
    const clonedProfile = await this.create({
      userId: new Schema.Types.ObjectId(userId),
      name: newName,
      description: `Cloned from ${sourceProfile.name}`,
      modules: sourceProfile.modules,
      defaultModality: sourceProfile.defaultModality,
      tags: sourceProfile.tags,
      metadata: sourceProfile.metadata,
      icon: sourceProfile.icon,
      color: sourceProfile.color,
      isPublic: false,
      clonedFrom: sourceProfile._id,
      cloneCount: 0,
    });

    // Increment the clone count of the source profile
    await sourceProfile.incrementCloneCount();

    return clonedProfile;
  }

  /**
   * Make a profile public or private
   *
   * @param profileId The profile ID
   * @param isPublic Whether the profile should be public
   * @returns The updated profile or null if not found
   */
  async makePublic(profileId: string, isPublic: boolean): Promise<IProfileDocument | null> {
    return this.updateById(profileId, { isPublic });
  }
}
