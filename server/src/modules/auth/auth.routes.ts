import { Router } from 'express';
import * as controller from './auth.controller';
import { validate } from '../../common/middleware/validate';
import { loginSchema, changePasswordSchema } from './auth.validation';
import { verifyJWT } from '../../common/middleware/auth';

const router = Router();

// Public route
router.post('/login', validate(loginSchema), controller.login);
router.use(verifyJWT);

router.get('/me', controller.getMe);
router.post('/change-password', validate(changePasswordSchema), controller.changePassword);

export default router;