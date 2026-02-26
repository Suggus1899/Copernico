/**
 * Report model wrapper for SQLite.
 */

import BaseModel from '../BaseModel.js';

class ReportModel extends BaseModel {
    constructor(adapter) {
        super('Report', adapter);
    }
}

export default new ReportModel();
