/**
 * Initialize sample data for Project Mosaic
 *
 * This script initializes the database with sample data for development and testing.
 */
import {
  connectDatabase,
  disconnectDatabase,
  UserRepository,
  ModuleRepository,
  ProfileRepository,
  ConversationRepository,
} from '../index';
import { ModuleType, ReviewStatus, ConversationStatus, UserStatus } from '../../types';
import { IUserDocument } from '../models/user.model';
import { IModuleDocument } from '../models/module.model';
import { IProfileDocument } from '../models/profile.model';
import { IConversationDocument } from '../models/conversation.model';

/**
 * Create sample users
 */
async function createSampleUsers(): Promise<IUserDocument[]> {
  console.log('Creating sample users...');
  const userRepo = new UserRepository();

  // Check if users already exist
  const existingUsers = await userRepo.find({});
  if (existingUsers.length > 0) {
    console.log(`Found ${existingUsers.length} existing users, skipping creation`);
    return existingUsers;
  }

  // Create admin user
  const adminUser = await userRepo.create({
    username: 'admin',
    email: 'admin@example.com',
    passwordHash: 'admin123', // In a real app, this would be hashed
    displayName: 'Administrator',
    status: UserStatus.ACTIVE,
    roles: [
      {
        name: 'admin',
        permissions: [
          { resource: '*', action: 'create' },
          { resource: '*', action: 'read' },
          { resource: '*', action: 'update' },
          { resource: '*', action: 'delete' },
          { resource: '*', action: 'execute' },
        ],
      },
    ],
  });

  // Create regular user
  const regularUser = await userRepo.create({
    username: 'user',
    email: 'user@example.com',
    passwordHash: 'user123', // In a real app, this would be hashed
    displayName: 'Regular User',
    status: UserStatus.ACTIVE,
    roles: [
      {
        name: 'user',
        permissions: [
          { resource: 'profile', action: 'create' },
          { resource: 'profile', action: 'read' },
          { resource: 'profile', action: 'update' },
          { resource: 'profile', action: 'delete' },
          { resource: 'conversation', action: 'create' },
          { resource: 'conversation', action: 'read' },
          { resource: 'conversation', action: 'update' },
          { resource: 'conversation', action: 'delete' },
        ],
      },
    ],
  });

  console.log(`Created ${2} sample users`);
  return [adminUser, regularUser];
}

/**
 * Create sample modules
 */
async function createSampleModules(users: IUserDocument[]): Promise<IModuleDocument[]> {
  console.log('Creating sample modules...');
  const moduleRepo = new ModuleRepository();

  // Check if modules already exist
  const existingModules = await moduleRepo.find({});
  if (existingModules.length > 0) {
    console.log(`Found ${existingModules.length} existing modules, skipping creation`);
    return existingModules;
  }

  const adminUser = users.find(u => u.username === 'admin');
  if (!adminUser) {
    throw new Error('Admin user not found');
  }

  // Create personality module
  const personalityModule = await moduleRepo.create({
    name: 'Helpful Assistant',
    description: 'A helpful and friendly assistant personality',
    version: '1.0.0',
    type: ModuleType.PERSONALITY,
    author: {
      id: adminUser._id,
      name: adminUser.displayName || adminUser.username,
    },
    requiresReview: false,
    reviewStatus: ReviewStatus.APPROVED,
    metadata: {
      schemaVersion: '1.0',
      license: 'MIT',
      tags: ['helpful', 'friendly', 'assistant'],
      dependencies: [],
      permissions: [],
      capabilities: [],
      compatibility: {
        minPlatformVersion: '1.0.0',
        targetPlatformVersion: '1.0.0',
        supportedProtocols: [],
        supportedModalities: ['text'],
      },
    },
    publishedAt: new Date(),
    installCount: 100,
    rating: 4.5,
    ratingCount: 20,
  });

  // Create tool module
  const toolModule = await moduleRepo.create({
    name: 'Weather Tool',
    description: 'A tool for checking the weather',
    version: '1.0.0',
    type: ModuleType.TOOL,
    author: {
      id: adminUser._id,
      name: adminUser.displayName || adminUser.username,
    },
    requiresReview: false,
    reviewStatus: ReviewStatus.APPROVED,
    metadata: {
      schemaVersion: '1.0',
      license: 'MIT',
      tags: ['weather', 'tool', 'utility'],
      dependencies: [],
      permissions: ['internet'],
      capabilities: [],
      compatibility: {
        minPlatformVersion: '1.0.0',
        targetPlatformVersion: '1.0.0',
        supportedProtocols: [],
        supportedModalities: ['text'],
      },
    },
    publishedAt: new Date(),
    installCount: 50,
    rating: 4.0,
    ratingCount: 10,
  });

  console.log(`Created ${2} sample modules`);
  return [personalityModule, toolModule];
}

/**
 * Create sample profiles
 */
async function createSampleProfiles(
  users: IUserDocument[],
  modules: IModuleDocument[]
): Promise<IProfileDocument[]> {
  console.log('Creating sample profiles...');
  const profileRepo = new ProfileRepository();

  // Check if profiles already exist
  const existingProfiles = await profileRepo.find({});
  if (existingProfiles.length > 0) {
    console.log(`Found ${existingProfiles.length} existing profiles, skipping creation`);
    return existingProfiles;
  }

  const regularUser = users.find(u => u.username === 'user');
  if (!regularUser) {
    throw new Error('Regular user not found');
  }

  const personalityModule = modules.find(m => m.type === ModuleType.PERSONALITY);
  const toolModule = modules.find(m => m.type === ModuleType.TOOL);

  if (!personalityModule || !toolModule) {
    throw new Error('Required modules not found');
  }

  // Create default profile
  const defaultProfile = await profileRepo.create({
    userId: regularUser._id,
    name: 'Default Profile',
    description: 'Default user profile',
    modules: [
      {
        moduleId: personalityModule._id,
        version: personalityModule.version,
        config: {},
        priority: 100,
        isActive: true,
      },
      {
        moduleId: toolModule._id,
        version: toolModule.version,
        config: {},
        priority: 90,
        isActive: true,
      },
    ],
    defaultModality: 'text',
    isDefault: true,
    tags: ['default'],
    isPublic: false,
    cloneCount: 0,
  });

  // Create another profile
  const customProfile = await profileRepo.create({
    userId: regularUser._id,
    name: 'Custom Profile',
    description: 'Custom user profile',
    modules: [
      {
        moduleId: personalityModule._id,
        version: personalityModule.version,
        config: {
          customPrompt: 'You are a very helpful assistant.',
        },
        priority: 100,
        isActive: true,
      },
    ],
    defaultModality: 'text',
    isDefault: false,
    tags: ['custom'],
    isPublic: true,
    cloneCount: 5,
  });

  console.log(`Created ${2} sample profiles`);
  return [defaultProfile, customProfile];
}

/**
 * Create sample conversations
 */
async function createSampleConversations(
  users: IUserDocument[],
  profiles: IProfileDocument[]
): Promise<IConversationDocument[]> {
  console.log('Creating sample conversations...');
  const conversationRepo = new ConversationRepository();

  // Check if conversations already exist
  const existingConversations = await conversationRepo.find({});
  if (existingConversations.length > 0) {
    console.log(`Found ${existingConversations.length} existing conversations, skipping creation`);
    return existingConversations;
  }

  const regularUser = users.find(u => u.username === 'user');
  if (!regularUser) {
    throw new Error('Regular user not found');
  }

  const defaultProfile = profiles.find(p => p.name === 'Default Profile');
  if (!defaultProfile) {
    throw new Error('Default profile not found');
  }

  // Create a conversation
  const conversation = await conversationRepo.create({
    title: 'Sample Conversation',
    userId: regularUser._id,
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
        timezone: 'America/New_York',
        locale: 'en-US',
        device: {
          type: 'desktop',
          capabilities: ['text'],
        },
        currentTime: new Date(),
      },
      customData: {},
    },
    activeModules: [],
    profile: defaultProfile._id,
    status: ConversationStatus.ACTIVE,
    pinned: false,
    sharedWith: [],
  });

  // Add messages to the conversation
  await conversationRepo.addMessage(conversation._id.toString(), {
    conversationId: conversation._id,
    role: 'user',
    content: [
      {
        type: 'text',
        value: 'Hello, how are you?',
      },
    ],
    createdAt: new Date(),
    metadata: {},
  });

  await conversationRepo.addMessage(conversation._id.toString(), {
    conversationId: conversation._id,
    role: 'assistant',
    content: [
      {
        type: 'text',
        value: "I'm doing well, thank you for asking! How can I help you today?",
      },
    ],
    createdAt: new Date(),
    metadata: {},
  });

  console.log(`Created ${1} sample conversation with ${2} messages`);
  return [conversation];
}

/**
 * Initialize sample data
 */
async function initSampleData() {
  try {
    console.log('Initializing sample data...');

    // Connect to database
    await connectDatabase();

    // Create sample data
    const users = await createSampleUsers();
    const modules = await createSampleModules(users);
    const profiles = await createSampleProfiles(users, modules);
    await createSampleConversations(users, profiles);

    console.log('Sample data initialization complete');
  } catch (error) {
    console.error('Error initializing sample data:', error);
    process.exit(1);
  } finally {
    // Disconnect from database
    await disconnectDatabase();
  }
}

// Run initialization if this script is executed directly
if (require.main === module) {
  initSampleData();
}

export { initSampleData };
