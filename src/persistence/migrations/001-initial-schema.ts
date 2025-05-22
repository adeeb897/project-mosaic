/**
 * Initial schema migration for Project Mosaic
 *
 * This migration sets up the initial database schema.
 */
import { IMigration } from './migration';
import { getDatabaseService } from '../database.service';

/**
 * Initial schema migration
 */
export const InitialSchemaMigration: IMigration = {
  version: 1,
  name: 'initial-schema',
  description: 'Initial database schema setup',

  /**
   * Apply the migration
   */
  async up(): Promise<void> {
    const mongoose = getDatabaseService().getMongoose();
    const db = mongoose.connection.db;

    console.log('Creating indexes for User collection...');
    await db
      .collection('users')
      .createIndexes([
        { key: { username: 1 }, unique: true },
        { key: { email: 1 }, unique: true },
        { key: { status: 1 } },
        { key: { 'roles.name': 1 } },
        { key: { createdAt: 1 } },
        { key: { updatedAt: 1 } },
      ]);

    console.log('Creating indexes for Module collection...');
    await db
      .collection('modules')
      .createIndexes([
        { key: { name: 1 } },
        { key: { 'author.id': 1 } },
        { key: { type: 1 } },
        { key: { 'metadata.tags': 1 } },
        { key: { reviewStatus: 1 } },
        { key: { installCount: -1 } },
        { key: { rating: -1 } },
        { key: { createdAt: -1 } },
        { key: { publishedAt: -1 } },
        { key: { name: 'text', description: 'text' } },
        { key: { type: 1, reviewStatus: 1 } },
        { key: { type: 1, 'metadata.tags': 1 } },
        { key: { type: 1, rating: -1 } },
        { key: { type: 1, installCount: -1 } },
      ]);

    console.log('Creating indexes for Message collection...');
    await db
      .collection('messages')
      .createIndexes([
        { key: { conversationId: 1, createdAt: 1 } },
        { key: { role: 1 } },
        { key: { createdAt: 1 } },
        { key: { 'metadata.sourceModules': 1 } },
        { key: { 'content.type': 1 } },
      ]);

    console.log('Creating indexes for Conversation collection...');
    await db
      .collection('conversations')
      .createIndexes([
        { key: { userId: 1, createdAt: -1 } },
        { key: { userId: 1, status: 1 } },
        { key: { userId: 1, pinned: -1, lastMessageAt: -1 } },
        { key: { profile: 1 } },
        { key: { status: 1 } },
        { key: { lastMessageAt: -1 } },
        { key: { folderPath: 1 } },
        { key: { sharedWith: 1 } },
        { key: { title: 'text' } },
        { key: { userId: 1, folderPath: 1 } },
        { key: { userId: 1, activeModules: 1 } },
      ]);

    console.log('Creating indexes for Profile collection...');
    await db
      .collection('profiles')
      .createIndexes([
        { key: { userId: 1, name: 1 }, unique: true },
        { key: { userId: 1, isDefault: 1 } },
        { key: { userId: 1, createdAt: -1 } },
        { key: { userId: 1, lastUsed: -1 } },
        { key: { shareCode: 1 }, unique: true, sparse: true },
        { key: { isPublic: 1 } },
        { key: { tags: 1 } },
        { key: { clonedFrom: 1 } },
        { key: { name: 'text', description: 'text', tags: 'text' } },
        { key: { userId: 1, 'modules.moduleId': 1 } },
        { key: { isPublic: 1, cloneCount: -1 } },
      ]);

    console.log('Initial schema setup complete');
  },

  /**
   * Rollback the migration
   */
  async down(): Promise<void> {
    const mongoose = getDatabaseService().getMongoose();
    const db = mongoose.connection.db;

    console.log('Dropping indexes for User collection...');
    await db.collection('users').dropIndexes();

    console.log('Dropping indexes for Module collection...');
    await db.collection('modules').dropIndexes();

    console.log('Dropping indexes for Message collection...');
    await db.collection('messages').dropIndexes();

    console.log('Dropping indexes for Conversation collection...');
    await db.collection('conversations').dropIndexes();

    console.log('Dropping indexes for Profile collection...');
    await db.collection('profiles').dropIndexes();

    console.log('Index rollback complete');
  },
};
