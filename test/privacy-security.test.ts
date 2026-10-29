import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { startIntegrationEnv } from './helpers/integration.js';

test('notas y mensajes exponen solo datos públicos y cerrar sesión invalida la cookie', async () => {
  const env = await startIntegrationEnv();
  try {
    const { default: User } = await import('../src/models/User.js');
    const { default: Course } = await import('../src/models/Course.js');
    const { default: EducationalMaterial } = await import('../src/models/EducationalMaterial.js');
    const signup = async (email: string, role: 'student' | 'tutor') => {
      const res = await request(env.app).post('/api/auth/signup').send({
        email, role, password: 'Clave-Segura-2025', personalInfo: { firstName: 'Ana', lastName: 'Perez' },
        studentProfile: { studentId: email }, tutorProfile: { specialties: ['Math'] },
      }).expect(201);
      return { id: String(res.body.data._id), cookie: res.headers['set-cookie'] };
    };
    const student = await signup('privacy-student@example.com', 'student');
    const tutor = await signup('privacy-tutor@example.com', 'tutor');
    await User.updateMany({ _id: { $in: [student.id, tutor.id] } }, { $set: {
      'personalInfo.phone': '555-private', 'personalInfo.address': 'private-address',
    } });
    await Course.create({ title: 'Math', instructor: tutor.id, enrolledStudents: [{ student: student.id }] });
    const message = await request(env.app).post('/api/messages').set('Cookie', student.cookie)
      .send({ to: tutor.id, text: 'Hola' }).expect(201);
    const conversations = await request(env.app).get('/api/messages/conversations').set('Cookie', tutor.cookie).expect(200);
    const history = await request(env.app).get(`/api/messages/${student.id}`).set('Cookie', tutor.cookie).expect(200);
    const notifications = await request(env.app).get('/api/notifications').set('Cookie', tutor.cookie).expect(200);
    assert.ok(notifications.body.data.length > 0);
    const notification = await request(env.app).get(`/api/notifications/${notifications.body.data[0]._id}`)
      .set('Cookie', tutor.cookie).expect(200);
    const video = await request(env.app).post('/api/videos').set('Cookie', tutor.cookie)
      .send({ title: 'Math', subject: 'Math', youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ', visibility: 'students' }).expect(201);
    await request(env.app).post(`/api/video-progress/videos/${video.body.data._id}/progress`).set('Cookie', student.cookie)
      .send({ requestId: randomUUID(), currentTime: 10, watchedSeconds: 10, totalDuration: 100 }).expect(200);
    const watched = await request(env.app).get('/api/video-progress/my-most-watched').set('Cookie', student.cookie).expect(200);
    assert.ok(watched.body.data.length > 0);
    const material = await EducationalMaterial.create({ title: 'Material', subject: 'Math', type: 'document',
      content: 'Contenido', status: 'published', visibility: 'students', createdBy: tutor.id, updatedBy: tutor.id, allowedStudents: [student.id] });
    const materials = await request(env.app).get('/api/materials').set('Cookie', student.cookie).expect(200);
    const materialDetail = await request(env.app).get(`/api/materials/${material._id}`).set('Cookie', student.cookie).expect(200);
    const popular = await request(env.app).get('/api/materials/popular').set('Cookie', student.cookie).expect(200);
    const mine = await request(env.app).get('/api/materials/my/materials').set('Cookie', tutor.cookie).expect(200);
    const rating = await request(env.app).post(`/api/materials/${material._id}/rate`).set('Cookie', student.cookie)
      .send({ rating: 5 }).expect(200);
    const note = await request(env.app).post('/api/notes').set('Cookie', student.cookie)
      .send({ title: 'Nota', content: 'Contenido' }).expect(201);
    const shared = await request(env.app).post(`/api/notes/${note.body.data._id}/share`).set('Cookie', student.cookie)
      .send({ email: 'privacy-tutor@example.com', permission: 'read' }).expect(200);
    const read = await request(env.app).get(`/api/notes/${note.body.data._id}`).set('Cookie', tutor.cookie).expect(200);
    for (const response of [message, conversations, history, notifications, notification, watched, materials, materialDetail, popular, mine, rating, note, shared, read]) {
      const serialized = JSON.stringify(response.body);
      assert.ok(!serialized.includes('555-private'));
      assert.ok(!serialized.includes('private-address'));
      assert.ok(serialized.includes('Ana'));
    }
    await request(env.app).post('/api/auth/signout').set('Cookie', student.cookie).expect(200);
    await request(env.app).get('/api/auth/profile').set('Cookie', student.cookie).expect(401);
    await request(env.app).post('/api/auth/signout').set('Cookie', student.cookie).expect(200);
    await request(env.app).post('/api/auth/signout').expect(200);
    await request(env.app).get('/api/auth/profile').set('Cookie', tutor.cookie).expect(200);
  } finally {
    await env.stop();
  }
});
