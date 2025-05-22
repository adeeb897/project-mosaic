/**
 * Conversation model for Project Mosaic
 */
import mongoose, { Document, Schema } from 'mongoose';
import { ConversationStatus } from '../../types';

/**
 * Message content interface
 */
export interface IMessageContent {
  type: string;
  value: any;
}

/**
 * Token usage interface
 */
export interface ITokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

/**
 * Tool call interface
 */
export interface IToolCall {
  toolId: string;
  parameters: Record<string, any>;
  result: any;
  error?: string;
  startTime: Date;
  endTime: Date;
}

/**
 * Annotation interface
 */
export interface IAnnotation {
  type: string;
  startIndex: number;
  endIndex: number;
  metadata: Record<string, any>;
}

/**
 * Message metadata interface
 */
export interface IMessageMetadata {
  sourceModules?: string[];
  processingTime?: number;
  tokens?: ITokenUsage;
  toolCalls?: IToolCall[];
  annotations?: IAnnotation[];
}

/**
 * Message interface
 */
export interface IMessage {
  conversationId: Schema.Types.ObjectId;
  role: 'user' | 'assistant' | 'system';
  content: IMessageContent[];
  createdAt: Date;
  updatedAt?: Date;
  metadata: IMessageMetadata;
}

/**
 * Memory element interface
 */
export interface IMemoryElement {
  id: string;
  type: string;
  content: any;
  relevanceScore?: number;
  timestamp: Date;
  source: string;
}

/**
 * Historical interaction interface
 */
export interface IHistoricalInteraction {
  type: string;
  timestamp: Date;
  summary: string;
  relevanceScore: number;
}

/**
 * User context profile interface
 */
export interface IUserContextProfile {
  preferences: Record<string, any>;
  history: IHistoricalInteraction[];
  knownFacts: Record<string, any>;
}

/**
 * Device info interface
 */
export interface IDeviceInfo {
  type: string;
  screenSize?: {
    width: number;
    height: number;
  };
  capabilities: string[];
}

/**
 * Location info interface
 */
export interface ILocationInfo {
  country: string;
  region?: string;
  city?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Environment context interface
 */
export interface IEnvironmentContext {
  timezone: string;
  locale: string;
  device: IDeviceInfo;
  location?: ILocationInfo;
  currentTime: Date;
}

/**
 * Conversation context interface
 */
export interface IConversationContext {
  systemPrompt: string;
  personaAttributes: Record<string, any>;
  memoryElements: IMemoryElement[];
  activeTools: string[];
  userProfile: IUserContextProfile;
  environmentContext: IEnvironmentContext;
  customData: Record<string, any>;
}

/**
 * Conversation interface
 */
export interface IConversation {
  title?: string;
  userId: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
  messages: Schema.Types.ObjectId[];
  context: IConversationContext;
  activeModules: Schema.Types.ObjectId[];
  profile: Schema.Types.ObjectId;
  status: ConversationStatus;
  metadata: Record<string, any>;
  folderPath?: string;
  pinned: boolean;
  sharedWith: Schema.Types.ObjectId[];
}

/**
 * Message document interface
 */
export interface IMessageDocument extends IMessage, Document {}

/**
 * Conversation document interface
 */
export interface IConversationDocument extends IConversation, Document {
  addMessage(message: IMessage): Promise<IMessageDocument>;
  updateContext(contextUpdates: Partial<IConversationContext>): Promise<void>;
  archive(): Promise<void>;
  delete(): Promise<void>;
}

/**
 * Message content schema
 */
const MessageContentSchema = new Schema<IMessageContent>(
  {
    type: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

/**
 * Token usage schema
 */
const TokenUsageSchema = new Schema<ITokenUsage>(
  {
    prompt: { type: Number, required: true },
    completion: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  { _id: false }
);

/**
 * Tool call schema
 */
const ToolCallSchema = new Schema<IToolCall>(
  {
    toolId: { type: String, required: true },
    parameters: { type: Schema.Types.Mixed, required: true },
    result: { type: Schema.Types.Mixed },
    error: { type: String },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
  },
  { _id: false }
);

/**
 * Annotation schema
 */
const AnnotationSchema = new Schema<IAnnotation>(
  {
    type: { type: String, required: true },
    startIndex: { type: Number, required: true },
    endIndex: { type: Number, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

/**
 * Message metadata schema
 */
const MessageMetadataSchema = new Schema<IMessageMetadata>(
  {
    sourceModules: [{ type: String }],
    processingTime: { type: Number },
    tokens: { type: TokenUsageSchema },
    toolCalls: [ToolCallSchema],
    annotations: [AnnotationSchema],
  },
  { _id: false }
);

/**
 * Message schema
 */
const MessageSchema = new Schema<IMessageDocument>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: [MessageContentSchema],
      required: true,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
    metadata: {
      type: MessageMetadataSchema,
      default: () => ({}),
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

/**
 * Memory element schema
 */
const MemoryElementSchema = new Schema<IMemoryElement>(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    content: { type: Schema.Types.Mixed, required: true },
    relevanceScore: { type: Number },
    timestamp: { type: Date, required: true },
    source: { type: String, required: true },
  },
  { _id: false }
);

/**
 * Historical interaction schema
 */
const HistoricalInteractionSchema = new Schema<IHistoricalInteraction>(
  {
    type: { type: String, required: true },
    timestamp: { type: Date, required: true },
    summary: { type: String, required: true },
    relevanceScore: { type: Number, required: true },
  },
  { _id: false }
);

/**
 * User context profile schema
 */
const UserContextProfileSchema = new Schema<IUserContextProfile>(
  {
    preferences: { type: Schema.Types.Mixed, default: {} },
    history: [HistoricalInteractionSchema],
    knownFacts: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

/**
 * Device info schema
 */
const DeviceInfoSchema = new Schema<IDeviceInfo>(
  {
    type: { type: String, required: true },
    screenSize: {
      width: { type: Number },
      height: { type: Number },
    },
    capabilities: [{ type: String }],
  },
  { _id: false }
);

/**
 * Location info schema
 */
const LocationInfoSchema = new Schema<ILocationInfo>(
  {
    country: { type: String, required: true },
    region: { type: String },
    city: { type: String },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
  },
  { _id: false }
);

/**
 * Environment context schema
 */
const EnvironmentContextSchema = new Schema<IEnvironmentContext>(
  {
    timezone: { type: String, required: true },
    locale: { type: String, required: true },
    device: { type: DeviceInfoSchema, required: true },
    location: { type: LocationInfoSchema },
    currentTime: { type: Date, required: true },
  },
  { _id: false }
);

/**
 * Conversation context schema
 */
const ConversationContextSchema = new Schema<IConversationContext>(
  {
    systemPrompt: { type: String, required: true },
    personaAttributes: { type: Schema.Types.Mixed, default: {} },
    memoryElements: [MemoryElementSchema],
    activeTools: [{ type: String }],
    userProfile: { type: UserContextProfileSchema, required: true },
    environmentContext: { type: EnvironmentContextSchema, required: true },
    customData: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

/**
 * Conversation schema
 */
const ConversationSchema = new Schema<IConversationDocument>(
  {
    title: { type: String },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastMessageAt: { type: Date, default: Date.now },
    messages: [{ type: Schema.Types.ObjectId, ref: 'Message' }],
    context: { type: ConversationContextSchema, required: true },
    activeModules: [{ type: Schema.Types.ObjectId, ref: 'Module' }],
    profile: {
      type: Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ConversationStatus),
      default: ConversationStatus.ACTIVE,
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
    folderPath: { type: String },
    pinned: { type: Boolean, default: false },
    sharedWith: [{ type: Schema.Types.ObjectId, ref: 'User' }],
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

// Indexes for Message
MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ role: 1 });
MessageSchema.index({ createdAt: 1 });
MessageSchema.index({ 'metadata.sourceModules': 1 });
MessageSchema.index({ 'content.type': 1 });

// Indexes for Conversation
ConversationSchema.index({ userId: 1, createdAt: -1 });
ConversationSchema.index({ userId: 1, status: 1 });
ConversationSchema.index({ userId: 1, pinned: -1, lastMessageAt: -1 });
ConversationSchema.index({ profile: 1 });
ConversationSchema.index({ status: 1 });
ConversationSchema.index({ lastMessageAt: -1 });
ConversationSchema.index({ folderPath: 1 });
ConversationSchema.index({ sharedWith: 1 });
ConversationSchema.index({ title: 'text' });

// Compound indexes
ConversationSchema.index({ userId: 1, folderPath: 1 });
ConversationSchema.index({ userId: 1, activeModules: 1 });

// Methods for Conversation
ConversationSchema.methods.addMessage = async function (
  message: IMessage
): Promise<IMessageDocument> {
  const messageDoc = new Message({
    ...message,
    conversationId: this._id,
  });
  await messageDoc.save();

  this.messages.push(messageDoc._id);
  this.lastMessageAt = new Date();
  await this.save();

  return messageDoc;
};

ConversationSchema.methods.updateContext = async function (
  contextUpdates: Partial<IConversationContext>
): Promise<void> {
  this.context = {
    ...this.context,
    ...contextUpdates,
  };
  this.updatedAt = new Date();
  await this.save();
};

ConversationSchema.methods.archive = async function (): Promise<void> {
  this.status = ConversationStatus.ARCHIVED;
  this.updatedAt = new Date();
  await this.save();
};

ConversationSchema.methods.delete = async function (): Promise<void> {
  this.status = ConversationStatus.DELETED;
  this.updatedAt = new Date();
  await this.save();
};

// Pre-save hook for Conversation
ConversationSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Create and export the models
export const Message = mongoose.model<IMessageDocument>('Message', MessageSchema);
export const Conversation = mongoose.model<IConversationDocument>(
  'Conversation',
  ConversationSchema
);
