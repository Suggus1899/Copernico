import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startIntegrationEnv } from './helpers/integration.js';
test('academic progress stays visible to its student and editable by its tutor',async()=>{
 const env=await startIntegrationEnv();
 try{
  const signup=async(email:string,role:'student'|'tutor')=>{const res=await request(env.app).post('/api/auth/signup').send({email,role,password:'Clave-Segura-2025',personalInfo:{firstName:'Ana',lastName:'Perez'},studentProfile:{studentId:email},tutorProfile:{specialties:['Math']}}).expect(201);return {id:String(res.body.data._id),cookie:res.headers['set-cookie']};};
  const tutor=await signup('progress-tutor@example.com','tutor'),student=await signup('progress-student@example.com','student'),stranger=await signup('progress-stranger@example.com','student');
  const created=await request(env.app).post('/api/progress').set('Cookie',tutor.cookie).send({studentId:student.id,trackedBy:tutor.id,subject:'Math',metrics:{assignmentGrades:80,examScores:60},trackingPeriod:{startDate:'2026-01-01T00:00:00Z',endDate:'2027-01-01T00:00:00Z'}}).expect(201);const id=String(created.body.data._id);
  await request(env.app).get(`/api/progress/${id}`).set('Cookie',student.cookie).expect(200);await request(env.app).get(`/api/progress/${id}`).set('Cookie',stranger.cookie).expect(403);
  const updated=await request(env.app).put(`/api/progress/${id}`).set('Cookie',tutor.cookie).send({observations:'Making progress'}).expect(200);assert.equal(updated.body.data.observations,'Making progress');
  const own=await request(env.app).get('/api/progress/my-progress').set('Cookie',student.cookie).expect(200);assert.equal(own.body.data[0]._id,id);
 } finally{await env.stop();}
});
