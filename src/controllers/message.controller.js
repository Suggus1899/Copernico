import Message from '../models/Message.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Appointment from '../models/Appointment.js';
import Course from '../models/Course.js';

const canUsersChat = (roleA, roleB) => {
  const isStudentTutorPair =
    (roleA === 'student' && (roleB === 'tutor' || roleB === 'advisor')) ||
    (roleB === 'student' && (roleA === 'tutor' || roleA === 'advisor'));
  return isStudentTutorPair;
};

export const createMessage = async (req, res, next) => {
  try {
    const senderId = req.user.id;
    const { to, text } = req.body;

    if (senderId === to) {
      const error = new Error('No puedes enviarte mensajes a ti mismo');
      error.status = 400;
      throw error;
    }

    const receiver = await User.findById(to);
    if (!receiver) {
      const error = new Error('Usuario destino no encontrado');
      error.status = 404;
      throw error;
    }

    if (!canUsersChat(req.user.role, receiver.role)) {
      const error = new Error('Solo se permite mensajería entre estudiantes y tutores/asesores');
      error.status = 403;
      throw error;
    }

    // Verificar si los usuarios tienen una relación de curso activa
    const hasActiveCourseRelationship = await Course.exists({
      $or: [
        // Si el remitente es instructor del curso y el destinatario es estudiante
        { instructor: senderId, enrolledStudents: { $elemMatch: { student: to } } },
        // Si el remitente es estudiante del curso y el destinatario es instructor
        { instructor: to, enrolledStudents: { $elemMatch: { student: senderId } } }
      ]
    });

    // Verificar si los usuarios tienen una cita activa
    const hasActiveAppointment = await Appointment.exists({
      status: { $in: ['scheduled', 'confirmed', 'in-progress', 'completed'] },
      $or: [
        { studentId: senderId, professionalId: to },
        { professionalId: senderId, studentId: to }
      ]
    });

    if (!hasActiveCourseRelationship && !hasActiveAppointment) {
      const error = new Error('No se permite mensajería con este usuario, ya que no hay una relación de curso o cita activa');
      error.status = 403;
      throw error;
    }

    const message = await Message.create({
      sender: senderId,
      receiver: receiver._id,
      text
    });

    // Crear notificación mejorada para el receptor
    try {
      const senderName = req.user.personalInfo?.firstName 
        ? `${req.user.personalInfo.firstName} ${req.user.personalInfo.lastName || ''}`.trim()
        : req.user.email;

      await Notification.create({
        userId: receiver._id,
        title: `💬 Nuevo mensaje de ${senderName}`,
        message: text.length > 100 ? `${text.substring(0, 100)}...` : text,
        type: 'message_received',
        priority: 'medium',
        category: 'communication',
        relatedUser: req.user._id,
        actionUrl: `/dashboard/mensajes?userId=${req.user._id}`,
        actionLabel: 'Responder',
        deliveryMethod: ['in_app'],
        createdBy: req.user._id,
        updatedBy: req.user._id
      });
      
      console.log(`✅ Notificación de mensaje creada para ${receiver.email}`);
    } catch (notifyError) {
      console.error('❌ No se pudo crear la notificación de mensaje:', notifyError);
    }

    const populated = await Message.findById(message._id)
      .populate('sender', 'personalInfo role')
      .populate('receiver', 'personalInfo role');

    res.status(201).json({
      success: true,
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;
    console.log('=== OBTENER CONVERSACIONES ===');
    console.log('Usuario ID:', userId);
    console.log('Usuario Role:', req.user.role);

    // Obtener todos los usuarios con los que tiene una relación activa (curso o cita)
    const activeRelationships = new Set();

    // Obtener usuarios con cita activa
    const activeAppointments = await Appointment.find({
      status: { $in: ['scheduled', 'confirmed', 'in-progress', 'completed'] },
      $or: [
        { studentId: userId },
        { professionalId: userId }
      ]
    }).select('studentId professionalId');

    console.log('Citas activas encontradas:', activeAppointments.length);

    activeAppointments.forEach(apt => {
      const otherId = String(apt.studentId) === String(userId)
        ? String(apt.professionalId)
        : String(apt.studentId);
      activeRelationships.add(otherId);
    });

    console.log('Relaciones desde citas:', activeRelationships.size);

    // Obtener usuarios con curso activo
    const activeCourses = await Course.find({
      $or: [
        { instructor: userId },
        { enrolledStudents: { $elemMatch: { student: userId } } }
      ]
    }).select('instructor enrolledStudents');

    console.log('Cursos activos encontrados:', activeCourses.length);

    activeCourses.forEach(course => {
      if (String(course.instructor) === String(userId)) {
        // Si es instructor, agregar todos los estudiantes del curso
        course.enrolledStudents.forEach(enrollment => {
          activeRelationships.add(String(enrollment.student));
        });
      } else {
        // Si es estudiante, agregar el instructor del curso
        activeRelationships.add(String(course.instructor));
      }
    });

    console.log('Total de relaciones activas:', activeRelationships.size);
    console.log('IDs de usuarios relacionados:', Array.from(activeRelationships));

    // Obtener conversaciones existentes
    const conversationsAgg = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: userId },
            { receiver: userId }
          ]
        }
      },
      {
        $addFields: {
          otherUser: {
            $cond: [
              { $eq: ['$sender', userId] },
              '$receiver',
              '$sender'
            ]
          }
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
      },
      { $sort: { lastMessageAt: -1 } }
    ]);

    // Crear un mapa de conversaciones existentes por userId
    const existingConversationsMap = new Map();
    conversationsAgg.forEach(conv => {
      existingConversationsMap.set(String(conv._id), conv);
    });

    // Obtener todos los usuarios con relaciones activas
    const activeUserIds = Array.from(activeRelationships);
    const users = await User.find({ _id: { $in: activeUserIds } })
      .select('personalInfo role');

    const usersById = users.reduce((acc, u) => {
      acc[u._id.toString()] = u;
      return acc;
    }, {});

    // Construir la lista de conversaciones
    const conversations = [];

    activeUserIds.forEach(otherUserId => {
      const user = usersById[otherUserId];
      if (user && canUsersChat(req.user.role, user.role)) {
        const existing = existingConversationsMap.get(otherUserId);
        conversations.push({
          otherUser: user,
          lastMessageAt: existing?.lastMessageAt || null,
          lastMessage: existing?.lastMessage || '',
          lastSender: existing?.lastSender || null,
          unreadCount: existing?.unreadCount || 0
        });
      }
    });

    // Ordenar conversaciones por última actividad
    conversations.sort((a, b) => {
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
    });

    res.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    next(error);
  }
};

export const getConversationWithUser = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { otherUserId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      const error = new Error('Usuario no encontrado');
      error.status = 404;
      throw error;
    }

    if (!canUsersChat(req.user.role, otherUser.role)) {
      const error = new Error('Solo se permite mensajería entre estudiantes y tutores/asesores');
      error.status = 403;
      throw error;
    }

    // Verificar si los usuarios tienen una relación de curso activa o cita activa
    const hasActiveCourseRelationship = await Course.exists({
      $or: [
        { instructor: userId, enrolledStudents: { $elemMatch: { student: otherUserId } } },
        { instructor: otherUserId, enrolledStudents: { $elemMatch: { student: userId } } }
      ]
    });

    const hasActiveAppointment = await Appointment.exists({
      status: { $in: ['scheduled', 'confirmed', 'in-progress', 'completed'] },
      $or: [
        { studentId: userId, professionalId: otherUserId },
        { professionalId: userId, studentId: otherUserId }
      ]
    });

    if (!hasActiveCourseRelationship && !hasActiveAppointment) {
      const error = new Error('No se permite mensajería con este usuario, ya que no hay una relación de curso o cita activa');
      error.status = 403;
      throw error;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;

    const filter = {
      $or: [
        { sender: userId, receiver: otherUser._id },
        { sender: otherUser._id, receiver: userId }
      ]
    };

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .populate('sender', 'personalInfo role')
      .populate('receiver', 'personalInfo role');

    const total = await Message.countDocuments(filter);

    res.json({
      success: true,
      data: messages.reverse(), // devolver en orden cronológico ascendente
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const markConversationAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { otherUserId } = req.params;

    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      const error = new Error('Usuario no encontrado');
      error.status = 404;
      throw error;
    }

    if (!canUsersChat(req.user.role, otherUser.role)) {
      const error = new Error('Solo se permite mensajería entre estudiantes y tutores/asesores');
      error.status = 403;
      throw error;
    }

    // Verificar si los usuarios tienen una relación de curso activa o cita activa
    const hasActiveCourseRelationship = await Course.exists({
      $or: [
        { instructor: userId, enrolledStudents: { $elemMatch: { student: otherUserId } } },
        { instructor: otherUserId, enrolledStudents: { $elemMatch: { student: userId } } }
      ]
    });

    const hasActiveAppointment = await Appointment.exists({
      status: { $in: ['scheduled', 'confirmed', 'in-progress', 'completed'] },
      $or: [
        { studentId: userId, professionalId: otherUserId },
        { professionalId: userId, studentId: otherUserId }
      ]
    });

    if (!hasActiveCourseRelationship && !hasActiveAppointment) {
      const error = new Error('No se permite mensajería con este usuario, ya que no hay una relación de curso o cita activa');
      error.status = 403;
      throw error;
    }

    const result = await Message.updateMany(
      {
        sender: otherUser._id,
        receiver: userId,
        read: false
      },
      {
        $set: {
          read: true,
          readAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: 'Mensajes marcados como leídos',
      updated: result.modifiedCount
    });
  } catch (error) {
    next(error);
  }
};

