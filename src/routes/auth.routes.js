import { Router } from "express";
import { profile, signin, signup, forgotPassword, changePassword, changeEmail } from "../controllers/auth.controller.js";
import { schemaValidator } from "../middlewares/schemaValidator.js";
import { signinSchema, changePasswordSchema, changeEmailSchema } from "../schemas/auth.schema.js";
import { registerSchema } from "../schemas/user.schema.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { logActivity } from "../middlewares/activity.middleware.js";

const router = Router();

// Rutas públicas (no requieren autenticación)
router.post("/signup", schemaValidator(registerSchema), signup);
router.post("/signin", schemaValidator(signinSchema), signin);
router.post("/forgot-password", forgotPassword);
router.post("/change-password", authenticateToken, schemaValidator(changePasswordSchema), logActivity('auth.change_password'), changePassword);
router.post("/change-email", authenticateToken, schemaValidator(changeEmailSchema), logActivity('auth.change_email'), changeEmail);

// Ruta protegida (requiere autenticación)
router.get("/profile", authenticateToken, profile);

export default router;
