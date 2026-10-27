import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startIntegrationEnv } from './helpers/integration.js';

const ORIGIN = 'http://localhost:5173';
const PASSWORD = 'Clave-Segura-2025';
const SESSION = 'copernico_session';
const VIDEO_ID = 'dQw4w9WgXcQ';
const OTHER_VIDEO_ID = 'aaaaaaaaaaa';

const cookieOf = (res) => {
  const cookie = (res.headers['set-cookie'] ?? []).find((c) => c.startsWith(`${SESSION}=`));
  return cookie?.split(';')[0];
};

describe('vídeos de YouTube: publicación, visibilidad y reacciones', () => {
  let env;
  let User;
  let tutor;
  let otherTutor;
  let ana;
  let bruno;
  let admin;

  // Fixtures creados en before() y compartidos por los tests.
  let openVideo;
  let publicVideo;
  let privateVideo;
  let grantedVideo;

  /** Petición con sesión opcional: as = { cookie }. */
  const call = (method, url, as, body) => {
    let req = request(env.app)[method](url).set('Origin', ORIGIN);
    if (as) req = req.set('Cookie', as.cookie);
    return body === undefined ? req : req.send(body);
  };

  const youtubeVideo = (overrides = {}) => ({
    title: 'Derivadas',
    subject: 'Matemáticas',
    youtubeUrl: `https://www.youtube.com/watch?v=${VIDEO_ID}`,
    ...overrides,
  });

  const createVideo = async (as, overrides) => {
    const res = await call('post', '/api/videos', as, youtubeVideo(overrides));
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return res.body.data;
  };

  const titlesOf = (res) => res.body.data.map((video) => video.title);

  before(async () => {
    env = await startIntegrationEnv();
    ({ default: User } = await import('../src/models/User.js'));

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
      studentProfile: { studentId: 'B001' },
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

    openVideo = await createVideo(tutor, { title: 'Derivadas', visibility: 'students' });
    publicVideo = await createVideo(tutor, { title: 'Física básica', subject: 'Física', visibility: 'public' });
    privateVideo = await createVideo(tutor, { title: 'Borrador privado', visibility: 'private' });
    grantedVideo = await createVideo(tutor, {
      title: 'Solo para Ana',
      visibility: 'private',
      allowedStudents: [ana.id],
    });
  });

  after(async () => {
    await env.stop();
  });

  it('publica vídeos a partir de una URL de YouTube y no guarda archivos', async () => {
    const res = await call('post', '/api/videos', tutor, youtubeVideo({ title: 'Integrales' }));
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.data.youtubeId, VIDEO_ID);
    assert.equal(res.body.data.thumbnailUrl, `https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`);
    assert.equal(res.body.data.uploadedBy, tutor.id);
    assert.equal(res.body.data.videoUrl, undefined);
  });

  it('rechaza URLs que no son de YouTube y payloads con archivos', async () => {
    const foreignHost = await call('post', '/api/videos', tutor, youtubeVideo({ youtubeUrl: 'https://vimeo.com/12345' }));
    assert.equal(foreignHost.status, 422);
    assert.equal(foreignHost.body.error.code, 'VALIDATION_ERROR');

    const fileOnly = await call('post', '/api/videos', tutor, {
      title: 'Archivo',
      subject: 'Matemáticas',
      videoUrl: 'https://cdn.example/clase.mp4',
    });
    assert.equal(fileOnly.status, 422);
  });

  it('solo tutores y administradores publican vídeos', async () => {
    assert.equal((await call('post', '/api/videos', ana, youtubeVideo())).status, 403);
    assert.equal((await call('post', '/api/videos', undefined, youtubeVideo())).status, 401);
  });

  it('no acepta campos que el cliente no puede fijar', async () => {
    const res = await call('post', '/api/videos', tutor, youtubeVideo({
      title: 'Campos forzados',
      likes: 999,
      views: 500,
      uploadedBy: otherTutor.id,
      status: 'archived',
    }));
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.data.likes, 0);
    assert.equal(res.body.data.views, 0);
    assert.equal(res.body.data.uploadedBy, tutor.id);
    assert.equal(res.body.data.status, 'published');
  });

  it('la visibilidad decide quién ve cada vídeo', async () => {
    const anaList = await call('get', '/api/videos', ana);
    assert.ok(titlesOf(anaList).includes('Derivadas'));
    assert.ok(titlesOf(anaList).includes('Física básica'));
    assert.ok(titlesOf(anaList).includes('Solo para Ana'));
    assert.ok(!titlesOf(anaList).includes('Borrador privado'));

    const brunoList = await call('get', '/api/videos', bruno);
    assert.ok(titlesOf(brunoList).includes('Derivadas'));
    assert.ok(!titlesOf(brunoList).includes('Solo para Ana'));
    assert.ok(!titlesOf(brunoList).includes('Borrador privado'));

    assert.equal((await call('get', `/api/videos/${privateVideo.id}`, ana)).status, 404);
    assert.equal((await call('get', `/api/videos/${privateVideo.id}`, otherTutor)).status, 404);
    assert.equal((await call('get', `/api/videos/${privateVideo.id}`, tutor)).status, 200);
    assert.equal((await call('get', `/api/videos/${privateVideo.id}`, admin)).status, 200);
    assert.equal((await call('get', `/api/videos/${grantedVideo.id}`, ana)).status, 200);
    assert.equal((await call('get', `/api/videos/${grantedVideo.id}`, bruno)).status, 404);
  });

  it('oculta allowedStudents y likedBy a quien no gestiona el vídeo', async () => {
    const studentView = await call('get', `/api/videos/${openVideo.id}`, ana);
    assert.equal(studentView.status, 200);
    assert.equal(studentView.body.data.allowedStudents, undefined);
    assert.equal(studentView.body.data.likedBy, undefined);
    assert.equal(studentView.body.data.likedByMe, false);
    assert.equal(studentView.body.data.thumbnailUrl, openVideo.thumbnailUrl);

    const tutorView = await call('get', `/api/videos/${grantedVideo.id}`, tutor);
    assert.deepEqual(tutorView.body.data.allowedStudents, [ana.id]);
  });

  it('los vídeos archivados solo los ven su autor y el administrador', async () => {
    const archivable = await createVideo(tutor, { title: 'Archivable' });
    const archived = await call('put', `/api/videos/${archivable.id}`, tutor, { status: 'archived' });
    assert.equal(archived.status, 200, JSON.stringify(archived.body));

    assert.equal((await call('get', `/api/videos/${archivable.id}`, ana)).status, 404);
    assert.ok(!titlesOf(await call('get', '/api/videos', ana)).includes('Archivable'));
    assert.equal((await call('get', `/api/videos/${archivable.id}`, tutor)).status, 200);
    assert.equal((await call('get', `/api/videos/${archivable.id}`, admin)).status, 200);
  });

  it('solo el autor o un administrador editan y borran, y la URL nueva actualiza el ID', async () => {
    const editable = await createVideo(tutor, { title: 'Editable' });

    assert.equal((await call('put', `/api/videos/${editable.id}`, otherTutor, { title: 'Robado' })).status, 403);
    assert.equal((await call('delete', `/api/videos/${editable.id}`, otherTutor)).status, 403);

    const updated = await call('put', `/api/videos/${editable.id}`, tutor, {
      youtubeUrl: `https://youtu.be/${OTHER_VIDEO_ID}`,
    });
    assert.equal(updated.status, 200, JSON.stringify(updated.body));
    assert.equal(updated.body.data.youtubeId, OTHER_VIDEO_ID);

    assert.equal((await call('delete', `/api/videos/${editable.id}`, tutor)).status, 200);
    assert.equal((await call('get', `/api/videos/${editable.id}`, tutor)).status, 404);
  });

  it('el filtro por materia trata el texto como literal, no como expresión regular', async () => {
    const wildcard = await call('get', '/api/videos?subject=.*', ana);
    assert.equal(wildcard.status, 200);
    assert.equal(wildcard.body.data.length, 0);

    const partial = await call('get', '/api/videos?subject=matem', ana);
    assert.ok(titlesOf(partial).includes('Derivadas'));
  });

  it('las reacciones alternan like y no se aplican a los propios vídeos', async () => {
    const own = await call('post', `/api/videos/${openVideo.id}/like`, tutor);
    assert.equal(own.status, 400);
    assert.equal(own.body.error.code, 'OWN_VIDEO');

    const liked = await call('post', `/api/videos/${publicVideo.id}/like`, ana);
    assert.equal(liked.status, 200);
    assert.deepEqual(liked.body.data, { likes: 1, likedByMe: true });

    const unliked = await call('post', `/api/videos/${publicVideo.id}/like`, ana);
    assert.deepEqual(unliked.body.data, { likes: 0, likedByMe: false });
  });

  it('valida el identificador antes de consultar la base de datos', async () => {
    const res = await call('get', '/api/videos/no-es-un-id', ana);
    assert.equal(res.status, 422);
  });
});
