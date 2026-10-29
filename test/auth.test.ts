import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startIntegrationEnv } from './helpers/integration.js';

const ORIGIN = 'http://localhost:5173';
const PASSWORD = 'Clave-Segura-2025';
const NEW_PASSWORD = 'Otra-Clave-2025';
const WRONG_PASSWORD = 'Incorrecta-2025';
const SESSION = 'copernico_session';

const studentBody = (email: string) => ({
  email,
  password: PASSWORD,
  role: 'student',
  personalInfo: { firstName: 'Ana', lastName: 'Perez' },
  studentProfile: { studentId: 'A001' },
});

const sessionCookie = (res: request.Response) => {
  const cookie = ([res.headers['set-cookie']].flat().filter((cookie): cookie is string => typeof cookie === 'string')).find((cookie) => cookie.startsWith(`${SESSION}=`));
  assert.ok(cookie);
  return cookie;
};

describe('autenticación y sesiones', () => {
  let env: Awaited<ReturnType<typeof startIntegrationEnv>>;
  let User: typeof import('../src/models/User.js').default;

  before(async () => {
    env = await startIntegrationEnv();
    User = (await import('../src/models/User.js')).default;
  });

  after(async () => {
    await env.stop();
  });

  const post = (path: string, body: object, cookie?: string) => {
    const req = request(env.app).post(path).set('Origin', ORIGIN);
    if (cookie) req.set('Cookie', cookie);
    return req.send(body);
  };

  it('registra un estudiante con cookie HttpOnly y sin exponer secretos', async () => {
    const res = await post('/api/auth/signup', studentBody('ana@example.com'));

    assert.equal(res.status, 201);
    const cookie = sessionCookie(res);
    assert.ok(cookie, 'debe emitir la cookie de sesión');
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/i);
    assert.equal(res.body.data.email, 'ana@example.com');
    assert.equal('password' in res.body.data, false);
    assert.equal('sessionVersion' in res.body.data, false);
  });

  it('guarda la contraseña como hash bcrypt, nunca en texto plano', async () => {
    const user = await User.findOne({ email: 'ana@example.com' }).select('+password');

    assert.ok(user);
    assert.match(user.password, /^\$2[aby]\$/);
    assert.notEqual(user.password, PASSWORD);
  });

  it('rechaza contraseñas débiles con 422 VALIDATION_ERROR', async () => {
    const res = await post('/api/auth/signup', { ...studentBody('debil@example.com'), password: 'corta' });

    assert.equal(res.status, 422);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('responde 409 si el correo ya está registrado', async () => {
    const res = await post('/api/auth/signup', studentBody('ANA@example.com'));

    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'EMAIL_ALREADY_REGISTERED');
  });

  it('responde igual ante un correo inexistente y una contraseña incorrecta', async () => {
    const wrongPassword = await post('/api/auth/signin', { email: 'ana@example.com', password: WRONG_PASSWORD });
    const unknownEmail = await post('/api/auth/signin', { email: 'nadie@example.com', password: WRONG_PASSWORD });

    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownEmail.status, 401);
    assert.equal(wrongPassword.body.error.code, 'INVALID_CREDENTIALS');
    assert.deepEqual(unknownEmail.body.error, wrongPassword.body.error);
  });

  it('bloquea temporalmente la cuenta tras cinco intentos fallidos', async () => {
    await post('/api/auth/signup', studentBody('bloqueo@example.com'));
    for (let i = 0; i < 5; i += 1) {
      const failed = await post('/api/auth/signin', { email: 'bloqueo@example.com', password: WRONG_PASSWORD });
      assert.equal(failed.status, 401);
    }

    const correctWhileLocked = await post('/api/auth/signin', { email: 'bloqueo@example.com', password: PASSWORD });

    assert.equal(correctWhileLocked.status, 401);
    assert.equal(correctWhileLocked.body.error.code, 'INVALID_CREDENTIALS');
  });

  it('exige una sesión válida para leer el perfil', async () => {
    const res = await request(env.app).get('/api/auth/profile').set('Origin', ORIGIN);

    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHENTICATED');
  });

  it('no permite que PATCH de perfil cambie el rol', async () => {
    const login = await post('/api/auth/signin', { email: 'ana@example.com', password: PASSWORD });
    const cookie = sessionCookie(login);

    const res = await request(env.app)
      .patch('/api/auth/profile')
      .set('Origin', ORIGIN)
      .set('Cookie', cookie)
      .send({ role: 'admin', personalInfo: { firstName: 'Ana Maria' } });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.role, 'student');
    assert.equal(res.body.data.personalInfo.firstName, 'Ana Maria');
  });

  it('cambiar contraseña exige la actual e invalida la sesión anterior', async () => {
    const login = await post('/api/auth/signin', { email: 'ana@example.com', password: PASSWORD });
    const oldCookie = sessionCookie(login);

    const wrong = await post('/api/auth/change-password', { currentPassword: WRONG_PASSWORD, newPassword: NEW_PASSWORD }, oldCookie);
    assert.equal(wrong.status, 400);
    assert.equal(wrong.body.error.code, 'INVALID_CURRENT_PASSWORD');

    const changed = await post('/api/auth/change-password', { currentPassword: PASSWORD, newPassword: NEW_PASSWORD }, oldCookie);
    assert.equal(changed.status, 200);

    const stale = await request(env.app).get('/api/auth/profile').set('Origin', ORIGIN).set('Cookie', oldCookie);
    assert.equal(stale.status, 401);
    assert.equal(stale.body.error.code, 'SESSION_INVALID');

    const oldPasswordLogin = await post('/api/auth/signin', { email: 'ana@example.com', password: PASSWORD });
    const newPasswordLogin = await post('/api/auth/signin', { email: 'ana@example.com', password: NEW_PASSWORD });
    assert.equal(oldPasswordLogin.status, 401);
    assert.equal(newPasswordLogin.status, 200);
  });

  it('desactivar la cuenta cierra la sesión y impide volver a entrar', async () => {
    const login = await post('/api/auth/signin', { email: 'ana@example.com', password: NEW_PASSWORD });
    const cookie = sessionCookie(login);

    const res = await post('/api/auth/deactivate', { currentPassword: NEW_PASSWORD }, cookie);
    assert.equal(res.status, 200);

    const stale = await request(env.app).get('/api/auth/profile').set('Origin', ORIGIN).set('Cookie', cookie);
    assert.equal(stale.status, 401);

    const blocked = await post('/api/auth/signin', { email: 'ana@example.com', password: NEW_PASSWORD });
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.error.code, 'ACCOUNT_UNAVAILABLE');
  });

  it('rechaza mutaciones desde un origen no permitido antes de llegar a la ruta', async () => {
    const res = await request(env.app)
      .post('/api/auth/signin')
      .set('Origin', 'https://evil.example')
      .send({ email: 'ana@example.com', password: PASSWORD });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN_ORIGIN');
  });
});
