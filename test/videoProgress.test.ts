type Actor = { id: string; cookie: string };
type VideoFixture = { _id: string; title: string; youtubeId: string };
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { startIntegrationEnv } from './helpers/integration.js';

const ORIGIN = 'http://localhost:5173';
const PASSWORD = 'Clave-Segura-2025';
const SESSION = 'copernico_session';
const VIDEO_ID = 'dQw4w9WgXcQ';

const cookieOf = (res: request.Response) => {
  const cookie = [res.headers['set-cookie']].flat().filter((c): c is string => typeof c === 'string').find((c) => c.startsWith(`${SESSION}=`));
  assert.ok(cookie); return cookie.split(';')[0];
};

describe('progreso de vídeo: umbral de completado y permisos', () => {
  let env: Awaited<ReturnType<typeof startIntegrationEnv>>;
  let User: typeof import('../src/models/User.js').default;
  let VideoProgress: typeof import('../src/models/VideoProgress.js').default;
  let VideoProgressRequest: typeof import('../src/models/VideoProgressRequest.js').default;
  let tutor: Actor;
  let ana: Actor;
  let bruno: Actor;

  /** Petición con sesión opcional: as = { cookie }. */
  const call = (method: 'get' | 'post' | 'put' | 'patch' | 'delete', url: string, as?: Actor | null, body?: object) => {
    let req = request(env.app)[method](url).set('Origin', ORIGIN);
    if (as) req = req.set('Cookie', as.cookie);
    return body === undefined ? req : req.send(body);
  };

  const createVideo = async (overrides: object = {}): Promise<VideoFixture> => {
    const res = await call('post', '/api/videos', tutor, {
      title: 'Derivadas',
      subject: 'Matemáticas',
      youtubeUrl: `https://youtu.be/${VIDEO_ID}`,
      visibility: 'students',
      ...overrides,
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return res.body.data;
  };

  const report = (as: Actor, videoId: string, body: object) =>
    call('post', `/api/video-progress/videos/${videoId}/progress`, as, { requestId: randomUUID(), ...body });

  before(async () => {
    env = await startIntegrationEnv();
    ({ default: User } = await import('../src/models/User.js'));
    ({ default: VideoProgress } = await import('../src/models/VideoProgress.js'));
    ({ default: VideoProgressRequest } = await import('../src/models/VideoProgressRequest.js'));
    await VideoProgressRequest.init();

    const signup = async (body: { email: string; role: string; personalInfo: { firstName: string; lastName: string }; tutorProfile?: { specialties: string[] }; studentProfile?: { studentId: string } }) => {
      const res = await request(env.app)
        .post('/api/auth/signup')
        .set('Origin', ORIGIN)
        .send({ password: PASSWORD, ...body });
      assert.equal(res.status, 201, JSON.stringify(res.body));
      const user = await User.findOne({ email: body.email }).lean();
      assert.ok(user);
      return { id: String(user._id), cookie: cookieOf(res) };
    };

    tutor = await signup({
      email: 'luis@example.com',
      role: 'tutor',
      personalInfo: { firstName: 'Luis', lastName: 'Tutor' },
      tutorProfile: { specialties: ['Matemáticas'] },
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
      studentProfile: { studentId: 'B001' },
    });
    const { default: Course } = await import('../src/models/Course.js');
    await Course.create({ title: 'Matemáticas', instructor: tutor.id, enrolledStudents: [{ student: ana.id }] });
  });

  after(async () => {
    await env.stop();
  });

  it('calcula el porcentaje sin completar antes del umbral del 90%', async () => {
    const video = await createVideo({ title: 'Mitad del vídeo' });
    const res = await report(ana, video._id, { currentTime: 300, watchedSeconds: 300, totalDuration: 600 });

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.progressPercentage, 50);
    assert.equal(res.body.data.isCompleted, false);
    assert.equal(res.body.data.status, 'in_progress');
  });

  it('marca como completado a partir del 90% y no retrocede al volver atrás', async () => {
    const video = await createVideo({ title: 'Casi terminado' });
    const finished = await report(ana, video._id, { currentTime: 545, watchedSeconds: 245, totalDuration: 600 });
    assert.equal(finished.status, 200, JSON.stringify(finished.body));
    assert.equal(finished.body.data.progressPercentage, 91);
    assert.equal(finished.body.data.isCompleted, true);
    assert.equal(finished.body.data.status, 'completed');

    // Volver al inicio con una duración distinta: el completado se mantiene.
    const rewound = await report(ana, video._id, { currentTime: 5, watchedSeconds: 0, totalDuration: 1200 });
    assert.equal(rewound.status, 200, JSON.stringify(rewound.body));
    assert.equal(rewound.body.data.isCompleted, true);
    assert.equal(rewound.body.data.status, 'completed');
    assert.ok(rewound.body.data.progressPercentage < 90);
  });

  it('usa exactamente 90% como frontera de completado', async () => {
    const video = await createVideo({ title: 'Frontera' });

    const almost = await report(ana, video._id, { currentTime: 89, watchedSeconds: 89, totalDuration: 100 });
    assert.equal(almost.body.data.progressPercentage, 89);
    assert.equal(almost.body.data.isCompleted, false);

    const exact = await report(ana, video._id, { currentTime: 90, watchedSeconds: 1, totalDuration: 100 });
    assert.equal(exact.body.data.progressPercentage, 90);
    assert.equal(exact.body.data.isCompleted, true);
  });

  it('aplica una operación de progreso una sola vez y rechaza reutilizar la clave con otro contenido', async () => {
    const video = await createVideo({ title: 'Idempotencia' });
    const body = { requestId: randomUUID(), currentTime: 10, watchedSeconds: 10, totalDuration: 100 };
    const [first, concurrentRetry] = await Promise.all([
      report(ana, video._id, body),
      report(ana, video._id, body),
    ]);

    assert.equal(first.status, 200, JSON.stringify(first.body));
    assert.equal(concurrentRetry.status, 200, JSON.stringify(concurrentRetry.body));
    assert.deepEqual(concurrentRetry.body.data, first.body.data);

    const lostResponseRetry = await report(ana, video._id, body);
    assert.equal(lostResponseRetry.status, 200, JSON.stringify(lostResponseRetry.body));
    assert.deepEqual(lostResponseRetry.body.data, first.body.data);

    const changedPayload = await report(ana, video._id, { ...body, currentTime: 11 });
    assert.equal(changedPayload.status, 409);
    assert.equal(changedPayload.body.error.code, 'IDEMPOTENCY_KEY_REUSED');

    const savedProgress = await VideoProgress.findOne({ studentId: ana.id, videoId: video._id }).lean();
    assert.equal(savedProgress?.watchTime, 10);
    const savedRequest = await VideoProgressRequest.findOne({ requestId: body.requestId }).lean();
    assert.ok(savedRequest);
    assert.ok(savedRequest.expiresAt.getTime() >= Date.now() + 7 * 24 * 60 * 60 * 1000 - 5000);
    assert.ok(VideoProgressRequest.schema.indexes().some(([keys, options]) => keys.expiresAt === 1 && options.expireAfterSeconds === 0));
  });

  it('rechaza progreso con valores fuera de rango o identificadores no válidos', async () => {
    const video = await createVideo({ title: 'Validación' });

    const negativeTime = await report(ana, video._id, { currentTime: -1 });
    assert.equal(negativeTime.status, 422);
    assert.equal(negativeTime.body.error.code, 'VALIDATION_ERROR');

    const hugeIncrement = await report(ana, video._id, { currentTime: 10, watchedSeconds: 99999 });
    assert.equal(hugeIncrement.status, 422);

    const missingRequestId = await call('post', `/api/video-progress/videos/${video._id}/progress`, ana, { currentTime: 10 });
    assert.equal(missingRequestId.status, 422);

    const badId = await report(ana, 'xyz', { currentTime: 10 });
    assert.equal(badId.status, 422);
  });

  it('no registra progreso de vídeos que el estudiante no puede ver', async () => {
    const privateVideo = await createVideo({ title: 'Borrador privado', visibility: 'private' });

    const res = await report(bruno, privateVideo._id, { currentTime: 10, watchedSeconds: 10, totalDuration: 600 });
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  it('separa los paneles de estudiante y de tutor por rol', async () => {
    const asStudent = await call('get', '/api/video-progress/student-stats', ana);
    assert.equal(asStudent.status, 403);

    const asTutor = await call('get', '/api/video-progress/my-stats', tutor);
    assert.equal(asTutor.status, 403);

    const ownStats = await call('get', '/api/video-progress/my-stats', ana);
    assert.equal(ownStats.status, 200, JSON.stringify(ownStats.body));
  });

  it('limita el ranking de vídeos más vistos a 50 resultados', async () => {
    const tooMany = await call(
      'get',
      `/api/video-progress/student-most-watched?studentId=${ana.id}&limit=500`,
      tutor,
    );
    assert.equal(tooMany.status, 422);

    const valid = await call(
      'get',
      `/api/video-progress/student-most-watched?studentId=${ana.id}&limit=5`,
      tutor,
    );
    assert.equal(valid.status, 200, JSON.stringify(valid.body));
  });
});
