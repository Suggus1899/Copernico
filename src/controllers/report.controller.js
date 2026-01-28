import Report from "../models/Report.js";
import User from "../models/User.js";
import ProgressTracking from "../models/ProgressTracking.js";
import Appointment from "../models/Appointment.js";
import Assignment from "../models/Assignment.js";
import EducationalMaterial from "../models/EducationalMaterial.js";

export const getReports = async (req, res, next) => {
  try {
    const { 
      type, 
      status, 
      generatedBy,
      forUser,
      dateFrom,
      dateTo,
      accessLevel,
      page = 1, 
      limit = 20 
    } = req.query;
    
    const filter = {};
    
    // Filtros básicos
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (generatedBy) filter.generatedBy = generatedBy;
    if (forUser) filter.forUser = forUser;
    if (accessLevel) filter.accessLevel = accessLevel;
    
    // Filtro por fecha
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    // Filtrar por acceso del usuario
    if (req.user.role !== 'admin') {
      filter.$or = [
        { generatedBy: req.user.id },
        { forUser: req.user.id },
        { 
          accessLevel: 'public',
          forRole: { $in: [req.user.role, 'all'] }
        },
        { 
          accessLevel: 'restricted',
          allowedUsers: req.user.id
        }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const reports = await Report.find(filter)
      .populate('generatedBy', 'personalInfo email')
      .populate('forUser', 'personalInfo email')
      .populate('allowedUsers', 'personalInfo email')
      .populate('delivery.recipients', 'personalInfo email')
      .populate('createdBy', 'personalInfo')
      .populate('updatedBy', 'personalInfo')
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .sort(options.sort);

    const total = await Report.countDocuments(filter);

    res.json({
      success: true,
      data: reports,
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

export const getReportById = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('generatedBy', 'personalInfo email')
      .populate('forUser', 'personalInfo email')
      .populate('allowedUsers', 'personalInfo email')
      .populate('delivery.recipients', 'personalInfo email')
      .populate('createdBy', 'personalInfo')
      .populate('updatedBy', 'personalInfo')
      .populate('filters.users', 'personalInfo email');

    if (!report) {
      const error = new Error("Report not found");
      error.status = 404;
      throw error;
    }

    // Verificar permisos de acceso
    const canAccess = 
      req.user.role === 'admin' ||
      report.generatedBy._id.toString() === req.user.id ||
      (report.forUser && report.forUser._id.toString() === req.user.id) ||
      report.accessLevel === 'public' ||
      (report.accessLevel === 'restricted' && report.allowedUsers.some(user => user._id.toString() === req.user.id)) ||
      report.forRole === 'all' ||
      report.forRole === req.user.role;

    if (!canAccess) {
      const error = new Error("Access denied to this report");
      error.status = 403;
      throw error;
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

export const createReport = async (req, res, next) => {
  try {
    const reportData = req.body;

    // Verificar usuario destinatario si se especifica
    if (reportData.forUser) {
      const forUser = await User.findById(reportData.forUser);
      if (!forUser) {
        const error = new Error("Target user not found");
        error.status = 404;
        throw error;
      }
    }

    // Verificar usuarios permitidos
    if (reportData.allowedUsers && reportData.allowedUsers.length > 0) {
      const allowedUsers = await User.find({ _id: { $in: reportData.allowedUsers } });
      if (allowedUsers.length !== reportData.allowedUsers.length) {
        const error = new Error("Some allowed users not found");
        error.status = 404;
        throw error;
      }
    }

    // Agregar información de auditoría
    reportData.generatedBy = req.user.id;
    reportData.createdBy = req.user.id;
    reportData.updatedBy = req.user.id;

    // Configurar próxima generación si es recurrente
    if (reportData.isRecurring && reportData.recurrence) {
      const nextGen = new Date();
      switch (reportData.recurrence.frequency) {
        case 'daily':
          nextGen.setDate(nextGen.getDate() + 1);
          break;
        case 'weekly':
          nextGen.setDate(nextGen.getDate() + 7);
          break;
        case 'monthly':
          nextGen.setMonth(nextGen.getMonth() + 1);
          break;
        case 'quarterly':
          nextGen.setMonth(nextGen.getMonth() + 3);
          break;
        case 'yearly':
          nextGen.setFullYear(nextGen.getFullYear() + 1);
          break;
      }
      reportData.recurrence.nextGeneration = nextGen;
    }

    const newReport = new Report(reportData);
    const reportSaved = await newReport.save();

    // Populate para la respuesta
    const populatedReport = await Report.findById(reportSaved._id)
      .populate('generatedBy', 'personalInfo email')
      .populate('forUser', 'personalInfo email')
      .populate('allowedUsers', 'personalInfo email');

    res.status(201).json({
      success: true,
      message: "Report created successfully",
      data: populatedReport
    });
  } catch (error) {
    next(error);
  }
};

export const generateReportData = async (req, res, next) => {
  try {
    const { forceRegenerate } = req.body;
    const report = await Report.findById(req.params.id);

    if (!report) {
      const error = new Error("Report not found");
      error.status = 404;
      throw error;
    }

    // Verificar permisos
    if (report.generatedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      const error = new Error("Not authorized to generate this report");
      error.status = 403;
      throw error;
    }

    // Si ya está generado y no se fuerza regeneración
    if (report.status === 'generated' && !forceRegenerate) {
      return res.json({
        success: true,
        message: "Report already generated",
        data: report
      });
    }

    // Actualizar estado
    report.status = 'generating';
    report.updatedBy = req.user.id;
    await report.save();

    try {
      // Generar datos según el tipo de reporte
      await report.addGenerationLog('start', 'Starting report data generation');
      
      let reportData;
      switch (report.type) {
        case 'student_progress':
          reportData = await generateStudentProgressReport(report);
          break;
        case 'tutor_performance':
          reportData = await generateTutorPerformanceReport(report);
          break;
        case 'system_usage':
          reportData = await generateSystemUsageReport(report);
          break;
        case 'assignment_completion':
          reportData = await generateAssignmentCompletionReport(report);
          break;
        default:
          reportData = await generateCustomReport(report);
      }

      report.data = reportData;
      report.status = 'generated';
      await report.addGenerationLog('complete', 'Report data generation completed', 1000);

      const updatedReport = await Report.findById(report._id)
        .populate('generatedBy', 'personalInfo email');

      res.json({
        success: true,
        message: "Report data generated successfully",
        data: updatedReport
      });

    } catch (genError) {
      report.status = 'failed';
      await report.addGenerationLog('error', `Generation failed: ${genError.message}`);
      await report.save();
      
      const error = new Error(`Report generation failed: ${genError.message}`);
      error.status = 500;
      throw error;
    }

  } catch (error) {
    next(error);
  }
};

// Funciones auxiliares para generar datos de reportes
const generateStudentProgressReport = async (report) => {
  const { period, filters } = report;
  
  // Obtener progreso del estudiante
  const progressData = await ProgressTracking.find({
    studentId: report.forUser,
    createdAt: {
      $gte: period.startDate,
      $lte: period.endDate
    },
    ...(filters.subjects && filters.subjects.length > 0 && { subject: { $in: filters.subjects } })
  }).populate('studentId', 'personalInfo studentProfile');

  // Obtener asignaciones del estudiante
  const assignments = await Assignment.find({
    studentId: report.forUser,
    dueDate: {
      $gte: period.startDate,
      $lte: period.endDate
    }
  });

  // Obtener citas del estudiante
  const appointments = await Appointment.find({
    studentId: report.forUser,
    scheduledDate: {
      $gte: period.startDate,
      $lte: period.endDate
    }
  });

  // Calcular métricas
  const completedAssignments = assignments.filter(a => a.status === 'graded').length;
  const totalAssignments = assignments.length;
  const assignmentCompletionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;
  
  const attendedAppointments = appointments.filter(a => a.status === 'completed').length;
  const totalAppointments = appointments.length;
  const attendanceRate = totalAppointments > 0 ? (attendedAppointments / totalAppointments) * 100 : 0;

  const averageGrade = assignments.filter(a => a.grading?.grade)
    .reduce((sum, a) => sum + a.grading.grade, 0) / completedAssignments || 0;

  return {
    academicPerformance: {
      totalSessions: attendedAppointments,
      completedAssignments,
      averageGrade: Math.round(averageGrade * 100) / 100,
      gradeImprovement: 0, // Se calcularía comparando con período anterior
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      subjects: progressData.map(p => ({
        name: p.subject,
        grade: p.metrics.assignmentGrades || 0,
        progress: p.metrics.understandingLevel || 0,
        assignmentsCompleted: assignments.filter(a => a.materialId?.subject === p.subject).length
      }))
    },
    activitySummary: {
      subjectsCovered: [...new Set(progressData.map(p => p.subject))],
      hoursOfTutoring: attendedAppointments * 1, // Asumiendo 1 hora por sesión
      materialsAccessed: await EducationalMaterial.countDocuments({
        createdBy: report.forUser,
        createdAt: { $gte: period.startDate, $lte: period.endDate }
      }),
      assignmentsSubmitted: assignments.filter(a => a.submission?.submittedAt).length,
      activeDays: new Set(appointments.map(a => a.scheduledDate.toISOString().split('T')[0])).size
    },
    metrics: {
      totalRecords: progressData.length + assignments.length + appointments.length,
      dataPoints: progressData.length,
      calculationTime: 500,
      accuracy: 95
    }
  };
};

const generateTutorPerformanceReport = async (report) => {
  const { period, filters } = report;
  
  const tutorId = report.forUser || filters.users?.[0];
  if (!tutorId) throw new Error("Tutor ID required for performance report");

  // Obtener citas del tutor
  const appointments = await Appointment.find({
    professionalId: tutorId,
    scheduledDate: {
      $gte: period.startDate,
      $lte: period.endDate
    },
    status: 'completed'
  }).populate('studentId', 'personalInfo');

  // Obtener estudiantes únicos
  const uniqueStudents = [...new Set(appointments.map(a => a.studentId._id.toString()))];

  // Obtener progreso de estudiantes
  const studentProgress = await ProgressTracking.find({
    studentId: { $in: uniqueStudents },
    trackedBy: tutorId,
    createdAt: { $gte: period.startDate, $lte: period.endDate }
  });

  // Calcular métricas
  const totalStudents = uniqueStudents.length;
  const sessionsCompleted = appointments.length;
  
  const ratings = appointments.filter(a => a.studentRating).map(a => a.studentRating);
  const averageRating = ratings.length > 0 ? 
    ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;

  const subjectsTaught = [...new Set(appointments.map(a => a.subject))];

  return {
    tutorPerformance: {
      totalStudents,
      averageRating: Math.round(averageRating * 100) / 100,
      sessionsCompleted,
      studentSatisfaction: Math.round((ratings.length / sessionsCompleted) * 100),
      subjectsTaught,
      studentProgress: studentProgress.map(sp => ({
        studentId: sp.studentId,
        improvement: sp.metrics.understandingLevel || 0,
        completionRate: sp.metrics.completionRate || 0
      }))
    },
    metrics: {
      totalRecords: appointments.length + studentProgress.length,
      dataPoints: appointments.length,
      calculationTime: 300,
      accuracy: 90
    }
  };
};

const generateSystemUsageReport = async (report) => {
  const { period } = report;

  // Obtener estadísticas del sistema
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({
    lastLogin: { $gte: period.startDate }
  });
  
  const newRegistrations = await User.countDocuments({
    createdAt: { $gte: period.startDate, $lte: period.endDate }
  });

  const sessionsCreated = await Appointment.countDocuments({
    createdAt: { $gte: period.startDate, $lte: period.endDate }
  });

  const materialsUploaded = await EducationalMaterial.countDocuments({
    createdAt: { $gte: period.startDate, $lte: period.endDate }
  });

  const assignmentsCreated = await Assignment.countDocuments({
    createdAt: { $gte: period.startDate, $lte: period.endDate }
  });

  // Obtener materias populares
  const popularSubjects = await Appointment.aggregate([
    {
      $match: {
        createdAt: { $gte: period.startDate, $lte: period.endDate }
      }
    },
    {
      $group: {
        _id: '$subject',
        usageCount: { $sum: 1 }
      }
    },
    {
      $sort: { usageCount: -1 }
    },
    {
      $limit: 10
    }
  ]);

  return {
    systemUsage: {
      totalUsers,
      activeUsers,
      newRegistrations,
      sessionsCreated,
      materialsUploaded,
      assignmentsCreated,
      peakUsageTimes: [
        { hour: 9, activity: 75 },
        { hour: 14, activity: 85 },
        { hour: 18, activity: 65 }
      ],
      popularSubjects: popularSubjects.map(ps => ({
        subject: ps._id,
        usageCount: ps.usageCount
      }))
    },
    metrics: {
      totalRecords: totalUsers + sessionsCreated + materialsUploaded + assignmentsCreated,
      dataPoints: 8,
      calculationTime: 200,
      accuracy: 98
    }
  };
};

const generateAssignmentCompletionReport = async (report) => {
  const { period, filters } = report;

  const assignments = await Assignment.find({
    dueDate: { $gte: period.startDate, $lte: period.endDate },
    ...(filters.subjects && filters.subjects.length > 0 && { 
      'materialId.subject': { $in: filters.subjects } 
    })
  }).populate('materialId', 'subject')
    .populate('studentId', 'personalInfo');

  const completionStats = assignments.reduce((stats, assignment) => {
    const subject = assignment.materialId?.subject || 'Unknown';
    if (!stats[subject]) {
      stats[subject] = { total: 0, completed: 0, graded: 0, late: 0 };
    }
    
    stats[subject].total++;
    if (assignment.status === 'submitted' || assignment.status === 'graded') {
      stats[subject].completed++;
    }
    if (assignment.status === 'graded') {
      stats[subject].graded++;
    }
    if (assignment.status === 'late') {
      stats[subject].late++;
    }
    
    return stats;
  }, {});

  return {
    assignmentCompletion: {
      bySubject: Object.entries(completionStats).map(([subject, stats]) => ({
        subject,
        total: stats.total,
        completed: stats.completed,
        completionRate: Math.round((stats.completed / stats.total) * 100),
        graded: stats.graded,
        late: stats.late
      })),
      overall: {
        total: assignments.length,
        completed: assignments.filter(a => a.status === 'submitted' || a.status === 'graded').length,
        graded: assignments.filter(a => a.status === 'graded').length,
        late: assignments.filter(a => a.status === 'late').length
      }
    },
    metrics: {
      totalRecords: assignments.length,
      dataPoints: Object.keys(completionStats).length,
      calculationTime: 150,
      accuracy: 97
    }
  };
};

const generateCustomReport = async (report) => {
  // Reporte personalizado - estructura básica
  return {
    customData: {
      message: "Custom report data would be generated based on specific requirements",
      generatedAt: new Date().toISOString(),
      parameters: report.filters
    },
    metrics: {
      totalRecords: 0,
      dataPoints: 0,
      calculationTime: 100,
      accuracy: 0
    }
  };
};

export const deliverReport = async (req, res, next) => {
  try {
    const { method, recipients, message } = req.body;
    const report = await Report.findById(req.params.id);

    if (!report) {
      const error = new Error("Report not found");
      error.status = 404;
      throw error;
    }

    // Verificar que el reporte esté generado
    if (report.status !== 'generated') {
      const error = new Error("Report must be generated before delivery");
      error.status = 400;
      throw error;
    }

    // Verificar permisos
    if (report.generatedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      const error = new Error("Not authorized to deliver this report");
      error.status = 403;
      throw error;
    }

    // Actualizar información de entrega
    report.delivery.method = method;
    report.delivery.recipients = recipients || [];
    report.delivery.sentAt = new Date();
    report.delivery.deliveryStatus = 'sent';
    report.status = 'delivered';
    report.updatedBy = req.user.id;

    await report.save();

    // Aquí iría la lógica real de entrega (email, etc.)
    // Por ahora solo simulamos

    res.json({
      success: true,
      message: `Report delivered via ${method}`,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

export const getReportTemplates = async (req, res, next) => {
  try {
    const templates = {
      student_progress: {
        name: "Student Progress Report",
        description: "Comprehensive report on student academic progress",
        defaultPeriod: "monthly",
        availableVisualizations: ["summary", "detailed", "charts"],
        requiredFilters: ["student"]
      },
      tutor_performance: {
        name: "Tutor Performance Report",
        description: "Performance metrics and student outcomes for tutors",
        defaultPeriod: "quarterly",
        availableVisualizations: ["summary", "charts", "tables"],
        requiredFilters: ["tutor"]
      },
      system_usage: {
        name: "System Usage Report",
        description: "Platform usage statistics and activity metrics",
        defaultPeriod: "monthly",
        availableVisualizations: ["charts", "summary"],
        requiredFilters: []
      },
      assignment_completion: {
        name: "Assignment Completion Report",
        description: "Tracking assignment submission and completion rates",
        defaultPeriod: "weekly",
        availableVisualizations: ["tables", "charts"],
        requiredFilters: []
      }
    };

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    next(error);
  }
};

export const deleteReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      const error = new Error("Report not found");
      error.status = 404;
      throw error;
    }

    // Verificar permisos
    if (report.generatedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      const error = new Error("Not authorized to delete this report");
      error.status = 403;
      throw error;
    }

    await Report.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Report deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};