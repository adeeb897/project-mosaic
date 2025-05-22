/**
 * Core type definitions for Project Mosaic
 */

/**
 * Module type enumeration
 */
export enum ModuleType {
  PERSONALITY = 'personality',
  TOOL = 'tool',
  AGENT = 'agent',
  THEME = 'theme',
  MODALITY = 'modality',
}

/**
 * Review status enumeration
 */
export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEEDS_CHANGES = 'needs_changes',
}

/**
 * User status enumeration
 */
export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
  PENDING_VERIFICATION = 'pending_verification',
}

/**
 * Conversation status enumeration
 */
export enum ConversationStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

/**
 * Tool type enumeration
 */
export enum ToolType {
  WEB_SEARCH = 'web_search',
  CALCULATOR = 'calculator',
  DATA_RETRIEVAL = 'data_retrieval',
  FILE_OPERATION = 'file_operation',
  API_CONNECTOR = 'api_connector',
  CUSTOM = 'custom',
  VISUALIZATION = 'visualization',
  KNOWLEDGE_BASE = 'knowledge_base',
}
