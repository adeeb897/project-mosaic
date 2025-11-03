/**
 * Role model for user authorization
 */
import { Permission } from './Permission';

export interface Role {
  /**
   * Unique identifier for the role
   */
  id: string;

  /**
   * Name of the role
   */
  name: string;

  /**
   * Permissions associated with this role
   */
  permissions: Permission[];
}
