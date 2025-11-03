import { Module } from '../../../../src/core/abstracts/Module';
import { ModuleType } from '../../../../src/core/types/ModuleTypes';
import { ModuleContext } from '../../../../src/core/models/ModuleContext';
import { ModuleConfig } from '../../../../src/core/models/ModuleConfig';
import { ValidationResult } from '../../../../src/core/models/ValidationResult';
import { ModuleEvent } from '../../../../src/core/models/ModuleEvent';

// Mock implementation of the abstract Module class for testing
class TestModule extends Module {
  public initializeCalled = false;
  public activateCalled = false;
  public deactivateCalled = false;
  public updateCalled = false;
  public uninstallCalled = false;
  public configUpdateCalled = false;
  public validateConfigCalled = false;
  public handleEventCalled = false;

  constructor(id: string, version: string) {
    super(id, ModuleType.TOOL, version);
  }

  public getConfigSchema(): any {
    return {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        testProperty: { type: 'string' },
      },
      required: ['enabled'],
    };
  }

  protected async onInitialize(): Promise<void> {
    this.initializeCalled = true;
  }

  protected async onActivate(): Promise<void> {
    this.activateCalled = true;
  }

  protected async onDeactivate(): Promise<void> {
    this.deactivateCalled = true;
  }

  protected async onUpdate(_oldVersion: string, _newVersion: string): Promise<void> {
    this.updateCalled = true;
  }

  protected async onUninstall(): Promise<void> {
    this.uninstallCalled = true;
  }

  protected async onConfigUpdate(_config: ModuleConfig): Promise<void> {
    this.configUpdateCalled = true;
  }

  protected async onValidateConfig(_config: ModuleConfig): Promise<ValidationResult> {
    this.validateConfigCalled = true;
    return { valid: true };
  }

  protected async onHandleEvent(_event: ModuleEvent): Promise<void> {
    this.handleEventCalled = true;
  }
}

describe('Module', () => {
  let module: TestModule;
  let context: ModuleContext;

  beforeEach(() => {
    module = new TestModule('test-module', '1.0.0');
    context = {
      userId: 'user-123',
      eventBus: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        emitAsync: jest.fn(),
        getSubscriberCount: jest.fn(),
      } as any,
      logger: {} as any,
      storage: {} as any,
      services: {},
      environment: {
        isDevelopment: true,
        isProduction: false,
        version: '1.0.0',
      },
    };
  });

  describe('constructor', () => {
    it('should set the id, type, and version', () => {
      expect(module.id).toBe('test-module');
      expect(module.type).toBe(ModuleType.TOOL);
      expect(module.version).toBe('1.0.0');
    });
  });

  describe('initialize', () => {
    it('should set the context and call onInitialize', async () => {
      await module.initialize(context);
      expect(module.initializeCalled).toBe(true);
    });
  });

  describe('activate', () => {
    it('should throw an error if not initialized', async () => {
      await expect(module.activate()).rejects.toThrow(
        'Module must be initialized before activation'
      );
    });

    it('should call onActivate if initialized', async () => {
      await module.initialize(context);
      await module.activate();
      expect(module.activateCalled).toBe(true);
    });
  });

  describe('deactivate', () => {
    it('should not call onDeactivate if not active', async () => {
      await module.deactivate();
      expect(module.deactivateCalled).toBe(false);
    });

    it('should call onDeactivate if active', async () => {
      await module.initialize(context);
      await module.activate();
      await module.deactivate();
      expect(module.deactivateCalled).toBe(true);
    });
  });

  describe('update', () => {
    it('should update the version and call onUpdate', async () => {
      // Update the version
      await module.update('2.0.0');
      expect(module.version).toBe('2.0.0');
      expect(module.updateCalled).toBe(true);
    });
  });

  describe('uninstall', () => {
    it('should deactivate if active and call onUninstall', async () => {
      await module.initialize(context);
      await module.activate();
      await module.uninstall();
      expect(module.deactivateCalled).toBe(true);
      expect(module.uninstallCalled).toBe(true);
    });

    it('should call onUninstall if not active', async () => {
      await module.uninstall();
      expect(module.uninstallCalled).toBe(true);
    });
  });

  describe('updateConfig', () => {
    it('should validate the config and call onConfigUpdate', async () => {
      const config = { enabled: true, testProperty: 'test' };
      await module.updateConfig(config);
      expect(module.validateConfigCalled).toBe(true);
      expect(module.configUpdateCalled).toBe(true);
      expect(module.getConfig()).toEqual(expect.objectContaining(config));
    });

    it('should throw an error if the config is invalid', async () => {
      jest.spyOn(module, 'validateConfig').mockResolvedValue({
        valid: false,
        errors: [{ path: 'enabled', message: 'enabled is required' }],
      });

      await expect(module.updateConfig({ testProperty: 'test' })).rejects.toThrow();
    });
  });

  describe('handleEvent', () => {
    it('should not call onHandleEvent if not active', async () => {
      const event: ModuleEvent = {
        type: 'test',
        source: 'test',
        timestamp: new Date(),
      };
      await module.handleEvent(event);
      expect(module.handleEventCalled).toBe(false);
    });

    it('should call onHandleEvent if active', async () => {
      const event: ModuleEvent = {
        type: 'test',
        source: 'test',
        timestamp: new Date(),
      };
      await module.initialize(context);
      await module.activate();
      await module.handleEvent(event);
      expect(module.handleEventCalled).toBe(true);
    });
  });

  describe('getCapabilities', () => {
    it('should return the capabilities', () => {
      expect(module.getCapabilities()).toEqual([]);
    });
  });

  describe('hasCapability', () => {
    it('should return false if the capability does not exist', () => {
      expect(module.hasCapability('test')).toBe(false);
    });
  });
});
