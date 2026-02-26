/**
 * ProgressTracking model wrapper for SQLite.
 */

import BaseModel from '../BaseModel.js';

class ProgressTrackingModel extends BaseModel {
    constructor(adapter) {
        super('ProgressTracking', adapter);
    }
}

export default new ProgressTrackingModel();
