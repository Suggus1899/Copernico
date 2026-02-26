/**
 * EducationalMaterial model wrapper for SQLite.
 */

import BaseModel from '../BaseModel.js';

class EducationalMaterialModel extends BaseModel {
    constructor(adapter) {
        super('EducationalMaterial', adapter);
    }
}

export default new EducationalMaterialModel();
