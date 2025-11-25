import { Router } from "express";
import { profile, signin, signup } from "../controllers/auth.controller.js";
import { schemaValidator } from "../middlewares/schemaValidator.js";
import { signinSchema } from "../schemas/auth.schema.js";
import { registerSchema } from "../schemas/user.schema.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

// Rutas públicas (no requieren autenticación)
router.post("/signup", schemaValidator(registerSchema), signup);
router.post("/signin", schemaValidator(signinSchema), signin);

// Ruta protegida (requiere autenticación)
router.get("/profile", authenticateToken, profile);

export default router;
