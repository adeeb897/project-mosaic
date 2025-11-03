import { Router } from 'express';
import { asyncHandler, ApiError } from '../middleware';
import { authenticate } from '../middleware/auth.middleware';
import { AuthService, OAuthProvider } from '../../services/auth/auth.service';

const router = Router();
const authService = new AuthService();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { username, email, password, displayName } = req.body;

    // Validate input
    if (!username || !email || !password) {
      throw new ApiError(400, 'Username, email, and password are required');
    }

    // Register user
    const { user, tokens } = await authService.register(username, email, password, displayName);

    // Return user and tokens
    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
        },
        tokens,
      },
    });
  })
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user and get token
 * @access  Public
 */
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      throw new ApiError(400, 'Email and password are required');
    }

    // Login user
    const { user, tokens } = await authService.login(email, password);

    // Return user and tokens
    res.status(200).json({
      status: 'success',
      message: 'User logged in successfully',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
        },
        tokens,
      },
    });
  })
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    // Validate input
    if (!refreshToken) {
      throw new ApiError(400, 'Refresh token is required');
    }

    // Refresh token
    const tokens = await authService.refreshToken(refreshToken);

    // Return new tokens
    res.status(200).json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: {
        tokens,
      },
    });
  })
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    // User is set by authenticate middleware
    const user = req.user;

    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    // Return user data
    res.status(200).json({
      id: user.id,
      email: user.email,
      roles: user.roles,
      // Add any other user properties you want to return
      username: user.email.split('@')[0], // Generate username from email for now
      displayName: user.email.split('@')[0],
    });
  })
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const { userId, tokenId } = req.body;

    // Validate input
    if (!userId) {
      throw new ApiError(400, 'User ID is required');
    }

    // Logout user
    await authService.logout(userId, tokenId);

    // Return success
    res.status(200).json({
      status: 'success',
      message: 'User logged out successfully',
    });
  })
);

/**
 * @route   GET /api/v1/auth/oauth/:provider
 * @desc    Get OAuth authorization URL
 * @access  Public
 */
router.get(
  '/oauth/:provider',
  asyncHandler(async (req, res) => {
    const { provider } = req.params;
    const { state } = req.query;

    // Validate input
    if (!provider || !Object.values(OAuthProvider).includes(provider as OAuthProvider)) {
      throw new ApiError(400, 'Invalid OAuth provider');
    }

    if (!state) {
      throw new ApiError(400, 'State parameter is required');
    }

    // Get authorization URL
    const authUrl = authService.getOAuthAuthorizationUrl(
      provider as OAuthProvider,
      state as string
    );

    // Return authorization URL
    res.status(200).json({
      status: 'success',
      data: {
        authUrl,
      },
    });
  })
);

/**
 * @route   POST /api/v1/auth/oauth/:provider/callback
 * @desc    Handle OAuth callback
 * @access  Public
 */
router.post(
  '/oauth/:provider/callback',
  asyncHandler(async (req, res) => {
    const { provider } = req.params;
    const { code } = req.body;

    // Validate input
    if (!provider || !Object.values(OAuthProvider).includes(provider as OAuthProvider)) {
      throw new ApiError(400, 'Invalid OAuth provider');
    }

    if (!code) {
      throw new ApiError(400, 'Authorization code is required');
    }

    // Authenticate with OAuth
    const { user, tokens, isNewUser } = await authService.authenticateWithOAuth(
      provider as OAuthProvider,
      code
    );

    // Return user and tokens
    res.status(200).json({
      status: 'success',
      message: isNewUser ? 'User registered successfully' : 'User logged in successfully',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
        },
        tokens,
        isNewUser,
      },
    });
  })
);

/**
 * @route   POST /api/v1/auth/oauth/:provider/token
 * @desc    Authenticate with OAuth ID token
 * @access  Public
 */
router.post(
  '/oauth/:provider/token',
  asyncHandler(async (req, res) => {
    const { provider } = req.params;
    const { idToken } = req.body;

    // Validate input
    if (!provider || !Object.values(OAuthProvider).includes(provider as OAuthProvider)) {
      throw new ApiError(400, 'Invalid OAuth provider');
    }

    if (!idToken) {
      throw new ApiError(400, 'ID token is required');
    }

    // Verify ID token
    const { user, tokens, isNewUser } = await authService.verifyIdToken(
      provider as OAuthProvider,
      idToken
    );

    // Return user and tokens
    res.status(200).json({
      status: 'success',
      message: isNewUser ? 'User registered successfully' : 'User logged in successfully',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
        },
        tokens,
        isNewUser,
      },
    });
  })
);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    // Validate input
    if (!email) {
      throw new ApiError(400, 'Email is required');
    }

    // TODO: Implement forgot password functionality

    // Return success
    res.status(200).json({
      status: 'success',
      message: `Password reset email sent to ${email}`,
    });
  })
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password
 * @access  Public
 */
router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    // Validate input
    if (!token || !password) {
      throw new ApiError(400, 'Token and password are required');
    }

    // TODO: Implement reset password functionality

    // Return success
    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully',
    });
  })
);

export const authRoutes = router;
