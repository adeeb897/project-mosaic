/**
 * Attributes that define an AI personality
 */
export interface PersonalityAttributes {
  /**
   * Conversation style attributes
   */
  conversationStyle: ConversationStyle;

  /**
   * Knowledge areas the personality specializes in
   */
  knowledgeAreas: KnowledgeArea[];

  /**
   * Emotional intelligence attributes
   */
  emotionalIntelligence: EmotionalIntelligence;

  /**
   * Response formatting preferences
   */
  responseFormatting: ResponseFormatting;

  /**
   * Proactivity settings
   */
  proactivity: ProactivitySettings;

  /**
   * Ethical boundaries
   */
  ethicalBoundaries: EthicalBoundaries;
}

/**
 * Conversation style attributes
 */
export interface ConversationStyle {
  /**
   * Formality level (0-100 scale)
   */
  formality: number;

  /**
   * Verbosity level (0-100 scale)
   */
  verbosity: number;

  /**
   * Humor level (0-100 scale)
   */
  humor: number;

  /**
   * Creativity level (0-100 scale)
   */
  creativity: number;

  /**
   * Empathy level (0-100 scale)
   */
  empathy: number;

  /**
   * Tone descriptors
   */
  tone: string[];

  /**
   * Vocabulary complexity
   */
  vocabulary: 'simple' | 'moderate' | 'advanced' | 'technical';

  /**
   * Whether to express personal perspective
   */
  perspectiveExpression: boolean;
}

/**
 * Knowledge area
 */
export interface KnowledgeArea {
  /**
   * Name of the knowledge area
   */
  name: string;

  /**
   * Expertise level (0-100 scale)
   */
  expertise: number;

  /**
   * Information sources
   */
  sources?: string[];

  /**
   * Confidence threshold for providing information
   */
  confidenceThreshold?: number;
}

/**
 * Emotional intelligence attributes
 */
export interface EmotionalIntelligence {
  /**
   * Empathy level (0-100 scale)
   */
  empathyLevel: number;

  /**
   * Whether to recognize emotions in user messages
   */
  emotionRecognition: boolean;

  /**
   * Whether to analyze sentiment in user messages
   */
  sentimentAnalysis: boolean;

  /**
   * Whether to remember emotional context across conversation
   */
  emotionalMemory: boolean;

  /**
   * Whether to provide supportive responses for negative emotions
   */
  supportiveResponses: boolean;
}

/**
 * Response formatting preferences
 */
export interface ResponseFormatting {
  /**
   * Default format for responses
   */
  defaultFormat: 'paragraph' | 'bullet' | 'numbered';

  /**
   * Whether to use markdown formatting
   */
  markdown: boolean;

  /**
   * Whether to include citations
   */
  citations: boolean;

  /**
   * Whether to include structured data when appropriate
   */
  structuredData: boolean;

  /**
   * Brevity preference (0-100 scale, higher = more concise)
   */
  brevityPreference: number;
}

/**
 * Proactivity settings
 */
export interface ProactivitySettings {
  /**
   * Frequency of suggestions (0-100 scale)
   */
  suggestionFrequency: number;

  /**
   * Level of initiative (0-100 scale)
   */
  initiativeLevel: number;

  /**
   * Whether to ask follow-up questions
   */
  followUpQuestions: boolean;

  /**
   * Whether to expand on topics beyond what was explicitly asked
   */
  topicExpansion: boolean;

  /**
   * Whether to suggest relevant resources
   */
  resourceSuggestions: boolean;
}

/**
 * Ethical boundaries
 */
export interface EthicalBoundaries {
  /**
   * Content policy description
   */
  contentPolicy: string;

  /**
   * Safety level
   */
  safetyLevel: 'strict' | 'moderate' | 'minimal';

  /**
   * How to handle refusals
   */
  refusalBehavior: 'polite' | 'direct' | 'redirect';

  /**
   * Whether to be transparent about limitations
   */
  transparency: boolean;

  /**
   * Whether to acknowledge potential biases
   */
  biasAwareness: boolean;
}
