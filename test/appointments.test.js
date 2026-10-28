import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { startIntegrationEnv } from './helpers/integration.js';

const ORIGIN = 'http://localhost:5173';
const PASSWORD = 'Clave-Segura-2025';
const HOUR = 60 * 60 * 1000;
const SESSION = 'copernico_session';

/** Fecha ISO a `hours` horas desde ahora, para construir horarios futuros. */
const inHours = (hours) => new Date(Date.now() + hours * HOUR).toISOString();

const cookieOf = (res) => {
  const cookie = (res.headers['set-cookie'] ?? []).find((c) => c.startsWith(`${SESSION}=`));
  return cookie?.split(';')[0];
};

describe('citas: propuesta, confirmación y reservas', () => {
  let env;
  let User;
  let Course;
  let Appointment;
  let Notification;

  let tutor;
  let otherTutor;
  let ana;
  let bruno;
  let admin;
  let course;
  let otherCourse;
  let unpublishedCourse;

  // Citas que van pasando por el flujo a lo largo de los tests (se ejecutan en orden).
  let proposed;
  let rejectable;
  let cancellable;
  let rebooked;

  before(async () => {
    env = await startIntegrationEnv();
    ({ default: User } = await import('../src/models/User.js'));
    ({ default: Course } = await import('../src/models/Course.js'));
    ({ default: Appointment } = await import('../src/models/Appointment.js'));
    ({ default: Notification } = await import('../src/models/Notification.js'));

    const signup = async (body) => {
      const res = await request(env.app)
        .post('/api/auth/signup')
        .set('Origin', ORIGIN)
        .send({ password: PASSWORD, ...body });
      assert.equal(res.status, 201, JSON.stringify(res.body));
      const user = await User.findOne({ email: body.email }).lean();
      return { id: String(user._id), cookie: cookieOf(res) };
    };

    tutor = await signup({
      email: 'luis@example.com',
      role: 'tutor',
      personalInfo: { firstName: 'Luis', lastName: 'Tutor' },
      tutorProfile: { specialties: ['Matemáticas'] },
    });
    otherTutor = await signup({
      email: 'marta@example.com',
      role: 'tutor',
      personalInfo: { firstName: 'Marta', lastName: 'Tutora' },
      tutorProfile: { specialties: ['Física'] },
    });
    ana = await signup({
      email: 'ana@example.com',
      role: 'student',
      personalInfo: { firstName: 'Ana', lastName: 'Estudiante' },
      studentProfile: { studentId: 'A001' },
    });
    bruno = await signup({
      email: 'bruno@example.com',
      role: 'student',
      personalInfo: { firstName: 'Bruno', lastName: 'Estudiante' },
      studentProfile: { studentId: 'B002' },
    });

    const adminUser = await User.create({
      email: 'admin@example.com',
      password: PASSWORD,
      role: 'admin',
      personalInfo: { firstName: 'Ada', lastName: 'Admin' },
    });
    const adminSignin = await request(env.app)
      .post('/api/auth/signin')
      .set('Origin', ORIGIN)
      .send({ email: 'admin@example.com', password: PASSWORD });
    assert.equal(adminSignin.status, 200);
    admin = { id: String(adminUser._id), cookie: cookieOf(adminSignin) };

    course = await Course.create({ title: 'Cálculo I', instructor: tutor.id, isPublished: true });
    otherCourse = await Course.create({ title: 'Física I', instructor: otherTutor.id, isPublished: true });
    unpublishedCourse = await Course.create({ title: 'Borrador', instructor: tutor.id, isPublished: false });
  });

  after(async () => {
    await env.stop();
  });

  const call = (method, path, who, body) => {
    const req = request(env.app)[method](path).set('Origin', ORIGIN);
    if (who) req.set('Cookie', who.cookie);
    return body === undefined ? req : req.send(body);
  };

  const notificationsFor = (user, type) => Notification.find({ userId: user.id, type }).lean();

  it('un estudiante propone una cita pendiente en UTC y notifica al tutor', async () => {
    const startsAt = inHours(48);
    const res = await call('post', '/api/appointments', ana, {
      tutorId: tutor.id,
      courseId: String(course._id),
      startsAt,
      topic: 'Derivadas',
    });

    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.data.status, 'pending');
    assert.equal(res.body.data.durationMinutes, 60);
    assert.equal(new Date(res.body.data.startsAt).getTime(), new Date(startsAt).getTime());
    assert.equal(
      new Date(res.body.data.endsAt).getTime() - new Date(res.body.data.startsAt).getTime(),
      HOUR
    );
    assert.equal(res.body.data.studentId.personalInfo.email, undefined);
    proposed = res.body.data._id;

    const notes = await notificationsFor(tutor, 'appointment_requested');
    assert.equal(notes.length, 1);
  });

  it('rechaza horarios pasados y fechas sin desfase horario', async () => {
    const past = await call('post', '/api/appointments', ana, {
      tutorId: tutor.id,
      courseId: String(course._id),
      startsAt: new Date(Date.now() - HOUR).toISOString(),
    });
    assert.equal(past.status, 422);
    assert.equal(past.body.error.code, 'VALIDATION_ERROR');

    const naive = await call('post', '/api/appointments', ana, {
      tutorId: tutor.id,
      courseId: String(course._id),
      startsAt: '2099-01-01T10:00:00',
    });
    assert.equal(naive.status, 422);
    assert.equal(naive.body.error.code, 'VALIDATION_ERROR');
  });

  it('solo estudiantes proponen citas y solo con tutores y cursos válidos', async () => {
    const body = { tutorId: tutor.id, courseId: String(course._id), startsAt: inHours(72) };

    const byTutor = await call('post', '/api/appointments', tutor, body);
    assert.equal(byTutor.status, 403);

    const unknownTutor = await call('post', '/api/appointments', ana, {
      ...body,
      tutorId: String(new mongoose.Types.ObjectId()),
    });
    assert.equal(unknownTutor.status, 422);
    assert.equal(unknownTutor.body.error.code, 'TUTOR_UNAVAILABLE');

    const draft = await call('post', '/api/appointments', ana, {
      ...body,
      courseId: String(unpublishedCourse._id),
    });
    assert.equal(draft.status, 422);
    assert.equal(draft.body.error.code, 'COURSE_UNAVAILABLE');

    const wrongTutor = await call('post', '/api/appointments', ana, {
      ...body,
      courseId: String(otherCourse._id),
    });
    assert.equal(wrongTutor.status, 422);
    assert.equal(wrongTutor.body.error.code, 'COURSE_UNAVAILABLE');
  });

  it('el estudiante ve solo los cursos publicados del tutor elegido', async () => {
    const res = await call('get', `/api/appointments/tutors/${tutor.id}/courses`, ana);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(res.body.data.map((c) => c.title), ['Cálculo I']);
    assert.equal(res.body.data[0].instructor, undefined);

    const asTutor = await call('get', `/api/appointments/tutors/${tutor.id}/courses`, tutor);
    assert.equal(asTutor.status, 403);
    const invalid = await call('get', '/api/appointments/tutors/no-es-id/courses', ana);
    assert.equal(invalid.status, 400);
  });

  it('bloquea solapamientos, pero permite citas contiguas', async () => {
    const overlapping = await call('post', '/api/appointments', bruno, {
      tutorId: tutor.id,
      courseId: String(course._id),
      startsAt: inHours(48.5),
    });
    assert.equal(overlapping.status, 409);
    assert.equal(overlapping.body.error.code, 'SLOT_UNAVAILABLE');

    const contiguous = await call('post', '/api/appointments', bruno, {
      tutorId: tutor.id,
      courseId: String(course._id),
      startsAt: inHours(49),
    });
    assert.equal(contiguous.status, 201);
    rejectable = contiguous.body.data._id;
  });

  it('dos reservas simultáneas para el mismo hueco: solo una tiene éxito', async () => {
    const body = { tutorId: tutor.id, courseId: String(course._id), startsAt: inHours(72) };
    const [first, second] = await Promise.all([
      call('post', '/api/appointments', ana, body),
      call('post', '/api/appointments', bruno, body),
    ]);

    assert.deepEqual([first.status, second.status].sort(), [201, 409]);
    const loser = first.status === 409 ? first : second;
    assert.equal(loser.body.error.code, 'SLOT_UNAVAILABLE');
  });

  it('solo el tutor dueño confirma; otros reciben 403 o 404', async () => {
    const byStudent = await call('post', `/api/appointments/${proposed}/confirm`, ana, {});
    assert.equal(byStudent.status, 403);

    const byOtherTutor = await call('post', `/api/appointments/${proposed}/confirm`, otherTutor, {});
    assert.equal(byOtherTutor.status, 404);
  });

  it('confirmar matricula al estudiante en el curso y notifica; no se repite', async () => {
    const res = await call('post', `/api/appointments/${proposed}/confirm`, tutor, {
      meetingLink: 'https://meet.example.com/cita',
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.status, 'confirmed');
    assert.equal(res.body.data.meetingLink, 'https://meet.example.com/cita');

    const freshCourse = await Course.findById(course._id).lean();
    assert.ok(freshCourse.enrolledStudents.some((e) => String(e.student) === ana.id));
    const freshAna = await User.findById(ana.id).lean();
    assert.ok(freshAna.studentProfile.enrolledCourses.includes(String(course._id)));
    assert.equal((await notificationsFor(ana, 'appointment_confirmed')).length, 1);

    const again = await call('post', `/api/appointments/${proposed}/confirm`, tutor, {});
    assert.equal(again.status, 409);
    assert.equal(again.body.error.code, 'INVALID_TRANSITION');
  });

  it('el tutor rechaza una solicitud pendiente con motivo, una sola vez', async () => {
    const res = await call('post', `/api/appointments/${rejectable}/reject`, tutor, {
      reason: 'Sin disponibilidad',
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'rejected');
    assert.equal(res.body.data.cancellationReason, 'Sin disponibilidad');
    assert.equal((await notificationsFor(bruno, 'appointment_rejected')).length, 1);

    const again = await call('post', `/api/appointments/${rejectable}/reject`, tutor, {});
    assert.equal(again.status, 409);

    const confirmed = await call('post', `/api/appointments/${proposed}/reject`, tutor, {});
    assert.equal(confirmed.status, 409);
    assert.equal(confirmed.body.error.code, 'INVALID_TRANSITION');
  });

  it('cancelar libera el hueco y notifica a la otra parte', async () => {
    cancellable = proposed;
    const stranger = await call('post', `/api/appointments/${cancellable}/cancel`, bruno, {});
    assert.equal(stranger.status, 404);

    const res = await call('post', `/api/appointments/${cancellable}/cancel`, ana, {});
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'cancelled');
    assert.equal((await notificationsFor(tutor, 'appointment_cancelled')).length, 1);

    const again = await call('post', `/api/appointments/${cancellable}/cancel`, ana, {});
    assert.equal(again.status, 409);

    const rebook = await call('post', '/api/appointments', ana, {
      tutorId: tutor.id,
      courseId: String(course._id),
      startsAt: inHours(48),
    });
    assert.equal(rebook.status, 201);
    rebooked = rebook.body.data._id;
  });

  it('completar exige confirmación, inicio de la cita y tutor dueño', async () => {
    const pending = await call('post', `/api/appointments/${rebooked}/complete`, tutor, {});
    assert.equal(pending.status, 409);
    assert.equal(pending.body.error.code, 'INVALID_TRANSITION');

    const confirmed = await call('post', `/api/appointments/${rebooked}/confirm`, tutor, {});
    assert.equal(confirmed.status, 200);

    const early = await call('post', `/api/appointments/${rebooked}/complete`, tutor, {});
    assert.equal(early.status, 409);
    assert.equal(early.body.error.code, 'NOT_STARTED');

    await Appointment.updateOne(
      { _id: rebooked },
      { $set: { startsAt: new Date(Date.now() - 2 * HOUR), endsAt: new Date(Date.now() - HOUR) } }
    );
    const done = await call('post', `/api/appointments/${rebooked}/complete`, tutor, {});
    assert.equal(done.status, 200);
    assert.equal(done.body.data.status, 'completed');
    assert.ok(done.body.data.completedAt);
  });

  it('las notas internas solo las ven el tutor y el administrador', async () => {
    const note = await call('post', `/api/appointments/${rebooked}/notes`, tutor, {
      note: 'Revisar integrales',
    });
    assert.equal(note.status, 201);
    assert.equal(note.body.data.internalNotes.length, 1);

    const byStudent = await call('post', `/api/appointments/${rebooked}/notes`, ana, { note: 'Hola' });
    assert.equal(byStudent.status, 403);

    const studentView = await call('get', `/api/appointments/${rebooked}`, ana);
    assert.equal(studentView.status, 200);
    assert.equal('internalNotes' in studentView.body.data, false);

    const tutorView = await call('get', `/api/appointments/${rebooked}`, tutor);
    assert.equal(tutorView.body.data.internalNotes[0].note, 'Revisar integrales');

    const adminView = await call('get', `/api/appointments/${rebooked}`, admin);
    assert.equal(adminView.body.data.internalNotes.length, 1);
  });

  it('calificar: solo citas completadas, una vez por parte, con rango 1-5', async () => {
    const notCompleted = await call('post', `/api/appointments/${rejectable}/rate`, bruno, { rating: 3 });
    assert.equal(notCompleted.status, 409);
    assert.equal(notCompleted.body.error.code, 'NOT_COMPLETED');

    const outOfRange = await call('post', `/api/appointments/${rebooked}/rate`, ana, { rating: 6 });
    assert.equal(outOfRange.status, 422);

    const studentRating = await call('post', `/api/appointments/${rebooked}/rate`, ana, {
      rating: 5,
      feedback: 'Muy claro',
    });
    assert.equal(studentRating.status, 200);
    assert.equal(studentRating.body.data.studentRating, 5);

    const repeated = await call('post', `/api/appointments/${rebooked}/rate`, ana, { rating: 1 });
    assert.equal(repeated.status, 409);
    assert.equal(repeated.body.error.code, 'ALREADY_RATED');

    const tutorRating = await call('post', `/api/appointments/${rebooked}/rate`, tutor, { rating: 4 });
    assert.equal(tutorRating.status, 200);
    assert.equal(tutorRating.body.data.tutorRating, 4);
  });

  it('listados: cada usuario ve solo sus citas y los ids inválidos responden 400', async () => {
    const anaList = await call('get', '/api/appointments', ana);
    assert.equal(anaList.status, 200);
    assert.ok(anaList.body.data.length > 0);
    assert.ok(anaList.body.data.every((a) => a.studentId._id === ana.id));

    const hidden = await call('get', `/api/appointments/${rebooked}`, bruno);
    assert.equal(hidden.status, 404);

    const invalid = await call('get', '/api/appointments/no-es-un-id', ana);
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.code, 'INVALID_ID');

    const badStatus = await call('get', '/api/appointments?status=bogus', ana);
    assert.equal(badStatus.status, 422);

    const upcoming = await call('get', '/api/appointments/upcoming', tutor);
    assert.equal(upcoming.status, 200);
    assert.ok(upcoming.body.data.every((a) => ['pending', 'confirmed'].includes(a.status)));
  });

  it('el tutor ve a sus estudiantes con cita confirmada o completada', async () => {
    const students = await call('get', '/api/appointments/my-students', tutor);
    assert.equal(students.status, 200);
    assert.ok(students.body.data.some((s) => s._id === ana.id));
    assert.ok(!students.body.data.some((s) => s._id === bruno.id));

    const asStudent = await call('get', '/api/appointments/my-students', ana);
    assert.equal(asStudent.status, 403);
  });
});
