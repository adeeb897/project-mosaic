/**
 * User model representing a system user
 */
import { UserPreferences } from './UserPreferences';
import { Role } from './Role';

export interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  preferences: UserPreferences;
  roles: Role[];
  status: UserStatus;
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
  PENDING_VERIFICATION = 'pending_verification',
}
