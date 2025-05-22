/**
 * User model for Project Mosaic
 */
import mongoose, { Document, Schema } from 'mongoose';
import { UserStatus } from '../../types';

/**
 * User notification settings interface
 */
export interface INotificationSettings {
  email: boolean;
  push: boolean;
  inApp: boolean;
  digestFrequency: 'daily' | 'weekly' | 'never';
}

/**
 * User privacy settings interface
 */
export interface IPrivacySettings {
  shareUsageData: boolean;
  shareConversations: boolean;
  allowProfileDiscovery: boolean;
}

/**
 * User accessibility settings interface
 */
export interface IAccessibilitySettings {
  highContrast: boolean;
  fontSize: number;
  reduceMotion: boolean;
  screenReader: boolean;
}

/**
 * User modality preference interface
 */
export interface IModalityPreference {
  type: string;
  priority: number;
  enabled: boolean;
}

/**
 * User preferences interface
 */
export interface IUserPreferences {
  theme: 'light' | 'dark' | 'system';
  defaultProfile: Schema.Types.ObjectId;
  preferredModalities: IModalityPreference[];
  messageBubbleStyle: string;
  notificationSettings: INotificationSettings;
  privacySettings: IPrivacySettings;
  accessibilitySettings: IAccessibilitySettings;
}

/**
 * Permission interface
 */
export interface IPermission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'execute';
}

/**
 * Role interface
 */
export interface IRole {
  name: string;
  permissions: IPermission[];
}

/**
 * User interface
 */
export interface IUser {
  username: string;
  email: string;
  passwordHash: string;
  displayName?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  preferences: IUserPreferences;
  roles: IRole[];
  status: UserStatus;
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  failedLoginAttempts: number;
  lockUntil?: Date;
}

/**
 * User document interface
 */
export interface IUserDocument extends IUser, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
  isLocked(): boolean;
}

/**
 * Notification settings schema
 */
const NotificationSettingsSchema = new Schema<INotificationSettings>(
  {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true },
    digestFrequency: { type: String, enum: ['daily', 'weekly', 'never'], default: 'daily' },
  },
  { _id: false }
);

/**
 * Privacy settings schema
 */
const PrivacySettingsSchema = new Schema<IPrivacySettings>(
  {
    shareUsageData: { type: Boolean, default: true },
    shareConversations: { type: Boolean, default: false },
    allowProfileDiscovery: { type: Boolean, default: false },
  },
  { _id: false }
);

/**
 * Accessibility settings schema
 */
const AccessibilitySettingsSchema = new Schema<IAccessibilitySettings>(
  {
    highContrast: { type: Boolean, default: false },
    fontSize: { type: Number, default: 16 },
    reduceMotion: { type: Boolean, default: false },
    screenReader: { type: Boolean, default: false },
  },
  { _id: false }
);

/**
 * Modality preference schema
 */
const ModalityPreferenceSchema = new Schema<IModalityPreference>(
  {
    type: { type: String, required: true },
    priority: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

/**
 * User preferences schema
 */
const UserPreferencesSchema = new Schema<IUserPreferences>(
  {
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    defaultProfile: { type: Schema.Types.ObjectId, ref: 'Profile' },
    preferredModalities: [ModalityPreferenceSchema],
    messageBubbleStyle: { type: String, default: 'modern' },
    notificationSettings: { type: NotificationSettingsSchema, default: () => ({}) },
    privacySettings: { type: PrivacySettingsSchema, default: () => ({}) },
    accessibilitySettings: { type: AccessibilitySettingsSchema, default: () => ({}) },
  },
  { _id: false }
);

/**
 * Permission schema
 */
const PermissionSchema = new Schema<IPermission>(
  {
    resource: { type: String, required: true },
    action: {
      type: String,
      enum: ['create', 'read', 'update', 'delete', 'execute'],
      required: true,
    },
  },
  { _id: false }
);

/**
 * Role schema
 */
const RoleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true },
    permissions: [PermissionSchema],
  },
  { _id: false }
);

/**
 * User schema
 */
const UserSchema = new Schema<IUserDocument>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-zA-Z0-9_-]+$/,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^\S+@\S+\.\S+$/,
    },
    passwordHash: { type: String, required: true },
    displayName: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date },
    preferences: { type: UserPreferencesSchema, default: () => ({}) },
    roles: [RoleSchema],
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.PENDING_VERIFICATION,
    },
    verificationToken: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        delete ret.passwordHash;
        delete ret.verificationToken;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        delete ret.failedLoginAttempts;
        delete ret.lockUntil;
        return ret;
      },
    },
  }
);

// Indexes
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ 'roles.name': 1 });
UserSchema.index({ createdAt: 1 });
UserSchema.index({ updatedAt: 1 });

// Methods
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  // In a real implementation, this would use bcrypt to compare the password
  // For now, we'll return a placeholder
  return candidatePassword === this.passwordHash;
};

UserSchema.methods.isLocked = function (): boolean {
  // Check if the account is locked
  return !!(this.lockUntil && this.lockUntil > new Date());
};

// Pre-save hook
UserSchema.pre('save', function (next) {
  if (this.isModified('passwordHash')) {
    // In a real implementation, this would hash the password using bcrypt
    // For now, we'll just pass through
  }

  this.updatedAt = new Date();
  next();
});

// Create and export the model
export const User = mongoose.model<IUserDocument>('User', UserSchema);
