import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startIntegrationEnv } from './helpers/integration.js';

describe('contrato general de la API', () => {
  let env;

  before(async () => {
    env = await startIntegrationEnv();
  });

  after(async () => {
    await env.stop();
  });

  it('expone liveness en /api/health', async () => {
    const res = await request(env.app).get('/api/health');

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });

  it('expone readiness con la base de datos conectada', async () => {
    const res = await request(env.app).get('/api/health/ready');

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ready');
  });

  it('marca las respuestas de la API como no almacenables', async () => {
    const res = await request(env.app).get('/api/health');

    assert.equal(res.headers['cache-control'], 'no-store');
  });

  it('responde con el formato de error unificado en rutas inexistentes', async () => {
    const res = await request(env.app).get('/api/ruta-que-no-existe');

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'NOT_FOUND');
    assert.equal(typeof res.body.error.message, 'string');
  });

  it('no expone rutas experimentales de tareas e informes', async () => {
    const assignments = await request(env.app).get('/api/assignments');
    const reports = await request(env.app).get('/api/reports');

    assert.equal(assignments.status, 404);
    assert.equal(reports.status, 404);
  });
});
