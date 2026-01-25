import { Router } from "express";
import {
  getNotes,
  createNote,
  getNote,
  deleteNote,
  updateNote,
} from "../controllers/notes.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

router.get("/", getNotes);

router.post("/", createNote);

router.get("/:id", getNote);

router.delete("/:id", deleteNote);

router.put("/:id", updateNote);

export default router;
