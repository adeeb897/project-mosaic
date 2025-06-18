/**
 * Module repository for Project Mosaic
 */
import { FilterQuery } from 'mongoose';
import { BaseRepository, IBaseRepository } from './base.repository';
import { ModuleDocument, ModuleModel } from '../models/module.model';
import { ModuleType } from '../../core/types/ModuleTypes';
import { ReviewStatus } from '../../core/models/Module';

/**
 * Module repository interface
 */
export interface IModuleRepository extends IBaseRepository<ModuleDocument> {
  findByName(name: string): Promise<ModuleDocument | null>;
  findByType(type: ModuleType, filter?: FilterQuery<ModuleDocument>): Promise<ModuleDocument[]>;
  findByAuthor(authorId: string, filter?: FilterQuery<ModuleDocument>): Promise<ModuleDocument[]>;
  findByTags(tags: string[], filter?: FilterQuery<ModuleDocument>): Promise<ModuleDocument[]>;
  findByReviewStatus(
    status: ReviewStatus,
    filter?: FilterQuery<ModuleDocument>
  ): Promise<ModuleDocument[]>;
  findPopular(limit?: number, filter?: FilterQuery<ModuleDocument>): Promise<ModuleDocument[]>;
  findHighestRated(limit?: number, filter?: FilterQuery<ModuleDocument>): Promise<ModuleDocument[]>;
  findNewest(limit?: number, filter?: FilterQuery<ModuleDocument>): Promise<ModuleDocument[]>;
  searchModules(query: string, filter?: FilterQuery<ModuleDocument>): Promise<ModuleDocument[]>;
  incrementInstallCount(moduleId: string): Promise<void>;
  updateRating(moduleId: string, newRating: number): Promise<void>;
  updateReviewStatus(moduleId: string, status: ReviewStatus): Promise<ModuleDocument | null>;
  publishModule(moduleId: string): Promise<ModuleDocument | null>;
}

/**
 * Module repository implementation
 */
export class ModuleRepository extends BaseRepository<ModuleDocument> implements IModuleRepository {
  /**
   * Constructor
   */
  constructor() {
    super(ModuleModel);
  }

  /**
   * Find a module by name
   *
   * @param name The module name
   * @returns The module or null if not found
   */
  async findByName(name: string): Promise<ModuleDocument | null> {
    return this.findOne({ name });
  }

  /**
   * Find modules by type
   *
   * @param type The module type
   * @param filter Additional filter criteria
   * @returns An array of modules
   */
  async findByType(
    type: ModuleType,
    filter: FilterQuery<ModuleDocument> = {}
  ): Promise<ModuleDocument[]> {
    return this.find({
      ...filter,
      type,
    });
  }

  /**
   * Find modules by author
   *
   * @param authorId The author ID
   * @param filter Additional filter criteria
   * @returns An array of modules
   */
  async findByAuthor(
    authorId: string,
    filter: FilterQuery<ModuleDocument> = {}
  ): Promise<ModuleDocument[]> {
    return this.find({
      ...filter,
      'author.id': authorId,
    });
  }

  /**
   * Find modules by tags
   *
   * @param tags The tags to search for
   * @param filter Additional filter criteria
   * @returns An array of modules
   */
  async findByTags(
    tags: string[],
    filter: FilterQuery<ModuleDocument> = {}
  ): Promise<ModuleDocument[]> {
    return this.find({
      ...filter,
      'metadata.tags': { $in: tags },
    });
  }

  /**
   * Find modules by review status
   *
   * @param status The review status
   * @param filter Additional filter criteria
   * @returns An array of modules
   */
  async findByReviewStatus(
    status: ReviewStatus,
    filter: FilterQuery<ModuleDocument> = {}
  ): Promise<ModuleDocument[]> {
    return this.find({
      ...filter,
      reviewStatus: status,
    });
  }

  /**
   * Find popular modules
   *
   * @param limit The maximum number of modules to return
   * @param filter Additional filter criteria
   * @returns An array of modules
   */
  async findPopular(
    limit: number = 10,
    filter: FilterQuery<ModuleDocument> = {}
  ): Promise<ModuleDocument[]> {
    const result = await this.model.find(filter).sort({ installCount: -1 }).limit(limit);
    return result;
  }

  /**
   * Find highest rated modules
   *
   * @param limit The maximum number of modules to return
   * @param filter Additional filter criteria
   * @returns An array of modules
   */
  async findHighestRated(
    limit: number = 10,
    filter: FilterQuery<ModuleDocument> = {}
  ): Promise<ModuleDocument[]> {
    const result = await this.model.find(filter).sort({ rating: -1 }).limit(limit);
    return result;
  }

  /**
   * Find newest modules
   *
   * @param limit The maximum number of modules to return
   * @param filter Additional filter criteria
   * @returns An array of modules
   */
  async findNewest(
    limit: number = 10,
    filter: FilterQuery<ModuleDocument> = {}
  ): Promise<ModuleDocument[]> {
    const result = await this.model.find(filter).sort({ createdAt: -1 }).limit(limit);
    return result;
  }

  /**
   * Search modules by text query
   *
   * @param query The search query
   * @param filter Additional filter criteria
   * @returns An array of modules
   */
  async searchModules(
    query: string,
    filter: FilterQuery<ModuleDocument> = {}
  ): Promise<ModuleDocument[]> {
    return this.model.find({
      ...filter,
      $text: { $search: query },
    });
  }

  /**
   * Increment a module's install count
   *
   * @param moduleId The module ID
   */
  async incrementInstallCount(moduleId: string): Promise<void> {
    await this.model.findByIdAndUpdate(moduleId, {
      $inc: { installCount: 1 },
    });
  }

  /**
   * Update a module's rating
   *
   * @param moduleId The module ID
   * @param newRating The new rating
   */
  async updateRating(moduleId: string, newRating: number): Promise<void> {
    const module = await this.findById(moduleId);
    if (module) {
      // Calculate new average rating
      const currentRating = module.rating || 0;
      const ratingCount = module.ratingCount || 0;
      const newAverage = (currentRating * ratingCount + newRating) / (ratingCount + 1);

      await this.model.findByIdAndUpdate(moduleId, {
        $set: { rating: newAverage },
        $inc: { ratingCount: 1 },
      });
    }
  }

  /**
   * Update a module's review status
   *
   * @param moduleId The module ID
   * @param status The new review status
   * @returns The updated module or null if not found
   */
  async updateReviewStatus(moduleId: string, status: ReviewStatus): Promise<ModuleDocument | null> {
    return this.updateById(moduleId, { reviewStatus: status });
  }

  /**
   * Publish a module
   *
   * @param moduleId The module ID
   * @returns The updated module or null if not found
   */
  async publishModule(moduleId: string): Promise<ModuleDocument | null> {
    return this.updateById(moduleId, {
      publishedAt: new Date(),
      reviewStatus: ReviewStatus.APPROVED,
    });
  }
}
