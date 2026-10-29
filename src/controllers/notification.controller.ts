import type { Handler, BodyOf } from '../types/http.js';
import type * as schemas from '../schemas/notification.schema.js';
import type { FilterQuery } from 'mongoose';
import type { NotificationRecord } from '../models/Notification.js';
import { AppError } from '../utils/AppError.js';
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import Appointment from "../models/Appointment.js";
import Assignment from "../models/Assignment.js";
import EducationalMaterial from "../models/EducationalMaterial.js";

export const getNotifications: Handler<Record<string, string>, unknown, unknown> = async (req, res, next) => {
  try {
    const {
      read,
      type,
      priority,
      category,
      page = 1,
      limit = 20
    } = req.query;

    const filter: FilterQuery<NotificationRecord> = { userId: req.user!.id };

    // Filtros
    if (read !== undefined) filter.read = read === 'true';
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    const options = {
      page: parseInt(String(page)),
      limit: parseInt(String(limit)),
      sort: { createdAt: -1 as const }
    };

    const notifications = await Notification.find(filter)
      .populate('relatedAppointment', 'topic startsAt')
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
      userId: req.user!.id,
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

export const getNotificationById: Handler<Record<string, string>, unknown, unknown> = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('relatedAppointment', 'topic startsAt')
      .populate('relatedAssignment', 'title dueDate')
      .populate('relatedMaterial', 'title type')
      .populate('relatedReport', 'title type')
      .populate('relatedUser', 'personalInfo')
      .populate('createdBy', 'personalInfo');

    if (!notification) {
      throw new AppError(404, 'NOT_FOUND', "Notification not found");
    }

    // Verificar que el usuario es el destinatario
    if (notification.userId.toString() !== req.user!.id && req.user!.role !== 'admin') {
      throw new AppError(403, 'FORBIDDEN', "Access denied to this notification");
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

export const createNotification: Handler<Record<string, string>, unknown, BodyOf<typeof schemas.createNotificationSchema> & { createdBy?: string; updatedBy?: string }> = async (req, res, next) => {
  try {
    const notificationData = req.body;

    // Verificar que el usuario destinatario existe
    const user = await User.findById(notificationData.userId);
    if (!user) {
      throw new AppError(404, 'NOT_FOUND', "User not found");
    }

    // Las notificaciones manuales son solo para administración. Las del flujo de citas
    // se generan en el controlador de citas, nunca desde el cliente.
    if (req.user!.role !== 'admin') {
      throw new AppError(403, 'FORBIDDEN', "Only admins can create notifications");
    }

    // Verificar referencias si se proporcionan
    if (notificationData.relatedAppointment) {
      const appointment = await Appointment.findById(notificationData.relatedAppointment);
      if (!appointment) {
        throw new AppError(404, 'NOT_FOUND', "Related appointment not found");
      }
    }

    if (notificationData.relatedAssignment) {
      const assignment = await Assignment.findById(notificationData.relatedAssignment);
      if (!assignment) {
        throw new AppError(404, 'NOT_FOUND', "Related assignment not found");
      }
    }

    // Agregar información de auditoría
    notificationData.createdBy = req.user!.id;
    notificationData.updatedBy = req.user!.id;

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

export const markAsRead: Handler<Record<string, string>, unknown, unknown> = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      throw new AppError(404, 'NOT_FOUND', "Notification not found");
    }

    // Verificar que el usuario es el destinatario
    if (notification.userId.toString() !== req.user!.id) {
      throw new AppError(403, 'FORBIDDEN', "Not authorized to mark this notification as read");
    }

    await notification.markAsRead();

    const unreadCount = await Notification.countDocuments({
      userId: req.user!.id,
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

export const markAllAsRead: Handler<Record<string, string>, unknown, unknown> = async (req, res, next) => {
  try {
    const { type } = req.query;

    const filter: FilterQuery<NotificationRecord> = { userId: req.user!.id, read: false };

    // Si se especifica un tipo, filtrar por ese tipo
    if (type) {
      filter.type = type;
    }

    const result = await Notification.updateMany(
      filter,
      {
        $set: {
          read: true,
          updatedBy: req.user!.id
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
      message: type
        ? `All ${type} notifications marked as read`
        : "All notifications marked as read",
      updated: result.modifiedCount
    });
  } catch (error) {
    next(error);
  }
};

export const recordClick: Handler<Record<string, string>, unknown, unknown> = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      throw new AppError(404, 'NOT_FOUND', "Notification not found");
    }

    // Verificar que el usuario es el destinatario
    if (notification.userId.toString() !== req.user!.id) {
      throw new AppError(403, 'FORBIDDEN', "Not authorized to interact with this notification");
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

export const respondToNotification: Handler<Record<string, string>, unknown, BodyOf<typeof schemas.responseToNotificationSchema> & { createdBy?: string; updatedBy?: string }> = async (req, res, next) => {
  try {
    const { response, data } = req.body;
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      throw new AppError(404, 'NOT_FOUND', "Notification not found");
    }

    // Verificar que el usuario es el destinatario
    if (notification.userId.toString() !== req.user!.id) {
      throw new AppError(403, 'FORBIDDEN', "Not authorized to respond to this notification");
    }

    // Verificar que permite respuesta
    if (!notification.allowResponse) {
      throw new AppError(400, 'BAD_REQUEST', "This notification does not allow responses");
    }

    // Verificar que la respuesta es válida
    if (notification.responseOptions.length > 0 &&
        !notification.responseOptions.includes(response)) {
      throw new AppError(400, 'BAD_REQUEST', "Invalid response. Available options: " + notification.responseOptions.join(', '));
    }

    // La respuesta solo registra la elección del destinatario. El estado de las citas
    // se cambia únicamente desde /api/appointments (reglas de rol y transiciones).
    await notification.recordResponse(response, data);

    res.json({
      success: true,
      message: "Response recorded successfully",
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

export const createBulkNotifications: Handler<Record<string, string>, unknown, BodyOf<typeof schemas.createBulkNotificationsSchema> & { createdBy?: string; updatedBy?: string }> = async (req, res, next) => {
  try {
    const { users, title, message, type, priority, category, deliveryMethod, batchId } = req.body;

    // Solo administración puede enviar notificaciones masivas
    if (req.user!.role !== 'admin') {
      throw new AppError(403, 'FORBIDDEN', "Only admins can create bulk notifications");
    }

    // Verificar que los usuarios existen
    const existingUsers = await User.find({ _id: { $in: users } });
    if (existingUsers.length !== users.length) {
      throw new AppError(404, 'NOT_FOUND', "Some users not found");
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
      createdBy: req.user!.id,
      updatedBy: req.user!.id
    }));

    const createdNotifications = await Notification.insertMany(notifications);

    // Simular envío (en producción esto sería asíncrono)
    for (const notification of createdNotifications) {
      const notif = await Notification.findById(notification._id);
      await notif!.recordDelivery('in_app', 'sent');
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

export const getUnreadCount: Handler<Record<string, string>, unknown, unknown> = async (req, res, next) => {
  try {
    const unreadCount = await Notification.countDocuments({
      userId: req.user!.id,
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

export const deleteNotification: Handler<Record<string, string>, unknown, unknown> = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      throw new AppError(404, 'NOT_FOUND', "Notification not found");
    }

    // Verificar que el usuario es el destinatario o admin
    if (notification.userId.toString() !== req.user!.id && req.user!.role !== 'admin') {
      throw new AppError(403, 'FORBIDDEN', "Not authorized to delete this notification");
    }

    await Notification.findByIdAndDelete(req.params.id);

    const unreadCount = await Notification.countDocuments({
      userId: req.user!.id,
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

export const getNotificationStats: Handler<Record<string, string>, unknown, unknown> = async (req, res, next) => {
  try {
    const stats = await Notification.aggregate([
      { $match: { userId: req.user!.id } },
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
      { $match: { userId: req.user!.id } },
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
