/**
 * User repository for Project Mosaic
 */
import { FilterQuery } from 'mongoose';
import { BaseRepository, IBaseRepository } from './base.repository';
import { IUserDocument, User } from '../models/user.model';

/**
 * User repository interface
 */
export interface IUserRepository extends IBaseRepository<IUserDocument> {
  findByUsername(username: string): Promise<IUserDocument | null>;
  findByEmail(email: string): Promise<IUserDocument | null>;
  findByVerificationToken(token: string): Promise<IUserDocument | null>;
  findByResetPasswordToken(token: string): Promise<IUserDocument | null>;
  updatePassword(userId: string, passwordHash: string): Promise<IUserDocument | null>;
  updateLastLogin(userId: string): Promise<void>;
  incrementFailedLoginAttempts(userId: string): Promise<number>;
  resetFailedLoginAttempts(userId: string): Promise<void>;
  lockAccount(userId: string, lockUntil: Date): Promise<void>;
  findActiveUsers(filter?: FilterQuery<IUserDocument>): Promise<IUserDocument[]>;
}

/**
 * User repository implementation
 */
export class UserRepository extends BaseRepository<IUserDocument> implements IUserRepository {
  /**
   * Constructor
   */
  constructor() {
    super(User);
  }

  /**
   * Find a user by username
   *
   * @param username The username
   * @returns The user or null if not found
   */
  async findByUsername(username: string): Promise<IUserDocument | null> {
    return this.findOne({ username });
  }

  /**
   * Find a user by email
   *
   * @param email The email
   * @returns The user or null if not found
   */
  async findByEmail(email: string): Promise<IUserDocument | null> {
    return this.findOne({ email });
  }

  /**
   * Find a user by verification token
   *
   * @param token The verification token
   * @returns The user or null if not found
   */
  async findByVerificationToken(token: string): Promise<IUserDocument | null> {
    return this.findOne({ verificationToken: token });
  }

  /**
   * Find a user by reset password token
   *
   * @param token The reset password token
   * @returns The user or null if not found
   */
  async findByResetPasswordToken(token: string): Promise<IUserDocument | null> {
    return this.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });
  }

  /**
   * Update a user's password
   *
   * @param userId The user ID
   * @param passwordHash The new password hash
   * @returns The updated user or null if not found
   */
  async updatePassword(userId: string, passwordHash: string): Promise<IUserDocument | null> {
    return this.updateById(userId, {
      passwordHash,
      resetPasswordToken: undefined,
      resetPasswordExpires: undefined,
      failedLoginAttempts: 0,
      lockUntil: undefined,
    });
  }

  /**
   * Update a user's last login timestamp
   *
   * @param userId The user ID
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.updateById(userId, {
      lastLoginAt: new Date(),
      failedLoginAttempts: 0,
      lockUntil: undefined,
    });
  }

  /**
   * Increment a user's failed login attempts
   *
   * @param userId The user ID
   * @returns The new number of failed login attempts
   */
  async incrementFailedLoginAttempts(userId: string): Promise<number> {
    const user = await this.updateById(userId, {
      $inc: { failedLoginAttempts: 1 },
    });

    return user?.failedLoginAttempts || 0;
  }

  /**
   * Reset a user's failed login attempts
   *
   * @param userId The user ID
   */
  async resetFailedLoginAttempts(userId: string): Promise<void> {
    await this.updateById(userId, {
      failedLoginAttempts: 0,
      lockUntil: undefined,
    });
  }

  /**
   * Lock a user's account
   *
   * @param userId The user ID
   * @param lockUntil The date until which the account is locked
   */
  async lockAccount(userId: string, lockUntil: Date): Promise<void> {
    await this.updateById(userId, { lockUntil });
  }

  /**
   * Find active users
   *
   * @param filter Additional filter criteria
   * @returns An array of active users
   */
  async findActiveUsers(filter: FilterQuery<IUserDocument> = {}): Promise<IUserDocument[]> {
    return this.find({
      ...filter,
      status: 'active',
    });
  }
}
