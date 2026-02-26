/**
 * AvailabilitySlot model wrapper for SQLite.
 */

import BaseModel from '../BaseModel.js';

class AvailabilitySlotModel extends BaseModel {
    constructor(adapter) {
        super('AvailabilitySlot', adapter);
    }
}

export default new AvailabilitySlotModel();
