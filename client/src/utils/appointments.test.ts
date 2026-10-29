import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getAppointmentTutor, getStudentStatus } from './appointments';
import type { Appointment } from '../types/appointments';

const appointment: Appointment = {
  _id: 'appointment-1', studentId: null, courseId: null,
  tutorId: { _id: 'tutor-1', personalInfo: { firstName: 'Ana', lastName: 'Pérez' } },
  startsAt: '2026-10-28T14:00:00.000Z', endsAt: '2026-10-28T15:00:00.000Z',
  durationMinutes: 60, status: 'confirmed', createdAt: '2026-10-28T12:00:00.000Z', updatedAt: '2026-10-28T12:00:00.000Z',
};

test('uses the populated tutor reference and its HTTP string id', () => {
  assert.deepEqual(getAppointmentTutor(appointment), { id: 'tutor-1', name: 'Ana Pérez', role: 'tutor' });
  assert.deepEqual(getAppointmentTutor({ tutorId: 'tutor-2' }), { id: 'tutor-2', name: 'Tutor', role: 'tutor' });
  assert.equal(getAppointmentTutor({ tutorId: null }).id, undefined);
});

test('students without optional statistics retain inactive fallback', () => {
  assert.equal(getStudentStatus({}), 'inactive');
  assert.equal(getStudentStatus({ stats: { lastAppointmentDate: null } }), 'inactive');
  assert.equal(getStudentStatus({ stats: { lastAppointmentDate: new Date().toISOString() } }), 'active');
});
