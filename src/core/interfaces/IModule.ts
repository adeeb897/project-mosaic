/**
 * Base interface for all modules in the system
 */
import { ModuleType } from '../types/ModuleTypes';
import { ModuleContext } from '../models/ModuleContext';
import { ModuleConfig } from '../models/ModuleConfig';
import { ValidationResult } from '../models/ValidationResult';
import { ModuleEvent } from '../models/ModuleEvent';
import { ModuleCapability } from '../models/ModuleCapability';

export interface IModule {
  // Core Module Properties
  id: string;
  type: ModuleType;
  version: string;

  // Lifecycle Methods
  initialize(context: ModuleContext): Promise<void>;
  activate(): Promise<void>;
  deactivate(): Promise<void>;
  update(newVersion: string): Promise<void>;
  uninstall(): Promise<void>;

  // Configuration
  getConfigSchema(): any; // JSONSchema7
  getConfig(): ModuleConfig;
  updateConfig(config: Partial<ModuleConfig>): Promise<ModuleConfig>;
  validateConfig(config: ModuleConfig): Promise<ValidationResult>;

  // Event Handling
  handleEvent(event: ModuleEvent): Promise<void>;

  // Capability Methods
  getCapabilities(): ModuleCapability[];
  hasCapability(capability: string): boolean;
}
