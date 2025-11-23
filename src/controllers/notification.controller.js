import Notification from "../models/Notification.js";
import User from "../models/User.js";
import Appointment from "../models/Appointment.js";
import Assignment from "../models/Assignment.js";
import EducationalMaterial from "../models/EducationalMaterial.js";

export const getNotifications = async (req, res, next) => {
  try {
    const { 
      read, 
      type, 
      priority,
      category,
      page = 1, 
      limit = 20 
    } = req.query;
    
    const filter = { userId: req.user.id };
    
    // Filtros
    if (read !== undefined) filter.read = read === 'true';
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const notifications = await Notification.find(filter)
      .populate('relatedAppointment', 'subject scheduledDate')
      .populate('relatedAssignment', 'title dueDate')
      .populate('relatedMaterial', 'title type')
      .populate('relatedReport', 'title type')
      .populate('relatedUser', 'personalInfo')
      .populate('createdBy', 'personalInfo')
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .sort(options.sort);

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ 
      userId: req.user.id, 
      read: false 
    });

    res.json({
      success: true,
      data: notifications,
      unreadCount,
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

export const getNotificationById = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('relatedAppointment', 'subject scheduledDate')
      .populate('relatedAssignment', 'title dueDate')
      .populate('relatedMaterial', 'title type')
      .populate('relatedReport', 'title type')
      .populate('relatedUser', 'personalInfo')
      .populate('createdBy', 'personalInfo');

    if (!notification) {
      const error = new Error("Notification not found");
      error.status = 404;
      throw error;
    }

    // Verificar que el usuario es el destinatario
    if (notification.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      const error = new Error("Access denied to this notification");
      error.status = 403;
      throw error;
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

export const createNotification = async (req, res, next) => {
  try {
    const notificationData = req.body;

    // Verificar que el usuario destinatario existe
    const user = await User.findById(notificationData.userId);
    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    // Verificar permisos para crear notificaciones
    if (!['tutor', 'advisor', 'admin'].includes(req.user.role)) {
      const error = new Error("Only tutors, advisors and admins can create notifications");
      error.status = 403;
      throw error;
    }

    // Verificar referencias si se proporcionan
    if (notificationData.relatedAppointment) {
      const appointment = await Appointment.findById(notificationData.relatedAppointment);
      if (!appointment) {
        const error = new Error("Related appointment not found");
        error.status = 404;
        throw error;
      }
    }

    if (notificationData.relatedAssignment) {
      const assignment = await Assignment.findById(notificationData.relatedAssignment);
      if (!assignment) {
        const error = new Error("Related assignment not found");
        error.status = 404;
        throw error;
      }
    }

    // Agregar información de auditoría
    notificationData.createdBy = req.user.id;
    notificationData.updatedBy = req.user.id;

    const newNotification = new Notification(notificationData);
    const notificationSaved = await newNotification.save();

    // Simular envío (en producción esto sería asíncrono)
    await notificationSaved.recordDelivery('in_app', 'sent');

    // Populate para la respuesta
    const populatedNotification = await Notification.findById(notificationSaved._id)
      .populate('userId', 'personalInfo email')
      .populate('createdBy', 'personalInfo');

    res.status(201).json({
      success: true,
      message: "Notification created successfully",
      data: populatedNotification
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      const error = new Error("Notification not found");
      error.status = 404;
      throw error;
    }

    // Verificar que el usuario es el destinatario
    if (notification.userId.toString() !== req.user.id) {
      const error = new Error("Not authorized to mark this notification as read");
      error.status = 403;
      throw error;
    }

    await notification.markAsRead();

    const unreadCount = await Notification.countDocuments({ 
      userId: req.user.id, 
      read: false 
    });

    res.json({
      success: true,
      message: "Notification marked as read",
      unreadCount
    });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: false },
      { 
        $set: { 
          read: true,
          updatedBy: req.user.id 
        },
        $push: {
          interactionLog: {
            action: 'viewed',
            timestamp: new Date()
          }
        }
      }
    );

    res.json({
      success: true,
      message: "All notifications marked as read"
    });
  } catch (error) {
    next(error);
  }
};

export const recordClick = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      const error = new Error("Notification not found");
      error.status = 404;
      throw error;
    }

    // Verificar que el usuario es el destinatario
    if (notification.userId.toString() !== req.user.id) {
      const error = new Error("Not authorized to interact with this notification");
      error.status = 403;
      throw error;
    }

    await notification.recordClick();

    res.json({
      success: true,
      message: "Click recorded"
    });
  } catch (error) {
    next(error);
  }
};

export const respondToNotification = async (req, res, next) => {
  try {
    const { response, data } = req.body;
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      const error = new Error("Notification not found");
      error.status = 404;
      throw error;
    }

    // Verificar que el usuario es el destinatario
    if (notification.userId.toString() !== req.user.id) {
      const error = new Error("Not authorized to respond to this notification");
      error.status = 403;
      throw error;
    }

    // Verificar que permite respuesta
    if (!notification.allowResponse) {
      const error = new Error("This notification does not allow responses");
      error.status = 400;
      throw error;
    }

    // Verificar que la respuesta es válida
    if (notification.responseOptions.length > 0 && 
        !notification.responseOptions.includes(response)) {
      const error = new Error("Invalid response. Available options: " + notification.responseOptions.join(', '));
      error.status = 400;
      throw error;
    }

    await notification.recordResponse(response, data);

    // Aquí podrías agregar lógica adicional basada en la respuesta
    // Por ejemplo, confirmar/cancelar cita, etc.

    res.json({
      success: true,
      message: "Response recorded successfully",
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

export const createBulkNotifications = async (req, res, next) => {
  try {
    const { users, title, message, type, priority, category, deliveryMethod, batchId } = req.body;

    // Verificar permisos
    if (!['tutor', 'advisor', 'admin'].includes(req.user.role)) {
      const error = new Error("Only tutors, advisors and admins can create bulk notifications");
      error.status = 403;
      throw error;
    }

    // Verificar que los usuarios existen
    const existingUsers = await User.find({ _id: { $in: users } });
    if (existingUsers.length !== users.length) {
      const error = new Error("Some users not found");
      error.status = 404;
      throw error;
    }

    // Crear notificaciones en lote
    const notifications = users.map(userId => ({
      userId,
      title,
      message,
      type,
      priority,
      category,
      deliveryMethod,
      batchId: batchId || `bulk_${Date.now()}`,
      createdBy: req.user.id,
      updatedBy: req.user.id
    }));

    const createdNotifications = await Notification.insertMany(notifications);

    // Simular envío (en producción esto sería asíncrono)
    for (const notification of createdNotifications) {
      const notif = await Notification.findById(notification._id);
      await notif.recordDelivery('in_app', 'sent');
    }

    res.status(201).json({
      success: true,
      message: `${createdNotifications.length} notifications created successfully`,
      data: {
        count: createdNotifications.length,
        batchId: batchId || `bulk_${Date.now()}`
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const unreadCount = await Notification.countDocuments({ 
      userId: req.user.id, 
      read: false 
    });

    res.json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      const error = new Error("Notification not found");
      error.status = 404;
      throw error;
    }

    // Verificar que el usuario es el destinatario o admin
    if (notification.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      const error = new Error("Not authorized to delete this notification");
      error.status = 403;
      throw error;
    }

    await Notification.findByIdAndDelete(req.params.id);

    const unreadCount = await Notification.countDocuments({ 
      userId: req.user.id, 
      read: false 
    });

    res.json({
      success: true,
      message: "Notification deleted successfully",
      unreadCount
    });
  } catch (error) {
    next(error);
  }
};

export const getNotificationStats = async (req, res, next) => {
  try {
    const stats = await Notification.aggregate([
      { $match: { userId: req.user.id } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          read: { $sum: { $cond: ['$read', 1, 0] } },
          responded: { $sum: { $cond: ['$userResponse', 1, 0] } }
        }
      }
    ]);

    const deliveryStats = await Notification.aggregate([
      { $match: { userId: req.user.id } },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
          read: { $sum: { $cond: ['$read', 1, 0] } }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        byType: stats,
        byPriority: deliveryStats
      }
    });
  } catch (error) {
    next(error);
  }
};

// Función para generar notificaciones automáticas del sistema
export const generateSystemNotifications = async () => {
  try {
    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    // Recordatorios de citas (24 horas antes)
    const upcomingAppointments = await Appointment.find({
      scheduledDate: { 
        $gte: oneHourFromNow,
        $lte: oneDayFromNow 
      },
      status: { $in: ['scheduled', 'confirmed'] }
    }).populate('studentId professionalId');

    for (const appointment of upcomingAppointments) {
      const notification = new Notification({
        userId: appointment.studentId._id,
        title: 'Recordatorio de Tutoría',
        message: `Tienes una sesión de ${appointment.subject} programada para ${appointment.scheduledDate.toLocaleString()}`,
        type: 'appointment_reminder',
        priority: 'medium',
        relatedAppointment: appointment._id,
        actionUrl: `/appointments/${appointment._id}`,
        actionLabel: 'Ver Detalles',
        category: 'appointment',
        createdBy: appointment.professionalId._id
      });
      await notification.save();
      await notification.recordDelivery('in_app', 'sent');
    }

    // Recordatorios de tareas próximas a vencer (24 horas antes)
    const dueAssignments = await Assignment.find({
      dueDate: { 
        $gte: oneHourFromNow,
        $lte: oneDayFromNow 
      },
      status: { $in: ['assigned', 'returned'] }
    }).populate('studentId materialId');

    for (const assignment of dueAssignments) {
      const notification = new Notification({
        userId: assignment.studentId._id,
        title: 'Tarea Próxima a Vencer',
        message: `La tarea "${assignment.title}" vence el ${assignment.dueDate.toLocaleString()}`,
        type: 'assignment_due',
        priority: 'high',
        relatedAssignment: assignment._id,
        actionUrl: `/assignments/${assignment._id}`,
        actionLabel: 'Entregar Tarea',
        category: 'assignment',
        createdBy: assignment.assignedBy
      });
      await notification.save();
      await notification.recordDelivery('in_app', 'sent');
    }

    // Notificaciones de nuevas calificaciones
    const recentGradedAssignments = await Assignment.find({
      'grading.gradedAt': { 
        $gte: new Date(now.getTime() - 60 * 60 * 1000) // Última hora
      },
      status: 'graded'
    }).populate('studentId');

    for (const assignment of recentGradedAssignments) {
      const notification = new Notification({
        userId: assignment.studentId._id,
        title: 'Nueva Calificación',
        message: `Tu tarea "${assignment.title}" ha sido calificada: ${assignment.grading.grade}/${assignment.maxPoints}`,
        type: 'grade_posted',
        priority: 'medium',
        relatedAssignment: assignment._id,
        actionUrl: `/assignments/${assignment._id}`,
        actionLabel: 'Ver Calificación',
        category: 'academic',
        createdBy: assignment.grading.gradedBy
      });
      await notification.save();
      await notification.recordDelivery('in_app', 'sent');
    }

    return {
      appointmentReminders: upcomingAppointments.length,
      assignmentReminders: dueAssignments.length,
      gradeNotifications: recentGradedAssignments.length
    };
  } catch (error) {
    console.error('Error generating system notifications:', error);
    throw error;
  }
};