/**
 * Database module for Project Mosaic
 *
 * This module provides functions to interact with the database.
 * It re-exports the database service and repositories for easy access.
 */

import mongoose from 'mongoose';

/**
 * Get a collection from the database
 *
 * @param collectionName The name of the collection
 * @returns The collection
 */
// Define a generic collection interface
interface DatabaseCollection {
  findOne: (query?: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  find: (query?: Record<string, unknown>) => {
    sort?: (sortOptions: Record<string, number>) => {
      skip: (skipCount: number) => {
        limit: (limitCount: number) => {
          toArray: () => Promise<unknown[]>;
        };
      };
    };
    toArray: () => Promise<unknown[]>;
  };
  insertOne: (
    document: Record<string, unknown>
  ) => Promise<{ insertedId: mongoose.Types.ObjectId }>;
  updateOne: (
    query: Record<string, unknown>,
    update: Record<string, unknown>
  ) => Promise<{ modifiedCount: number }>;
  deleteOne: (query: Record<string, unknown>) => Promise<{ deletedCount: number }>;
}

export const getCollection = (_collectionName: string): DatabaseCollection => {
  // In a real implementation, this would return a MongoDB collection
  // For now, we'll return a mock implementation for testing
  return {
    findOne: async () => ({}),
    find: () => ({
      sort: _sortOptions => ({
        skip: _skipCount => ({
          limit: _limitCount => ({
            toArray: async () => [],
          }),
        }),
      }),
      toArray: async () => [],
    }),
    insertOne: async () => ({ insertedId: new mongoose.Types.ObjectId() }),
    updateOne: async () => ({ modifiedCount: 1 }),
    deleteOne: async () => ({ deletedCount: 1 }),
  };
};

/**
 * Connect to the database
 *
 * @param uri The database URI
 * @returns A promise that resolves when the connection is established
 */
export const connect = async (uri: string): Promise<void> => {
  try {
    await mongoose.connect(uri);
    // Use a logger instead of console statements
    // For now, we'll comment out the console.log to fix the ESLint warning
    // In a real application, we would use a proper logger
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
};

/**
 * Connect to the database using environment variables
 *
 * @returns A promise that resolves when the connection is established
 */
export const connectDatabase = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/project-mosaic';
  return connect(uri);
};

/**
 * Disconnect from the database
 *
 * @returns A promise that resolves when the connection is closed
 */
export const disconnect = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    // Use a logger instead of console statements
    // For now, we'll comment out the console.log to fix the ESLint warning
    // In a real application, we would use a proper logger
  } catch (error) {
    console.error('Failed to disconnect from database:', error);
    throw error;
  }
};

/**
 * Get the current database connection status
 *
 * @returns An object with the connection status
 */
export const getDatabaseStatus = (): { connected: boolean; status: string } => {
  const state = mongoose.connection.readyState;

  // Convert readyState number to a descriptive string
  let status: string;
  switch (state) {
    case 0:
      status = 'disconnected';
      break;
    case 1:
      status = 'connected';
      break;
    case 2:
      status = 'connecting';
      break;
    case 3:
      status = 'disconnecting';
      break;
    default:
      status = 'unknown';
  }

  return {
    connected: state === 1,
    status,
  };
};

// Re-export everything from the persistence layer
export * from './index';
