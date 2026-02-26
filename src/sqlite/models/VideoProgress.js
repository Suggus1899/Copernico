/**
 * VideoProgress model wrapper for SQLite.
 */

import BaseModel from '../BaseModel.js';

class VideoProgressModel extends BaseModel {
    constructor(adapter) {
        super('VideoProgress', adapter);
        // Use 'video_progresses' as table name
        this.tableName = 'video_progresses';
    }
}

export default new VideoProgressModel();
