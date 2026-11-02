import { Router } from 'express';
import * as controller from './users.controller';
import { validate } from '../../common/middleware/validate';
import { createUserSchema, updateUserSchema, overridesSchema } from './users.validation';
import { verifyJWT } from '../../common/middleware/auth';
import { requirePermission } from '../../common/middleware/authorize';
import { requireAdmin } from '../../common/middleware/requireAdmin';
import { validateId } from '../../common/middleware/validateId';

const router = Router();

router.use(verifyJWT);

router.get('/assignable', controller.assignable);

router.get('/roles', requirePermission('users:view'), controller.roles);
router.get('/', requirePermission('users:view'), controller.list);
router.get('/:id', requirePermission('users:view'), validateId(), controller.getOne);

router.post('/', requirePermission('users:create'), validate(createUserSchema), controller.create);
router.patch('/:id', requirePermission('users:update'), validateId(), validate(updateUserSchema), controller.update);

router.get('/:id/permissions', requireAdmin, validateId(), controller.getUserPermissions);
router.put('/:id/permissions', requireAdmin, validateId(), validate(overridesSchema), controller.replacePermissions);

export default router;