/**
 * ClassVideo model wrapper for SQLite.
 */

import BaseModel from '../BaseModel.js';

class ClassVideoModel extends BaseModel {
    constructor(adapter) {
        super('ClassVideo', adapter);
    }
}

export default new ClassVideoModel();
