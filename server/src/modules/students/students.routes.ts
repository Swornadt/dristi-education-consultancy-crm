import { Router } from 'express';
import * as controller from './students.controller';
import { validate } from '../../common/middleware/validate';
import { updateStudentSchema, updatePreferredCountriesSchema } from './students.validation';
import { verifyJWT } from '../../common/middleware/auth';
import { requirePermission } from '../../common/middleware/authorize';
import { validateId } from '../../common/middleware/validateId';

const router = Router();
router.use(verifyJWT);

router.get('/', requirePermission('students:view'), controller.list);
router.get('/:id', requirePermission('students:view'), validateId(), controller.getOne);
router.patch('/:id', requirePermission('students:update'), validateId(), validate(updateStudentSchema), controller.update);

router.put(
  '/:id/preferred-countries', 
  requirePermission('students:update'), 
  validateId(), 
  validate(updatePreferredCountriesSchema), 
  controller.updatePreferredCountries
);

export default router;