import { Router } from 'express';
import { asyncHandler } from '../middleware';
import { authenticate } from '../middleware/auth.middleware';
import { getChatService } from '../../services/chat/chat.service';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Get chat service instance
const chatService = getChatService();

/**
 * @route   GET /api/v1/chat/sessions
 * @desc    Get all chat sessions for the user
 * @access  Private
 */
router.get(
  '/sessions',
  asyncHandler(async (req, res) => {
    const { userId } = req.query;
    const currentUserId = req.user?.id;

    // Use current user ID if not provided or if different from authenticated user
    const targetUserId = (userId as string) || currentUserId || 'dev-user-id';

    const sessions = await chatService.getSessions(targetUserId);
    res.status(200).json(sessions);
  })
);

/**
 * @route   GET /api/v1/chat/sessions/:id
 * @desc    Get chat session by ID
 * @access  Private
 */
router.get(
  '/sessions/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const session = await chatService.getSession(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.status(200).json(session);
  })
);

/**
 * @route   POST /api/v1/chat/sessions
 * @desc    Create a new chat session
 * @access  Private
 */
router.post(
  '/sessions',
  asyncHandler(async (req, res) => {
    const { title, userId, profileId } = req.body;
    const currentUserId = req.user?.id;

    // Use current user ID if not provided
    const targetUserId = userId || currentUserId;

    const newSession = await chatService.createSession(targetUserId, title, profileId);
    res.status(201).json(newSession);
  })
);

/**
 * @route   GET /api/v1/chat/sessions/:sessionId/messages
 * @desc    Get messages for a specific chat session
 * @access  Private
 */
router.get(
  '/sessions/:sessionId/messages',
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    const messages = await chatService.getMessages(sessionId);
    res.status(200).json(messages);
  })
);

/**
 * @route   POST /api/v1/chat/sessions/:sessionId/messages
 * @desc    Add a new message to a chat session
 * @access  Private
 */
router.post(
  '/sessions/:sessionId/messages',
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { content, role, metadata } = req.body;
    const userId = req.user?.id;

    const newMessage = await chatService.addMessage({
      sessionId,
      content,
      role: role || 'user',
      metadata: metadata || {},
    }, userId);

    res.status(201).json(newMessage);
  })
);

/**
 * @route   DELETE /api/v1/chat/messages/:messageId
 * @desc    Delete a chat message
 * @access  Private
 */
router.delete(
  '/messages/:messageId',
  asyncHandler(async (req, res) => {
    const { messageId } = req.params;

    const success = await chatService.deleteMessage(messageId);
    if (!success) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.status(200).json({
      status: 'success',
      message: `Message ${messageId} deleted successfully`,
    });
  })
);

/**
 * @route   DELETE /api/v1/chat/sessions/:id
 * @desc    Delete chat session
 * @access  Private
 */
router.delete(
  '/sessions/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const success = await chatService.deleteSession(id);
    if (!success) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.status(200).json({
      status: 'success',
      message: `Chat session ${id} deleted successfully`,
    });
  })
);

export const chatRoutes = router;
