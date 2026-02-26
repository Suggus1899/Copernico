/**
 * ActivityLog model wrapper for SQLite.
 */

import BaseModel from '../BaseModel.js';

class ActivityLogModel extends BaseModel {
    constructor(adapter) {
        super('ActivityLog', adapter);
    }
}

export default new ActivityLogModel();
