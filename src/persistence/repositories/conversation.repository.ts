/**
 * Conversation repository for Project Mosaic
 */
import { FilterQuery } from 'mongoose';
import { BaseRepository, IBaseRepository } from './base.repository';
import {
  IConversationDocument,
  IMessageDocument,
  Conversation,
  Message,
  IMessage,
  IConversationContext,
} from '../models/conversation.model';
import { ConversationStatus } from '../../types';

/**
 * Message repository interface
 */
export interface IMessageRepository extends IBaseRepository<IMessageDocument> {
  findByConversation(conversationId: string): Promise<IMessageDocument[]>;
  findByConversationAndRole(
    conversationId: string,
    role: 'user' | 'assistant' | 'system'
  ): Promise<IMessageDocument[]>;
  findLatestByConversation(conversationId: string, limit?: number): Promise<IMessageDocument[]>;
  createMessage(message: IMessage): Promise<IMessageDocument>;
}

/**
 * Conversation repository interface
 */
export interface IConversationRepository extends IBaseRepository<IConversationDocument> {
  findByUser(
    userId: string,
    filter?: FilterQuery<IConversationDocument>
  ): Promise<IConversationDocument[]>;
  findActiveByUser(userId: string): Promise<IConversationDocument[]>;
  findArchivedByUser(userId: string): Promise<IConversationDocument[]>;
  findPinnedByUser(userId: string): Promise<IConversationDocument[]>;
  findByFolder(userId: string, folderPath: string): Promise<IConversationDocument[]>;
  findSharedWithUser(userId: string): Promise<IConversationDocument[]>;
  findByProfile(userId: string, profileId: string): Promise<IConversationDocument[]>;
  searchConversations(userId: string, query: string): Promise<IConversationDocument[]>;
  addMessage(conversationId: string, message: IMessage): Promise<IMessageDocument>;
  updateContext(
    conversationId: string,
    contextUpdates: Partial<IConversationContext>
  ): Promise<IConversationDocument | null>;
  archiveConversation(conversationId: string): Promise<IConversationDocument | null>;
  deleteConversation(conversationId: string): Promise<IConversationDocument | null>;
  pinConversation(conversationId: string, pinned: boolean): Promise<IConversationDocument | null>;
  moveToFolder(conversationId: string, folderPath: string): Promise<IConversationDocument | null>;
  shareConversation(
    conversationId: string,
    userIds: string[]
  ): Promise<IConversationDocument | null>;
  unshareConversation(
    conversationId: string,
    userId: string
  ): Promise<IConversationDocument | null>;
}

/**
 * Message repository implementation
 */
export class MessageRepository
  extends BaseRepository<IMessageDocument>
  implements IMessageRepository
{
  /**
   * Constructor
   */
  constructor() {
    super(Message);
  }

  /**
   * Find messages by conversation
   *
   * @param conversationId The conversation ID
   * @returns An array of messages
   */
  async findByConversation(conversationId: string): Promise<IMessageDocument[]> {
    return this.find({ conversationId });
  }

  /**
   * Find messages by conversation and role
   *
   * @param conversationId The conversation ID
   * @param role The message role
   * @returns An array of messages
   */
  async findByConversationAndRole(
    conversationId: string,
    role: 'user' | 'assistant' | 'system'
  ): Promise<IMessageDocument[]> {
    return this.find({ conversationId, role });
  }

  /**
   * Find latest messages by conversation
   *
   * @param conversationId The conversation ID
   * @param limit The maximum number of messages to return
   * @returns An array of messages
   */
  async findLatestByConversation(
    conversationId: string,
    limit: number = 10
  ): Promise<IMessageDocument[]> {
    const result = await this.model.find({ conversationId }).sort({ createdAt: -1 }).limit(limit);
    return result;
  }

  /**
   * Create a new message
   *
   * @param message The message data
   * @returns The created message
   */
  async createMessage(message: IMessage): Promise<IMessageDocument> {
    return this.create(message);
  }
}

/**
 * Conversation repository implementation
 */
export class ConversationRepository
  extends BaseRepository<IConversationDocument>
  implements IConversationRepository
{
  private messageRepository: IMessageRepository;

  /**
   * Constructor
   *
   * @param messageRepository The message repository
   */
  constructor(messageRepository?: IMessageRepository) {
    super(Conversation);
    this.messageRepository = messageRepository || new MessageRepository();
  }

  /**
   * Find conversations by user
   *
   * @param userId The user ID
   * @param filter Additional filter criteria
   * @returns An array of conversations
   */
  async findByUser(
    userId: string,
    filter: FilterQuery<IConversationDocument> = {}
  ): Promise<IConversationDocument[]> {
    return this.find({
      ...filter,
      userId,
    });
  }

  /**
   * Find active conversations by user
   *
   * @param userId The user ID
   * @returns An array of active conversations
   */
  async findActiveByUser(userId: string): Promise<IConversationDocument[]> {
    return this.find({
      userId,
      status: ConversationStatus.ACTIVE,
    });
  }

  /**
   * Find archived conversations by user
   *
   * @param userId The user ID
   * @returns An array of archived conversations
   */
  async findArchivedByUser(userId: string): Promise<IConversationDocument[]> {
    return this.find({
      userId,
      status: ConversationStatus.ARCHIVED,
    });
  }

  /**
   * Find pinned conversations by user
   *
   * @param userId The user ID
   * @returns An array of pinned conversations
   */
  async findPinnedByUser(userId: string): Promise<IConversationDocument[]> {
    return this.find({
      userId,
      pinned: true,
      status: ConversationStatus.ACTIVE,
    });
  }

  /**
   * Find conversations by folder
   *
   * @param userId The user ID
   * @param folderPath The folder path
   * @returns An array of conversations
   */
  async findByFolder(userId: string, folderPath: string): Promise<IConversationDocument[]> {
    return this.find({
      userId,
      folderPath,
      status: { $ne: ConversationStatus.DELETED },
    });
  }

  /**
   * Find conversations shared with a user
   *
   * @param userId The user ID
   * @returns An array of conversations
   */
  async findSharedWithUser(userId: string): Promise<IConversationDocument[]> {
    return this.find({
      sharedWith: userId,
      status: { $ne: ConversationStatus.DELETED },
    });
  }

  /**
   * Find conversations by profile
   *
   * @param userId The user ID
   * @param profileId The profile ID
   * @returns An array of conversations
   */
  async findByProfile(userId: string, profileId: string): Promise<IConversationDocument[]> {
    return this.find({
      userId,
      profile: profileId,
      status: { $ne: ConversationStatus.DELETED },
    });
  }

  /**
   * Search conversations by text query
   *
   * @param userId The user ID
   * @param query The search query
   * @returns An array of conversations
   */
  async searchConversations(userId: string, query: string): Promise<IConversationDocument[]> {
    return this.model.find({
      userId,
      $text: { $search: query },
      status: { $ne: ConversationStatus.DELETED },
    });
  }

  /**
   * Add a message to a conversation
   *
   * @param conversationId The conversation ID
   * @param message The message data
   * @returns The created message
   */
  async addMessage(conversationId: string, message: IMessage): Promise<IMessageDocument> {
    const conversation = await this.findById(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    return conversation.addMessage(message);
  }

  /**
   * Update a conversation's context
   *
   * @param conversationId The conversation ID
   * @param contextUpdates The context updates
   * @returns The updated conversation or null if not found
   */
  async updateContext(
    conversationId: string,
    contextUpdates: Partial<IConversationContext>
  ): Promise<IConversationDocument | null> {
    const conversation = await this.findById(conversationId);
    if (!conversation) {
      return null;
    }

    await conversation.updateContext(contextUpdates);
    return conversation;
  }

  /**
   * Archive a conversation
   *
   * @param conversationId The conversation ID
   * @returns The updated conversation or null if not found
   */
  async archiveConversation(conversationId: string): Promise<IConversationDocument | null> {
    const conversation = await this.findById(conversationId);
    if (!conversation) {
      return null;
    }

    await conversation.archive();
    return conversation;
  }

  /**
   * Delete a conversation
   *
   * @param conversationId The conversation ID
   * @returns The updated conversation or null if not found
   */
  async deleteConversation(conversationId: string): Promise<IConversationDocument | null> {
    const conversation = await this.findById(conversationId);
    if (!conversation) {
      return null;
    }

    await conversation.delete();
    return conversation;
  }

  /**
   * Pin or unpin a conversation
   *
   * @param conversationId The conversation ID
   * @param pinned Whether to pin or unpin the conversation
   * @returns The updated conversation or null if not found
   */
  async pinConversation(
    conversationId: string,
    pinned: boolean
  ): Promise<IConversationDocument | null> {
    return this.updateById(conversationId, { pinned });
  }

  /**
   * Move a conversation to a folder
   *
   * @param conversationId The conversation ID
   * @param folderPath The folder path
   * @returns The updated conversation or null if not found
   */
  async moveToFolder(
    conversationId: string,
    folderPath: string
  ): Promise<IConversationDocument | null> {
    return this.updateById(conversationId, { folderPath });
  }

  /**
   * Share a conversation with users
   *
   * @param conversationId The conversation ID
   * @param userIds The user IDs to share with
   * @returns The updated conversation or null if not found
   */
  async shareConversation(
    conversationId: string,
    userIds: string[]
  ): Promise<IConversationDocument | null> {
    return this.updateById(conversationId, {
      $addToSet: { sharedWith: { $each: userIds } },
    });
  }

  /**
   * Unshare a conversation with a user
   *
   * @param conversationId The conversation ID
   * @param userId The user ID to unshare with
   * @returns The updated conversation or null if not found
   */
  async unshareConversation(
    conversationId: string,
    userId: string
  ): Promise<IConversationDocument | null> {
    return this.updateById(conversationId, {
      $pull: { sharedWith: userId },
    });
  }
}
