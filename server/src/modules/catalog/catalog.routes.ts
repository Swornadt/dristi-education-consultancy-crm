import { Router } from 'express';
import * as controller from './catalog.controller';
import { validate } from '../../common/middleware/validate';
import {
  createCountrySchema,
  updateCountrySchema,
  createDocumentTypeSchema,
  updateDocumentTypeSchema,
  createUniversitySchema, 
  updateUniversitySchema,
  createProgramSchema, 
  updateProgramSchema,
  createIntakeSchema, 
  updateIntakeSchema,
} from './catalog.validation';
import { verifyJWT } from '../../common/middleware/auth';
import { requirePermission } from '../../common/middleware/authorize';
import { validateId } from '../../common/middleware/validateId';

const router = Router();
router.use(verifyJWT);

// for countries routes
router.get('/countries', requirePermission('catalog:view'), controller.listCountries);
router.post('/countries', requirePermission('catalog:create'), validate(createCountrySchema), controller.createCountry);
router.patch('/countries/:id', requirePermission('catalog:update'), validateId(), validate(updateCountrySchema), controller.updateCountry);

// for document routes
router.get('/document-types', requirePermission('catalog:view'), controller.listDocumentTypes);
router.post('/document-types', requirePermission('catalog:create'), validate(createDocumentTypeSchema), controller.createDocumentType);
router.patch('/document-types/:id', requirePermission('catalog:update'), validateId(), validate(updateDocumentTypeSchema), controller.updateDocumentType);

//for university routes
router.get('/universities', requirePermission('catalog:view'), controller.listUniversities);
router.post('/universities', requirePermission('catalog:create'), validate(createUniversitySchema), controller.createUniversity);
router.patch('/universities/:id', requirePermission('catalog:update'), validateId(), validate(updateUniversitySchema), controller.updateUniversity);

// for program routes
router.get('/programs', requirePermission('catalog:view'), controller.listPrograms);
router.post('/programs', requirePermission('catalog:create'), validate(createProgramSchema), controller.createProgram);
router.patch('/programs/:id', requirePermission('catalog:update'), validateId(), validate(updateProgramSchema), controller.updateProgram);

// for intake(year's) routes
router.get('/intakes', requirePermission('catalog:view'), controller.listIntakes);
router.post('/intakes', requirePermission('catalog:create'), validate(createIntakeSchema), controller.createIntake);
router.patch('/intakes/:id', requirePermission('catalog:update'), validateId(), validate(updateIntakeSchema), controller.updateIntake);

export default router;