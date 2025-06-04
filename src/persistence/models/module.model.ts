import mongoose, { Schema, Document } from 'mongoose';
import {
  Module,
  ModuleVersion,
  ModuleInstallation,
  ModuleStatus,
  ReviewStatus,
} from '../../core/models/Module';
import { ModuleType } from '../../core/types/ModuleTypes';

/**
 * Module document interface
 */
export interface ModuleDocument
  extends Omit<Module, 'id' | 'createdAt' | 'updatedAt' | 'publishedAt'>,
    Document {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

/**
 * Module version document interface
 */
export interface ModuleVersionDocument extends Omit<ModuleVersion, 'id' | 'createdAt'>, Document {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
}

/**
 * Module installation document interface
 */
export interface ModuleInstallationDocument
  extends Omit<ModuleInstallation, 'id' | 'installedAt' | 'updatedAt'>,
    Document {
  _id: mongoose.Types.ObjectId;
  installedAt: Date;
  updatedAt: Date;
}

/**
 * Author schema
 */
const AuthorSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  website: { type: String },
  email: { type: String },
});

/**
 * Dependency schema
 */
const DependencySchema = new Schema({
  id: { type: String, required: true },
  version: { type: String, required: true },
  optional: { type: Boolean, default: false },
});

/**
 * Capability schema
 */
const CapabilitySchema = new Schema({
  id: { type: String, required: true },
  version: { type: String, required: true },
  optional: { type: Boolean, default: false },
});

/**
 * Protocol support schema
 */
const ProtocolSupportSchema = new Schema({
  name: { type: String, required: true },
  version: { type: String, required: true },
});

/**
 * Compatibility schema
 */
const CompatibilitySchema = new Schema({
  minPlatformVersion: { type: String, required: true },
  targetPlatformVersion: { type: String, required: true },
  supportedProtocols: [ProtocolSupportSchema],
  supportedModalities: [{ type: String }],
});

/**
 * UI component definition schema
 */
const UIComponentDefinitionSchema = new Schema({
  id: { type: String, required: true },
  type: { type: String, required: true },
  location: { type: String, required: true },
  component: { type: String, required: true },
  props: { type: Schema.Types.Mixed },
});

/**
 * Module metadata schema
 */
const ModuleMetadataSchema = new Schema({
  schemaVersion: { type: String, required: true },
  license: { type: String, required: true },
  tags: [{ type: String }],
  dependencies: [DependencySchema],
  permissions: [{ type: String }],
  capabilities: [CapabilitySchema],
  compatibility: { type: CompatibilitySchema, required: true },
  uiComponents: [UIComponentDefinitionSchema],
});

/**
 * Module schema
 */
const ModuleSchema = new Schema<ModuleDocument>(
  {
    name: { type: String, required: true, index: true },
    description: { type: String, required: true },
    version: { type: String, required: true },
    type: {
      type: String,
      enum: Object.values(ModuleType),
      required: true,
      index: true,
    },
    author: { type: AuthorSchema, required: true },
    publishedAt: { type: Date },
    requiresReview: { type: Boolean, default: true },
    reviewStatus: {
      type: String,
      enum: Object.values(ReviewStatus),
      default: ReviewStatus.PENDING,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ModuleStatus),
      default: ModuleStatus.INACTIVE,
      index: true,
    },
    metadata: { type: ModuleMetadataSchema, required: true },
    checksum: { type: String },
    downloadUrl: { type: String },
    installCount: { type: Number, default: 0 },
    rating: { type: Number, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
ModuleSchema.index({ name: 1, version: 1 }, { unique: true });
ModuleSchema.index({ 'author.id': 1 });
ModuleSchema.index({ 'metadata.tags': 1 });
ModuleSchema.index({ status: 1, type: 1 });

/**
 * Module version schema
 */
const ModuleVersionSchema = new Schema<ModuleVersionDocument>(
  {
    moduleId: { type: String, required: true, index: true },
    version: { type: String, required: true },
    releaseNotes: { type: String },
    metadata: { type: ModuleMetadataSchema, required: true },
    checksum: { type: String, required: true },
    downloadUrl: { type: String, required: true },
    deprecated: { type: Boolean, default: false },
    yanked: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound index for module versions
ModuleVersionSchema.index({ moduleId: 1, version: 1 }, { unique: true });

/**
 * Module installation schema
 */
const ModuleInstallationSchema = new Schema<ModuleInstallationDocument>(
  {
    userId: { type: String, required: true, index: true },
    moduleId: { type: String, required: true, index: true },
    version: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    config: { type: Schema.Types.Mixed, default: {} },
    profileIds: [{ type: String }],
  },
  {
    timestamps: { createdAt: 'installedAt', updatedAt: true },
  }
);

// Compound indexes for installations
ModuleInstallationSchema.index({ userId: 1, moduleId: 1 }, { unique: true });
ModuleInstallationSchema.index({ userId: 1, enabled: 1 });
ModuleInstallationSchema.index({ profileIds: 1 });

/**
 * Module model
 */
export const ModuleModel = mongoose.model<ModuleDocument>('Module', ModuleSchema);

/**
 * Module version model
 */
export const ModuleVersionModel = mongoose.model<ModuleVersionDocument>(
  'ModuleVersion',
  ModuleVersionSchema
);

/**
 * Module installation model
 */
export const ModuleInstallationModel = mongoose.model<ModuleInstallationDocument>(
  'ModuleInstallation',
  ModuleInstallationSchema
);
