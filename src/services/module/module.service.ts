import { logger } from '@utils/logger';

/**
 * Module types
 */
export enum ModuleType {
  PERSONALITY = 'personality',
  TOOL = 'tool',
  AGENT = 'agent',
  MODALITY = 'modality',
}

/**
 * Module interface
 */
export interface Module {
  id: string;
  name: string;
  description: string;
  version: string;
  type: ModuleType;
  author: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

/**
 * Module service interface
 */
export interface ModuleService {
  findAll(): Promise<Module[]>;
  findById(id: string): Promise<Module | null>;
  findByType(type: ModuleType): Promise<Module[]>;
  install(moduleData: Partial<Module>): Promise<Module>;
  update(id: string, moduleData: Partial<Module>): Promise<Module | null>;
  uninstall(id: string): Promise<boolean>;
  enable(id: string): Promise<boolean>;
  disable(id: string): Promise<boolean>;
}

/**
 * Module service implementation
 */
class ModuleServiceImpl implements ModuleService {
  private modules: Module[] = [];

  /**
   * Find all modules
   * @returns Array of modules
   */
  async findAll(): Promise<Module[]> {
    logger.debug('Finding all modules');
    return this.modules;
  }

  /**
   * Find module by ID
   * @param id Module ID
   * @returns Module object or null if not found
   */
  async findById(id: string): Promise<Module | null> {
    logger.debug(`Finding module by ID: ${id}`);
    const module = this.modules.find(m => m.id === id);
    return module || null;
  }

  /**
   * Find modules by type
   * @param type Module type
   * @returns Array of modules of the specified type
   */
  async findByType(type: ModuleType): Promise<Module[]> {
    logger.debug(`Finding modules by type: ${type}`);
    return this.modules.filter(m => m.type === type);
  }

  /**
   * Install a new module
   * @param moduleData Module data
   * @returns Installed module
   */
  async install(moduleData: Partial<Module>): Promise<Module> {
    logger.debug(`Installing module: ${moduleData.name}`);

    const newModule: Module = {
      id: `module-${Date.now()}`,
      name: moduleData.name || 'Unnamed Module',
      description: moduleData.description || '',
      version: moduleData.version || '1.0.0',
      type: moduleData.type || ModuleType.TOOL,
      author: moduleData.author || 'Unknown',
      enabled: true,
      config: moduleData.config || {},
    };

    this.modules.push(newModule);
    return newModule;
  }

  /**
   * Update module
   * @param id Module ID
   * @param moduleData Module data
   * @returns Updated module or null if not found
   */
  async update(id: string, moduleData: Partial<Module>): Promise<Module | null> {
    logger.debug(`Updating module: ${id}`);

    const index = this.modules.findIndex(m => m.id === id);
    if (index === -1) {
      return null;
    }

    const updatedModule = {
      ...this.modules[index],
      ...moduleData,
    };

    this.modules[index] = updatedModule;
    return updatedModule;
  }

  /**
   * Uninstall module
   * @param id Module ID
   * @returns True if uninstalled
   */
  async uninstall(id: string): Promise<boolean> {
    logger.debug(`Uninstalling module: ${id}`);

    const index = this.modules.findIndex(m => m.id === id);
    if (index === -1) {
      return false;
    }

    this.modules.splice(index, 1);
    return true;
  }

  /**
   * Enable module
   * @param id Module ID
   * @returns True if enabled
   */
  async enable(id: string): Promise<boolean> {
    logger.debug(`Enabling module: ${id}`);

    const module = await this.findById(id);
    if (!module) {
      return false;
    }

    return this.update(id, { enabled: true }).then(m => !!m);
  }

  /**
   * Disable module
   * @param id Module ID
   * @returns True if disabled
   */
  async disable(id: string): Promise<boolean> {
    logger.debug(`Disabling module: ${id}`);

    const module = await this.findById(id);
    if (!module) {
      return false;
    }

    return this.update(id, { enabled: false }).then(m => !!m);
  }
}

// Create singleton instance
const moduleServiceInstance = new ModuleServiceImpl();

/**
 * Initialize module service
 */
export const initModuleService = async (): Promise<void> => {
  logger.info('Initializing module service');
  // Add initialization logic here
};

/**
 * Get module service instance
 * @returns Module service instance
 */
export const getModuleService = (): ModuleService => {
  return moduleServiceInstance;
};
