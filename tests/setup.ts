/**
 * Global test setup file for Project Mosaic
 * This file contains setup code that will be run before each test
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createClient } from 'redis-mock';
import { mockDeep, mockReset } from 'jest-mock-extended';

// MongoDB in-memory server instance
let mongoServer: MongoMemoryServer;

// Mock Redis client
const redisMock = createClient();

// Global mocks
jest.mock('@utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Setup and teardown for MongoDB
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';

  // Start in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect to the in-memory database
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  // Disconnect and stop MongoDB server
  await mongoose.disconnect();
  await mongoServer.stop();

  // Close Redis mock
  redisMock.quit();
});

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Global test utilities
global.testUtils = {
  // Helper to create a mock Express request
  mockRequest: () => {
    const req: Record<string, unknown> = {};
    req.body = jest.fn().mockReturnValue(req);
    req.params = jest.fn().mockReturnValue(req);
    req.query = jest.fn().mockReturnValue(req);
    req.headers = jest.fn().mockReturnValue(req);
    req.user = jest.fn().mockReturnValue(req);
    return req;
  },

  // Helper to create a mock Express response
  mockResponse: () => {
    const res: Record<string, unknown> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.end = jest.fn().mockReturnValue(res);
    return res;
  },

  // Helper to create a mock Express next function
  mockNext: jest.fn(),

  // Helper to create deep mocks
  mockDeep,
  mockReset,

  // Redis mock client
  redisMock: redisMock as unknown,
};

// Type definitions for global test utilities
declare global {
  // eslint-disable-next-line no-var
  var testUtils: {
    mockRequest: () => Record<string, unknown>;
    mockResponse: () => Record<string, unknown>;
    mockNext: jest.Mock;
    mockDeep: typeof mockDeep;
    mockReset: typeof mockReset;
    redisMock: unknown;
  };
}
