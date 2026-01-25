import { Router } from "express";
import { profile, signin, signup, forgotPassword, updateProfile } from "../controllers/auth.controller.js";
import { schemaValidator } from "../middlewares/schemaValidator.js";
import { signinSchema } from "../schemas/auth.schema.js";
import { registerSchema, updateProfileSchema } from "../schemas/user.schema.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

// Rutas públicas (no requieren autenticación)
router.post("/signup", schemaValidator(registerSchema), signup);
router.post("/signin", schemaValidator(signinSchema), signin);
router.post("/forgot-password", forgotPassword);

// Rutas protegidas (requieren autenticación)
router.get("/profile", authenticateToken, profile);
router.patch("/profile", authenticateToken, schemaValidator(updateProfileSchema), updateProfile);

export default router;
