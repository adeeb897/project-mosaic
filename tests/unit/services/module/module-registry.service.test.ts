import { ModuleRegistryService } from '../../../../src/services/module/module-registry.service';
import { ModuleType } from '../../../../src/core/types/ModuleTypes';
import { ModuleStatus, ReviewStatus } from '../../../../src/core/models/Module';
import { ModuleModel, ModuleVersionModel } from '../../../../src/persistence/models/module.model';
import semver from 'semver';
import { after } from 'node:test';

// Mock the logger
jest.mock('../../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('ModuleRegistryService', () => {
  let moduleRegistry: ModuleRegistryService;
  let mockModule: any;
  let mockVersion: any;
  let mockInstallation: any;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    moduleRegistry = new ModuleRegistryService();

    // Setup mock data
    mockModule = {
      _id: 'module-123',
      id: 'module-123',
      name: 'Test Module',
      description: 'A test module',
      version: '1.0.0',
      type: ModuleType.TOOL,
      author: {
        id: 'author-123',
        name: 'Test Author',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      requiresReview: true,
      reviewStatus: ReviewStatus.PENDING,
      status: ModuleStatus.INACTIVE,
      metadata: {
        schemaVersion: '1.0',
        license: 'MIT',
        tags: ['test'],
        dependencies: [],
        permissions: [],
        capabilities: [],
        compatibility: {
          minPlatformVersion: '1.0.0',
          targetPlatformVersion: '1.0.0',
          supportedProtocols: [],
          supportedModalities: [],
        },
      },
      save: jest.fn().mockResolvedValue(mockModule),
      toObject: jest.fn().mockReturnValue(mockModule),
    };

    mockVersion = {
      _id: 'version-123',
      id: 'version-123',
      moduleId: 'module-123',
      version: '1.0.0',
      releaseNotes: 'Initial release',
      createdAt: new Date(),
      metadata: mockModule.metadata,
      checksum: 'abc123',
      downloadUrl: 'https://example.com/module.zip',
      deprecated: false,
      yanked: false,
      save: jest.fn().mockResolvedValue(mockVersion),
      toObject: jest.fn().mockReturnValue(mockVersion),
    };

    mockInstallation = {
      _id: 'installation-123',
      id: 'installation-123',
      userId: 'user-123',
      moduleId: 'module-123',
      version: '1.0.0',
      installedAt: new Date(),
      updatedAt: new Date(),
      enabled: true,
      config: {},
      profileIds: [],
      save: jest.fn().mockResolvedValue(mockInstallation),
      toObject: jest.fn().mockReturnValue(mockInstallation),
    };

    // Setup mock implementations
    jest.spyOn(ModuleModel, 'findById').mockResolvedValue(mockModule);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('registerModule', () => {
    it('should register a new module', async () => {
      // Setup
      jest.spyOn(ModuleModel, 'findOne').mockResolvedValueOnce(null); // Module doesn't exist yet
      const moduleData = {
        name: 'New Module',
        description: 'A new module',
        version: '1.0.0',
        type: ModuleType.TOOL,
        author: {
          id: 'author-123',
          name: 'Test Author',
        },
        metadata: {
          schemaVersion: '1.0',
          license: 'MIT',
          tags: ['test'],
          dependencies: [],
          permissions: [],
          capabilities: [],
          compatibility: {
            minPlatformVersion: '1.0.0',
            targetPlatformVersion: '1.0.0',
            supportedProtocols: [],
            supportedModalities: [],
          },
        },
        checksum: 'abc123',
        downloadUrl: 'https://example.com/new-module.zip',
      };

      // Act
      const result = await moduleRegistry.registerModule(moduleData as any);

      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe(moduleData.name);
      expect(result.version).toBe(moduleData.version);
    });

    it('should throw an error if module already exists', async () => {
      // Setup
      jest.spyOn(ModuleModel, 'findOne').mockResolvedValue(mockModule);
      const moduleData = {
        name: 'Test Module',
        description: 'A test module',
        version: '1.0.0',
        type: ModuleType.TOOL,
        author: {
          id: 'author-123',
          name: 'Test Author',
        },
        metadata: {
          schemaVersion: '1.0',
          license: 'MIT',
          tags: [],
          dependencies: [],
          permissions: [],
          capabilities: [],
          compatibility: {
            minPlatformVersion: '1.0.0',
            targetPlatformVersion: '1.0.0',
            supportedProtocols: [],
            supportedModalities: [],
          },
        },
      };

      // Act & Assert
      await expect(moduleRegistry.registerModule(moduleData as any)).rejects.toThrow(
        `Module ${moduleData.name}@${moduleData.version} already exists`
      );
    });
  });

  describe('getModule', () => {
    it('should return a module by ID', async () => {
      // Act
      const result = await moduleRegistry.getModule('module-123');

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe('module-123');
      expect(ModuleModel.findById).toHaveBeenCalledWith('module-123');
    });

    it('should return null if module not found', async () => {
      // Setup
      jest.spyOn(ModuleModel, 'findById').mockResolvedValue(null);

      // Act
      const result = await moduleRegistry.getModule('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getModuleByNameAndVersion', () => {
    it('should return a module by name and version', async () => {
      jest.spyOn(ModuleModel, 'findOne').mockResolvedValue(mockModule);
      const result = await moduleRegistry.getModuleByNameAndVersion('Test Module', '1.0.0');
      expect(result).toBeDefined();
      expect(result?.name).toBe('Test Module');
      expect(result?.version).toBe('1.0.0');
    });
    it('should return null if not found', async () => {
      jest.spyOn(ModuleModel, 'findOne').mockResolvedValue(null);
      const result = await moduleRegistry.getModuleByNameAndVersion('Missing', '0.0.1');
      expect(result).toBeNull();
    });
  });

  describe('getModuleVersions', () => {
    it('should return module versions', async () => {
      const mockVersions = [mockVersion];
      const mockSort = jest.fn().mockReturnThis();
      const mockExec = jest.fn().mockResolvedValue(mockVersions);
      const mockQuery = { sort: mockSort, exec: mockExec };
      jest.spyOn(ModuleVersionModel, 'find').mockReturnValue(mockQuery as any);
      const result = await moduleRegistry.getModuleVersions('module-123');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('version-123');
    });

    it('should return empty array if no versions', async () => {
      const mockSortEmpty = jest.fn().mockReturnThis();
      const mockExecEmpty = jest.fn().mockResolvedValue([]);
      const mockQueryEmpty = { sort: mockSortEmpty, exec: mockExecEmpty };
      jest.spyOn(ModuleVersionModel, 'find').mockReturnValue(mockQueryEmpty as any);
      const result = await moduleRegistry.getModuleVersions('module-123');
      expect(result).toEqual([]);
    });
  });

  describe('getLatestVersion', () => {
    it('should return the latest version', async () => {
      const v1 = { ...mockVersion, version: '1.0.0' };
      const v2 = { ...mockVersion, version: '2.0.0' };
      const mockSort = jest.fn().mockReturnValue([v1, v2]);
      jest.spyOn(ModuleVersionModel, 'find').mockReturnValue({ sort: mockSort } as any);
      jest
        .spyOn(semver, 'rcompare')
        .mockImplementation((a: string | semver.SemVer, b: string | semver.SemVer) => {
          const aStr = typeof a === 'string' ? a : a.version;
          const bStr = typeof b === 'string' ? b : b.version;
          if (aStr === bStr) return 0;
          return aStr > bStr ? -1 : 1;
        });
      const result = await moduleRegistry.getLatestVersion('module-123');
      expect(result).toBeDefined();
      expect(result?.version).toBe('2.0.0');
    });
    it('should return null if no versions', async () => {
      const mockSort = jest.fn().mockReturnValue([]);
      jest.spyOn(ModuleVersionModel, 'find').mockReturnValue({ sort: mockSort } as any);
      const result = await moduleRegistry.getLatestVersion('module-123');
      expect(result).toBeNull();
    });
  });

  describe('compareVersions', () => {
    it('should compare versions correctly', () => {
      expect(moduleRegistry.compareVersions('1.0.0', '2.0.0')).toBeLessThan(0);
      expect(moduleRegistry.compareVersions('2.0.0', '1.0.0')).toBeGreaterThan(0);
      expect(moduleRegistry.compareVersions('1.0.0', '1.0.0')).toBe(0);
    });
  });

  describe('isVersionCompatible', () => {
    it('should check version compatibility', () => {
      expect(moduleRegistry.isVersionCompatible('1.2.0', '>=1.0.0')).toBe(true);
      expect(moduleRegistry.isVersionCompatible('0.9.0', '>=1.0.0')).toBe(false);
    });
  });

  describe('addModuleTags', () => {
    it('should add tags to a module', async () => {
      const updatedModule = {
        ...mockModule,
        metadata: { ...mockModule.metadata, tags: ['test', 'new'] },
      };
      jest.spyOn(ModuleModel, 'findByIdAndUpdate').mockResolvedValue(updatedModule);
      const result = await moduleRegistry.addModuleTags('module-123', ['new']);
      expect(result).toBeDefined();
      expect(result.metadata.tags).toContain('new');
    });
  });

  describe('removeModuleTags', () => {
    it('should remove tags from a module', async () => {
      const updatedModule = { ...mockModule, metadata: { ...mockModule.metadata, tags: [] } };
      jest.spyOn(ModuleModel, 'findByIdAndUpdate').mockResolvedValue(updatedModule);
      const result = await moduleRegistry.removeModuleTags('module-123', ['test']);
      expect(result).toBeDefined();
      expect(result.metadata.tags).not.toContain('test');
    });
  });

  describe('incrementInstallCount', () => {
    it('should increment install count', async () => {
      const updatedModule = { ...mockModule, installCount: 1 };
      jest.spyOn(ModuleModel, 'findByIdAndUpdate').mockResolvedValue(updatedModule);
      await expect(moduleRegistry.incrementInstallCount('module-123')).resolves.toBeUndefined();
    });
  });

  describe('updateModuleRating', () => {
    it('should update module rating', async () => {
      jest.spyOn(ModuleModel, 'findById').mockResolvedValue(mockModule);
      mockModule.rating = 0;
      mockModule.ratingCount = 0;
      mockModule.save = jest.fn().mockResolvedValue(mockModule);
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        moduleRegistry.updateModuleRating('module-123', 5, 'user-123')
      ).resolves.toBeUndefined();
    });
  });

  describe('deprecateVersion', () => {
    it('should deprecate a version', async () => {
      const mockVersionDoc = {
        ...mockVersion,
        moduleId: 'module-123',
        deprecated: false,
        save: jest
          .fn()
          .mockResolvedValue({ ...mockVersion, deprecated: true, moduleId: 'module-123' }),
      };
      jest.spyOn(ModuleVersionModel, 'findOne').mockResolvedValue(mockVersionDoc);
      jest.spyOn(ModuleVersionModel, 'findOneAndUpdate').mockResolvedValue(mockVersionDoc);
      await expect(moduleRegistry.deprecateVersion('module-123', '1.0.0')).resolves.toBeUndefined();
    });
    it('should throw if version not found', async () => {
      jest.spyOn(ModuleVersionModel, 'findOne').mockResolvedValue(null);
      await expect(moduleRegistry.deprecateVersion('module-123', 'missing')).rejects.toThrow();
    });
  });

  describe('yankVersion', () => {
    it('should yank a version', async () => {
      const mockVersionDoc = {
        ...mockVersion,
        moduleId: 'module-123',
        yanked: false,
        save: jest.fn().mockResolvedValue({ ...mockVersion, yanked: true, moduleId: 'module-123' }),
      };
      jest.spyOn(ModuleVersionModel, 'findOne').mockResolvedValue(mockVersionDoc);
      jest.spyOn(ModuleVersionModel, 'findOneAndUpdate').mockResolvedValue(mockVersionDoc);
      await expect(moduleRegistry.yankVersion('module-123', '1.0.0')).resolves.toBeUndefined();
    });
    it('should throw if version not found', async () => {
      jest.spyOn(ModuleVersionModel, 'findOne').mockResolvedValue(null);
      await expect(moduleRegistry.yankVersion('module-123', 'missing')).rejects.toThrow();
    });
  });

  describe('event subscription', () => {
    it('should call event listeners', () => {
      const listener = jest.fn();
      moduleRegistry.on('module:registered', listener);
      (moduleRegistry as any).eventEmitter.emit('module:registered', { moduleId: 'module-123' });
      expect(listener).toHaveBeenCalledWith({ moduleId: 'module-123' });
      moduleRegistry.off('module:registered', listener);
    });
  });
});
