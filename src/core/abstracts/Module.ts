/**
 * Abstract base class for all modules
 */
import { IModule } from '../interfaces/IModule';
import { ModuleType } from '../types/ModuleTypes';
import { ModuleContext } from '../models/ModuleContext';
import { ModuleConfig } from '../models/ModuleConfig';
import { ValidationResult } from '../models/ValidationResult';
import { ModuleEvent } from '../models/ModuleEvent';
import { ModuleCapability } from '../models/ModuleCapability';

export abstract class Module implements IModule {
  // Core Module Properties
  public id: string;
  public type: ModuleType;
  public version: string;
  protected context!: ModuleContext;
  protected config: ModuleConfig = { enabled: true };
  protected capabilities: ModuleCapability[] = [];
  protected initialized: boolean = false;
  protected active: boolean = false;

  constructor(id: string, type: ModuleType, version: string) {
    this.id = id;
    this.type = type;
    this.version = version;
  }

  // Lifecycle Methods
  public async initialize(context: ModuleContext): Promise<void> {
    this.context = context;
    this.initialized = true;
    await this.onInitialize();
  }

  public async activate(): Promise<void> {
    if (!this.initialized) {
      throw new Error('Module must be initialized before activation');
    }
    this.active = true;
    await this.onActivate();
  }

  public async deactivate(): Promise<void> {
    if (!this.active) {
      return;
    }
    this.active = false;
    await this.onDeactivate();
  }

  public async update(newVersion: string): Promise<void> {
    const oldVersion = this.version;
    this.version = newVersion;
    await this.onUpdate(oldVersion, newVersion);
  }

  public async uninstall(): Promise<void> {
    if (this.active) {
      await this.deactivate();
    }
    await this.onUninstall();
  }

  // Configuration
  public abstract getConfigSchema(): any;

  public getConfig(): ModuleConfig {
    return this.config;
  }

  public async updateConfig(config: Partial<ModuleConfig>): Promise<ModuleConfig> {
    const validationResult = await this.validateConfig({
      ...this.config,
      ...config,
    });

    if (!validationResult.valid) {
      throw new Error(`Invalid configuration: ${JSON.stringify(validationResult.errors)}`);
    }

    this.config = {
      ...this.config,
      ...config,
    };

    await this.onConfigUpdate(this.config);
    return this.config;
  }

  public async validateConfig(config: ModuleConfig): Promise<ValidationResult> {
    // Basic validation that all modules should have
    const errors = [];

    if (config.enabled === undefined) {
      errors.push({
        path: 'enabled',
        message: 'enabled is required',
      });
    }

    // Call module-specific validation
    const moduleValidation = await this.onValidateConfig(config);

    return {
      valid: errors.length === 0 && moduleValidation.valid,
      errors: [...errors, ...(moduleValidation.errors || [])],
      warnings: moduleValidation.warnings,
    };
  }

  // Event Handling
  public async handleEvent(event: ModuleEvent): Promise<void> {
    if (!this.active) {
      return;
    }
    await this.onHandleEvent(event);
  }

  // Capability Methods
  public getCapabilities(): ModuleCapability[] {
    return this.capabilities;
  }

  public hasCapability(capability: string): boolean {
    return this.capabilities.some(cap => cap.id === capability);
  }

  // Protected methods for subclasses to override
  protected abstract onInitialize(): Promise<void>;
  protected abstract onActivate(): Promise<void>;
  protected abstract onDeactivate(): Promise<void>;
  protected abstract onUpdate(oldVersion: string, newVersion: string): Promise<void>;
  protected abstract onUninstall(): Promise<void>;
  protected abstract onConfigUpdate(config: ModuleConfig): Promise<void>;
  protected abstract onValidateConfig(config: ModuleConfig): Promise<ValidationResult>;
  protected abstract onHandleEvent(event: ModuleEvent): Promise<void>;
}
