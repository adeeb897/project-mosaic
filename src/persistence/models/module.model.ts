/**
 * Module model for Project Mosaic
 */
import mongoose, { Document, Schema } from 'mongoose';
import { ModuleType, ReviewStatus } from '../../types';

/**
 * Author interface
 */
export interface IAuthor {
  id: Schema.Types.ObjectId;
  name: string;
  website?: string;
  email?: string;
}

/**
 * Dependency interface
 */
export interface IDependency {
  id: string;
  version: string;
  optional: boolean;
}

/**
 * Capability interface
 */
export interface ICapability {
  id: string;
  version: string;
  optional: boolean;
}

/**
 * Protocol support interface
 */
export interface IProtocolSupport {
  name: string;
  version: string;
}

/**
 * Compatibility interface
 */
export interface ICompatibility {
  minPlatformVersion: string;
  targetPlatformVersion: string;
  supportedProtocols: IProtocolSupport[];
  supportedModalities: string[];
}

/**
 * UI component definition interface
 */
export interface IUIComponentDefinition {
  id: string;
  type: string;
  location: string;
  component: string;
  props?: Record<string, any>;
}

/**
 * Module metadata interface
 */
export interface IModuleMetadata {
  schemaVersion: string;
  license: string;
  tags: string[];
  dependencies: IDependency[];
  permissions: string[];
  capabilities: ICapability[];
  compatibility: ICompatibility;
  uiComponents?: IUIComponentDefinition[];
}

/**
 * Module interface
 */
export interface IModule {
  name: string;
  description: string;
  version: string;
  type: ModuleType;
  author: IAuthor;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  requiresReview: boolean;
  reviewStatus: ReviewStatus;
  metadata: IModuleMetadata;
  packageUrl?: string;
  iconUrl?: string;
  documentationUrl?: string;
  repositoryUrl?: string;
  installCount: number;
  rating: number;
  ratingCount: number;
}

/**
 * Module document interface
 */
export interface IModuleDocument extends IModule, Document {
  incrementInstallCount(): Promise<void>;
  updateRating(newRating: number): Promise<void>;
}

/**
 * Author schema
 */
const AuthorSchema = new Schema<IAuthor>(
  {
    id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    website: { type: String },
    email: { type: String },
  },
  { _id: false }
);

/**
 * Dependency schema
 */
const DependencySchema = new Schema<IDependency>(
  {
    id: { type: String, required: true },
    version: { type: String, required: true },
    optional: { type: Boolean, default: false },
  },
  { _id: false }
);

/**
 * Capability schema
 */
const CapabilitySchema = new Schema<ICapability>(
  {
    id: { type: String, required: true },
    version: { type: String, required: true },
    optional: { type: Boolean, default: false },
  },
  { _id: false }
);

/**
 * Protocol support schema
 */
const ProtocolSupportSchema = new Schema<IProtocolSupport>(
  {
    name: { type: String, required: true },
    version: { type: String, required: true },
  },
  { _id: false }
);

/**
 * Compatibility schema
 */
const CompatibilitySchema = new Schema<ICompatibility>(
  {
    minPlatformVersion: { type: String, required: true },
    targetPlatformVersion: { type: String, required: true },
    supportedProtocols: [ProtocolSupportSchema],
    supportedModalities: [{ type: String }],
  },
  { _id: false }
);

/**
 * UI component definition schema
 */
const UIComponentDefinitionSchema = new Schema<IUIComponentDefinition>(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    location: { type: String, required: true },
    component: { type: String, required: true },
    props: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

/**
 * Module metadata schema
 */
const ModuleMetadataSchema = new Schema<IModuleMetadata>(
  {
    schemaVersion: { type: String, required: true },
    license: { type: String, required: true },
    tags: [{ type: String }],
    dependencies: [DependencySchema],
    permissions: [{ type: String }],
    capabilities: [CapabilitySchema],
    compatibility: { type: CompatibilitySchema, required: true },
    uiComponents: [UIComponentDefinitionSchema],
  },
  { _id: false }
);

/**
 * Module schema
 */
const ModuleSchema = new Schema<IModuleDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    version: {
      type: String,
      required: true,
      match:
        /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/,
    },
    type: {
      type: String,
      enum: Object.values(ModuleType),
      required: true,
    },
    author: {
      type: AuthorSchema,
      required: true,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    publishedAt: { type: Date },
    requiresReview: { type: Boolean, default: true },
    reviewStatus: {
      type: String,
      enum: Object.values(ReviewStatus),
      default: ReviewStatus.PENDING,
    },
    metadata: {
      type: ModuleMetadataSchema,
      required: true,
    },
    packageUrl: { type: String },
    iconUrl: { type: String },
    documentationUrl: { type: String },
    repositoryUrl: { type: String },
    installCount: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
ModuleSchema.index({ name: 1 });
ModuleSchema.index({ 'author.id': 1 });
ModuleSchema.index({ type: 1 });
ModuleSchema.index({ 'metadata.tags': 1 });
ModuleSchema.index({ reviewStatus: 1 });
ModuleSchema.index({ installCount: -1 });
ModuleSchema.index({ rating: -1 });
ModuleSchema.index({ createdAt: -1 });
ModuleSchema.index({ publishedAt: -1 });
ModuleSchema.index({ name: 'text', description: 'text' });

// Compound indexes
ModuleSchema.index({ type: 1, reviewStatus: 1 });
ModuleSchema.index({ type: 1, 'metadata.tags': 1 });
ModuleSchema.index({ type: 1, rating: -1 });
ModuleSchema.index({ type: 1, installCount: -1 });

// Methods
ModuleSchema.methods.incrementInstallCount = async function (): Promise<void> {
  this.installCount += 1;
  await this.save();
};

ModuleSchema.methods.updateRating = async function (newRating: number): Promise<void> {
  // Calculate new average rating
  const totalRating = this.rating * this.ratingCount + newRating;
  this.ratingCount += 1;
  this.rating = totalRating / this.ratingCount;
  await this.save();
};

// Pre-save hook
ModuleSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Create and export the model
export const Module = mongoose.model<IModuleDocument>('Module', ModuleSchema);
