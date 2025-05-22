import mongoose from 'mongoose';
import { logger } from '@utils/logger';

/**
 * Connect to MongoDB database
 */
export const connectDatabase = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/project-mosaic';

  try {
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB database');

    // Set up event listeners for database connection
    mongoose.connection.on('error', error => {
      logger.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed due to application termination');
    });
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};

/**
 * Disconnect from MongoDB database
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error);
    throw error;
  }
};

/**
 * Get MongoDB connection status
 */
export const getDatabaseStatus = (): { connected: boolean; status: number } => {
  return {
    connected: mongoose.connection.readyState === 1,
    status: mongoose.connection.readyState,
  };
};
