import { Router } from 'express';
import { verifyJWT } from '../../common/middleware/auth';
import { requirePermission } from '../../common/middleware/authorize';
import { validateId } from '../../common/middleware/validateId';
import { validate } from '../../common/middleware/validate';
import {
  createCategorySchema,
  updateCategorySchema,
  createEntrySchema,
  updateEntrySchema,
  summaryQuerySchema,
} from './accounts.validation';
import * as controller from './accounts.controller';

const router = Router();
router.use(verifyJWT);

// ── Categories ────────────────────────────────────────────────────────────────
// GET /accounts/categories must come before /:id routes to avoid being captured.

router.get(
  '/categories',
  requirePermission('accounts:view'),
  controller.listCategories,
);

router.post(
  '/categories',
  requirePermission('accounts:create'),
  validate(createCategorySchema),
  controller.createCategory,
);

router.patch(
  '/categories/:id',
  requirePermission('accounts:update'),
  validateId(),
  validate(updateCategorySchema),
  controller.updateCategory,
);

// ── Summary ───────────────────────────────────────────────────────────────────
// Defined before /entries so the literal path is not captured as an entry id.

router.get(
  '/summary',
  requirePermission('accounts:view'),
  validate(summaryQuerySchema),
  controller.getSummary,
);

// ── Entries ───────────────────────────────────────────────────────────────────

router.get(
  '/entries',
  requirePermission('accounts:view'),
  controller.listEntries,
);

router.post(
  '/entries',
  requirePermission('accounts:create'),
  validate(createEntrySchema),
  controller.createEntry,
);

router.patch(
  '/entries/:id',
  requirePermission('accounts:update'),
  validateId(),
  validate(updateEntrySchema),
  controller.updateEntry,
);

router.delete(
  '/entries/:id',
  requirePermission('accounts:delete'),
  validateId(),
  controller.deleteEntry,
);

export default router;
