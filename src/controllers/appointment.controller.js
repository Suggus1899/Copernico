import Appointment from "../models/Appointment.js";
import User from "../models/User.js";
import AvailabilitySlot from "../models/AvailabilitySlot.js";
import Notification from "../models/Notification.js";
import Course from "../models/Course.js";

// Helper function to create or update course relationship when appointment is confirmed
const ensureCourseRelationship = async (appointment) => {
  try {
    // Extraer IDs - pueden ser objetos poblados o IDs directos
    const professionalId = appointment.professionalId?._id || appointment.professionalId;
    const studentId = appointment.studentId?._id || appointment.studentId;
    const subject = appointment.subject;
    
    console.log('=== CREAR RELACIÓN DE CURSO ===');
    console.log('Professional ID:', professionalId);
    console.log('Student ID:', studentId);
    console.log('Subject:', subject);
    
    if (!professionalId || !studentId || !subject) {
      console.log('❌ Faltan campos requeridos para crear relación de curso');
      console.log('professionalId:', professionalId);
      console.log('studentId:', studentId);
      console.log('subject:', subject);
      return;
    }

    // Buscar si ya existe un curso para este tutor y materia
    let course = await Course.findOne({
      instructor: professionalId,
      title: subject
    });

    if (!course) {
      // Crear nuevo curso
      course = await Course.create({
        title: subject,
        description: `Curso de ${subject} - Generado automáticamente desde asesorías`,
        instructor: professionalId,
        category: subject,
        level: 'intermediate',
        isPublished: true,
        enrolledStudents: [{
          student: studentId,
          enrolledAt: new Date(),
          progress: 0,
          completed: false
        }]
      });
      console.log(`✅ Curso creado automáticamente: ${course._id} para ${subject}`);
    } else {
      // Verificar si el estudiante ya está inscrito
      const isEnrolled = course.enrolledStudents.some(
        enrollment => enrollment.student.toString() === studentId.toString()
      );

      if (!isEnrolled) {
        // Agregar estudiante al curso existente
        course.enrolledStudents.push({
          student: studentId,
          enrolledAt: new Date(),
          progress: 0,
          completed: false
        });
        await course.save();
        console.log(`✅ Estudiante agregado al curso existente: ${course._id}`);
      } else {
        console.log(`ℹ️  Estudiante ya inscrito en el curso: ${course._id}`);
      }
    }

    // También actualizar el perfil del estudiante
    await User.findByIdAndUpdate(studentId, {
      $addToSet: { "studentProfile.enrolledCourses": course._id }
    });

    console.log('✅ Relación de curso asegurada exitosamente');
    return course;
  } catch (error) {
    console.error('❌ Error ensuring course relationship:', error);
    console.error('Stack:', error.stack);
    // No lanzar error para no interrumpir el flujo principal
  }
};

export const getAppointments = async (req, res, next) => {
  try {
    const { 
      studentId, 
      professionalId, 
      status, 
      appointmentType,
      subject,
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
      filter.professionalId = req.user.id;
    }
    
    // Filtros adicionales
    if (studentId && req.user.role !== 'student') filter.studentId = studentId;
    if (professionalId && !['tutor', 'advisor'].includes(req.user.role)) filter.professionalId = professionalId;
    if (status) filter.status = status;
    if (appointmentType) filter.appointmentType = appointmentType;
    if (subject) filter.subject = new RegExp(subject, 'i');
    
    // Filtro por fecha
    if (dateFrom || dateTo) {
      filter.scheduledDate = {};
      if (dateFrom) filter.scheduledDate.$gte = new Date(dateFrom);
      if (dateTo) filter.scheduledDate.$lte = new Date(dateTo);
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { scheduledDate: 1 }
    };

    const appointments = await Appointment.find(filter)
      .populate('studentId', 'personalInfo email studentProfile')
      .populate('professionalId', 'personalInfo email tutorProfile advisorProfile')
      .populate('cancelledBy', 'personalInfo')
      .populate('availabilitySlotId', 'subject topic duration')
      .populate('groupParticipants.studentId', 'personalInfo email')
      .populate('internalNotes.authorId', 'personalInfo')
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .sort(options.sort);

    const total = await Appointment.countDocuments(filter);

    res.json({
      success: true,
      data: appointments,
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

export const getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('studentId', 'personalInfo email studentProfile')
      .populate('professionalId', 'personalInfo email tutorProfile advisorProfile')
      .populate('cancelledBy', 'personalInfo')
      .populate('availabilitySlotId', 'subject topic duration')
      .populate('groupParticipants.studentId', 'personalInfo email')
      .populate('internalNotes.authorId', 'personalInfo')
      .populate('createdBy', 'personalInfo')
      .populate('updatedBy', 'personalInfo');

    if (!appointment) {
      const error = new Error("Appointment not found");
      error.status = 404;
      throw error;
    }

    // Verificar permisos
    const canView = 
      req.user.role === 'admin' ||
      appointment.studentId._id.toString() === req.user.id ||
      appointment.professionalId._id.toString() === req.user.id;

    if (!canView) {
      const error = new Error("Access denied");
      error.status = 403;
      throw error;
    }

    res.json({
      success: true,
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};

export const createAppointment = async (req, res, next) => {
  try {
    console.log('=== CREAR CITA - INICIO ===');
    console.log('Datos recibidos:', req.body);
    console.log('Usuario autenticado:', req.user?.id, req.user?.role);
    
    const appointmentData = { ...req.body };

    // Si no se especifica studentId, usar el usuario autenticado (para estudiantes)
    if (!appointmentData.studentId && req.user.role === 'student') {
      appointmentData.studentId = req.user.id;
    }

    // Si no se especifica professionalId pero se especifica tutorId, usar tutorId
    if (!appointmentData.professionalId && appointmentData.tutorId) {
      appointmentData.professionalId = appointmentData.tutorId;
      delete appointmentData.tutorId; // Limpiar el campo tutorId
    }

    // Mapear type a appointmentType si existe
    if (appointmentData.type && !appointmentData.appointmentType) {
      appointmentData.appointmentType = appointmentData.type;
      delete appointmentData.type;
    }

    // Convertir fecha y hora en scheduledDate
    if (appointmentData.date && appointmentData.time && !appointmentData.scheduledDate) {
      const dateTime = new Date(`${appointmentData.date}T${appointmentData.time}`);
      appointmentData.scheduledDate = dateTime;
      delete appointmentData.date;
      delete appointmentData.time;
    }

    // Verificar que los usuarios existen
    const [student, professional] = await Promise.all([
      User.findById(appointmentData.studentId),
      User.findById(appointmentData.professionalId)
    ]);

    if (!student) {
      const error = new Error("Student not found");
      error.status = 404;
      throw error;
    }

    if (!professional) {
      const error = new Error("Professional not found");
      error.status = 404;
      throw error;
    }

    // Verificar roles
    if (!['tutor', 'advisor'].includes(professional.role)) {
      const error = new Error("Professional must be a tutor or advisor");
      error.status = 400;
      throw error;
    }

    // Establecer tipo de cita basado en el rol del profesional si no se especificó
    if (!appointmentData.appointmentType) {
      appointmentData.appointmentType = professional.role === 'tutor' ? 'tutoring' : 'advising';
    }

    // Mapear 'advisory' a 'advising' para compatibilidad con el modelo
    if (appointmentData.appointmentType === 'advisory') {
      appointmentData.appointmentType = 'advising';
    }

    // Verificar disponibilidad (si se proporciona availabilitySlotId)
    if (appointmentData.availabilitySlotId) {
      const availabilitySlot = await AvailabilitySlot.findById(appointmentData.availabilitySlotId);
      if (!availabilitySlot || availabilitySlot.status !== 'available') {
        const error = new Error("Selected time slot is not available");
        error.status = 400;
        throw error;
      }
    }

    // Verificar conflictos de horario
    if (appointmentData.scheduledDate) {
      const conflictingAppointment = await Appointment.findOne({
        $or: [
          { studentId: appointmentData.studentId },
          { professionalId: appointmentData.professionalId }
        ],
        status: { $in: ['scheduled', 'confirmed', 'in-progress'] },
        scheduledDate: {
          $gte: new Date(new Date(appointmentData.scheduledDate).getTime() - (appointmentData.duration * 60000)),
          $lte: new Date(new Date(appointmentData.scheduledDate).getTime() + (appointmentData.duration * 60000))
        }
      });

      if (conflictingAppointment) {
        const error = new Error("Time conflict with existing appointment");
        error.status = 409;
        throw error;
      }
    }

    // Agregar información de auditoría
    if (req.user) {
      appointmentData.createdBy = req.user.id;
      appointmentData.updatedBy = req.user.id;
    }

    // Establecer estado inicial
    if (!appointmentData.status) {
      appointmentData.status = 'pending';
    }

    // Establecer duración por defecto si no se especifica
    if (!appointmentData.duration) {
      appointmentData.duration = 60;
    }

    // Inicializar participantes para sesiones grupales
    if (appointmentData.isGroupSession) {
      appointmentData.groupParticipants = [{
        studentId: appointmentData.studentId,
        status: 'confirmed',
        joinedAt: new Date()
      }];
    }

    // Limpiar campos que no pertenecen al modelo
    const studentMessage = req.body.message;
    delete appointmentData.message;

    console.log('Datos transformados para crear cita:', appointmentData);

    // Crear la cita directamente (sin transacciones para desarrollo)
    try {
      if (appointmentData.availabilitySlotId) {
        // Marcar el slot como 'booked' sólo si sigue 'available'
        const updatedSlot = await AvailabilitySlot.findOneAndUpdate(
          { _id: appointmentData.availabilitySlotId, status: 'available' },
          { $set: { status: 'booked' } },
          { new: true }
        );
        if (!updatedSlot) {
          const error = new Error('Selected time slot was just booked by someone else');
          error.status = 409;
          throw error;
        }
      }

      const appointmentSaved = await Appointment.create(appointmentData);
      console.log('Cita creada exitosamente:', appointmentSaved._id);

      // Populate para la respuesta
      const populatedAppointment = await Appointment.findById(appointmentSaved._id)
        .populate('studentId', 'personalInfo email studentProfile')
        .populate('professionalId', 'personalInfo email tutorProfile advisorProfile')
        .populate('availabilitySlotId', 'subject topic duration');

      // Si la cita se crea con estado 'confirmed', crear/actualizar la relación del curso
      if (appointmentSaved.status === 'confirmed') {
        console.log('Cita creada con estado confirmado, creando relación de curso...');
        await ensureCourseRelationship(populatedAppointment);
      }

      // Crear notificación para el tutor/asesor
      try {
        const studentName = `${student.personalInfo?.firstName || ''} ${student.personalInfo?.lastName || ''}`.trim() || student.email;
        const appointmentDate = new Date(appointmentData.scheduledDate).toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        const appointmentTime = new Date(appointmentData.scheduledDate).toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit'
        });

        const notificationData = {
          userId: professional._id,
          title: '📅 Nueva Solicitud de Asesoría',
          message: `${studentName} ha solicitado una asesoría de ${appointmentData.subject} para el ${appointmentDate} a las ${appointmentTime}. ${studentMessage ? `Mensaje: "${studentMessage}"` : ''}`,
          type: 'appointment_reminder',
          priority: 'high',
          category: 'appointment',
          relatedAppointment: appointmentSaved._id,
          actionUrl: `/appointments/${appointmentSaved._id}`,
          actionLabel: 'Ver Solicitud',
          allowResponse: true,
          responseOptions: ['confirm', 'decline', 'reschedule'],
          createdBy: student._id
        };

        console.log('=== CREANDO NOTIFICACIÓN ===');
        console.log('Datos de notificación:', notificationData);

        const notification = new Notification(notificationData);
        const savedNotification = await notification.save();
        await savedNotification.recordDelivery('in_app', 'sent');
        
        console.log('Notificación creada exitosamente con ID:', savedNotification._id);
        console.log('Para usuario:', professional._id);
        console.log('Título:', savedNotification.title);
      } catch (notificationError) {
        console.error('=== ERROR CREANDO NOTIFICACIÓN ===');
        console.error('Error completo:', notificationError);
        console.error('Stack:', notificationError.stack);
        // No fallar la creación de la cita si falla la notificación
      }

      console.log('=== CREAR CITA - ÉXITO ===');
      return res.status(201).json({
        success: true,
        message: "Appointment created successfully",
        data: populatedAppointment
      });
    } catch (createError) {
      console.error('Error en createAppointment:', createError);
      throw createError;
    }
  } catch (error) {
    console.error('=== CREAR CITA - ERROR ===');
    console.error('Error completo:', error);
    next(error);
  }
};

export const updateAppointment = async (req, res, next) => {
  try {
    console.log('=== ACTUALIZAR CITA ===');
    console.log('ID de cita:', req.params.id);
    console.log('Datos a actualizar:', req.body);
    console.log('Usuario:', req.user?.id, req.user?.role);
    
    const updateData = { ...req.body };
    
    // Agregar información de auditoría
    if (req.user) {
      updateData.updatedBy = req.user.id;
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('studentId', 'personalInfo email studentProfile')
    .populate('professionalId', 'personalInfo email tutorProfile advisorProfile')
    .populate('availabilitySlotId', 'subject topic duration');

    if (!appointment) {
      console.log('Cita no encontrada:', req.params.id);
      const error = new Error("Appointment not found");
      error.status = 404;
      throw error;
    }

    // Si la cita se confirma, crear/actualizar la relación del curso
    if (updateData.status === 'confirmed' && appointment.status === 'confirmed') {
      console.log('Cita confirmada, creando relación de curso...');
      await ensureCourseRelationship(appointment);
    }

    console.log('Cita actualizada exitosamente:', appointment._id);
    res.json({
      success: true,
      message: "Appointment updated successfully",
      data: appointment
    });
  } catch (error) {
    console.error('Error en updateAppointment:', error);
    next(error);
  }
};

export const cancelAppointment = async (req, res, next) => {
  try {
    const { cancellationReason } = req.body;

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      {
        status: 'cancelled',
        cancellationReason,
        cancelledBy: req.user.id,
        updatedBy: req.user.id
      },
      { new: true }
    )
    .populate('studentId', 'personalInfo email')
    .populate('professionalId', 'personalInfo email')
    .populate('availabilitySlotId');

    if (!appointment) {
      const error = new Error("Appointment not found");
      error.status = 404;
      throw error;
    }

    // Liberar el slot de disponibilidad si existe
    if (appointment.availabilitySlotId) {
      await AvailabilitySlot.findByIdAndUpdate(
        appointment.availabilitySlotId,
        { status: 'available' }
      );
    }

    res.json({
      success: true,
      message: "Appointment cancelled successfully",
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};

export const addInternalNote = async (req, res, next) => {
  try {
    const { note } = req.body;
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      const error = new Error("Appointment not found");
      error.status = 404;
      throw error;
    }

    await appointment.addInternalNote(req.user.id, note);

    const updatedAppointment = await Appointment.findById(req.params.id)
      .populate('internalNotes.authorId', 'personalInfo');

    res.json({
      success: true,
      message: "Internal note added successfully",
      data: updatedAppointment.internalNotes
    });
  } catch (error) {
    next(error);
  }
};

export const rateAppointment = async (req, res, next) => {
  try {
    const { rating, feedback } = req.body;
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      const error = new Error("Appointment not found");
      error.status = 404;
      throw error;
    }

    // Verificar que la cita esté completada
    if (appointment.status !== 'completed') {
      const error = new Error("Can only rate completed appointments");
      error.status = 400;
      throw error;
    }

    // Determinar quién está calificando
    let raterRole;
    if (appointment.studentId.toString() === req.user.id) {
      raterRole = 'student';
    } else if (appointment.professionalId.toString() === req.user.id) {
      raterRole = 'professional';
    } else {
      const error = new Error("Not authorized to rate this appointment");
      error.status = 403;
      throw error;
    }

    await appointment.rateSession(raterRole, rating, feedback);

    res.json({
      success: true,
      message: "Appointment rated successfully",
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};

export const getTutorStudents = async (req, res, next) => {
  try {
    console.log('=== OBTENER ESTUDIANTES DEL TUTOR ===');
    console.log('Usuario:', req.user?.id, req.user?.role);

    // Verificar que el usuario sea tutor o asesor
    if (!['tutor', 'advisor'].includes(req.user.role)) {
      const error = new Error("Only tutors and advisors can access their students");
      error.status = 403;
      throw error;
    }

    // Buscar todas las citas confirmadas del tutor/asesor
    const appointments = await Appointment.find({
      professionalId: req.user.id,
      status: { $in: ['confirmed', 'completed'] }
    })
    .populate('studentId', 'personalInfo email studentProfile')
    .populate('professionalId', 'personalInfo')
    .sort({ scheduledDate: -1 });

    console.log('Citas encontradas:', appointments.length);

    // Agrupar estudiantes únicos con su información
    const studentsMap = new Map();
    
    appointments.forEach(appointment => {
      const student = appointment.studentId;
      if (student && !studentsMap.has(student._id.toString())) {
        studentsMap.set(student._id.toString(), {
          _id: student._id,
          personalInfo: student.personalInfo,
          email: student.email,
          studentProfile: student.studentProfile,
          appointments: []
        });
      }
      
      if (student) {
        studentsMap.get(student._id.toString()).appointments.push({
          _id: appointment._id,
          subject: appointment.subject,
          topic: appointment.topic,
          scheduledDate: appointment.scheduledDate,
          status: appointment.status,
          duration: appointment.duration
        });
      }
    });

    // Convertir Map a Array y agregar estadísticas
    const students = Array.from(studentsMap.values()).map(student => {
      const confirmedAppointments = student.appointments.filter(apt => apt.status === 'confirmed');
      const completedAppointments = student.appointments.filter(apt => apt.status === 'completed');
      const lastAppointment = student.appointments[0]; // Ya están ordenados por fecha desc
      
      return {
        ...student,
        stats: {
          totalAppointments: student.appointments.length,
          confirmedAppointments: confirmedAppointments.length,
          completedAppointments: completedAppointments.length,
          lastAppointmentDate: lastAppointment?.scheduledDate,
          subjects: [...new Set(student.appointments.map(apt => apt.subject))]
        }
      };
    });

    console.log('Estudiantes únicos encontrados:', students.length);

    res.json({
      success: true,
      data: students,
      total: students.length
    });
  } catch (error) {
    console.error('Error en getTutorStudents:', error);
    next(error);
  }
};

export const getUpcomingAppointments = async (req, res, next) => {
  try {
    const now = new Date();
    
    let filter = {
      scheduledDate: { $gte: now },
      status: { $in: ['scheduled', 'confirmed'] }
    };

    // Filtrar por usuario según su rol
    if (req.user.role === 'student') {
      filter.studentId = req.user.id;
    } else if (['tutor', 'advisor'].includes(req.user.role)) {
      filter.professionalId = req.user.id;
    } else if (req.user.role !== 'admin') {
      const error = new Error("Access denied");
      error.status = 403;
      throw error;
    }

    const appointments = await Appointment.find(filter)
      .populate('studentId', 'personalInfo email')
      .populate('professionalId', 'personalInfo email tutorProfile advisorProfile')
      .sort({ scheduledDate: 1 })
      .limit(10);

    res.json({
      success: true,
      data: appointments
    });
  } catch (error) {
    next(error);
  }
};