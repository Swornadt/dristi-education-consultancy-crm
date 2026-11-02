import { Router } from 'express';
import * as controller from './roles.controller';
import { validate } from '../../common/middleware/validate';
import { replaceRolePermissionsSchema } from './roles.validation';
import { verifyJWT } from '../../common/middleware/auth';
import { requireAdmin } from '../../common/middleware/requireAdmin';
import { validateId } from '../../common/middleware/validateId';

const router = Router();
router.use(verifyJWT);

router.put(
  '/:id/permissions', 
  requireAdmin, 
  validateId(), 
  validate(replaceRolePermissionsSchema), 
  controller.replacePermissions
);

export default router;