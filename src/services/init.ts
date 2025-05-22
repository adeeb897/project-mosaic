import { logger } from '@utils/logger';
import { initUserService } from './user/user.service';
import { initModuleService } from './module/module.service';
import { initChatService } from './chat/chat.service';
import { initProfileService } from './profile/profile.service';
import { initModalityService } from './modality/modality.service';
import { initSecurityService } from './security/security.service';
import { initEventSystem } from '@framework/event/event.system';

/**
 * Initialize all services
 * This function should be called during application startup
 */
export const initializeServices = async (): Promise<void> => {
  logger.info('Initializing services...');

  try {
    // Initialize core framework components first
    await initEventSystem();
    logger.info('Event system initialized');

    // Initialize services
    await initSecurityService();
    logger.info('Security service initialized');

    await initUserService();
    logger.info('User service initialized');

    await initModuleService();
    logger.info('Module service initialized');

    await initChatService();
    logger.info('Chat service initialized');

    await initProfileService();
    logger.info('Profile service initialized');

    await initModalityService();
    logger.info('Modality service initialized');

    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    throw new Error(
      `Service initialization failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

/**
 * Shutdown all services gracefully
 * This function should be called during application shutdown
 */
export const shutdownServices = async (): Promise<void> => {
  logger.info('Shutting down services...');

  try {
    // Shutdown in reverse order of initialization
    // Add shutdown logic for each service here

    logger.info('All services shut down successfully');
  } catch (error) {
    logger.error('Error during service shutdown:', error);
    throw error;
  }
};
