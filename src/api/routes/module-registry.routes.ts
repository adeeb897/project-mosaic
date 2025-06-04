import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { getModuleRegistryService } from '../../services/module/module-registry.service';
import { ModuleType } from '../../core/types/ModuleTypes';
import { ModuleStatus, ReviewStatus } from '../../core/models/Module';
import { logger } from '@utils/logger';

const router = Router();
const moduleRegistry = getModuleRegistryService();

/**
 * Validation middleware
 */
const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * @route   POST /api/modules/register
 * @desc    Register a new module
 * @access  Private (requires authentication)
 */
router.post(
  '/register',
  authMiddleware,
  [
    body('name').notEmpty().withMessage('Module name is required'),
    body('description').notEmpty().withMessage('Module description is required'),
    body('version').notEmpty().withMessage('Module version is required'),
    body('type').isIn(Object.values(ModuleType)).withMessage('Invalid module type'),
    body('author.id').notEmpty().withMessage('Author ID is required'),
    body('author.name').notEmpty().withMessage('Author name is required'),
    body('metadata.schemaVersion').notEmpty().withMessage('Schema version is required'),
    body('metadata.license').notEmpty().withMessage('License is required'),
    body('metadata.compatibility.minPlatformVersion').notEmpty(),
    body('metadata.compatibility.targetPlatformVersion').notEmpty(),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const module = await moduleRegistry.registerModule(req.body);
      res.status(201).json({
        success: true,
        data: module,
      });
    } catch (error: any) {
      logger.error('Failed to register module:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * @route   PUT /api/modules/:moduleId
 * @desc    Update module information
 * @access  Private (requires authentication)
 */
router.put(
  '/:moduleId',
  authMiddleware,
  [
    param('moduleId').notEmpty().withMessage('Module ID is required'),
    body('description').optional().isString(),
    body('status').optional().isIn(Object.values(ModuleStatus)),
    body('reviewStatus').optional().isIn(Object.values(ReviewStatus)),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const module = await moduleRegistry.updateModule(req.params.moduleId, req.body);
      res.json({
        success: true,
        data: module,
      });
    } catch (error: any) {
      logger.error('Failed to update module:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/modules/:moduleId/versions
 * @desc    Publish a new version of a module
 * @access  Private (requires authentication)
 */
router.post(
  '/:moduleId/versions',
  authMiddleware,
  [
    param('moduleId').notEmpty().withMessage('Module ID is required'),
    body('version').notEmpty().withMessage('Version is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('metadata').notEmpty().withMessage('Metadata is required'),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const version = await moduleRegistry.publishModuleVersion(req.params.moduleId, req.body);
      res.status(201).json({
        success: true,
        data: version,
      });
    } catch (error: any) {
      logger.error('Failed to publish module version:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/modules/search
 * @desc    Search for modules
 * @access  Public
 */
router.get(
  '/search',
  [
    query('type').optional().isIn(Object.values(ModuleType)),
    query('status').optional().isIn(Object.values(ModuleStatus)),
    query('author').optional().isString(),
    query('tags').optional().isString(),
    query('minRating').optional().isFloat({ min: 0, max: 5 }),
    query('searchText').optional().isString(),
    query('includeDeprecated').optional().isBoolean(),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const filters = {
        type: req.query.type as ModuleType,
        status: req.query.status as ModuleStatus,
        author: req.query.author as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        minRating: req.query.minRating ? parseFloat(req.query.minRating as string) : undefined,
        searchText: req.query.searchText as string,
        includeDeprecated: req.query.includeDeprecated === 'true',
      };

      const modules = await moduleRegistry.searchModules(filters);
      res.json({
        success: true,
        data: modules,
        count: modules.length,
      });
    } catch (error: any) {
      logger.error('Failed to search modules:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search modules',
      });
    }
  }
);

/**
 * @route   GET /api/modules/:moduleId
 * @desc    Get module by ID
 * @access  Public
 */
router.get(
  '/:moduleId',
  [param('moduleId').notEmpty().withMessage('Module ID is required')],
  validate,
  async (req: Request, res: Response) => {
    try {
      const module = await moduleRegistry.getModule(req.params.moduleId);
      if (!module) {
        return res.status(404).json({
          success: false,
          error: 'Module not found',
        });
      }
      res.json({
        success: true,
        data: module,
      });
    } catch (error: any) {
      logger.error('Failed to get module:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get module',
      });
    }
  }
);

/**
 * @route   GET /api/modules/:moduleId/versions
 * @desc    Get all versions of a module
 * @access  Public
 */
router.get(
  '/:moduleId/versions',
  [param('moduleId').notEmpty().withMessage('Module ID is required')],
  validate,
  async (req: Request, res: Response) => {
    try {
      const versions = await moduleRegistry.getModuleVersions(req.params.moduleId);
      res.json({
        success: true,
        data: versions,
        count: versions.length,
      });
    } catch (error: any) {
      logger.error('Failed to get module versions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get module versions',
      });
    }
  }
);

/**
 * @route   GET /api/modules/:moduleId/versions/latest
 * @desc    Get latest version of a module
 * @access  Public
 */
router.get(
  '/:moduleId/versions/latest',
  [param('moduleId').notEmpty().withMessage('Module ID is required')],
  validate,
  async (req: Request, res: Response) => {
    try {
      const version = await moduleRegistry.getLatestVersion(req.params.moduleId);
      if (!version) {
        return res.status(404).json({
          success: false,
          error: 'No versions found for module',
        });
      }
      res.json({
        success: true,
        data: version,
      });
    } catch (error: any) {
      logger.error('Failed to get latest version:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get latest version',
      });
    }
  }
);

/**
 * @route   POST /api/modules/:moduleId/install
 * @desc    Record module installation
 * @access  Private (requires authentication)
 */
router.post(
  '/:moduleId/install',
  authMiddleware,
  [
    param('moduleId').notEmpty().withMessage('Module ID is required'),
    body('version').notEmpty().withMessage('Version is required'),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const installation = await moduleRegistry.recordInstallation(
        userId,
        req.params.moduleId,
        req.body.version
      );
      res.status(201).json({
        success: true,
        data: installation,
      });
    } catch (error: any) {
      logger.error('Failed to record installation:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/modules/installations
 * @desc    Get user's module installations
 * @access  Private (requires authentication)
 */
router.get('/installations', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const installations = await moduleRegistry.getUserInstallations(userId);
    res.json({
      success: true,
      data: installations,
      count: installations.length,
    });
  } catch (error: any) {
    logger.error('Failed to get user installations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user installations',
    });
  }
});

/**
 * @route   PUT /api/modules/:moduleId/installation
 * @desc    Update module installation
 * @access  Private (requires authentication)
 */
router.put(
  '/:moduleId/installation',
  authMiddleware,
  [
    param('moduleId').notEmpty().withMessage('Module ID is required'),
    body('enabled').optional().isBoolean(),
    body('config').optional().isObject(),
    body('profileIds').optional().isArray(),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const installation = await moduleRegistry.updateInstallation(
        userId,
        req.params.moduleId,
        req.body
      );
      res.json({
        success: true,
        data: installation,
      });
    } catch (error: any) {
      logger.error('Failed to update installation:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/modules/:moduleId/dependencies
 * @desc    Resolve module dependencies
 * @access  Public
 */
router.get(
  '/:moduleId/dependencies',
  [
    param('moduleId').notEmpty().withMessage('Module ID is required'),
    query('version').optional().isString(),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const resolution = await moduleRegistry.resolveDependencies(
        req.params.moduleId,
        req.query.version as string
      );
      res.json({
        success: true,
        data: resolution,
      });
    } catch (error: any) {
      logger.error('Failed to resolve dependencies:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/modules/:moduleId/check-conflicts
 * @desc    Check for conflicts with installed modules
 * @access  Private (requires authentication)
 */
router.post(
  '/:moduleId/check-conflicts',
  authMiddleware,
  [param('moduleId').notEmpty().withMessage('Module ID is required')],
  validate,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const installations = await moduleRegistry.getUserInstallations(userId);
      const conflicts = await moduleRegistry.checkForConflicts(req.params.moduleId, installations);
      res.json({
        success: true,
        data: conflicts,
        hasConflicts: conflicts.length > 0,
      });
    } catch (error: any) {
      logger.error('Failed to check conflicts:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/modules/:moduleId/versions/:version/deprecate
 * @desc    Deprecate a module version
 * @access  Private (requires authentication and admin role)
 */
router.post(
  '/:moduleId/versions/:version/deprecate',
  authMiddleware,
  [
    param('moduleId').notEmpty().withMessage('Module ID is required'),
    param('version').notEmpty().withMessage('Version is required'),
    body('reason').optional().isString(),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      // TODO: Add admin role check
      await moduleRegistry.deprecateVersion(
        req.params.moduleId,
        req.params.version,
        req.body.reason
      );
      res.json({
        success: true,
        message: 'Version deprecated successfully',
      });
    } catch (error: any) {
      logger.error('Failed to deprecate version:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/modules/:moduleId/versions/:version/yank
 * @desc    Yank a module version
 * @access  Private (requires authentication and admin role)
 */
router.post(
  '/:moduleId/versions/:version/yank',
  authMiddleware,
  [
    param('moduleId').notEmpty().withMessage('Module ID is required'),
    param('version').notEmpty().withMessage('Version is required'),
    body('reason').optional().isString(),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      // TODO: Add admin role check
      await moduleRegistry.yankVersion(req.params.moduleId, req.params.version, req.body.reason);
      res.json({
        success: true,
        message: 'Version yanked successfully',
      });
    } catch (error: any) {
      logger.error('Failed to yank version:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * @route   PATCH /api/modules/:moduleId/metadata
 * @desc    Update module metadata
 * @access  Private (requires authentication)
 */
router.patch(
  '/:moduleId/metadata',
  authMiddleware,
  [
    param('moduleId').notEmpty().withMessage('Module ID is required'),
    body('tags').optional().isArray(),
    body('permissions').optional().isArray(),
    body('capabilities').optional().isArray(),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const module = await moduleRegistry.updateModuleMetadata(req.params.moduleId, req.body);
      res.json({
        success: true,
        data: module,
      });
    } catch (error: any) {
      logger.error('Failed to update module metadata:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/modules/:moduleId/tags
 * @desc    Add tags to module
 * @access  Private (requires authentication)
 */
router.post(
  '/:moduleId/tags',
  authMiddleware,
  [
    param('moduleId').notEmpty().withMessage('Module ID is required'),
    body('tags').isArray().withMessage('Tags must be an array'),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const module = await moduleRegistry.addModuleTags(req.params.moduleId, req.body.tags);
      res.json({
        success: true,
        data: module,
      });
    } catch (error: any) {
      logger.error('Failed to add module tags:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * @route   DELETE /api/modules/:moduleId/tags
 * @desc    Remove tags from module
 * @access  Private (requires authentication)
 */
router.delete(
  '/:moduleId/tags',
  authMiddleware,
  [
    param('moduleId').notEmpty().withMessage('Module ID is required'),
    body('tags').isArray().withMessage('Tags must be an array'),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const module = await moduleRegistry.removeModuleTags(req.params.moduleId, req.body.tags);
      res.json({
        success: true,
        data: module,
      });
    } catch (error: any) {
      logger.error('Failed to remove module tags:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/modules/:moduleId/rate
 * @desc    Rate a module
 * @access  Private (requires authentication)
 */
router.post(
  '/:moduleId/rate',
  authMiddleware,
  [
    param('moduleId').notEmpty().withMessage('Module ID is required'),
    body('rating').isFloat({ min: 0, max: 5 }).withMessage('Rating must be between 0 and 5'),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      await moduleRegistry.updateModuleRating(req.params.moduleId, req.body.rating, userId);
      res.json({
        success: true,
        message: 'Module rated successfully',
      });
    } catch (error: any) {
      logger.error('Failed to rate module:', error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

export default router;
