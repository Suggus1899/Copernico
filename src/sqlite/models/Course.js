/**
 * Course model wrapper for SQLite.
 */

import BaseModel from '../BaseModel.js';

class CourseModel extends BaseModel {
    constructor(adapter) {
        super('Course', adapter);
    }

    findByInstructor(instructorId) {
        return this.find({ instructor_id: instructorId });
    }

    async findPublished(filter = {}, options = {}) {
        return this.find({ ...filter, is_published: 1 }, options);
    }
}

export default new CourseModel();
