import { Router } from "express";
import {
  getNotes,
  createNote,
  getNote,
  deleteNote,
  updateNote,
  shareNote,
  unshareNote
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

// Nuevas rutas de compartido
router.post("/:id/share", shareNote);
router.delete("/:id/share/:userId", unshareNote);

export default router;
