import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startIntegrationEnv } from './helpers/integration.js';
test('profile patches preserve siblings and academic fields and ignore privilege escalation', async()=>{
 const env=await startIntegrationEnv();
 try {
  const account=await request(env.app).post('/api/auth/signup').send({email:'profile@example.com',password:'Clave-Segura-2025',role:'tutor',personalInfo:{firstName:'Ana',lastName:'Perez'},tutorProfile:{specialties:['Mathematics']}}).expect(201);
  const cookies=account.headers['set-cookie']; assert.ok(cookies);
  const fields={specialty:'Math',degrees:'MSc',experience:'Ten years',certifications:'Teaching'};
  await request(env.app).patch('/api/auth/profile').set('Cookie',cookies).send({personalInfo:fields}).expect(200);
  const updated=await request(env.app).patch('/api/auth/profile').set('Cookie',cookies).send({role:'admin',personalInfo:{firstName:'Maria'}}).expect(200);
  assert.equal(updated.body.data.role,'tutor'); assert.equal(updated.body.data.personalInfo.lastName,'Perez');
  for(const [key,value] of Object.entries(fields)) assert.equal(updated.body.data.personalInfo[key],value);
 } finally {await env.stop();}
});
