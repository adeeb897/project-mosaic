/**
 * API Key model for Project Mosaic
 */
import mongoose, { Document, Schema } from 'mongoose';

/**
 * API Key interface
 */
export interface IApiKey {
  userId: Schema.Types.ObjectId;
  provider: string;
  encryptedKey: string;
  keyHash: string;
  isActive: boolean;
  lastUsed?: Date;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * API Key document interface
 */
export interface IApiKeyDocument extends IApiKey, Document {
  incrementUsage(): Promise<void>;
  deactivate(): Promise<void>;
  activate(): Promise<void>;
}

/**
 * API Key schema
 */
const ApiKeySchema = new Schema<IApiKeyDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      enum: ['anthropic', 'openai', 'google'],
      index: true,
    },
    encryptedKey: {
      type: String,
      required: true,
    },
    keyHash: {
      type: String,
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastUsed: {
      type: Date,
      index: true,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        delete ret.__v;
        delete ret.encryptedKey; // Never expose encrypted key in JSON
        delete ret.keyHash; // Never expose hash in JSON
        return ret;
      },
    },
  }
);

// Compound indexes
ApiKeySchema.index({ userId: 1, provider: 1 }, { unique: true });
ApiKeySchema.index({ userId: 1, isActive: 1 });
ApiKeySchema.index({ provider: 1, isActive: 1 });
ApiKeySchema.index({ lastUsed: -1 });

// Instance methods
ApiKeySchema.methods.incrementUsage = async function (): Promise<void> {
  this.usageCount += 1;
  this.lastUsed = new Date();
  await this.save();
};

ApiKeySchema.methods.deactivate = async function (): Promise<void> {
  this.isActive = false;
  await this.save();
};

ApiKeySchema.methods.activate = async function (): Promise<void> {
  this.isActive = true;
  await this.save();
};

// Pre-save hook
ApiKeySchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Create and export the model
export const ApiKey = mongoose.model<IApiKeyDocument>('ApiKey', ApiKeySchema);
