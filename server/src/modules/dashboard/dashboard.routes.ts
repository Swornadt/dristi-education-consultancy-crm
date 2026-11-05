import { Router } from 'express';
import { verifyJWT } from '../../common/middleware/auth';
import { requirePermission } from '../../common/middleware/authorize';
import { validate } from '../../common/middleware/validate';
import { summaryQuerySchema } from './dashboard.validation';
import * as controller from './dashboard.controller';

const router = Router();
router.use(verifyJWT);

router.get(
  '/summary',
  requirePermission('dashboard:view'),
  validate(summaryQuerySchema),
  controller.getSummary,
);

export default router;
