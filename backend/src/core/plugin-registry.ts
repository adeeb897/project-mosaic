/**
 * Plugin Registry - Manages all plugins in the system
 */
import {
  Plugin,
  PluginRegistry as IPluginRegistry,
  PluginContext,
} from '@mosaic/shared';
import { logger } from './logger';
import { EventBus } from './event-bus';

export class PluginRegistry implements IPluginRegistry {
  private plugins: Map<string, Plugin> = new Map();
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  async register(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin ${plugin.name} is already registered`);
    }

    logger.info('Registering plugin', {
      name: plugin.name,
      version: plugin.version,
      type: plugin.type,
    });

    // Create plugin context
    const context: PluginContext = {
      config: this.loadPluginConfig(plugin.name),
      logger: logger.child({ plugin: plugin.name }),
      eventBus: this.eventBus,
      plugins: this,
    };

    try {
      // Initialize plugin
      await plugin.initialize(context);
      this.plugins.set(plugin.name, plugin);

      logger.info('Plugin registered successfully', {
        name: plugin.name,
        type: plugin.type,
      });
    } catch (error) {
      logger.error('Failed to register plugin', {
        name: plugin.name,
        error,
      });
      throw error;
    }
  }

  async unregister(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin ${name} is not registered`);
    }

    logger.info('Unregistering plugin', { name });

    try {
      await plugin.shutdown();
      this.plugins.delete(name);

      logger.info('Plugin unregistered successfully', { name });
    } catch (error) {
      logger.error('Failed to unregister plugin', { name, error });
      throw error;
    }
  }

  get(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  getByType(type: Plugin['type']): Plugin[] {
    return this.getAll().filter((plugin) => plugin.type === type);
  }

  private loadPluginConfig(name: string): Record<string, any> {
    // In a real implementation, load from config files or environment
    // For now, return empty config
    return {};
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down all plugins');

    for (const plugin of this.plugins.values()) {
      try {
        await plugin.shutdown();
      } catch (error) {
        logger.error('Error shutting down plugin', {
          name: plugin.name,
          error,
        });
      }
    }

    this.plugins.clear();
  }
}
