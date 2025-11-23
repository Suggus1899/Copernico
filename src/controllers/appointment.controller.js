import Appointment from "../models/Appointment.js";
import User from "../models/User.js";
import AvailabilitySlot from "../models/AvailabilitySlot.js";

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
    const appointmentData = req.body;

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

    if (professional.role !== appointmentData.appointmentType.slice(0, -3)) { // 'tutoring' -> 'tutor'
      const error = new Error("Appointment type doesn't match professional role");
      error.status = 400;
      throw error;
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

    // Agregar información de auditoría
    if (req.user) {
      appointmentData.createdBy = req.user.id;
      appointmentData.updatedBy = req.user.id;
    }

    // Inicializar participantes para sesiones grupales
    if (appointmentData.isGroupSession) {
      appointmentData.groupParticipants = [{
        studentId: appointmentData.studentId,
        status: 'confirmed',
        joinedAt: new Date()
      }];
    }

    const newAppointment = new Appointment(appointmentData);
    const appointmentSaved = await newAppointment.save();

    // Actualizar el slot de disponibilidad si se usó
    if (appointmentData.availabilitySlotId) {
      await AvailabilitySlot.findByIdAndUpdate(
        appointmentData.availabilitySlotId,
        { status: 'booked' }
      );
    }

    // Populate para la respuesta
    const populatedAppointment = await Appointment.findById(appointmentSaved._id)
      .populate('studentId', 'personalInfo email studentProfile')
      .populate('professionalId', 'personalInfo email tutorProfile advisorProfile')
      .populate('availabilitySlotId', 'subject topic duration');

    res.status(201).json({
      success: true,
      message: "Appointment created successfully",
      data: populatedAppointment
    });
  } catch (error) {
    next(error);
  }
};

export const updateAppointment = async (req, res, next) => {
  try {
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
      const error = new Error("Appointment not found");
      error.status = 404;
      throw error;
    }

    res.json({
      success: true,
      message: "Appointment updated successfully",
      data: appointment
    });
  } catch (error) {
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