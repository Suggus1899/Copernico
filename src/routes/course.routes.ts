import { Router } from "express";
import {
    getCourses,
    getCourse,
    createCourse,
    updateCourse,
    deleteCourse,
    enrollStudent
} from "../controllers/course.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", getCourses);
router.get("/:id", getCourse);

router.post("/", authenticateToken, createCourse);
router.put("/:id", authenticateToken, updateCourse);
router.delete("/:id", authenticateToken, deleteCourse);

router.post("/:id/enroll", authenticateToken, enrollStudent);

export default router;
