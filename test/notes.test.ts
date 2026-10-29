import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startIntegrationEnv } from './helpers/integration.js';
test('notes preserve owner edits, sharing permissions and revocation',async()=>{
 const env=await startIntegrationEnv();
 try {
  const signup=async(email:string)=>{const res=await request(env.app).post('/api/auth/signup').send({email,role:'student',password:'Clave-Segura-2025',personalInfo:{firstName:'Ana',lastName:'Perez'},studentProfile:{studentId:email}}).expect(201);return {id:String(res.body.data._id),cookie:res.headers['set-cookie']};};
  const owner=await signup('notes-owner@example.com'),reader=await signup('notes-reader@example.com'),stranger=await signup('notes-stranger@example.com');
  const created=await request(env.app).post('/api/notes').set('Cookie',owner.cookie).send({title:'Original',content:'Content',subject:'Math'}).expect(201);const id=String(created.body.data._id);
  const edited=await request(env.app).put(`/api/notes/${id}`).set('Cookie',owner.cookie).send({title:'Edited'}).expect(200);assert.equal(edited.body.data.title,'Edited');assert.equal(edited.body.data.content,'Content');
  await request(env.app).get(`/api/notes/${id}`).set('Cookie',stranger.cookie).expect(403);await request(env.app).delete(`/api/notes/${id}`).set('Cookie',stranger.cookie).expect(403);
  await request(env.app).post(`/api/notes/${id}/share`).set('Cookie',owner.cookie).send({email:'notes-reader@example.com',permission:'write'}).expect(200);
  const shared=await request(env.app).get(`/api/notes/${id}`).set('Cookie',reader.cookie).expect(200);assert.equal(shared.body.data.permission,'write');
  await request(env.app).put(`/api/notes/${id}`).set('Cookie',reader.cookie).send({content:'Shared edit',subject:'Forbidden subject change'}).expect(200);
  const saved=await request(env.app).get(`/api/notes/${id}`).set('Cookie',owner.cookie).expect(200);assert.equal(saved.body.data.subject,'Math');assert.equal(saved.body.data.content,'Shared edit');
  await request(env.app).delete(`/api/notes/${id}/share/${reader.id}`).set('Cookie',owner.cookie).expect(200);await request(env.app).get(`/api/notes/${id}`).set('Cookie',reader.cookie).expect(403);
 } finally {await env.stop();}
});
