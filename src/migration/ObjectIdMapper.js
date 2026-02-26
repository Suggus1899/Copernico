/**
 * ObjectIdMapper - maps MongoDB ObjectId values to integer IDs for SQLite.
 */

import db from '../db/connection.js';

class ObjectIdMapper {
    constructor(dbInstance = db, options = {}) {
        this.db = dbInstance;
        this.tableName = options.tableName || 'objectid_mapping';
    }

    async ensureTable() {
        const exists = await this.db.schema.hasTable(this.tableName);
        if (exists) {
            return;
        }

        await this.db.schema.createTable(this.tableName, (table) => {
            table.text('collection').notNullable();
            table.text('objectid').notNullable();
            table.integer('integer_id').notNullable();
            table.primary(['collection', 'objectid']);
            table.unique(['collection', 'integer_id']);
            table.index(['collection']);
        });
    }

    async getId(collection, objectId) {
        await this.ensureTable();
        const row = await this.db(this.tableName)
            .where({ collection, objectid: String(objectId) })
            .first();
        return row ? row.integer_id : null;
    }

    async getObjectId(collection, integerId) {
        await this.ensureTable();
        const row = await this.db(this.tableName)
            .where({ collection, integer_id: integerId })
            .first();
        return row ? row.objectid : null;
    }

    async getOrCreateId(collection, objectId) {
        await this.ensureTable();

        return this.db.transaction(async (trx) => {
            const existing = await trx(this.tableName)
                .where({ collection, objectid: String(objectId) })
                .first();

            if (existing) {
                return existing.integer_id;
            }

            const maxRow = await trx(this.tableName)
                .where({ collection })
                .max({ max: 'integer_id' })
                .first();
            const nextId = (maxRow?.max || 0) + 1;

            await trx(this.tableName).insert({
                collection,
                objectid: String(objectId),
                integer_id: nextId
            });

            return nextId;
        });
    }

    async mapObjectIds(collection, objectIds) {
        await this.ensureTable();

        const uniqueIds = Array.from(
            new Set((objectIds || []).filter(Boolean).map((id) => String(id)))
        );

        if (uniqueIds.length === 0) {
            return new Map();
        }

        return this.db.transaction(async (trx) => {
            const existingRows = await trx(this.tableName)
                .where({ collection })
                .whereIn('objectid', uniqueIds);

            const mapping = new Map(
                existingRows.map((row) => [row.objectid, row.integer_id])
            );

            const missing = uniqueIds.filter((id) => !mapping.has(id));
            if (missing.length === 0) {
                return mapping;
            }

            const maxRow = await trx(this.tableName)
                .where({ collection })
                .max({ max: 'integer_id' })
                .first();
            let nextId = (maxRow?.max || 0) + 1;

            const inserts = missing.map((objectid) => {
                const row = {
                    collection,
                    objectid,
                    integer_id: nextId
                };
                mapping.set(objectid, nextId);
                nextId += 1;
                return row;
            });

            await trx(this.tableName).insert(inserts);
            return mapping;
        });
    }
}

export default ObjectIdMapper;
