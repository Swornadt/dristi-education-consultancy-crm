import { Router } from 'express';
import * as controller from './applications.controller';
import { validate } from '../../common/middleware/validate';
import { createApplicationSchema, updateApplicationSchema, updateStatusSchema } from './applications.validation';
import { verifyJWT } from '../../common/middleware/auth';
import { requirePermission } from '../../common/middleware/authorize';
import { validateId } from '../../common/middleware/validateId';

const router = Router();
router.use(verifyJWT);

router.get('/', requirePermission('applications:view'), controller.list);
router.post('/', requirePermission('applications:create'), validate(createApplicationSchema), controller.create);

router.get('/:id', requirePermission('applications:view'), validateId(), controller.getOne);
router.patch('/:id', requirePermission('applications:update'), validateId(), validate(updateApplicationSchema), controller.update);
router.patch('/:id/status', requirePermission('applications:update'), validateId(), validate(updateStatusSchema), controller.updateStatus);
router.delete('/:id', requirePermission('applications:delete'), validateId(), controller.remove);

export default router;