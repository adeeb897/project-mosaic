import { Router } from 'express';
import { asyncHandler } from '../middleware';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';
import { UserStatus } from '../../types';

const router = Router();

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Private/Admin
 */
router.get(
  '/',
  ...adminMiddleware,
  asyncHandler(async (req, res) => {
    // Get query parameters for pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;

    // Get users from database
    const { getCollection } = await import('../../persistence/database');
    const collection = getCollection('users') as any;

    // Build query
    const query: any = {};
    if (status) {
      query.status = status;
    }

    // Get users with pagination
    const users = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    res.status(200).json(users);
  })
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private/Admin
 */
router.get(
  '/:id',
  ...adminMiddleware,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Get user from database
    const { getCollection } = await import('../../persistence/database');
    const collection = getCollection('users') as any;
    const user = await collection.findOne({ id });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    res.status(200).json(user);
  })
);

/**
 * @route   POST /api/users
 * @desc    Create a new user
 * @access  Private/Admin
 */
router.post(
  '/',
  ...adminMiddleware,
  asyncHandler(async (req, res) => {
    const userData = req.body;

    // Check if username already exists
    const { getCollection } = await import('../../persistence/database');
    const collection = getCollection('users') as any;

    const existingUsername = await collection.findOne({ username: userData.username });
    if (existingUsername) {
      return res.status(400).json({
        error: 'Username already exists',
      });
    }

    // Check if email already exists
    const existingEmail = await collection.findOne({ email: userData.email });
    if (existingEmail) {
      return res.status(400).json({
        error: 'Email already exists',
      });
    }

    // Create new user
    const { insertedId } = await collection.insertOne({
      ...userData,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Get the created user
    const newUser = await collection.findOne({ id: insertedId });

    // Remove password from response
    if (newUser) {
      delete newUser.password;
    }

    res.status(201).json(newUser);
  })
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private
 */
router.put(
  '/:id',
  ...authMiddleware,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userData = req.body;

    // Get user from database
    const { getCollection } = await import('../../persistence/database');
    const collection = getCollection('users') as any;
    const user = await collection.findOne({ id });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    // Update user
    const { modifiedCount } = await collection.updateOne(
      { id },
      {
        $set: {
          ...userData,
          updatedAt: new Date(),
        },
      }
    );

    if (modifiedCount === 0) {
      return res.status(400).json({
        error: 'Failed to update user',
      });
    }

    // Get the updated user
    const updatedUser = await collection.findOne({ id });

    res.status(200).json(updatedUser);
  })
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Private/Admin
 */
router.delete(
  '/:id',
  ...adminMiddleware,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Get user from database
    const { getCollection } = await import('../../persistence/database');
    const collection = getCollection('users') as any;
    const user = await collection.findOne({ id });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    // Soft delete - mark user as deleted
    const { modifiedCount } = await collection.updateOne(
      { id },
      {
        $set: {
          status: UserStatus.DELETED,
          updatedAt: new Date(),
        },
      }
    );

    if (modifiedCount === 0) {
      return res.status(400).json({
        error: 'Failed to delete user',
      });
    }

    res.status(200).json({
      success: true,
    });
  })
);

export const userRoutes = router;
