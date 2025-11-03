/**
 * Base repository for all database repositories
 */
import { Document, FilterQuery, Model, UpdateQuery } from 'mongoose';

/**
 * Base repository interface
 */
export interface IBaseRepository<T extends Document> {
  findById(id: string): Promise<T | null>;
  findOne(filter: FilterQuery<T>): Promise<T | null>;
  find(filter: FilterQuery<T>): Promise<T[]>;
  findWithPagination(
    filter: FilterQuery<T>,
    page: number,
    limit: number,
    sort?: Record<string, 1 | -1>
  ): Promise<{ data: T[]; total: number; page: number; limit: number }>;
  create(data: Partial<T>): Promise<T>;
  updateById(id: string, data: UpdateQuery<T>): Promise<T | null>;
  updateOne(filter: FilterQuery<T>, data: UpdateQuery<T>): Promise<T | null>;
  updateMany(filter: FilterQuery<T>, data: UpdateQuery<T>): Promise<number>;
  deleteById(id: string): Promise<boolean>;
  deleteOne(filter: FilterQuery<T>): Promise<boolean>;
  deleteMany(filter: FilterQuery<T>): Promise<number>;
  count(filter: FilterQuery<T>): Promise<number>;
  exists(filter: FilterQuery<T>): Promise<boolean>;
}

/**
 * Base repository implementation
 */
export class BaseRepository<T extends Document> implements IBaseRepository<T> {
  protected model: Model<T>;

  /**
   * Constructor
   *
   * @param model The mongoose model
   */
  constructor(model: Model<T>) {
    this.model = model;
  }

  /**
   * Find a document by ID
   *
   * @param id The document ID
   * @returns The document or null if not found
   */
  async findById(id: string): Promise<T | null> {
    try {
      return await this.model.findById(id);
    } catch (error) {
      console.error(`Error finding document by ID: ${error}`);
      return null;
    }
  }

  /**
   * Find a document by filter
   *
   * @param filter The filter query
   * @returns The document or null if not found
   */
  async findOne(filter: FilterQuery<T>): Promise<T | null> {
    try {
      return await this.model.findOne(filter);
    } catch (error) {
      console.error(`Error finding document: ${error}`);
      return null;
    }
  }

  /**
   * Find documents by filter
   *
   * @param filter The filter query
   * @returns An array of documents
   */
  async find(filter: FilterQuery<T>): Promise<T[]> {
    try {
      return await this.model.find(filter);
    } catch (error) {
      console.error(`Error finding documents: ${error}`);
      return [];
    }
  }

  /**
   * Find documents with pagination
   *
   * @param filter The filter query
   * @param page The page number (1-based)
   * @param limit The number of documents per page
   * @param sort The sort order
   * @returns An object with the data, total count, page, and limit
   */
  async findWithPagination(
    filter: FilterQuery<T>,
    page: number = 1,
    limit: number = 10,
    sort: Record<string, 1 | -1> = { _id: 1 }
  ): Promise<{ data: T[]; total: number; page: number; limit: number }> {
    try {
      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        this.model.find(filter).sort(sort).skip(skip).limit(limit),
        this.model.countDocuments(filter),
      ]);

      return {
        data,
        total,
        page,
        limit,
      };
    } catch (error) {
      console.error(`Error finding documents with pagination: ${error}`);
      return {
        data: [],
        total: 0,
        page,
        limit,
      };
    }
  }

  /**
   * Create a new document
   *
   * @param data The document data
   * @returns The created document
   */
  async create(data: Partial<T>): Promise<T> {
    try {
      return await this.model.create(data);
    } catch (error) {
      console.error(`Error creating document: ${error}`);
      throw error;
    }
  }

  /**
   * Update a document by ID
   *
   * @param id The document ID
   * @param data The update data
   * @returns The updated document or null if not found
   */
  async updateById(id: string, data: UpdateQuery<T>): Promise<T | null> {
    try {
      return await this.model.findByIdAndUpdate(id, data, { new: true });
    } catch (error) {
      console.error(`Error updating document by ID: ${error}`);
      return null;
    }
  }

  /**
   * Update a document by filter
   *
   * @param filter The filter query
   * @param data The update data
   * @returns The updated document or null if not found
   */
  async updateOne(filter: FilterQuery<T>, data: UpdateQuery<T>): Promise<T | null> {
    try {
      return await this.model.findOneAndUpdate(filter, data, { new: true });
    } catch (error) {
      console.error(`Error updating document: ${error}`);
      return null;
    }
  }

  /**
   * Update multiple documents by filter
   *
   * @param filter The filter query
   * @param data The update data
   * @returns The number of documents updated
   */
  async updateMany(filter: FilterQuery<T>, data: UpdateQuery<T>): Promise<number> {
    try {
      const result = await this.model.updateMany(filter, data);
      return result.modifiedCount;
    } catch (error) {
      console.error(`Error updating documents: ${error}`);
      return 0;
    }
  }

  /**
   * Delete a document by ID
   *
   * @param id The document ID
   * @returns True if the document was deleted, false otherwise
   */
  async deleteById(id: string): Promise<boolean> {
    try {
      const result = await this.model.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      console.error(`Error deleting document by ID: ${error}`);
      return false;
    }
  }

  /**
   * Delete a document by filter
   *
   * @param filter The filter query
   * @returns True if the document was deleted, false otherwise
   */
  async deleteOne(filter: FilterQuery<T>): Promise<boolean> {
    try {
      const result = await this.model.deleteOne(filter);
      return result.deletedCount > 0;
    } catch (error) {
      console.error(`Error deleting document: ${error}`);
      return false;
    }
  }

  /**
   * Delete multiple documents by filter
   *
   * @param filter The filter query
   * @returns The number of documents deleted
   */
  async deleteMany(filter: FilterQuery<T>): Promise<number> {
    try {
      const result = await this.model.deleteMany(filter);
      return result.deletedCount;
    } catch (error) {
      console.error(`Error deleting documents: ${error}`);
      return 0;
    }
  }

  /**
   * Count documents by filter
   *
   * @param filter The filter query
   * @returns The number of documents
   */
  async count(filter: FilterQuery<T>): Promise<number> {
    try {
      return await this.model.countDocuments(filter);
    } catch (error) {
      console.error(`Error counting documents: ${error}`);
      return 0;
    }
  }

  /**
   * Check if a document exists
   *
   * @param filter The filter query
   * @returns True if the document exists, false otherwise
   */
  async exists(filter: FilterQuery<T>): Promise<boolean> {
    try {
      return !!(await this.model.exists(filter));
    } catch (error) {
      console.error(`Error checking if document exists: ${error}`);
      return false;
    }
  }
}
