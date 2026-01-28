import ProgressTracking from "../models/ProgressTracking.js";
import User from "../models/User.js";
import Appointment from "../models/Appointment.js";

export const getProgressTrackings = async (req, res, next) => {
  try {
    const { 
      studentId, 
      trackedBy, 
      subject, 
      competencyLevel,
      dateFrom,
      dateTo,
      page = 1, 
      limit = 20 
    } = req.query;
    
    const filter = {};
    
    // Filtros según el rol del usuario
    if (req.user.role === 'student') {
      filter.studentId = req.user.id;
    } else if (['tutor', 'advisor'].includes(req.user.role)) {
      filter.trackedBy = req.user.id;
    }
    
    // Filtros adicionales
    if (studentId && req.user.role !== 'student') filter.studentId = studentId;
    if (trackedBy && !['tutor', 'advisor'].includes(req.user.role)) filter.trackedBy = trackedBy;
    if (subject) filter.subject = new RegExp(subject, 'i');
    if (competencyLevel) filter.competencyLevel = competencyLevel;
    
    // Filtro por fecha
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const progressTrackings = await ProgressTracking.find(filter)
      .populate('studentId', 'personalInfo email studentProfile')
      .populate('trackedBy', 'personalInfo email tutorProfile advisorProfile')
      .populate('appointmentId', 'subject scheduledDate')
      .populate('progressHistory.recordedBy', 'personalInfo')
      .populate('createdBy', 'personalInfo')
      .populate('updatedBy', 'personalInfo')
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .sort(options.sort);

    const total = await ProgressTracking.countDocuments(filter);

    res.json({
      success: true,
      data: progressTrackings,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getProgressTrackingById = async (req, res, next) => {
  try {
    const progressTracking = await ProgressTracking.findById(req.params.id)
      .populate('studentId', 'personalInfo email studentProfile')
      .populate('trackedBy', 'personalInfo email tutorProfile advisorProfile')
      .populate('appointmentId', 'subject scheduledDate')
      .populate('progressHistory.recordedBy', 'personalInfo')
      .populate('createdBy', 'personalInfo')
      .populate('updatedBy', 'personalInfo');

    if (!progressTracking) {
      const error = new Error("Progress tracking record not found");
      error.status = 404;
      throw error;
    }

    // Verificar permisos
    const canView = 
      req.user.role === 'admin' ||
      progressTracking.studentId._id.toString() === req.user.id ||
      progressTracking.trackedBy._id.toString() === req.user.id;

    if (!canView) {
      const error = new Error("Access denied to this progress tracking record");
      error.status = 403;
      throw error;
    }

    res.json({
      success: true,
      data: progressTracking
    });
  } catch (error) {
    next(error);
  }
};

export const createProgressTracking = async (req, res, next) => {
  try {
    const progressData = req.body;

    // Verificar que el estudiante existe
    const student = await User.findById(progressData.studentId);
    if (!student || student.role !== 'student') {
      const error = new Error("Student not found or invalid role");
      error.status = 404;
      throw error;
    }

    // Verificar que el tracker existe y tiene permisos
    const tracker = await User.findById(progressData.trackedBy);
    if (!tracker || !['tutor', 'advisor', 'admin'].includes(tracker.role)) {
      const error = new Error("Tracker must be a tutor, advisor or admin");
      error.status = 400;
      throw error;
    }

    // Verificar permisos para crear seguimiento
    if (!['tutor', 'advisor', 'admin'].includes(req.user.role)) {
      const error = new Error("Only tutors, advisors and admins can create progress tracking");
      error.status = 403;
      throw error;
    }

    // Verificar cita si se proporciona
    if (progressData.appointmentId) {
      const appointment = await Appointment.findById(progressData.appointmentId);
      if (!appointment) {
        const error = new Error("Appointment not found");
        error.status = 404;
        throw error;
      }
    }

    // Agregar información de auditoría
    progressData.createdBy = req.user.id;
    progressData.updatedBy = req.user.id;

    const newProgressTracking = new ProgressTracking(progressData);
    const progressSaved = await newProgressTracking.save();

    // Populate para la respuesta
    const populatedProgress = await ProgressTracking.findById(progressSaved._id)
      .populate('studentId', 'personalInfo email studentProfile')
      .populate('trackedBy', 'personalInfo email tutorProfile advisorProfile')
      .populate('appointmentId', 'subject scheduledDate');

    res.status(201).json({
      success: true,
      message: "Progress tracking created successfully",
      data: populatedProgress
    });
  } catch (error) {
    next(error);
  }
};

export const updateProgressTracking = async (req, res, next) => {
  try {
    const progressTracking = await ProgressTracking.findById(req.params.id);
    
    if (!progressTracking) {
      const error = new Error("Progress tracking record not found");
      error.status = 404;
      throw error;
    }

    // Verificar permisos - solo tracker o admin puede editar
    if (progressTracking.trackedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      const error = new Error("Not authorized to update this progress tracking");
      error.status = 403;
      throw error;
    }

    const updateData = { 
      ...req.body,
      updatedBy: req.user.id 
    };

    const updatedProgress = await ProgressTracking.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('studentId', 'personalInfo email studentProfile')
    .populate('trackedBy', 'personalInfo email tutorProfile advisorProfile')
    .populate('appointmentId', 'subject scheduledDate')
    .populate('updatedBy', 'personalInfo');

    res.json({
      success: true,
      message: "Progress tracking updated successfully",
      data: updatedProgress
    });
  } catch (error) {
    next(error);
  }
};

export const addProgressHistory = async (req, res, next) => {
  try {
    const { metricsSnapshot, notes } = req.body;
    const progressTracking = await ProgressTracking.findById(req.params.id);

    if (!progressTracking) {
      const error = new Error("Progress tracking record not found");
      error.status = 404;
      throw error;
    }

    // Verificar permisos - solo tracker o admin puede agregar historial
    if (progressTracking.trackedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      const error = new Error("Not authorized to add progress history");
      error.status = 403;
      throw error;
    }

    await progressTracking.addProgressHistory(metricsSnapshot, notes, req.user.id);

    const updatedProgress = await ProgressTracking.findById(req.params.id)
      .populate('progressHistory.recordedBy', 'personalInfo');

    res.json({
      success: true,
      message: "Progress history added successfully",
      data: updatedProgress.progressHistory
    });
  } catch (error) {
    next(error);
  }
};

export const updateGoalStatus = async (req, res, next) => {
  try {
    const { goalType, customGoalIndex, status, progress } = req.body;
    const progressTracking = await ProgressTracking.findById(req.params.id);

    if (!progressTracking) {
      const error = new Error("Progress tracking record not found");
      error.status = 404;
      throw error;
    }

    // Verificar permisos - estudiante, tracker o admin puede actualizar metas
    const canUpdate = 
      progressTracking.studentId.toString() === req.user.id ||
      progressTracking.trackedBy.toString() === req.user.id ||
      req.user.role === 'admin';

    if (!canUpdate) {
      const error = new Error("Not authorized to update goals");
      error.status = 403;
      throw error;
    }

    if (goalType === 'shortTerm' && progressTracking.goals.shortTerm) {
      progressTracking.goals.shortTerm.status = status;
      if (progress !== undefined) {
        progressTracking.goals.shortTerm.progress = progress;
      }
    } else if (goalType === 'longTerm' && progressTracking.goals.longTerm) {
      progressTracking.goals.longTerm.status = status;
      if (progress !== undefined) {
        progressTracking.goals.longTerm.progress = progress;
      }
    } else if (goalType === 'custom' && progressTracking.goals.customGoals[customGoalIndex]) {
      progressTracking.goals.customGoals[customGoalIndex].status = status;
      if (progress !== undefined) {
        progressTracking.goals.customGoals[customGoalIndex].progress = progress;
      }
    } else {
      const error = new Error("Invalid goal type or index");
      error.status = 400;
      throw error;
    }

    progressTracking.updatedBy = req.user.id;
    await progressTracking.save();

    const updatedProgress = await ProgressTracking.findById(req.params.id);

    res.json({
      success: true,
      message: "Goal status updated successfully",
      data: updatedProgress.goals
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentProgress = async (req, res, next) => {
  try {
    const { studentId, subject } = req.query;
    
    let targetStudentId = studentId;
    
    // Si es estudiante, solo puede ver su propio progreso
    if (req.user.role === 'student') {
      targetStudentId = req.user.id;
    } else if (!studentId && !['tutor', 'advisor', 'admin'].includes(req.user.role)) {
      const error = new Error("Student ID is required");
      error.status = 400;
      throw error;
    }

    const progress = await ProgressTracking.getStudentProgress(targetStudentId, subject);

    if (!progress) {
      return res.json({
        success: true,
        data: null,
        message: "No progress tracking found for this student and subject"
      });
    }

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    next(error);
  }
};

export const getMyProgress = async (req, res, next) => {
  try {
    const { subject } = req.query;
    
    const filter = { studentId: req.user.id };
    if (subject) filter.subject = new RegExp(subject, 'i');

    const progressTrackings = await ProgressTracking.find(filter)
      .populate('trackedBy', 'personalInfo email tutorProfile advisorProfile')
      .populate('appointmentId', 'subject scheduledDate')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: progressTrackings
    });
  } catch (error) {
    next(error);
  }
};

export const getProgressStatistics = async (req, res, next) => {
  try {
    const { studentId, subject, period = 'all' } = req.query;
    
    let filter = {};
    
    if (req.user.role === 'student') {
      filter.studentId = req.user.id;
    } else if (studentId) {
      filter.studentId = studentId;
    }
    
    if (subject) filter.subject = new RegExp(subject, 'i');

    // Filtrar por período
    if (period !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'quarter':
          startDate = new Date(now.setMonth(now.getMonth() - 3));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          startDate = new Date(0);
      }
      
      filter.createdAt = { $gte: startDate };
    }

    const stats = await ProgressTracking.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$subject',
          totalRecords: { $sum: 1 },
          avgAssignmentGrades: { $avg: '$metrics.assignmentGrades' },
          avgExamScores: { $avg: '$metrics.examScores' },
          avgParticipation: { $avg: '$metrics.participation' },
          avgUnderstanding: { $avg: '$metrics.understandingLevel' },
          competencyDistribution: {
            $push: '$competencyLevel'
          },
          latestUpdate: { $max: '$updatedAt' }
        }
      }
    ]);

    // Calcular distribución de competencias
    const competencyStats = await ProgressTracking.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$competencyLevel',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        bySubject: stats,
        competencyDistribution: competencyStats,
        totalTrackings: await ProgressTracking.countDocuments(filter)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createBaselineAssessment = async (req, res, next) => {
  try {
    const { studentId, subject } = req.body;

    // Verificar permisos
    if (!['tutor', 'advisor', 'admin'].includes(req.user.role)) {
      const error = new Error("Only tutors, advisors and admins can create baseline assessments");
      error.status = 403;
      throw error;
    }

    // Verificar que no exista ya una evaluación base
    const existingBaseline = await ProgressTracking.findOne({
      studentId,
      subject,
      isBaseline: true
    });

    if (existingBaseline) {
      const error = new Error("Baseline assessment already exists for this student and subject");
      error.status = 409;
      throw error;
    }

    const baselineData = {
      studentId,
      trackedBy: req.user.id,
      subject,
      metrics: {
        assignmentGrades: 0,
        examScores: 0,
        participation: 0,
        understandingLevel: 1,
        completionRate: 0
      },
      observations: "Initial baseline assessment",
      competencyLevel: 'beginner',
      confidenceLevel: 1,
      trackingPeriod: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
      },
      isBaseline: true,
      createdBy: req.user.id,
      updatedBy: req.user.id
    };

    const baseline = new ProgressTracking(baselineData);
    await baseline.save();

    const populatedBaseline = await ProgressTracking.findById(baseline._id)
      .populate('studentId', 'personalInfo email')
      .populate('trackedBy', 'personalInfo email');

    res.status(201).json({
      success: true,
      message: "Baseline assessment created successfully",
      data: populatedBaseline
    });
  } catch (error) {
    next(error);
  }
};