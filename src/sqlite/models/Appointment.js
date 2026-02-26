/**
 * Appointment model wrapper for SQLite with instance methods.
 */

import BaseModel from '../BaseModel.js';

class AppointmentModel extends BaseModel {
    constructor(adapter) {
        super('Appointment', adapter);
    }

    /**
     * Add an internal note to an appointment.
     */
    async addInternalNote(appointmentId, authorId, note) {
        const now = new Date().toISOString();
        await this.adapter.db('appointment_internal_notes').insert({
            appointment_id: appointmentId,
            author_id: authorId,
            note,
            created_at: now
        });
        return this.findById(appointmentId);
    }

    /**
     * Rate a session.
     */
    async rateSession(appointmentId, raterRole, rating, feedback) {
        const prefix = raterRole === 'student' ? 'rating_student' : 'rating_professional';
        const updateData = {
            [`${prefix}_score`]: rating,
            [`${prefix}_feedback`]: feedback,
            [`${prefix}_date`]: new Date().toISOString()
        };
        return this.findByIdAndUpdate(appointmentId, updateData, { new: true });
    }

    /**
     * Get internal notes for an appointment.
     */
    async getInternalNotes(appointmentId) {
        return this.adapter.db('appointment_internal_notes')
            .where({ appointment_id: appointmentId })
            .orderBy('created_at', 'asc');
    }
}

export default new AppointmentModel();
