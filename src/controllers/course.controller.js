import Course from "../models/Course.js";
import User from "../models/User.js";

export const getCourses = async (req, res) => {
    try {
        const { category, level, search, limit = 10, page = 1 } = req.query;
        const query = { isPublished: true };

        if (category) query.category = category;
        if (level) query.level = level;
        if (search) {
            query.$text = { $search: search };
        }

        const courses = await Course.find(query)
            .populate("instructor", "personalInfo.firstName personalInfo.lastName personalInfo.avatar")
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const total = await Course.countDocuments(query);

        res.json({
            success: true,
            data: courses,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate("instructor", "personalInfo")
            .populate("modules.materials");

        if (!course) return res.status(404).json({ success: false, message: "Course not found" });

        res.json({ success: true, data: course });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createCourse = async (req, res) => {
    try {
        const { title, description, category, level, price, modules, tags } = req.body;

        const newCourse = new Course({
            title,
            description,
            instructor: req.user.id,
            category,
            level,
            price,
            modules,
            tags
        });

        const savedCourse = await newCourse.save();
        res.status(201).json({ success: true, data: savedCourse });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ success: false, message: "Course not found" });

        if (course.instructor.toString() !== req.user.id && req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        const updatedCourse = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: updatedCourse });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ success: false, message: "Course not found" });

        if (course.instructor.toString() !== req.user.id && req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        await course.remove();
        res.json({ success: true, message: "Course deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const enrollStudent = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ success: false, message: "Course not found" });

        const isEnrolled = course.enrolledStudents.some(
            (enrollment) => enrollment.student.toString() === req.user.id
        );

        if (isEnrolled) {
            return res.status(400).json({ success: false, message: "Already enrolled" });
        }

        course.enrolledStudents.push({ student: req.user.id });
        await course.save();

        // Also update student profile if needed
        await User.findByIdAndUpdate(req.user.id, {
            $addToSet: { "studentProfile.enrolledCourses": course._id }
        });

        res.json({ success: true, message: "Enrolled successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
