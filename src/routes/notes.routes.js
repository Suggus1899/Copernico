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

router.get("/notes", getNotes);

router.post("/notes", createNote);

router.get("/notes/:id", getNote);

router.delete("/notes/:id", deleteNote);

router.put("/notes/:id", updateNote);

export default router;
