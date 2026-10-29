import type { AuthenticatedUser } from '../types/auth.js';
import type { Types } from 'mongoose';
import type { BodyOf } from '../types/http.js';
import type { createMessageSchema } from '../schemas/message.schema.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Appointment, { MESSAGING_APPOINTMENT_STATUSES } from '../models/Appointment.js';
import Course from '../models/Course.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const MAX_PAGE_SIZE = 100;

/** Solo hay mensajería entre un estudiante y un tutor. */
const canUsersChat = (roleA: string, roleB: string) =>
  (roleA === 'student' && roleB === 'tutor') || (roleA === 'tutor' && roleB === 'student');

/**
 * Relación que habilita la mensajería: un curso donde el tutor enseña al estudiante
 * o una cita confirmada/completada entre ambos. Es simétrica, así que sirve en ambos sentidos.
 */
const hasMessagingRelationship = async (userId: string | Types.ObjectId, otherUserId: string | Types.ObjectId) => {
  const [course, appointment] = await Promise.all([
    Course.exists({
      $or: [
        { instructor: userId, enrolledStudents: { $elemMatch: { student: otherUserId } } },
        { instructor: otherUserId, enrolledStudents: { $elemMatch: { student: userId } } }
      ]
    }),
    Appointment.exists({
      status: { $in: MESSAGING_APPOINTMENT_STATUSES },
      $or: [
        { studentId: userId, tutorId: otherUserId },
        { tutorId: userId, studentId: otherUserId }
      ]
    })
  ]);
  return Boolean(course || appointment);
};

/** Carga al otro participante y comprueba que la conversación esté permitida. */
const loadChatPartner = async (user: AuthenticatedUser, otherUserId: string) => {
  const otherUser = await User.findById(otherUserId).select('personalInfo role');
  if (!otherUser) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Usuario no encontrado.');
  }
  if (!canUsersChat(user.role, otherUser.role)) {
    throw new AppError(403, 'MESSAGING_NOT_ALLOWED', 'La mensajería solo está disponible entre estudiantes y tutores.');
  }
  if (!(await hasMessagingRelationship(user._id, otherUser._id))) {
    throw new AppError(
      403,
      'MESSAGING_NOT_ALLOWED',
      'No hay un curso ni una cita confirmada que habilite la mensajería con este usuario.'
    );
  }
  return otherUser;
};

export const createMessage = asyncHandler<Record<string, string>, unknown, BodyOf<typeof createMessageSchema>>(async (req, res) => {
  const sender = req.user!;
  const { to, text } = req.body;

  if (sender.id === to) {
    throw new AppError(400, 'SELF_MESSAGE', 'No puedes enviarte mensajes a ti mismo.');
  }

  const receiver = await loadChatPartner(sender, to);

  const message = await Message.create({
    sender: sender._id,
    receiver: receiver._id,
    text
  });

  try {
    const senderName = sender.personalInfo?.firstName
      ? `${sender.personalInfo.firstName} ${sender.personalInfo.lastName || ''}`.trim()
      : 'Un usuario';

    await Notification.create({
      userId: receiver._id,
      title: `💬 Nuevo mensaje de ${senderName}`,
      message: text.length > 100 ? `${text.substring(0, 100)}...` : text,
      type: 'message_received',
      priority: 'medium',
      category: 'communication',
      relatedUser: sender._id,
      actionUrl: `/dashboard/mensajes?userId=${sender._id}`,
      actionLabel: 'Responder',
      deliveryMethod: ['in_app'],
      createdBy: sender._id,
      updatedBy: sender._id
    });
  } catch (notifyError) {
    // Una notificación fallida no debe impedir que el mensaje se entregue.
    console.error('No se pudo crear la notificación de mensaje:', notifyError instanceof Error ? notifyError.message : String(notifyError));
  }

  const populated = await Message.findById(message._id)
    .populate('sender', 'personalInfo role')
    .populate('receiver', 'personalInfo role');

  res.status(201).json({ success: true, data: populated });
});

export const getConversations = asyncHandler(async (req, res) => {
  const user = req.user!;
  const userId = user._id;

  const [appointments, courses] = await Promise.all([
    Appointment.find({
      status: { $in: MESSAGING_APPOINTMENT_STATUSES },
      $or: [{ studentId: userId }, { tutorId: userId }]
    }).select('studentId tutorId'),
    Course.find({
      $or: [{ instructor: userId }, { enrolledStudents: { $elemMatch: { student: userId } } }]
    }).select('instructor enrolledStudents')
  ]);

  // Participantes con los que hay relación vigente (cita confirmada o curso compartido).
  const relatedIds = new Set<string>();
  appointments.forEach((apt) => {
    const otherId = String(apt.studentId) === String(userId) ? apt.tutorId : apt.studentId;
    relatedIds.add(String(otherId));
  });
  courses.forEach((course) => {
    if (String(course.instructor) === String(userId)) {
      course.enrolledStudents.forEach((enrollment) => relatedIds.add(String(enrollment.student)));
    } else {
      relatedIds.add(String(course.instructor));
    }
  });

  const summaries = await Message.aggregate<{ _id: Types.ObjectId; lastMessageAt: Date; lastMessage: string; lastSender: Types.ObjectId; unreadCount: number }>([
    { $match: { $or: [{ sender: userId }, { receiver: userId }] } },
    {
      $addFields: {
        otherUser: { $cond: [{ $eq: ['$sender', userId] }, '$receiver', '$sender'] }
      }
    },
    {
      $group: {
        _id: '$otherUser',
        lastMessageAt: { $max: '$createdAt' },
        lastMessage: { $last: '$text' },
        lastSender: { $last: '$sender' },
        unreadCount: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$receiver', userId] }, { $eq: ['$read', false] }] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
  const summaryByUser = new Map(summaries.map((summary) => [String(summary._id), summary]));

  const users = await User.find({ _id: { $in: Array.from(relatedIds) } }).select('personalInfo role');

  const conversations = users
    .filter((other) => canUsersChat(user.role, other.role))
    .map((other) => {
      const summary = summaryByUser.get(String(other._id));
      return {
        otherUser: other,
        lastMessageAt: summary?.lastMessageAt || null,
        lastMessage: summary?.lastMessage || '',
        lastSender: summary?.lastSender || null,
        unreadCount: summary?.unreadCount || 0
      };
    })
    .sort((a, b) => {
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });

  res.json({ success: true, data: conversations });
});

export const getConversationWithUser = asyncHandler(async (req, res) => {
  const userId = req.user!._id;
  const otherUser = await loadChatPartner(req.user!, req.params.otherUserId);

  const pageNum = Math.max(parseInt(String(req.query.page), 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 50, 1), MAX_PAGE_SIZE);

  const filter = {
    $or: [
      { sender: userId, receiver: otherUser._id },
      { sender: otherUser._id, receiver: userId }
    ]
  };

  const [messages, total] = await Promise.all([
    Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .populate('sender', 'personalInfo role')
      .populate('receiver', 'personalInfo role'),
    Message.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: messages.reverse(), // cronológico ascendente
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  });
});

export const markConversationAsRead = asyncHandler(async (req, res) => {
  const userId = req.user!._id;
  const otherUser = await loadChatPartner(req.user!, req.params.otherUserId);

  const result = await Message.updateMany(
    { sender: otherUser._id, receiver: userId, read: false },
    { $set: { read: true, readAt: new Date() } }
  );

  res.json({
    success: true,
    message: 'Mensajes marcados como leídos',
    updated: result.modifiedCount
  });
});
