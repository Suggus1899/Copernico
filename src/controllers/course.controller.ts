import type { Handler } from '../types/http.js';
import type { FilterQuery } from 'mongoose';
import type { CourseRecord } from '../models/Course.js';
import Course from "../models/Course.js";
import User from "../models/User.js";

type CourseQuery = { category?: string; level?: string; search?: string; limit?: string; page?: string };
type CourseParams = Record<string, string>;

export const getCourses: Handler<CourseParams, unknown, unknown, CourseQuery> = async (req, res) => {
    try {
        const { category, level, search, limit = '10', page = '1' } = req.query;
        const query: FilterQuery<CourseRecord> = { isPublished: true };

        if (category) query.category = category;
        if (level) query.level = level;
        if (search) {
            query.$text = { $search: search };
        }

        const courses = await Course.find(query)
            .populate("instructor", "personalInfo.firstName personalInfo.lastName personalInfo.avatar")
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit))
            .sort({ createdAt: -1 });

        const total = await Course.countDocuments(query);

        res.json({
            success: true,
            data: courses,
            pagination: {
                total,
            page: parseInt(String(page)),
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: (error as Error).message });
    }
};

export const getCourse: Handler<CourseParams> = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate("instructor", "personalInfo")
            .populate("modules.materials");

        if (!course) return res.status(404).json({ success: false, message: "Course not found" });

        res.json({ success: true, data: course });
    } catch (error) {
        res.status(500).json({ success: false, message: (error as Error).message });
    }
};

export const createCourse: Handler<CourseParams, unknown, Partial<CourseRecord>> = async (req, res) => {
    try {
        const { title, description, category, level, price, modules, tags } = req.body;

        const newCourse = new Course({
            title,
            description,
            instructor: req.user!.id,
            category,
            level,
            price,
            modules,
            tags
        });

        const savedCourse = await newCourse.save();
        res.status(201).json({ success: true, data: savedCourse });
    } catch (error) {
        res.status(500).json({ success: false, message: (error as Error).message });
    }
};

export const updateCourse: Handler<CourseParams, unknown, Partial<CourseRecord>> = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ success: false, message: "Course not found" });

        if (course.instructor.toString() !== req.user!.id && req.user!.role !== "admin") {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        const updatedCourse = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: updatedCourse });
    } catch (error) {
        res.status(500).json({ success: false, message: (error as Error).message });
    }
};

export const deleteCourse: Handler<CourseParams> = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ success: false, message: "Course not found" });

        if (course.instructor.toString() !== req.user!.id && req.user!.role !== "admin") {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        // shortcut: conserva esta llamada de la ruta no montada; sustituirla si se publica el módulo.
        await (course as typeof course & { remove(): Promise<unknown> }).remove();
        res.json({ success: true, message: "Course deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: (error as Error).message });
    }
};

export const enrollStudent: Handler<CourseParams> = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ success: false, message: "Course not found" });

        const isEnrolled = course.enrolledStudents.some(
            (enrollment) => enrollment.student!.toString() === req.user!.id
        );

        if (isEnrolled) {
            return res.status(400).json({ success: false, message: "Already enrolled" });
        }

        course.enrolledStudents.push({ student: req.user!.id });
        await course.save();

        // Also update student profile if needed
        await User.findByIdAndUpdate(req.user!.id, {
            $addToSet: { "studentProfile.enrolledCourses": course._id }
        });

        res.json({ success: true, message: "Enrolled successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: (error as Error).message });
    }
};
