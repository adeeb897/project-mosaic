/**
 * Unit tests for User Service
 */

import mongoose from 'mongoose';
import { UserService } from '../../../src/services/user/user.service';
import { UserStatus } from '../../../src/types';
import { generateMockUser } from '../../utils/mock-data-generator';

// Mock dependencies
jest.mock('../../../src/persistence/database', () => ({
  getCollection: jest.fn().mockImplementation(() => ({
    findOne: jest.fn(),
    find: jest.fn().mockReturnThis(),
    insertOne: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
    toArray: jest.fn(),
  })),
}));

// Import mocked dependencies
import { getCollection } from '../../../src/persistence/database';

describe('UserService', () => {
  let userService: UserService;
  // Define a type for the mock collection
  interface MockCollection {
    findOne: jest.Mock;
    find: jest.Mock;
    insertOne: jest.Mock;
    updateOne: jest.Mock;
    deleteOne: jest.Mock;
    toArray: jest.Mock;
    [key: string]: unknown;
  }

  let mockCollection: MockCollection;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock collection
    mockCollection = {
      findOne: jest.fn(),
      find: jest.fn().mockReturnThis(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
      toArray: jest.fn(),
    };

    (getCollection as jest.Mock).mockReturnValue(mockCollection);

    // Create service instance
    userService = new UserService();
  });

  describe('getUser', () => {
    it('should return a user by ID', async () => {
      // Arrange
      const mockUser = generateMockUser();
      mockCollection.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await userService.getUser(mockUser.id);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockCollection.findOne).toHaveBeenCalledWith({ id: mockUser.id });
    });

    it('should throw an error if user is not found', async () => {
      // Arrange
      const userId = new mongoose.Types.ObjectId().toString();
      mockCollection.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.getUser(userId)).rejects.toThrow('User not found');
      expect(mockCollection.findOne).toHaveBeenCalledWith({ id: userId });
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      // Arrange
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      // Mock findOne to return null for username and email checks
      mockCollection.findOne
        .mockResolvedValueOnce(null) // Username check
        .mockResolvedValueOnce(null); // Email check

      const mockInsertResult = { insertedId: new mongoose.Types.ObjectId() };
      mockCollection.insertOne.mockResolvedValue(mockInsertResult);

      const mockCreatedUser = generateMockUser({
        id: mockInsertResult.insertedId.toString(),
        username: userData.username,
        email: userData.email,
      });

      // Mock findOne to return the created user when checking by ID
      mockCollection.findOne.mockResolvedValueOnce(mockCreatedUser);

      // Act
      const result = await userService.createUser(userData);

      // Assert
      expect(result).toEqual(mockCreatedUser);
      expect(mockCollection.insertOne).toHaveBeenCalled();
      expect(mockCollection.findOne).toHaveBeenCalledWith({ username: userData.username });
      expect(mockCollection.findOne).toHaveBeenCalledWith({ email: userData.email });
      expect(mockCollection.findOne).toHaveBeenCalledWith({
        id: mockInsertResult.insertedId.toString(),
      });
    });

    it('should throw an error if username already exists', async () => {
      // Arrange
      const userData = {
        username: 'existinguser',
        email: 'test@example.com',
        password: 'password123',
      };

      mockCollection.findOne.mockResolvedValue(generateMockUser({ username: userData.username }));

      // Act & Assert
      await expect(userService.createUser(userData)).rejects.toThrow('Username already exists');
    });

    it('should throw an error if email already exists', async () => {
      // Arrange
      const userData = {
        username: 'newuser',
        email: 'existing@example.com',
        password: 'password123',
      };

      // First findOne (username check) returns null
      // Second findOne (email check) returns a user
      mockCollection.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(generateMockUser({ email: userData.email }));

      // Act & Assert
      await expect(userService.createUser(userData)).rejects.toThrow('Email already exists');
    });
  });

  describe('updateUser', () => {
    it('should update an existing user', async () => {
      // Arrange
      const mockUser = generateMockUser();
      const updateData = {
        displayName: 'Updated Name',
        preferences: {
          theme: 'dark',
        },
      };

      mockCollection.findOne.mockResolvedValue(mockUser);
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const updatedUser = {
        ...mockUser,
        displayName: updateData.displayName,
        preferences: {
          ...mockUser.preferences,
          theme: updateData.preferences.theme,
        },
        updatedAt: expect.any(Date),
      };
      mockCollection.findOne.mockResolvedValueOnce(mockUser).mockResolvedValueOnce(updatedUser);

      // Act
      const result = await userService.updateUser(mockUser.id, updateData);

      // Assert
      expect(result).toEqual(updatedUser);
      expect(mockCollection.findOne).toHaveBeenCalledWith({ id: mockUser.id });
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { id: mockUser.id },
        expect.objectContaining({
          $set: expect.objectContaining({
            displayName: updateData.displayName,
            'preferences.theme': updateData.preferences.theme,
            updatedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should throw an error if user is not found', async () => {
      // Arrange
      const userId = new mongoose.Types.ObjectId().toString();
      const updateData = { displayName: 'Updated Name' };
      mockCollection.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.updateUser(userId, updateData)).rejects.toThrow('User not found');
    });
  });

  describe('deleteUser', () => {
    it('should mark a user as deleted', async () => {
      // Arrange
      const mockUser = generateMockUser();
      mockCollection.findOne.mockResolvedValue(mockUser);
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act
      const result = await userService.deleteUser(mockUser.id);

      // Assert
      expect(result).toBe(true);
      expect(mockCollection.findOne).toHaveBeenCalledWith({ id: mockUser.id });
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { id: mockUser.id },
        {
          $set: {
            status: UserStatus.DELETED,
            updatedAt: expect.any(Date),
          },
        }
      );
    });

    it('should throw an error if user is not found', async () => {
      // Arrange
      const userId = new mongoose.Types.ObjectId().toString();
      mockCollection.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.deleteUser(userId)).rejects.toThrow('User not found');
    });
  });

  describe('getUserByUsername', () => {
    it('should return a user by username', async () => {
      // Arrange
      const mockUser = generateMockUser();
      mockCollection.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await userService.getUserByUsername(mockUser.username);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockCollection.findOne).toHaveBeenCalledWith({ username: mockUser.username });
    });

    it('should return null if user is not found', async () => {
      // Arrange
      mockCollection.findOne.mockResolvedValue(null);

      // Act
      const result = await userService.getUserByUsername('nonexistentuser');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return a user by email', async () => {
      // Arrange
      const mockUser = generateMockUser();
      mockCollection.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await userService.getUserByEmail(mockUser.email);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockCollection.findOne).toHaveBeenCalledWith({ email: mockUser.email });
    });

    it('should return null if user is not found', async () => {
      // Arrange
      mockCollection.findOne.mockResolvedValue(null);

      // Act
      const result = await userService.getUserByEmail('nonexistent@example.com');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('listUsers', () => {
    it('should return a list of users with pagination', async () => {
      // Arrange
      const mockUsers = [generateMockUser(), generateMockUser(), generateMockUser()];
      mockCollection.toArray.mockResolvedValue(mockUsers);

      // Act
      const result = await userService.listUsers({ page: 1, limit: 10 });

      // Assert
      expect(result).toEqual(mockUsers);
      expect(mockCollection.find).toHaveBeenCalled();
      expect(mockCollection.toArray).toHaveBeenCalled();
    });

    it('should apply filters when provided', async () => {
      // Arrange
      const mockUsers = [generateMockUser({ status: UserStatus.ACTIVE })];
      mockCollection.toArray.mockResolvedValue(mockUsers);

      // Act
      const result = await userService.listUsers({
        status: UserStatus.ACTIVE,
        page: 1,
        limit: 10,
      });

      // Assert
      expect(result).toEqual(mockUsers);
      expect(mockCollection.find).toHaveBeenCalledWith({ status: UserStatus.ACTIVE });
    });
  });
});
