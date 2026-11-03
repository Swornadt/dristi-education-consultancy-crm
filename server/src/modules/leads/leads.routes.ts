import { Router } from 'express';
import * as controller from './leads.controller';
import * as docsController from './leads.documents.controller'; 
import { validate } from '../../common/middleware/validate';
import { 
  createLeadSchema, 
  updateLeadSchema, 
  updateStatusSchema, 
  assignLeadSchema, 
  createActivitySchema 
} from './leads.validation';
import { verifyJWT } from '../../common/middleware/auth';
import { requirePermission } from '../../common/middleware/authorize';
import { validateId } from '../../common/middleware/validateId'; 
import { upload } from '../../common/upload/multer'; 
import { convertLeadSchema } from './leads.validation';

const router = Router();

router.use(verifyJWT);

router.get('/document-types', requirePermission('documents:view'), docsController.listDocumentTypes);

router.get('/', requirePermission('leads:view'), controller.list);
router.post('/', requirePermission('leads:create'), validate(createLeadSchema), controller.create);

router.get('/:id', requirePermission('leads:view'), validateId(), controller.getOne);
router.patch('/:id', requirePermission('leads:update'), validateId(), validate(updateLeadSchema), controller.update);
router.delete('/:id', requirePermission('leads:delete'), validateId(), controller.remove);

router.patch('/:id/status', requirePermission('leads:update'), validateId(), validate(updateStatusSchema), controller.updateStatus);
router.patch('/:id/assign', requirePermission('leads:update'), validateId(), validate(assignLeadSchema), controller.assign);

router.get('/:id/activities', requirePermission('leads:view'), validateId(), controller.getActivities);
router.post('/:id/activities', requirePermission('leads:update'), validateId(), validate(createActivitySchema), controller.createActivity);

router.get('/:id/documents', requirePermission('documents:view'), validateId(), docsController.listDocuments);
router.post('/:id/documents', requirePermission('documents:create'), validateId(), upload.single('file'), docsController.uploadDocument);
router.delete('/:id/documents/:docId', requirePermission('documents:delete'), validateId(), docsController.deleteDocument);
router.post(
  '/:id/convert', 
  requirePermission('leads:update'), 
  requirePermission('students:create'), 
  validateId(), 
  validate(convertLeadSchema), 
  controller.convert
);

export default router;