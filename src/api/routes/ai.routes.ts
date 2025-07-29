import { Router } from 'express';
import { asyncHandler } from '../middleware';
import { authenticate } from '../middleware/auth.middleware';
import { getApiKeyService } from '../../services/ai/api-key.service';
import { getLLMService } from '../../services/ai/llm.service';
import { LLMProvider } from '../../services/ai/llm.service';
import { z } from 'zod';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Get services (lazy initialization to avoid startup errors)
const getServices = () => {
  try {
    return {
      apiKeyService: getApiKeyService(),
      llmService: getLLMService(),
    };
  } catch (error) {
    // Return null services if initialization fails (e.g., missing encryption key)
    return {
      apiKeyService: null,
      llmService: null,
    };
  }
};

/**
 * Validation schemas
 */
const SaveApiKeySchema = z.object({
  provider: z.enum(['anthropic', 'openai', 'google']),
  apiKey: z.string().min(1, 'API key is required'),
});

const ValidateApiKeySchema = z.object({
  provider: z.enum(['anthropic', 'openai', 'google']),
  apiKey: z.string().min(1, 'API key is required'),
});

/**
 * @route   GET /api/v1/ai/providers
 * @desc    Get available AI providers and their models
 * @access  Private
 */
router.get(
  '/providers',
  asyncHandler(async (req, res) => {
    const { llmService } = getServices();

    const providers = {
      anthropic: {
        name: 'Anthropic Claude',
        models: llmService?.getAvailableModels() || [],
        description: 'Advanced AI assistant by Anthropic',
      },
      openai: {
        name: 'OpenAI GPT',
        models: [], // Will be populated when OpenAI integration is added
        description: 'GPT models by OpenAI',
        status: 'coming_soon',
      },
      google: {
        name: 'Google Gemini',
        models: [], // Will be populated when Google integration is added
        description: 'Gemini models by Google',
        status: 'coming_soon',
      },
    };

    res.status(200).json(providers);
  })
);

/**
 * @route   GET /api/v1/ai/providers/configured
 * @desc    Get configured providers for the current user
 * @access  Private
 */
router.get(
  '/providers/configured',
  asyncHandler(async (req, res) => {
    const { apiKeyService } = getServices();
    const userId = req.user?.id || 'dev-user-id';

    if (!apiKeyService) {
      return res.status(503).json({
        error: 'AI services not available',
        message: 'Please check server configuration',
      });
    }

    const configuredProviders = await apiKeyService.getUserProviders(userId);
    const usageStats = await apiKeyService.getUsageStats(userId);

    const result = configuredProviders.map((provider: any) => ({
      provider,
      ...(usageStats[provider as LLMProvider] || { usageCount: 0 }),
      hasValidKey: true,
    }));

    res.status(200).json(result);
  })
);

/**
 * @route   POST /api/v1/ai/providers/:provider/api-key
 * @desc    Save API key for a provider
 * @access  Private
 */
router.post(
  '/providers/:provider/api-key',
  asyncHandler(async (req, res) => {
    const { apiKeyService } = getServices();
    const { provider } = req.params;
    const userId = req.user?.id || 'dev-user-id';

    if (!apiKeyService) {
      return res.status(503).json({
        error: 'AI services not available',
        message: 'Please check server configuration',
      });
    }

    // Validate request body
    const validationResult = SaveApiKeySchema.safeParse({
      provider,
      apiKey: req.body.apiKey,
    });

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: validationResult.error.errors,
      });
    }

    const { apiKey } = validationResult.data;
    const llmProvider = provider as LLMProvider;

    try {
      await apiKeyService.saveApiKey(userId, llmProvider, apiKey);

      res.status(200).json({
        status: 'success',
        message: `API key saved successfully for ${provider}`,
        provider: llmProvider,
      });
    } catch (error) {
      res.status(400).json({
        error: 'Failed to save API key',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

/**
 * @route   POST /api/v1/ai/providers/:provider/validate
 * @desc    Validate API key for a provider
 * @access  Private
 */
router.post(
  '/providers/:provider/validate',
  asyncHandler(async (req, res) => {
    const { apiKeyService } = getServices();
    const { provider } = req.params;

    if (!apiKeyService) {
      return res.status(503).json({
        error: 'AI services not available',
        message: 'Please check server configuration',
      });
    }

    // Validate request body
    const validationResult = ValidateApiKeySchema.safeParse({
      provider,
      apiKey: req.body.apiKey,
    });

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: validationResult.error.errors,
      });
    }

    const { apiKey } = validationResult.data;
    const llmProvider = provider as LLMProvider;

    try {
      const isValid = await apiKeyService.validateApiKey(llmProvider, apiKey);

      res.status(200).json({
        valid: isValid,
        provider: llmProvider,
        message: isValid ? 'API key is valid' : 'API key is invalid',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to validate API key',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

/**
 * @route   DELETE /api/v1/ai/providers/:provider/api-key
 * @desc    Delete API key for a provider
 * @access  Private
 */
router.delete(
  '/providers/:provider/api-key',
  asyncHandler(async (req, res) => {
    const { apiKeyService } = getServices();
    const { provider } = req.params;
    const userId = req.user?.id || 'dev-user-id';

    if (!apiKeyService) {
      return res.status(503).json({
        error: 'AI services not available',
        message: 'Please check server configuration',
      });
    }

    if (!['anthropic', 'openai', 'google'].includes(provider)) {
      return res.status(400).json({
        error: 'Invalid provider',
        message: 'Provider must be one of: anthropic, openai, google',
      });
    }

    const llmProvider = provider as LLMProvider;

    try {
      await apiKeyService.deleteApiKey(userId, llmProvider);

      res.status(200).json({
        status: 'success',
        message: `API key deleted successfully for ${provider}`,
        provider: llmProvider,
      });
    } catch (error) {
      res.status(400).json({
        error: 'Failed to delete API key',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

/**
 * @route   GET /api/v1/ai/usage
 * @desc    Get usage statistics for the current user
 * @access  Private
 */
router.get(
  '/usage',
  asyncHandler(async (req, res) => {
    const { apiKeyService } = getServices();
    const userId = req.user?.id || 'dev-user-id';

    if (!apiKeyService) {
      return res.status(503).json({
        error: 'AI services not available',
        message: 'Please check server configuration',
      });
    }

    try {
      const usageStats = await apiKeyService.getUsageStats(userId);

      res.status(200).json(usageStats);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get usage statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

/**
 * @route   GET /api/v1/ai/models/:provider
 * @desc    Get available models for a specific provider
 * @access  Private
 */
router.get(
  '/models/:provider',
  asyncHandler(async (req, res) => {
    const { provider } = req.params;

    if (!['anthropic', 'openai', 'google'].includes(provider)) {
      return res.status(400).json({
        error: 'Invalid provider',
        message: 'Provider must be one of: anthropic, openai, google',
      });
    }

    // Temporarily initialize LLM service to get models
    const tempLlmService = getLLMService();

    // Mock initialization to get model list
    const models = tempLlmService.getAvailableModels();

    res.status(200).json({
      provider,
      models,
    });
  })
);

/**
 * @route   POST /api/v1/ai/test-connection
 * @desc    Test connection to AI provider with user's stored API key
 * @access  Private
 */
router.post(
  '/test-connection',
  asyncHandler(async (req, res) => {
    const { apiKeyService } = getServices();
    const { provider } = req.body;
    const userId = req.user?.id || 'dev-user-id';

    if (!apiKeyService) {
      return res.status(503).json({
        error: 'AI services not available',
        message: 'Please check server configuration',
      });
    }

    if (!provider || !['anthropic', 'openai', 'google'].includes(provider)) {
      return res.status(400).json({
        error: 'Invalid or missing provider',
        message: 'Provider must be one of: anthropic, openai, google',
      });
    }

    const llmProvider = provider as LLMProvider;

    try {
      // Check if user has API key for this provider
      const hasValidKey = await apiKeyService.hasValidApiKey(userId, llmProvider);

      if (!hasValidKey) {
        return res.status(400).json({
          error: 'No API key configured',
          message: `Please configure an API key for ${provider} first`,
        });
      }

      // Get the API key and test it
      const apiKey = await apiKeyService.getApiKey(userId, llmProvider);
      if (!apiKey) {
        return res.status(400).json({
          error: 'API key not found',
          message: 'API key could not be retrieved',
        });
      }

      const isValid = await apiKeyService.validateApiKey(llmProvider, apiKey);

      if (isValid) {
        // Track the test as usage
        await apiKeyService.trackUsage(userId, llmProvider);
      }

      res.status(200).json({
        success: isValid,
        provider: llmProvider,
        message: isValid
          ? `Successfully connected to ${provider}`
          : `Failed to connect to ${provider}`,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Connection test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })
);

export const aiRoutes = router;
