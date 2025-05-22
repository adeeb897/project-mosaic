/**
 * Context provided to modules during initialization
 */
import { User } from './User';
import { EventBus } from '../abstracts/EventBus';

export interface ModuleContext {
  userId: string;
  user?: User;
  eventBus: EventBus;
  logger: any; // Logger interface
  storage: any; // Storage interface for module-specific data
  services: {
    [key: string]: any; // Available services
  };
  environment: {
    isDevelopment: boolean;
    isProduction: boolean;
    version: string;
    [key: string]: any; // Other environment variables
  };
}
