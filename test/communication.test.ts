import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startIntegrationEnv } from './helpers/integration.js';
test('messaging requires relationship, isolates conversations and preserves delivery when notification fails', async()=>{
 const env=await startIntegrationEnv();
 try {
  const {default:Course}=await import('../src/models/Course.js');
  const {default:Notification}=await import('../src/models/Notification.js');
  const signup=async(email:string,role:'student'|'tutor')=>{
   const res=await request(env.app).post('/api/auth/signup').send({email,role,password:'Clave-Segura-2025',personalInfo:{firstName:'Ana',lastName:'Perez'},studentProfile:{studentId:email},tutorProfile:{specialties:['Math']}}).expect(201);
   return {id:String(res.body.data._id),cookie:res.headers['set-cookie']};
  };
  const student=await signup('chat-student@example.com','student'); const tutor=await signup('chat-tutor@example.com','tutor'); const stranger=await signup('chat-stranger@example.com','student');
  const denied=await request(env.app).post('/api/messages').set('Cookie',student.cookie).send({to:tutor.id,text:'Hello'}).expect(403);
  assert.equal(denied.body.error.code,'MESSAGING_NOT_ALLOWED');
  await Course.create({title:'Math',instructor:tutor.id,enrolledStudents:[{student:student.id}]});
  await request(env.app).post('/api/messages').set('Cookie',student.cookie).send({to:tutor.id,text:'Hello'}).expect(201);
  await request(env.app).get(`/api/messages/${tutor.id}`).set('Cookie',stranger.cookie).expect(403);
  const before=await request(env.app).get('/api/messages/conversations').set('Cookie',tutor.cookie).expect(200); assert.equal(before.body.data[0].unreadCount,1);
  const read=await request(env.app).patch(`/api/messages/${student.id}/read`).set('Cookie',tutor.cookie).expect(200); assert.equal(read.body.updated,1);
  const after=await request(env.app).get('/api/messages/conversations').set('Cookie',tutor.cookie).expect(200); assert.equal(after.body.data[0].unreadCount,0);
  const notification=await Notification.findOne({userId:tutor.id});assert.ok(notification);
  const notice=await request(env.app).patch(`/api/notifications/${notification._id}/read`).set('Cookie',tutor.cookie).expect(200);assert.equal(notice.body.unreadCount,0);
  const failing=mock.method(Notification,'create',async()=>{throw new Error('notification unavailable');});
  try {await request(env.app).post('/api/messages').set('Cookie',student.cookie).send({to:tutor.id,text:'Delivered despite notification error'}).expect(201);} finally {failing.mock.restore();}
  const history=await request(env.app).get(`/api/messages/${student.id}`).set('Cookie',tutor.cookie).expect(200); assert.equal(history.body.data.length,2);assert.equal(history.body.data[1].text,'Delivered despite notification error');
 } finally {await env.stop();}
});
