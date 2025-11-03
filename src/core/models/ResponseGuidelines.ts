/**
 * Guidelines for AI response formatting and style
 */
export interface ResponseGuidelines {
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
