import { Router } from "express";
import { profile, signin, signup } from "../controllers/auth.controller.js";
import { schemaValidator } from "../middlewares/schemaValidator.js";
import { signinSchema, signupSchema } from "../schemas/auth.schema.js";

const router = Router();

router.post("/signup", schemaValidator(signupSchema), signup);

router.post("/signin", schemaValidator(signinSchema), signin);

export default router;
