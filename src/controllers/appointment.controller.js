import mongoose from 'mongoose';
import Appointment, { ACTIVE_APPOINTMENT_STATUSES, computeEndsAt } from '../models/Appointment.js';
import Course from '../models/Course.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const DEFAULT_DURATION_MINUTES = 60;
const UPCOMING_LIMIT = 20;
const PERSON_FIELDS = 'personalInfo.firstName personalInfo.lastName';

const APPOINTMENT_POPULATE = [
  { path: 'studentId', select: `${PERSON_FIELDS} studentProfile.studentId` },
  { path: 'tutorId', select: PERSON_FIELDS },
  { path: 'courseId', select: 'title' },
];

// Flujo: el estudiante propone (pending); el tutor confirma (confirmed), rechaza
// (rejected) o completa la cita; cualquiera de los dos participantes puede
// cancelarla (cancelled). Las transiciones son atómicas: cada una exige el
// estado de origen en el filtro del update.

const notFound = () => new AppError(404, 'NOT_FOUND', 'Cita no encontrada');
const invalidTransition = () =>
  new AppError(409, 'INVALID_TRANSITION', 'La cita no admite esta acción en su estado actual');

/** Id de un campo que puede venir poblado (documento) o como ObjectId. */
const refId = (value) => String(value?._id ?? value);
const isTutorOf = (appointment, user) => refId(appointment.tutorId) === String(user._id);
const isStudentOf = (appointment, user) => refId(appointment.studentId) === String(user._id);
const canView = (appointment, user) =>
  user.role === 'admin' || isStudentOf(appointment, user) || isTutorOf(appointment, user);

const scopeFor = (user) => {
  if (user.role === 'admin') return {};
  if (user.role === 'tutor') return { tutorId: user._id };
  return { studentId: user._id };
};

/** Las notas internas solo las ven el tutor de la cita y los administradores. */
const toResponse = (appointment, user) => {
  const canSeeNotes = user.role === 'admin' || isTutorOf(appointment, user);
  if (canSeeNotes) return appointment;
  const { internalNotes, ...publicFields } = appointment;
  return publicFields;
};

const loadAppointment = async (id) => {
  const appointment = await Appointment.findById(id).populate(APPOINTMENT_POPULATE).lean();
  if (!appointment) throw notFound();
  return appointment;
};

/** Cita visible para el usuario; si no lo es, responde 404 para no revelar su existencia. */
const loadVisible = async (id, user) => {
  const appointment = await loadAppointment(id);
  if (!canView(appointment, user)) throw notFound();
  return appointment;
};

const loadOwnedByTutor = async (id, user) => {
  const appointment = await loadAppointment(id);
  if (!isTutorOf(appointment, user)) throw notFound();
  return appointment;
};

const sendAppointment = async (res, status, id, user) => {
  const appointment = await loadAppointment(id);
  res.status(status).json({ success: true, data: toResponse(appointment, user) });
};

const runInTransaction = async (work) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};

const notify = (session, { userId, appointmentId, type, title, message }) =>
  Notification.create(
    [{ userId, relatedAppointment: appointmentId, category: 'appointment', type, title, message }],
    { session }
  );

/** Cierra una cita desde `from` hacia `to` y notifica a la otra parte, en una transacción. */
const closeAppointment = ({ appointment, actor, from, to, reason, notify: notification }) =>
  runInTransaction(async (session) => {
    const updated = await Appointment.findOneAndUpdate(
      { _id: appointment._id, status: { $in: from } },
      { $set: { status: to, cancelledBy: actor._id, cancellationReason: reason ?? null } },
      { session, new: true }
    );
    if (!updated) throw invalidTransition();
    await notify(session, { ...notification, appointmentId: updated._id });
  });

export const createAppointment = asyncHandler(async (req, res) => {
  const { tutorId, courseId, startsAt, location, topic } = req.body;

  const tutor = await User.findOne({ _id: tutorId, role: 'tutor', status: 'active' })
    .select('tutorProfile')
    .lean();
  if (!tutor || tutor.tutorProfile?.available === false) {
    throw new AppError(422, 'TUTOR_UNAVAILABLE', 'El tutor no está disponible para citas');
  }

  // La cita trata sobre un curso publicado que imparte ese tutor.
  const course = await Course.findOne({ _id: courseId, instructor: tutorId, isPublished: true })
    .select('_id')
    .lean();
  if (!course) {
    throw new AppError(422, 'COURSE_UNAVAILABLE', 'El curso no está disponible con este tutor');
  }

  const durationMinutes =
    req.body.durationMinutes ?? tutor.tutorProfile?.appointmentDuration ?? DEFAULT_DURATION_MINUTES;
  const endsAt = computeEndsAt(startsAt, durationMinutes);

  const appointment = await runInTransaction(async (session) => {
    // Incrementar la versión del tutor hace que dos reservas simultáneas para el
    // mismo tutor entren en conflicto de escritura; la que pierde se reintenta
    // con una lectura nueva y ve la cita de la otra.
    await User.updateOne(
      { _id: tutorId },
      { $inc: { 'tutorProfile.scheduleVersion': 1 } },
      { session }
    );

    const overlap = await Appointment.exists({
      tutorId,
      status: { $in: ACTIVE_APPOINTMENT_STATUSES },
      startsAt: { $lt: endsAt },
      endsAt: { $gt: startsAt },
    }).session(session);
    if (overlap) {
      throw new AppError(409, 'SLOT_UNAVAILABLE', 'El tutor ya tiene una cita en ese horario');
    }

    const [created] = await Appointment.create(
      [{ studentId: req.user._id, tutorId, courseId, topic, startsAt, durationMinutes, location }],
      { session }
    );
    await notify(session, {
      userId: tutorId,
      appointmentId: created._id,
      type: 'appointment_requested',
      title: 'Nueva solicitud de cita',
      message: 'Tienes una solicitud de cita pendiente de confirmar.',
    });
    return created;
  });

  return sendAppointment(res, 201, appointment._id, req.user);
});

export const listAppointments = asyncHandler(async (req, res) => {
  const { status, from, to, limit } = req.query;
  const filter = scopeFor(req.user);
  if (status) filter.status = status;
  if (from || to) {
    filter.startsAt = {};
    if (from) filter.startsAt.$gte = from;
    if (to) filter.startsAt.$lte = to;
  }

  const appointments = await Appointment.find(filter)
    .sort({ startsAt: 1 })
    .limit(limit)
    .populate(APPOINTMENT_POPULATE)
    .lean();
  res.json({ success: true, data: appointments.map((a) => toResponse(a, req.user)) });
});

export const getUpcomingAppointments = asyncHandler(async (req, res) => {
  const appointments = await Appointment.find({
    ...scopeFor(req.user),
    status: { $in: ACTIVE_APPOINTMENT_STATUSES },
    startsAt: { $gte: new Date() },
  })
    .sort({ startsAt: 1 })
    .limit(UPCOMING_LIMIT)
    .populate(APPOINTMENT_POPULATE)
    .lean();
  res.json({ success: true, data: appointments.map((a) => toResponse(a, req.user)) });
});

export const getAppointmentById = asyncHandler(async (req, res) => {
  const appointment = await loadVisible(req.params.id, req.user);
  res.json({ success: true, data: toResponse(appointment, req.user) });
});

export const confirmAppointment = asyncHandler(async (req, res) => {
  const appointment = await loadOwnedByTutor(req.params.id, req.user);
  const { meetingLink } = req.body;

  await runInTransaction(async (session) => {
    const updated = await Appointment.findOneAndUpdate(
      { _id: appointment._id, status: 'pending', startsAt: { $gt: new Date() } },
      { $set: { status: 'confirmed', ...(meetingLink && { meetingLink }) } },
      { session, new: true }
    );
    if (!updated) throw invalidTransition();

    // Confirmar matricula al estudiante en el curso, en ambos sentidos.
    await Course.updateOne(
      { _id: updated.courseId, 'enrolledStudents.student': { $ne: updated.studentId } },
      { $push: { enrolledStudents: { student: updated.studentId } } },
      { session }
    );
    await User.updateOne(
      { _id: updated.studentId },
      { $addToSet: { 'studentProfile.enrolledCourses': String(updated.courseId) } },
      { session }
    );

    await notify(session, {
      userId: updated.studentId,
      appointmentId: updated._id,
      type: 'appointment_confirmed',
      title: 'Cita confirmada',
      message: 'Tu cita fue confirmada y el curso se añadió a tus cursos.',
    });
  });

  return sendAppointment(res, 200, appointment._id, req.user);
});

export const rejectAppointment = asyncHandler(async (req, res) => {
  const appointment = await loadOwnedByTutor(req.params.id, req.user);
  await closeAppointment({
    appointment,
    actor: req.user,
    from: ['pending'],
    to: 'rejected',
    reason: req.body.reason,
    notify: {
      userId: refId(appointment.studentId),
      type: 'appointment_rejected',
      title: 'Cita rechazada',
      message: 'Tu solicitud de cita fue rechazada.',
    },
  });
  return sendAppointment(res, 200, appointment._id, req.user);
});

export const cancelAppointment = asyncHandler(async (req, res) => {
  const appointment = await loadVisible(req.params.id, req.user);
  const byStudent = isStudentOf(appointment, req.user);
  await closeAppointment({
    appointment,
    actor: req.user,
    from: ACTIVE_APPOINTMENT_STATUSES,
    to: 'cancelled',
    reason: req.body.reason,
    notify: {
      userId: refId(byStudent ? appointment.tutorId : appointment.studentId),
      type: 'appointment_cancelled',
      title: 'Cita cancelada',
      message: 'Una de tus citas fue cancelada.',
    },
  });
  return sendAppointment(res, 200, appointment._id, req.user);
});

export const completeAppointment = asyncHandler(async (req, res) => {
  const appointment = await loadOwnedByTutor(req.params.id, req.user);
  const now = new Date();
  if (appointment.status !== 'confirmed') throw invalidTransition();
  if (new Date(appointment.startsAt) > now) {
    throw new AppError(409, 'NOT_STARTED', 'La cita solo puede completarse después de su inicio');
  }

  const updated = await Appointment.findOneAndUpdate(
    { _id: appointment._id, status: 'confirmed' },
    { $set: { status: 'completed', completedAt: now } }
  );
  if (!updated) throw invalidTransition();
  return sendAppointment(res, 200, appointment._id, req.user);
});

export const addInternalNote = asyncHandler(async (req, res) => {
  const appointment = await loadVisible(req.params.id, req.user);
  await Appointment.updateOne(
    { _id: appointment._id },
    { $push: { internalNotes: { authorId: req.user._id, note: req.body.note } } }
  );
  return sendAppointment(res, 201, appointment._id, req.user);
});

export const rateAppointment = asyncHandler(async (req, res) => {
  const appointment = await loadVisible(req.params.id, req.user);
  if (appointment.status !== 'completed') {
    throw new AppError(409, 'NOT_COMPLETED', 'Solo puedes calificar citas completadas');
  }

  // Cada parte califica una sola vez; el filtro lo garantiza aunque haya peticiones simultáneas.
  const prefix = isStudentOf(appointment, req.user) ? 'student' : 'tutor';
  const { rating, feedback } = req.body;
  const result = await Appointment.updateOne(
    { _id: appointment._id, status: 'completed', [`${prefix}Rating`]: { $exists: false } },
    { $set: { [`${prefix}Rating`]: rating, [`${prefix}Feedback`]: feedback ?? '' } }
  );
  if (result.matchedCount === 0) {
    throw new AppError(409, 'ALREADY_RATED', 'Ya calificaste esta cita');
  }
  return sendAppointment(res, 200, appointment._id, req.user);
});

export const getTutorStudents = asyncHandler(async (req, res) => {
  const studentIds = await Appointment.distinct('studentId', {
    tutorId: req.user._id,
    status: { $in: ['confirmed', 'completed'] },
  });
  const students = await User.find({ _id: { $in: studentIds }, status: 'active' })
    .select(`${PERSON_FIELDS} studentProfile.studentId studentProfile.career`)
    .lean();
  res.json({ success: true, data: students });
});
