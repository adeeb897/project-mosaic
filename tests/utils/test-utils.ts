/**
 * Test Utilities for Project Mosaic
 *
 * This file contains utility functions for testing that can be used across
 * different test files to reduce duplication and standardize testing approaches.
 */

import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { UserStatus } from '../../src/types';

// We'll use type assertions to bypass TypeScript's strict checking
// for the purpose of testing

/**
 * Create a mock Express request object
 */
export const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => {
  const req: Partial<Request> = {
    body: {},
    params: {},
    query: {},
    headers: {},
    cookies: {},
    ...overrides,
  };

  return req;
};

/**
 * Create a mock Express response object
 */
export const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.sendStatus = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.render = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  res.type = jest.fn().mockReturnValue(res);
  res.locals = {};

  return res;
};

/**
 * Create a mock Express next function
 */
export const createMockNext = (): NextFunction => {
  return jest.fn();
};

/**
 * Create a mock authenticated request with a user
 */
// Define a type for the user object in authenticated requests
interface AuthUser {
  id: string;
  email: string;
  roles: string[];
  status: UserStatus;
}

export const createAuthenticatedRequest = (
  userId: string = new mongoose.Types.ObjectId().toString(),
  roles: string[] = ['user'],
  overrides: Partial<Request> = {}
): Partial<Request> => {
  return createMockRequest({
    user: {
      id: userId,
      email: `user_${userId.substring(0, 8)}@example.com`,
      roles,
      status: UserStatus.ACTIVE,
    } as AuthUser,
    ...overrides,
  });
};

/**
 * Generate a valid JWT token for testing
 */
export const generateTestToken = (
  userId: string = new mongoose.Types.ObjectId().toString(),
  roles: string[] = ['user'],
  expiresIn: string = '1h'
): string => {
  const secret = process.env.JWT_SECRET || 'test_jwt_secret';

  // Using type assertion to bypass TypeScript's strict checking for jwt.sign
  return (jwt as any).sign(
    {
      id: userId,
      email: `user_${userId.substring(0, 8)}@example.com`,
      roles,
      status: UserStatus.ACTIVE,
    },
    secret,
    { expiresIn }
  );
};

/**
 * Wait for a specified time (useful for testing async operations)
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Create a spy on a method of an object and restore it after the test
 */
export const spyOnMethod = <T extends object>(object: T, method: keyof T): jest.SpyInstance => {
  // Use type assertion to make TypeScript happy
  const spy = jest.spyOn(object, method as any);

  // Add spy to list of spies to be restored
  spyRegistry.push(spy);

  return spy;
};

/**
 * Registry of spies to be restored
 */
const spyRegistry: jest.SpyInstance[] = [];

/**
 * Restore all registered spies
 */
export const restoreAllSpies = (): void => {
  spyRegistry.forEach(spy => spy.mockRestore());
  spyRegistry.length = 0;
};

/**
 * Create a mock implementation of a service
 */
export const createMockService = <T>(methods: Record<string, jest.Mock> = {}): T => {
  const mockService = {} as T;

  // Add methods to the mock service
  Object.entries(methods).forEach(([key, value]) => {
    (mockService as Record<string, jest.Mock>)[key] = value;
  });

  return mockService;
};

/**
 * Create a mock MongoDB document
 */
export const createMockDocument = <T>(data: Partial<T> = {}): T => {
  return {
    _id: new mongoose.Types.ObjectId(),
    toObject: jest.fn().mockReturnValue({ ...data, _id: new mongoose.Types.ObjectId() }),
    toJSON: jest.fn().mockReturnValue({ ...data, _id: new mongoose.Types.ObjectId() }),
    ...data,
  } as unknown as T;
};

/**
 * Create a mock event emitter
 */
export const createMockEventEmitter = () => {
  return {
    on: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
    off: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
  };
};

/**
 * Create a mock WebSocket
 */
export const createMockWebSocket = () => {
  return {
    on: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
    terminate: jest.fn(),
    ping: jest.fn(),
    readyState: 1, // WebSocket.OPEN
  };
};

/**
 * Create a mock Redis client
 */
export const createMockRedisClient = () => {
  return {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    incr: jest.fn(),
    decr: jest.fn(),
    hget: jest.fn(),
    hset: jest.fn(),
    hdel: jest.fn(),
    hgetall: jest.fn(),
    quit: jest.fn(),
    on: jest.fn(),
  };
};

/**
 * Create a mock MongoDB collection
 */
export const createMockCollection = () => {
  return {
    find: jest.fn().mockReturnThis(),
    findOne: jest.fn(),
    insertOne: jest.fn(),
    insertMany: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
    aggregate: jest.fn().mockReturnThis(),
    countDocuments: jest.fn(),
    distinct: jest.fn(),
    toArray: jest.fn(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    project: jest.fn().mockReturnThis(),
  };
};
