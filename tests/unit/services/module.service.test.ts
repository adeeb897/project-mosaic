/**
 * Unit tests for Module Service
 */

import {
  getModuleService,
  resetModuleService,
  Module,
  ModuleType,
} from '../../../src/services/module/module.service';

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('ModuleService', () => {
  const moduleService = getModuleService();
  let testModule: Module;

  beforeEach(async () => {
    // Reset the module service before each test
    resetModuleService();

    // Create a test module for each test
    testModule = await moduleService.install({
      name: 'Test Module',
      description: 'Test module description',
      version: '1.0.0',
      type: ModuleType.TOOL,
      author: 'Test Author',
      config: { key: 'value' },
    });
  });

  describe('findAll', () => {
    it('should return all modules', async () => {
      // Arrange - create another module
      await moduleService.install({
        name: 'Another Module',
        type: ModuleType.PERSONALITY,
      });

      // Act
      const modules = await moduleService.findAll();

      // Assert
      expect(modules.length).toBeGreaterThanOrEqual(2);
      expect(modules.some(m => m.id === testModule.id)).toBe(true);
    });
  });

  describe('findById', () => {
    it('should return a module by ID', async () => {
      // Act
      const module = await moduleService.findById(testModule.id);

      // Assert
      expect(module).toEqual(testModule);
    });

    it('should return null for non-existent module', async () => {
      // Act
      const module = await moduleService.findById('non-existent-module');

      // Assert
      expect(module).toBeNull();
    });
  });

  describe('findByType', () => {
    it('should return modules of a specific type', async () => {
      // Arrange - create modules of different types
      await moduleService.install({
        name: 'Personality Module',
        type: ModuleType.PERSONALITY,
      });
      await moduleService.install({
        name: 'Agent Module',
        type: ModuleType.AGENT,
      });
      await moduleService.install({
        name: 'Another Tool Module',
        type: ModuleType.TOOL,
      });

      // Act
      const toolModules = await moduleService.findByType(ModuleType.TOOL);
      const personalityModules = await moduleService.findByType(ModuleType.PERSONALITY);
      const agentModules = await moduleService.findByType(ModuleType.AGENT);
      const modalityModules = await moduleService.findByType(ModuleType.MODALITY);

      // Assert
      expect(toolModules.length).toBeGreaterThanOrEqual(2);
      expect(personalityModules.length).toBeGreaterThanOrEqual(1);
      expect(agentModules.length).toBeGreaterThanOrEqual(1);
      expect(modalityModules.length).toBe(0);
      expect(toolModules.every(m => m.type === ModuleType.TOOL)).toBe(true);
      expect(personalityModules.every(m => m.type === ModuleType.PERSONALITY)).toBe(true);
      expect(agentModules.every(m => m.type === ModuleType.AGENT)).toBe(true);
    });

    it('should return empty array for type with no modules', async () => {
      // Act
      const modules = await moduleService.findByType(ModuleType.MODALITY);

      // Assert
      expect(modules).toEqual([]);
    });
  });

  describe('install', () => {
    it('should install a module with provided data', async () => {
      // Arrange
      const moduleData = {
        name: 'New Module',
        description: 'New module description',
        version: '2.0.0',
        type: ModuleType.AGENT,
        author: 'New Author',
        config: { theme: 'dark' },
      };

      // Act
      const module = await moduleService.install(moduleData);

      // Assert
      expect(module.name).toBe(moduleData.name);
      expect(module.description).toBe(moduleData.description);
      expect(module.version).toBe(moduleData.version);
      expect(module.type).toBe(moduleData.type);
      expect(module.author).toBe(moduleData.author);
      expect(module.config).toEqual(moduleData.config);
      expect(module.enabled).toBe(true);
      expect(module.id).toBeDefined();
    });

    it('should install a module with default values if not provided', async () => {
      // Act
      const module = await moduleService.install({});

      // Assert
      expect(module.name).toBe('Unnamed Module');
      expect(module.description).toBe('');
      expect(module.version).toBe('1.0.0');
      expect(module.type).toBe(ModuleType.TOOL);
      expect(module.author).toBe('Unknown');
      expect(module.config).toEqual({});
      expect(module.enabled).toBe(true);
      expect(module.id).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update a module', async () => {
      // Arrange
      const updateData = {
        name: 'Updated Module',
        description: 'Updated description',
        version: '1.1.0',
        author: 'Updated Author',
        config: { theme: 'dark' },
      };

      // Act
      const updatedModule = await moduleService.update(testModule.id, updateData);

      // Assert
      expect(updatedModule).not.toBeNull();
      expect(updatedModule?.name).toBe(updateData.name);
      expect(updatedModule?.description).toBe(updateData.description);
      expect(updatedModule?.version).toBe(updateData.version);
      expect(updatedModule?.author).toBe(updateData.author);
      expect(updatedModule?.config).toEqual(updateData.config);
      expect(updatedModule?.type).toBe(testModule.type); // Type should not change
      expect(updatedModule?.enabled).toBe(testModule.enabled); // Enabled should not change
    });

    it('should return null when updating non-existent module', async () => {
      // Act
      const result = await moduleService.update('non-existent-module', { name: 'New Name' });

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('uninstall', () => {
    it('should uninstall a module and verify it returns true', async () => {
      // Create a new module specifically for this test
      const moduleToUninstall = await moduleService.install({ name: 'Module To Uninstall' });

      // Act
      const result = await moduleService.uninstall(moduleToUninstall.id);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when uninstalling non-existent module', async () => {
      // Act
      const result = await moduleService.uninstall('non-existent-module');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('enable', () => {
    it('should enable a disabled module', async () => {
      // Arrange - first disable the module
      await moduleService.disable(testModule.id);
      const disabledModule = await moduleService.findById(testModule.id);
      expect(disabledModule?.enabled).toBe(false);

      // Act
      const result = await moduleService.enable(testModule.id);
      const enabledModule = await moduleService.findById(testModule.id);

      // Assert
      expect(result).toBe(true);
      expect(enabledModule?.enabled).toBe(true);
    });

    it('should return false when enabling non-existent module', async () => {
      // Act
      const result = await moduleService.enable('non-existent-module');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('disable', () => {
    it('should disable an enabled module', async () => {
      // Act
      const result = await moduleService.disable(testModule.id);
      const disabledModule = await moduleService.findById(testModule.id);

      // Assert
      expect(result).toBe(true);
      expect(disabledModule?.enabled).toBe(false);
    });

    it('should return false when disabling non-existent module', async () => {
      // Act
      const result = await moduleService.disable('non-existent-module');

      // Assert
      expect(result).toBe(false);
    });
  });
});
