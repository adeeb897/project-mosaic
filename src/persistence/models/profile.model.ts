/**
 * Profile model for Project Mosaic
 */
import mongoose, { Document, Schema } from 'mongoose';

/**
 * Module reference interface
 */
export interface IModuleReference {
  moduleId: Schema.Types.ObjectId;
  version: string;
  config: Record<string, any>;
  priority: number;
  isActive: boolean;
}

/**
 * Profile interface
 */
export interface IProfile {
  userId: Schema.Types.ObjectId;
  name: string;
  description?: string;
  modules: IModuleReference[];
  defaultModality: string;
  createdAt: Date;
  updatedAt: Date;
  isDefault: boolean;
  shareCode?: string;
  tags: string[];
  metadata: Record<string, any>;
  icon?: string;
  color?: string;
  isPublic: boolean;
  clonedFrom?: Schema.Types.ObjectId;
  cloneCount: number;
  lastUsed?: Date;
}

/**
 * Profile document interface
 */
export interface IProfileDocument extends IProfile, Document {
  addModule(moduleRef: IModuleReference): Promise<void>;
  removeModule(moduleId: Schema.Types.ObjectId): Promise<void>;
  updateModuleConfig(moduleId: Schema.Types.ObjectId, config: Record<string, any>): Promise<void>;
  setAsDefault(): Promise<void>;
  generateShareCode(): Promise<string>;
  incrementCloneCount(): Promise<void>;
}

/**
 * Module reference schema
 */
const ModuleReferenceSchema = new Schema<IModuleReference>(
  {
    moduleId: {
      type: Schema.Types.ObjectId,
      ref: 'Module',
      required: true,
    },
    version: {
      type: String,
      required: true,
    },
    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
    priority: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

/**
 * Profile schema
 */
const ProfileSchema = new Schema<IProfileDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    modules: [ModuleReferenceSchema],
    defaultModality: {
      type: String,
      default: 'text',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    shareCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    tags: [{ type: String }],
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    icon: {
      type: String,
    },
    color: {
      type: String,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    clonedFrom: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
    },
    cloneCount: {
      type: Number,
      default: 0,
    },
    lastUsed: {
      type: Date,
    },
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
ProfileSchema.index({ userId: 1, name: 1 }, { unique: true });
ProfileSchema.index({ userId: 1, isDefault: 1 });
ProfileSchema.index({ userId: 1, createdAt: -1 });
ProfileSchema.index({ userId: 1, lastUsed: -1 });
ProfileSchema.index({ shareCode: 1 });
ProfileSchema.index({ isPublic: 1 });
ProfileSchema.index({ tags: 1 });
ProfileSchema.index({ clonedFrom: 1 });
ProfileSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Compound indexes
ProfileSchema.index({ userId: 1, 'modules.moduleId': 1 });
ProfileSchema.index({ isPublic: 1, cloneCount: -1 });

// Methods
ProfileSchema.methods.addModule = async function (moduleRef: IModuleReference): Promise<void> {
  // Check if module already exists
  const existingIndex = this.modules.findIndex(
    (m: IModuleReference) => m.moduleId.toString() === moduleRef.moduleId.toString()
  );

  if (existingIndex >= 0) {
    // Update existing module
    this.modules[existingIndex] = {
      ...this.modules[existingIndex],
      ...moduleRef,
    };
  } else {
    // Add new module
    this.modules.push(moduleRef);
  }

  this.updatedAt = new Date();
  await this.save();
};

ProfileSchema.methods.removeModule = async function (
  moduleId: Schema.Types.ObjectId
): Promise<void> {
  this.modules = this.modules.filter(
    (m: IModuleReference) => m.moduleId.toString() !== moduleId.toString()
  );
  this.updatedAt = new Date();
  await this.save();
};

ProfileSchema.methods.updateModuleConfig = async function (
  moduleId: Schema.Types.ObjectId,
  config: Record<string, any>
): Promise<void> {
  const moduleIndex = this.modules.findIndex(
    (m: IModuleReference) => m.moduleId.toString() === moduleId.toString()
  );

  if (moduleIndex >= 0) {
    this.modules[moduleIndex].config = {
      ...this.modules[moduleIndex].config,
      ...config,
    };
    this.updatedAt = new Date();
    await this.save();
  } else {
    throw new Error(`Module ${moduleId} not found in profile`);
  }
};

ProfileSchema.methods.setAsDefault = async function (): Promise<void> {
  // First, unset default flag on all other profiles for this user
  await (this.constructor as any).updateMany(
    { userId: this.userId, _id: { $ne: this._id } },
    { isDefault: false }
  );

  // Then set this profile as default
  this.isDefault = true;
  this.updatedAt = new Date();
  await this.save();
};

ProfileSchema.methods.generateShareCode = async function (): Promise<string> {
  // Generate a random share code
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let shareCode = '';
  for (let i = 0; i < 10; i++) {
    shareCode += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  this.shareCode = shareCode;
  this.updatedAt = new Date();
  await this.save();

  return shareCode;
};

ProfileSchema.methods.incrementCloneCount = async function (): Promise<void> {
  this.cloneCount += 1;
  this.updatedAt = new Date();
  await this.save();
};

// Pre-save hook
ProfileSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Create and export the model
export const Profile = mongoose.model<IProfileDocument>('Profile', ProfileSchema);
