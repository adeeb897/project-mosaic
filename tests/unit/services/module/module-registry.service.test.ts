import { ModuleRegistryService } from '../../../../src/services/module/module-registry.service';
import { ModuleType } from '../../../../src/core/types/ModuleTypes';
import { ModuleStatus, ReviewStatus } from '../../../../src/core/models/Module';
import {
  ModuleModel,
  ModuleVersionModel,
  ModuleInstallationModel,
} from '../../../../src/persistence/models/module.model';

// Mock the MongoDB models
jest.mock('../../../../src/persistence/models/module.model', () => {
  const mockSave = jest.fn().mockResolvedValue({
    _id: 'mock-id',
    toObject: () => ({
      _id: 'mock-id',
      name: 'Test Module',
      version: '1.0.0',
    }),
  });

  return {
    ModuleModel: {
      findById: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findOneAndUpdate: jest.fn(),
      prototype: {
        save: mockSave,
      },
    },
    ModuleVersionModel: {
      findOne: jest.fn(),
      find: jest.fn(),
      findOneAndUpdate: jest.fn(),
      prototype: {
        save: mockSave,
      },
    },
    ModuleInstallationModel: {
      findOne: jest.fn(),
      find: jest.fn(),
      findOneAndUpdate: jest.fn(),
      prototype: {
        save: mockSave,
      },
    },
  };
});

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
    jest.clearAllMocks();
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
    (ModuleModel.findById as jest.Mock).mockResolvedValue(mockModule);
    (ModuleModel.findOne as jest.Mock).mockResolvedValue(mockModule);
    (ModuleModel.find as jest.Mock).mockResolvedValue([mockModule]);
    (ModuleModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockModule);
    (ModuleModel.findOneAndUpdate as jest.Mock).mockResolvedValue(mockModule);

    (ModuleVersionModel.findOne as jest.Mock).mockResolvedValue(mockVersion);
    (ModuleVersionModel.find as jest.Mock).mockResolvedValue([mockVersion]);
    (ModuleVersionModel.findOneAndUpdate as jest.Mock).mockResolvedValue(mockVersion);

    (ModuleInstallationModel.findOne as jest.Mock).mockResolvedValue(mockInstallation);
    (ModuleInstallationModel.find as jest.Mock).mockResolvedValue([mockInstallation]);
    (ModuleInstallationModel.findOneAndUpdate as jest.Mock).mockResolvedValue(mockInstallation);
  });

  describe('registerModule', () => {
    it('should register a new module', async () => {
      // Setup
      (ModuleModel.findOne as jest.Mock).mockResolvedValueOnce(null); // Module doesn't exist yet
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
      };

      // Create a mock for the ModuleModel constructor
      const mockModuleDoc = {
        ...moduleData,
        _id: 'new-module-id',
        save: jest.fn().mockResolvedValue({
          ...moduleData,
          _id: 'new-module-id',
          id: 'new-module-id',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      };
      (ModuleModel as any) = jest.fn().mockImplementation(() => mockModuleDoc);

      // Create a mock for the ModuleVersionModel constructor
      const mockVersionDoc = {
        moduleId: 'new-module-id',
        version: '1.0.0',
        metadata: moduleData.metadata,
        checksum: '',
        downloadUrl: '',
        save: jest.fn().mockResolvedValue({
          _id: 'new-version-id',
          moduleId: 'new-module-id',
          version: '1.0.0',
        }),
      };
      (ModuleVersionModel as any) = jest.fn().mockImplementation(() => mockVersionDoc);

      // Act
      const result = await moduleRegistry.registerModule(moduleData as any);

      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe(moduleData.name);
      expect(result.version).toBe(moduleData.version);
      expect(mockModuleDoc.save).toHaveBeenCalled();
      expect(mockVersionDoc.save).toHaveBeenCalled();
    });

    it('should throw an error if module already exists', async () => {
      // Setup
      (ModuleModel.findOne as jest.Mock).mockResolvedValueOnce(mockModule); // Module already exists
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
      (ModuleModel.findById as jest.Mock).mockResolvedValueOnce(null);

      // Act
      const result = await moduleRegistry.getModule('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('searchModules', () => {
    it('should search modules with filters', async () => {
      // Setup
      const filters = {
        type: ModuleType.TOOL,
        status: ModuleStatus.ACTIVE,
        author: 'author-123',
        tags: ['test'],
        minRating: 4,
        searchText: 'test',
      };

      // Act
      const result = await moduleRegistry.searchModules(filters);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('module-123');
      expect(ModuleModel.find).toHaveBeenCalled();
    });
  });

  describe('updateModule', () => {
    it('should update a module', async () => {
      // Setup
      const updates = {
        description: 'Updated description',
        status: ModuleStatus.ACTIVE,
      };

      // Act
      const result = await moduleRegistry.updateModule('module-123', updates);

      // Assert
      expect(result).toBeDefined();
      expect(ModuleModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'module-123',
        expect.objectContaining({
          $set: expect.objectContaining({
            description: 'Updated description',
            status: ModuleStatus.ACTIVE,
          }),
        }),
        { new: true }
      );
    });

    it('should throw an error if module not found', async () => {
      // Setup
      (ModuleModel.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce(null);
      const updates = {
        description: 'Updated description',
      };

      // Act & Assert
      await expect(moduleRegistry.updateModule('non-existent-id', updates)).rejects.toThrow(
        'Module not found: non-existent-id'
      );
    });
  });

  describe('resolveDependencies', () => {
    it('should resolve dependencies for a module', async () => {
      // Setup
      const dependencyModule = {
        ...mockModule,
        _id: 'dependency-123',
        id: 'dependency-123',
        name: 'Dependency Module',
      };
      mockModule.metadata.dependencies = [
        {
          id: 'dependency-123',
          version: '1.0.0',
          optional: false,
        },
      ];
      (ModuleModel.findById as jest.Mock).mockResolvedValueOnce(mockModule);
      (ModuleModel.findOne as jest.Mock).mockResolvedValueOnce(dependencyModule);

      // Act
      const result = await moduleRegistry.resolveDependencies('module-123');

      // Assert
      expect(result).toBeDefined();
      expect(result.resolved).toBe(true);
      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies[0].moduleId).toBe('dependency-123');
      expect(result.installOrder).toContain('dependency-123');
      expect(result.installOrder).toContain('module-123');
    });

    it('should detect circular dependencies', async () => {
      // Setup
      const dependencyModule = {
        ...mockModule,
        _id: 'dependency-123',
        id: 'dependency-123',
        name: 'Dependency Module',
        metadata: {
          ...mockModule.metadata,
          dependencies: [
            {
              id: 'module-123',
              version: '1.0.0',
              optional: false,
            },
          ],
        },
      };
      mockModule.metadata.dependencies = [
        {
          id: 'dependency-123',
          version: '1.0.0',
          optional: false,
        },
      ];
      (ModuleModel.findById as jest.Mock).mockResolvedValueOnce(mockModule);
      (ModuleModel.findOne as jest.Mock).mockResolvedValueOnce(dependencyModule);

      // Act
      const result = await moduleRegistry.resolveDependencies('module-123');

      // Assert
      expect(result).toBeDefined();
      expect(result.resolved).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].type).toBe('dependency');
      expect(result.conflicts[0].description).toContain('Circular dependency detected');
    });
  });

  describe('recordInstallation', () => {
    it('should record a new installation', async () => {
      // Setup
      (ModuleInstallationModel.findOne as jest.Mock).mockResolvedValueOnce(null); // No existing installation
      const mockNewInstallation = {
        userId: 'user-123',
        moduleId: 'module-123',
        version: '1.0.0',
        enabled: true,
        config: {},
        profileIds: [],
        save: jest.fn().mockResolvedValue({
          _id: 'new-installation-id',
          userId: 'user-123',
          moduleId: 'module-123',
          version: '1.0.0',
          installedAt: new Date(),
          updatedAt: new Date(),
        }),
      };
      (ModuleInstallationModel as any) = jest.fn().mockImplementation(() => mockNewInstallation);

      // Act
      const result = await moduleRegistry.recordInstallation('user-123', 'module-123', '1.0.0');

      // Assert
      expect(result).toBeDefined();
      expect(mockNewInstallation.save).toHaveBeenCalled();
    });

    it('should update an existing installation', async () => {
      // Setup
      const existingInstallation = {
        ...mockInstallation,
        version: '0.9.0',
        save: jest.fn().mockResolvedValue({
          ...mockInstallation,
          version: '1.0.0',
          updatedAt: new Date(),
        }),
      };
      (ModuleInstallationModel.findOne as jest.Mock).mockResolvedValueOnce(existingInstallation);

      // Act
      const result = await moduleRegistry.recordInstallation('user-123', 'module-123', '1.0.0');

      // Assert
      expect(result).toBeDefined();
      expect(existingInstallation.save).toHaveBeenCalled();
      expect(existingInstallation.version).toBe('1.0.0');
    });
  });
});
