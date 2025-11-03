/**
 * Mock Data Generator for Project Mosaic Tests
 *
 * This utility provides functions to generate mock data for testing purposes.
 * It includes generators for all major data models in the system.
 */

import mongoose from 'mongoose';
import { ModuleType, ReviewStatus, UserStatus, ConversationStatus } from '../../src/types';

/**
 * Generate a random ID
 */
export const generateId = (): string => new mongoose.Types.ObjectId().toString();

/**
 * Generate a random date within a range
 */
export const generateDate = (start: Date = new Date(2023, 0, 1), end: Date = new Date()): Date => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

/**
 * Generate a mock user
 */
// Define interfaces for our mock data
interface MockUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
  preferences: {
    theme: string;
    defaultProfile: string;
    preferredModalities: Array<{ type: string; priority: number }>;
    messageBubbleStyle: string;
    notificationSettings: { enabled: boolean };
    privacySettings: { shareUsageData: boolean };
    accessibilitySettings: { highContrast: boolean };
  };
  roles: Array<{
    id: string;
    name: string;
    permissions: Array<{
      id: string;
      resource: string;
      action: string;
    }>;
  }>;
  status: UserStatus;
  [key: string]: unknown;
}

export const generateMockUser = (overrides: Partial<MockUser> = {}): MockUser => {
  const id = generateId();

  return {
    id,
    username: `user_${id.substring(0, 8)}`,
    email: `user_${id.substring(0, 8)}@example.com`,
    displayName: `Test User ${id.substring(0, 5)}`,
    createdAt: generateDate(),
    updatedAt: generateDate(),
    lastLoginAt: generateDate(),
    preferences: {
      theme: 'light',
      defaultProfile: generateId(),
      preferredModalities: [{ type: 'text', priority: 1 }],
      messageBubbleStyle: 'rounded',
      notificationSettings: { enabled: true },
      privacySettings: { shareUsageData: false },
      accessibilitySettings: { highContrast: false },
    },
    roles: [
      {
        id: generateId(),
        name: 'user',
        permissions: [
          {
            id: generateId(),
            resource: 'conversation',
            action: 'create',
          },
        ],
      },
    ],
    status: UserStatus.ACTIVE,
    ...overrides,
  };
};

/**
 * Generate a mock module
 */
interface MockModule {
  id: string;
  name: string;
  description: string;
  version: string;
  type: ModuleType;
  author: {
    id: string;
    name: string;
    website: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date;
  requiresReview: boolean;
  reviewStatus: ReviewStatus;
  metadata: {
    schemaVersion: string;
    license: string;
    tags: string[];
    dependencies: unknown[];
    permissions: string[];
    capabilities: unknown[];
    compatibility: {
      minPlatformVersion: string;
      targetPlatformVersion: string;
      supportedProtocols: Array<{ name: string; version: string }>;
      supportedModalities: string[];
    };
  };
  [key: string]: unknown;
}

export const generateMockModule = (overrides: Partial<MockModule> = {}): MockModule => {
  const id = generateId();
  const createdAt = generateDate();

  return {
    id,
    name: `Module ${id.substring(0, 5)}`,
    description: `Test module description for ${id}`,
    version: '1.0.0',
    type: ModuleType.TOOL,
    author: {
      id: generateId(),
      name: 'Test Author',
      website: 'https://example.com',
      email: 'author@example.com',
    },
    createdAt,
    updatedAt: new Date(createdAt.getTime() + 86400000), // +1 day
    publishedAt: new Date(createdAt.getTime() + 172800000), // +2 days
    requiresReview: true,
    reviewStatus: ReviewStatus.APPROVED,
    metadata: {
      schemaVersion: '1.0',
      license: 'MIT',
      tags: ['test', 'mock'],
      dependencies: [],
      permissions: ['network'],
      capabilities: [],
      compatibility: {
        minPlatformVersion: '0.1.0',
        targetPlatformVersion: '0.1.0',
        supportedProtocols: [{ name: 'mcp', version: '1.0' }],
        supportedModalities: ['text'],
      },
    },
    ...overrides,
  };
};

/**
 * Generate a mock conversation
 */
interface MockConversation {
  id: string;
  title: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
  messages: Array<{
    id: string;
    conversationId: string;
    role: string;
    content: Array<{ type: string; value: string }>;
    createdAt: Date;
    metadata: Record<string, unknown>;
  }>;
  context: {
    systemPrompt: string;
    personaAttributes: Record<string, unknown>;
    memoryElements: unknown[];
    activeTools: unknown[];
    userProfile: {
      preferences: Record<string, unknown>;
      history: unknown[];
      knownFacts: Record<string, unknown>;
    };
    environmentContext: {
      timezone: string;
      locale: string;
      device: { type: string; capabilities: string[] };
      currentTime: Date;
    };
    customData: Record<string, unknown>;
  };
  activeModules: unknown[];
  profile: string;
  status: ConversationStatus;
  metadata: Record<string, unknown>;
  [key: string]: unknown;
}

export const generateMockConversation = (
  overrides: Partial<MockConversation> = {}
): MockConversation => {
  const id = generateId();
  const userId = overrides.userId || generateId();
  const createdAt = generateDate();

  return {
    id,
    title: `Conversation ${id.substring(0, 5)}`,
    userId,
    createdAt,
    updatedAt: createdAt,
    lastMessageAt: createdAt,
    messages: [
      {
        id: generateId(),
        conversationId: id,
        role: 'user',
        content: [{ type: 'text', value: 'Hello, how can you help me today?' }],
        createdAt: createdAt,
        metadata: {},
      },
      {
        id: generateId(),
        conversationId: id,
        role: 'assistant',
        content: [
          { type: 'text', value: "I'm here to assist you with any questions or tasks you have!" },
        ],
        createdAt: new Date(createdAt.getTime() + 1000),
        metadata: {
          processingTime: 250,
          tokens: { prompt: 15, completion: 12, total: 27 },
        },
      },
    ],
    context: {
      systemPrompt: 'You are a helpful assistant.',
      personaAttributes: {},
      memoryElements: [],
      activeTools: [],
      userProfile: {
        preferences: {},
        history: [],
        knownFacts: {},
      },
      environmentContext: {
        timezone: 'UTC',
        locale: 'en-US',
        device: { type: 'desktop', capabilities: ['text'] },
        currentTime: createdAt,
      },
      customData: {},
    },
    activeModules: [],
    profile: generateId(),
    status: ConversationStatus.ACTIVE,
    metadata: {},
    ...overrides,
  };
};

/**
 * Generate a mock profile
 */
interface MockProfile {
  id: string;
  userId: string;
  name: string;
  description: string;
  modules: Array<{
    moduleId: string;
    version: string;
    config: Record<string, unknown>;
    priority: number;
    isActive: boolean;
  }>;
  defaultModality: string;
  createdAt: Date;
  updatedAt: Date;
  isDefault: boolean;
  tags: string[];
  metadata: Record<string, unknown>;
  [key: string]: unknown;
}

export const generateMockProfile = (overrides: Partial<MockProfile> = {}): MockProfile => {
  const id = generateId();
  const userId = overrides.userId || generateId();
  const createdAt = generateDate();

  return {
    id,
    userId,
    name: `Profile ${id.substring(0, 5)}`,
    description: `Test profile description for ${id}`,
    modules: [
      {
        moduleId: generateId(),
        version: '1.0.0',
        config: {},
        priority: 100,
        isActive: true,
      },
    ],
    defaultModality: 'text',
    createdAt,
    updatedAt: createdAt,
    isDefault: false,
    tags: ['test'],
    metadata: {},
    ...overrides,
  };
};

/**
 * Generate a mock tool result
 */
interface MockToolResult {
  result: { data: string };
  metadata: {
    processingTime: number;
    cacheHit: boolean;
    source: string;
  };
  [key: string]: unknown;
}

export const generateMockToolResult = (overrides: Partial<MockToolResult> = {}): MockToolResult => {
  return {
    result: { data: 'Mock tool result data' },
    metadata: {
      processingTime: 150,
      cacheHit: false,
      source: 'test',
    },
    ...overrides,
  };
};

/**
 * Generate a mock LLM response
 */
interface MockLLMResponse {
  text: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  processingTime: number;
  model: string;
  [key: string]: unknown;
}

export const generateMockLLMResponse = (
  overrides: Partial<MockLLMResponse> = {}
): MockLLMResponse => {
  return {
    text: 'This is a mock response from the LLM.',
    tokens: {
      prompt: 25,
      completion: 8,
      total: 33,
    },
    processingTime: 350,
    model: 'test-model',
    ...overrides,
  };
};

/**
 * Generate a mock error
 */
interface MockError extends Error {
  code: string;
  status: number;
}

export const generateMockError = (
  message = 'Mock error message',
  code = 'MOCK_ERROR',
  status = 500
): MockError => {
  const error = new Error(message) as MockError;
  error.code = code;
  error.status = status;
  return error;
};
