/**
 * Unit tests for Profile Service
 */

import { getProfileService, Profile } from '../../../src/services/profile/profile.service';
import { ModuleType } from '../../../src/services/module/module.service';

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('ProfileService', () => {
  const profileService = getProfileService();
  const userId = 'test-user-id';
  let testProfile: Profile;

  beforeEach(async () => {
    // Create a test profile for each test
    testProfile = await profileService.create(userId, {
      name: 'Test Profile',
      description: 'Test profile description',
      modules: {
        personality: ['personality-1'],
        tools: ['tool-1', 'tool-2'],
        agents: ['agent-1'],
        modalities: ['modality-1'],
      },
      config: { key: 'value' },
    });
  });

  describe('findAll', () => {
    it('should return all profiles for a user', async () => {
      // Arrange - create another profile
      await profileService.create(userId, { name: 'Another Profile' });

      // Act
      const profiles = await profileService.findAll(userId);

      // Assert
      expect(profiles.length).toBeGreaterThanOrEqual(2);
      expect(profiles.some(p => p.id === testProfile.id)).toBe(true);
      expect(profiles.every(p => p.userId === userId)).toBe(true);
    });

    it('should return empty array for user with no profiles', async () => {
      // Act
      const profiles = await profileService.findAll('non-existent-user');

      // Assert
      expect(profiles).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return a profile by ID', async () => {
      // Act
      const profile = await profileService.findById(testProfile.id);

      // Assert
      expect(profile).toEqual(testProfile);
    });

    it('should return null for non-existent profile', async () => {
      // Act
      const profile = await profileService.findById('non-existent-profile');

      // Assert
      expect(profile).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a profile with provided data', async () => {
      // Arrange
      const profileData = {
        name: 'New Profile',
        description: 'New profile description',
        modules: {
          personality: ['personality-2'],
          tools: ['tool-3'],
          agents: [],
          modalities: ['modality-2'],
        },
        config: { theme: 'dark' },
      };

      // Act
      const profile = await profileService.create(userId, profileData);

      // Assert
      expect(profile.userId).toBe(userId);
      expect(profile.name).toBe(profileData.name);
      expect(profile.description).toBe(profileData.description);
      expect(profile.modules.personality).toEqual(profileData.modules.personality);
      expect(profile.modules.tools).toEqual(profileData.modules.tools);
      expect(profile.modules.agents).toEqual(profileData.modules.agents);
      expect(profile.modules.modalities).toEqual(profileData.modules.modalities);
      expect(profile.config).toEqual(profileData.config);
      expect(profile.isDefault).toBe(false);
      expect(profile.id).toBeDefined();
      expect(profile.createdAt).toBeInstanceOf(Date);
      expect(profile.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a profile with default values if not provided', async () => {
      // Act
      const profile = await profileService.create(userId, {});

      // Assert
      expect(profile.userId).toBe(userId);
      expect(profile.name).toBe('New Assistant');
      expect(profile.description).toBe('');
      expect(profile.modules.personality).toEqual([]);
      expect(profile.modules.tools).toEqual([]);
      expect(profile.modules.agents).toEqual([]);
      expect(profile.modules.modalities).toEqual([]);
      expect(profile.config).toEqual({});
      expect(profile.isDefault).toBe(false);
    });

    it('should unset other default profiles when creating a default profile', async () => {
      // Arrange
      const defaultProfile = await profileService.create(userId, { isDefault: true });

      // Act
      const newDefaultProfile = await profileService.create(userId, { isDefault: true });
      const updatedOldDefault = await profileService.findById(defaultProfile.id);

      // Assert
      expect(newDefaultProfile.isDefault).toBe(true);
      expect(updatedOldDefault?.isDefault).toBe(false);
    });
  });

  describe('update', () => {
    it('should update a profile', async () => {
      // Arrange
      const updateData = {
        name: 'Updated Profile',
        description: 'Updated description',
        config: { theme: 'dark' },
      };

      // Act
      const updatedProfile = await profileService.update(testProfile.id, updateData);

      // Assert
      expect(updatedProfile).not.toBeNull();
      expect(updatedProfile?.name).toBe(updateData.name);
      expect(updatedProfile?.description).toBe(updateData.description);
      expect(updatedProfile?.config).toEqual(updateData.config);
      expect(updatedProfile?.updatedAt.getTime()).toBeGreaterThanOrEqual(
        testProfile.updatedAt.getTime()
      );
    });

    it('should return null when updating non-existent profile', async () => {
      // Act
      const result = await profileService.update('non-existent-profile', { name: 'New Name' });

      // Assert
      expect(result).toBeNull();
    });

    it('should update a profile to be default', async () => {
      // Act
      const updatedProfile = await profileService.update(testProfile.id, { isDefault: true });

      // Assert
      expect(updatedProfile?.isDefault).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete a profile and verify it returns true', async () => {
      // Create a new profile specifically for this test
      const profileToDelete = await profileService.create(userId, { name: 'Profile To Delete' });

      // Act
      const result = await profileService.delete(profileToDelete.id);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when deleting non-existent profile', async () => {
      // Act
      const result = await profileService.delete('non-existent-profile');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('setDefault', () => {
    it('should set a profile as default', async () => {
      // Act
      const result = await profileService.setDefault(testProfile.id, userId);
      const updatedProfile = await profileService.findById(testProfile.id);

      // Assert
      expect(result).toBe(true);
      expect(updatedProfile?.isDefault).toBe(true);
    });

    it('should set a profile as default and verify it is default', async () => {
      // Act
      await profileService.setDefault(testProfile.id, userId);
      const updatedProfile = await profileService.findById(testProfile.id);

      // Assert
      expect(updatedProfile?.isDefault).toBe(true);
    });

    it('should return false when setting non-existent profile as default', async () => {
      // Act
      const result = await profileService.setDefault('non-existent-profile', userId);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when setting profile of different user as default', async () => {
      // Act
      const result = await profileService.setDefault(testProfile.id, 'different-user');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('addModule', () => {
    it('should add a module to a profile', async () => {
      // Arrange
      const moduleId = 'new-tool';
      const moduleType = ModuleType.TOOL;

      // Act
      const result = await profileService.addModule(testProfile.id, moduleId, moduleType);
      const updatedProfile = await profileService.findById(testProfile.id);

      // Assert
      expect(result).toBe(true);
      expect(updatedProfile?.modules.tools).toContain(moduleId);
    });

    it('should verify that duplicate modules are not added twice', async () => {
      // Create a completely new profile for this test
      const uniqueProfile = await profileService.create('unique-user-id', {
        name: 'Unique Profile',
        modules: {
          personality: [],
          tools: [],
          agents: [],
          modalities: [],
        },
      });

      // First, add a module
      const moduleId = 'unique-tool';
      const moduleType = ModuleType.TOOL;
      await profileService.addModule(uniqueProfile.id, moduleId, moduleType);

      // Now try to add the same module again
      const result = await profileService.addModule(uniqueProfile.id, moduleId, moduleType);
      const updatedProfile = await profileService.findById(uniqueProfile.id);

      // Assert
      expect(result).toBe(true);
      expect(updatedProfile?.modules.tools).toContain(moduleId);
      expect(updatedProfile?.modules.tools.filter(id => id === moduleId).length).toBe(1);
    });

    it('should return false when adding module to non-existent profile', async () => {
      // Act
      const result = await profileService.addModule(
        'non-existent-profile',
        'module-id',
        ModuleType.TOOL
      );

      // Assert
      expect(result).toBe(false);
    });

    it('should add modules of different types correctly', async () => {
      // Arrange
      const personalityId = 'new-personality';
      const agentId = 'new-agent';
      const modalityId = 'new-modality';

      // Act
      await profileService.addModule(testProfile.id, personalityId, ModuleType.PERSONALITY);
      await profileService.addModule(testProfile.id, agentId, ModuleType.AGENT);
      await profileService.addModule(testProfile.id, modalityId, ModuleType.MODALITY);
      const updatedProfile = await profileService.findById(testProfile.id);

      // Assert
      expect(updatedProfile?.modules.personality).toContain(personalityId);
      expect(updatedProfile?.modules.agents).toContain(agentId);
      expect(updatedProfile?.modules.modalities).toContain(modalityId);
    });
  });

  describe('removeModule', () => {
    it('should remove a module from a profile', async () => {
      // Arrange
      const moduleId = testProfile.modules.tools[0];
      const moduleType = ModuleType.TOOL;

      // Act
      const result = await profileService.removeModule(testProfile.id, moduleId, moduleType);
      const updatedProfile = await profileService.findById(testProfile.id);

      // Assert
      expect(result).toBe(true);
      expect(updatedProfile?.modules.tools).not.toContain(moduleId);
    });

    it('should return false when removing module from non-existent profile', async () => {
      // Act
      const result = await profileService.removeModule(
        'non-existent-profile',
        'module-id',
        ModuleType.TOOL
      );

      // Assert
      expect(result).toBe(false);
    });

    it('should remove modules of different types correctly', async () => {
      // Arrange
      const personalityId = testProfile.modules.personality?.[0] || '';
      const agentId = testProfile.modules.agents[0];
      const modalityId = testProfile.modules.modalities[0];

      // Act
      await profileService.removeModule(testProfile.id, personalityId, ModuleType.PERSONALITY);
      await profileService.removeModule(testProfile.id, agentId, ModuleType.AGENT);
      await profileService.removeModule(testProfile.id, modalityId, ModuleType.MODALITY);
      const updatedProfile = await profileService.findById(testProfile.id);

      // Assert
      expect(updatedProfile?.modules.personality).not.toContain(personalityId);
      expect(updatedProfile?.modules.agents).not.toContain(agentId);
      expect(updatedProfile?.modules.modalities).not.toContain(modalityId);
    });
  });

  describe('getModules', () => {
    it('should return modules for a profile', async () => {
      // Act
      const modules = await profileService.getModules(testProfile.id);

      // Assert
      expect(modules).toBeDefined();
      expect(modules[ModuleType.PERSONALITY]).toBeDefined();
      expect(modules[ModuleType.TOOL]).toBeDefined();
      expect(modules[ModuleType.AGENT]).toBeDefined();
      expect(modules[ModuleType.MODALITY]).toBeDefined();
    });
  });
});
