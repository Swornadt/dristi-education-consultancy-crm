import { Router } from 'express';
import * as controller from './students.controller';
import * as subController from './students.subresources.controller';
import { validate } from '../../common/middleware/validate';
import { 
  updateStudentSchema, 
  updatePreferredCountriesSchema 
} from './students.validation';
import {
  createEducationSchema,
  updateEducationSchema,
  createTestScoreSchema,
  updateTestScoreSchema,
  addChecklistItemSchema,
  updateChecklistItemSchema
} from './students.subresources.validation';
import { verifyJWT } from '../../common/middleware/auth';
import { requirePermission } from '../../common/middleware/authorize';
import { validateId } from '../../common/middleware/validateId';
import { upload } from '../../common/upload/multer';

const router = Router();
router.use(verifyJWT);

// Core
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

// Education
router.post('/:id/education', requirePermission('students:update'), validateId(), validate(createEducationSchema), subController.createEducation);
router.patch('/:id/education/:eid', requirePermission('students:update'), validateId(), validate(updateEducationSchema), subController.updateEducation);
router.delete('/:id/education/:eid', requirePermission('students:update'), validateId(), subController.deleteEducation);

// Test Scores
router.post('/:id/test-scores', requirePermission('students:update'), validateId(), validate(createTestScoreSchema), subController.createTestScore);
router.patch('/:id/test-scores/:sid', requirePermission('students:update'), validateId(), validate(updateTestScoreSchema), subController.updateTestScore);
router.delete('/:id/test-scores/:sid', requirePermission('students:update'), validateId(), subController.deleteTestScore);

// Documents
router.get('/:id/documents', requirePermission('documents:view'), validateId(), subController.getDocuments);
router.post('/:id/documents', requirePermission('documents:create'), validateId(), validate(addChecklistItemSchema), subController.addChecklistItem);
router.patch('/:id/documents/:itemId', requirePermission('documents:update'), validateId(), validate(updateChecklistItemSchema), subController.updateChecklistItem);
router.post('/:id/documents/:itemId/file', requirePermission('documents:create'), validateId(), upload.single('file'), subController.uploadChecklistFile);
router.delete('/:id/documents/:itemId', requirePermission('documents:delete'), validateId(), subController.deleteChecklistItem);

export default router;