import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startIntegrationEnv } from './helpers/integration.js';

const password = 'Clave-Segura-2025';
type Actor = { id: string; cookie: string };

describe('autorización del progreso académico', () => {
  let env: Awaited<ReturnType<typeof startIntegrationEnv>>;
  let tutor: Actor, otherTutor: Actor, student: Actor, unrelated: Actor, admin: Actor;
  let recordId: string;
  const get = (url: string, actor: Actor) => request(env.app).get(url).set('Cookie', actor.cookie);
  const post = (url: string, actor: Actor, body: object) => request(env.app).post(url).set('Cookie', actor.cookie).send(body);

  before(async () => {
    env = await startIntegrationEnv();
    const { default: User } = await import('../src/models/User.js');
    const { default: Course } = await import('../src/models/Course.js');
    const { default: ProgressTracking } = await import('../src/models/ProgressTracking.js');
    const actor = async (email: string, role: string): Promise<Actor> => {
      const user = await User.create({ email, password, role });
      const login = await request(env.app).post('/api/auth/signin').send({ email, password });
      assert.equal(login.status, 200);
      const cookies = [login.headers['set-cookie']].flat();
      const cookie = cookies.find((value): value is string => typeof value === 'string' && value.startsWith('copernico_session='));
      assert.ok(cookie);
      return { id: String(user._id), cookie: cookie.split(';')[0] };
    };
    tutor = await actor('progress-tutor@example.test', 'tutor');
    otherTutor = await actor('progress-other@example.test', 'tutor');
    student = await actor('progress-student@example.test', 'student');
    unrelated = await actor('progress-unrelated@example.test', 'student');
    admin = await actor('progress-admin@example.test', 'admin');
    await Course.create({ title: 'Curso', instructor: tutor.id, enrolledStudents: [{ student: student.id }] });
    const record = await ProgressTracking.create({ studentId: student.id, trackedBy: tutor.id, subject: 'Álgebra', trackingPeriod: { startDate: new Date(), endDate: new Date(Date.now() + 86400000) } });
    recordId = String(record._id);
    await ProgressTracking.create({ studentId: unrelated.id, trackedBy: otherTutor.id, subject: 'Privada', trackingPeriod: { startDate: new Date(), endDate: new Date(Date.now() + 86400000) } });
  });
  after(async () => { await env.stop(); });

  it('protege los cuatro informes de vídeo de un tutor sin relación', async () => {
    for (const path of ['/student-stats', '/student-dashboard', '/student-most-watched', '/subject/Algebra/progress']) {
      const url = `/api/video-progress${path}?studentId=${student.id}`;
      assert.equal((await get(url, otherTutor)).status, 403, path);
      assert.equal((await get(url, tutor)).status, 200, path);
      assert.equal((await get(url, admin)).status, 200, path);
    }
  });

  it('limita informes y registros académicos por tutor, estudiante y administrador', async () => {
    const url = `/api/progress/student-progress?studentId=${student.id}&subject=Álgebra`;
    assert.equal((await get(url, otherTutor)).status, 403);
    assert.equal((await get(url, tutor)).body.data._id, recordId);
    assert.equal((await get(url, admin)).body.data._id, recordId);
    assert.equal((await get('/api/progress/statistics', tutor)).body.data.totalTrackings, 1);
    assert.equal((await get('/api/progress/statistics', admin)).body.data.totalTrackings, 2);
    assert.equal((await get('/api/progress/statistics', student)).body.data.totalTrackings, 1);
    assert.equal((await get(`/api/progress/statistics?studentId=${unrelated.id}`, tutor)).status, 403);
    assert.equal((await get(`/api/progress/${recordId}`, otherTutor)).status, 403);
  });

  it('impide crear seguimientos para estudiantes ajenos o suplantar al tutor', async () => {
    const body = { studentId: student.id, trackedBy: otherTutor.id, subject: 'Historia', trackingPeriod: { startDate: new Date().toISOString(), endDate: new Date(Date.now() + 86400000).toISOString() } };
    assert.equal((await post('/api/progress', tutor, body)).status, 403);
    assert.equal((await post('/api/progress', otherTutor, body)).status, 403);
    assert.equal((await post('/api/progress/baseline', tutor, { studentId: unrelated.id, subject: 'Historia' })).status, 403);
  });

  it('trata los filtros de materia como texto literal', async () => {
    assert.equal((await get('/api/progress/my-progress?subject=.*', student)).body.data.length, 0);
    assert.equal((await get('/api/progress/statistics?subject=.*', tutor)).body.data.totalTrackings, 0);
  });
});
