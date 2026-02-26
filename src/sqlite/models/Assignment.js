/**
 * Assignment model wrapper for SQLite.
 */

import BaseModel from '../BaseModel.js';

class AssignmentModel extends BaseModel {
    constructor(adapter) {
        super('Assignment', adapter);
    }
}

export default new AssignmentModel();
