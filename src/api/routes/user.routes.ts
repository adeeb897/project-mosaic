import { Router } from 'express';
import { asyncHandler } from '../middleware';

const router = Router();

/**
 * @route   GET /api/v1/users
 * @desc    Get all users
 * @access  Private/Admin
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.status(200).json({
      status: 'success',
      message: 'Get all users - Not implemented yet',
      data: [],
    });
  })
);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Private
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    res.status(200).json({
      status: 'success',
      message: `Get user by ID: ${id} - Not implemented yet`,
      data: { id },
    });
  })
);

/**
 * @route   POST /api/v1/users
 * @desc    Create a new user
 * @access  Private/Admin
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const userData = req.body;

    res.status(201).json({
      status: 'success',
      message: 'Create user - Not implemented yet',
      data: { ...userData, id: 'new-user-id' },
    });
  })
);

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Update user
 * @access  Private
 */
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userData = req.body;

    res.status(200).json({
      status: 'success',
      message: `Update user: ${id} - Not implemented yet`,
      data: { ...userData, id },
    });
  })
);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete user
 * @access  Private/Admin
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    res.status(200).json({
      status: 'success',
      message: `Delete user: ${id} - Not implemented yet`,
    });
  })
);

export const userRoutes = router;
