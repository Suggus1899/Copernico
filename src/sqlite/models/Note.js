/**
 * Note model wrapper for SQLite.
 */

import BaseModel from '../BaseModel.js';

class NoteModel extends BaseModel {
    constructor(adapter) {
        super('Note', adapter);
    }
}

export default new NoteModel();
