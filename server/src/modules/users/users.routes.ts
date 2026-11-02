import { Router } from 'express';
import * as controller from './users.controller';
import { validate } from '../../common/middleware/validate';
import { createUserSchema, updateUserSchema } from './users.validation';
import { verifyJWT } from '../../common/middleware/auth';
import { requirePermission } from '../../common/middleware/authorize';

const router = Router();

router.use(verifyJWT);

router.get('/assignable', controller.assignable);

// view permission for Admin only
router.get('/roles', requirePermission('users:view'), controller.roles);
router.get('/', requirePermission('users:view'), controller.list); 
router.get('/:id', requirePermission('users:view'), controller.getOne);

// create,users:update permission Admin only
router.post('/', requirePermission('users:create'), validate(createUserSchema), controller.create);
router.patch('/:id', requirePermission('users:update'), validate(updateUserSchema), controller.update);

export default router;