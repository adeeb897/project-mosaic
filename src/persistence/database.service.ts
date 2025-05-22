/**
 * Database service for Project Mosaic
 *
 * This service provides a clean API for connecting to the database and managing the connection.
 */
import mongoose from 'mongoose';
import { EventEmitter } from 'events';

/**
 * Database connection options
 */
export interface DatabaseConnectionOptions {
  uri: string;
  options?: mongoose.ConnectOptions;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Database connection status
 */
export interface DatabaseConnectionStatus {
  connected: boolean;
  status: 'disconnected' | 'connected' | 'connecting' | 'disconnecting' | 'unknown';
  error?: Error;
}

/**
 * Database service
 */
export class DatabaseService {
  private static instance: DatabaseService;
  private connectionOptions: DatabaseConnectionOptions;
  private retryCount: number = 0;
  private eventEmitter: EventEmitter = new EventEmitter();

  /**
   * Get the database service instance
   *
   * @returns The database service instance
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Set default connection options
    this.connectionOptions = {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/project-mosaic',
      maxRetries: 5,
      retryDelay: 5000,
    };

    // Set up mongoose connection event handlers
    mongoose.connection.on('connected', () => {
      console.log('MongoDB connected');
      this.eventEmitter.emit('connected');
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      this.eventEmitter.emit('disconnected');
    });

    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
      this.eventEmitter.emit('error', err);
    });
  }

  /**
   * Set the database connection options
   *
   * @param options The connection options
   */
  public setConnectionOptions(options: Partial<DatabaseConnectionOptions>): void {
    this.connectionOptions = {
      ...this.connectionOptions,
      ...options,
    };
  }

  /**
   * Connect to the database
   *
   * @returns A promise that resolves when the connection is established
   */
  public async connect(): Promise<void> {
    try {
      if (mongoose.connection.readyState === 1) {
        // Already connected
        return;
      }

      await mongoose.connect(this.connectionOptions.uri, this.connectionOptions.options);
      this.retryCount = 0;
    } catch (error) {
      console.error('Failed to connect to database:', error);

      // Retry connection if configured
      if (this.retryCount < (this.connectionOptions.maxRetries || 0)) {
        this.retryCount++;
        console.log(
          `Retrying connection (${this.retryCount}/${this.connectionOptions.maxRetries})...`
        );

        await new Promise(resolve => {
          setTimeout(resolve, this.connectionOptions.retryDelay);
        });

        return this.connect();
      }

      throw error;
    }
  }

  /**
   * Disconnect from the database
   *
   * @returns A promise that resolves when the connection is closed
   */
  public async disconnect(): Promise<void> {
    try {
      await mongoose.disconnect();
    } catch (error) {
      console.error('Failed to disconnect from database:', error);
      throw error;
    }
  }

  /**
   * Get the current database connection status
   *
   * @returns The connection status
   */
  public getConnectionStatus(): DatabaseConnectionStatus {
    const state = mongoose.connection.readyState;

    // Convert readyState number to a descriptive string
    let status: 'disconnected' | 'connected' | 'connecting' | 'disconnecting' | 'unknown';
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
  }

  /**
   * Subscribe to database connection events
   *
   * @param event The event to subscribe to
   * @param listener The event listener
   */
  public on(
    event: 'connected' | 'disconnected' | 'error',
    listener: (...args: any[]) => void
  ): void {
    this.eventEmitter.on(event, listener);
  }

  /**
   * Unsubscribe from database connection events
   *
   * @param event The event to unsubscribe from
   * @param listener The event listener
   */
  public off(
    event: 'connected' | 'disconnected' | 'error',
    listener: (...args: any[]) => void
  ): void {
    this.eventEmitter.off(event, listener);
  }

  /**
   * Get the mongoose instance
   *
   * @returns The mongoose instance
   */
  public getMongoose(): typeof mongoose {
    return mongoose;
  }
}

/**
 * Get the database service instance
 *
 * @returns The database service instance
 */
export const getDatabaseService = (): DatabaseService => {
  return DatabaseService.getInstance();
};

/**
 * Connect to the database using environment variables
 *
 * @returns A promise that resolves when the connection is established
 */
export const connectDatabase = async (): Promise<void> => {
  const dbService = getDatabaseService();
  return dbService.connect();
};

/**
 * Disconnect from the database
 *
 * @returns A promise that resolves when the connection is closed
 */
export const disconnectDatabase = async (): Promise<void> => {
  const dbService = getDatabaseService();
  return dbService.disconnect();
};

/**
 * Get the current database connection status
 *
 * @returns The connection status
 */
export const getDatabaseStatus = (): DatabaseConnectionStatus => {
  const dbService = getDatabaseService();
  return dbService.getConnectionStatus();
};
