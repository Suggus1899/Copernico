import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';
import { startIntegrationEnv } from './helpers/integration.js';

test('demo seed refuses real database names, creates usable accounts and published courses without duplication', async () => {
  const env = await startIntegrationEnv();
  try {
    const { assertDemoDatabase, seedDemo } = await import('../scripts/seed_demo.js');
    const { default: User } = await import('../src/models/User.js');
    const { default: Course } = await import('../src/models/Course.js');
    assert.throws(() => assertDemoDatabase('copernico'), /base con sufijo/);
    const previousEnvironment = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      assert.throws(() => assertDemoDatabase('copernico_demo'), /NODE_ENV/);
    } finally { process.env.NODE_ENV = previousEnvironment; }
    await assert.rejects(seedDemo('weak'), /contraseña fuerte/);
    assert.equal(await User.countDocuments(), 0);
    const password = 'Demo-Pruebas-2026';
    await seedDemo(password);
    await seedDemo(password);
    assert.equal(await User.countDocuments(), 5);
    assert.equal(await Course.countDocuments({ isPublished: true }), 2);
    const student = await request(env.app).post('/api/auth/signin').send({ email: 'ana@copernico.example', password }).expect(200);
    assert.equal(student.body.data.role, 'student');
    const admin = await request(env.app).post('/api/auth/signin').send({ email: 'admin@copernico.example', password }).expect(200);
    assert.equal(admin.body.data.role, 'admin');
  } finally { await env.stop(); }
});
