import { Router } from 'express';
import * as controller from './tasks.controller';
import { validate } from '../../common/middleware/validate';
import { createTaskSchema, updateTaskSchema } from './tasks.validation';
import { verifyJWT } from '../../common/middleware/auth';
import { requirePermission } from '../../common/middleware/authorize';
import { validateId } from '../../common/middleware/validateId';

const router = Router();
router.use(verifyJWT);

router.get('/', requirePermission('tasks:view'), controller.list);
router.post('/', requirePermission('tasks:create'), validate(createTaskSchema), controller.create);

router.get('/:id', requirePermission('tasks:view'), validateId(), controller.getOne);
router.patch('/:id', requirePermission('tasks:update'), validateId(), validate(updateTaskSchema), controller.update);

router.post('/:id/complete', requirePermission('tasks:update'), validateId(), controller.complete);

router.delete('/:id', requirePermission('tasks:delete'), validateId(), controller.remove);

export default router;