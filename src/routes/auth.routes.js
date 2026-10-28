import { Router } from 'express';
import {
  signup,
  signin,
  signout,
  profile,
  updateProfile,
  changePassword,
  changeEmail,
  deactivateAccount,
} from '../controllers/auth.controller.js';
import { schemaValidator } from '../middlewares/schemaValidator.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { signupLimiter, signinLimiter, sensitiveActionLimiter } from '../middlewares/rateLimiters.js';
import {
  signupSchema,
  signinSchema,
  changePasswordSchema,
  changeEmailSchema,
  deactivateSchema,
} from '../schemas/auth.schema.js';
import { updateProfileSchema } from '../schemas/user.schema.js';

const router = Router();

// Rutas públicas
router.post('/signup', signupLimiter, schemaValidator(signupSchema), signup);
router.post('/signin', signinLimiter, schemaValidator(signinSchema), signin);
router.post('/signout', signout);

// Rutas que requieren sesión
router.get('/profile', authenticateToken, profile);
router.patch('/profile', authenticateToken, schemaValidator(updateProfileSchema), updateProfile);
router.post('/change-password', sensitiveActionLimiter, authenticateToken, schemaValidator(changePasswordSchema), changePassword);
router.post('/change-email', sensitiveActionLimiter, authenticateToken, schemaValidator(changeEmailSchema), changeEmail);
router.post('/deactivate', sensitiveActionLimiter, authenticateToken, schemaValidator(deactivateSchema), deactivateAccount);

export default router;
