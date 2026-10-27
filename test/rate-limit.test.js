import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startIntegrationEnv } from './helpers/integration.js';

const ORIGIN = 'http://localhost:5173';

describe('límites de intentos de inicio de sesión', () => {
  let env;

  before(async () => {
    env = await startIntegrationEnv();
  });

  after(async () => {
    await env.stop();
  });

  it('responde 429 tras 20 intentos fallidos desde la misma IP', async () => {
    let last;
    for (let i = 0; i < 21; i += 1) {
      last = await request(env.app)
        .post('/api/auth/signin')
        .set('Origin', ORIGIN)
        .send({ email: 'nadie@example.com', password: 'Incorrecta-2025' });
    }

    assert.equal(last.status, 429);
    assert.equal(last.body.error.code, 'RATE_LIMITED');
  });
});
