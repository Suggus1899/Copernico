/**
 * QueryAdapter - Mongoose-compatible CRUD adapter for SQLite using Knex.
 */

import db from '../db/connection.js';

export const toSnakeCase = (value) => String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/\s+/g, '_')
    .toLowerCase();

export const toTableName = (modelName) => {
    const snake = toSnakeCase(modelName);
    return snake.endsWith('s') ? snake : `${snake}s`;
};

class QueryAdapter {
    constructor(dbInstance = db) {
        this.db = dbInstance;
    }

    // ──────────────────────────── READ ────────────────────────────

    async find(table, filter = {}, options = {}) {
        const query = this.db(table);
        this.applySelect(query, options.select);
        this.applyNegativeSelect(query, table, options.exclude);
        this.applyFilter(query, filter);
        this.applySort(query, options.sort);
        this.applyPagination(query, options);
        return query;
    }

    async findOne(table, filter = {}, options = {}) {
        const query = this.db(table);
        this.applySelect(query, options.select);
        this.applyNegativeSelect(query, table, options.exclude);
        this.applyFilter(query, filter);
        this.applySort(query, options.sort);
        const result = await query.first();
        return result || null;
    }

    async findById(table, id, options = {}) {
        return this.findOne(table, { id }, options);
    }

    async countDocuments(table, filter = {}) {
        const query = this.db(table);
        this.applyFilter(query, filter);
        const [{ count }] = await query.count('* as count');
        return count;
    }

    // ──────────────────────────── WRITE ────────────────────────────

    async create(table, data) {
        const now = new Date().toISOString();
        const insertData = { ...data };
        if (!insertData.created_at) insertData.created_at = now;
        if (!insertData.updated_at) insertData.updated_at = now;

        const [id] = await this.db(table).insert(insertData);
        if (id) {
            return this.db(table).where({ id }).first();
        }
        return insertData;
    }

    async update(table, filter, data) {
        const updateData = { ...data };
        if (!updateData.updated_at) updateData.updated_at = new Date().toISOString();

        const query = this.db(table);
        this.applyFilter(query, filter);
        const affectedRows = await query.update(updateData);
        return { affectedRows };
    }

    async findByIdAndUpdate(table, id, data, options = {}) {
        const updateData = { ...data };
        if (!updateData.updated_at) updateData.updated_at = new Date().toISOString();

        // Remove Mongoose special operators before update
        const cleanData = {};
        for (const [key, value] of Object.entries(updateData)) {
            if (!key.startsWith('$')) {
                cleanData[key] = value;
            }
        }

        await this.db(table).where({ id }).update(cleanData);

        if (options.new !== false) {
            const updated = await this.findById(table, id, {
                exclude: options.exclude
            });
            return updated;
        }
        return { id };
    }

    async findByIdAndDelete(table, id) {
        const existing = await this.findById(table, id);
        if (!existing) return null;
        await this.db(table).where({ id }).del();
        return existing;
    }

    async updateMany(table, filter, data) {
        const updateData = { ...data };
        if (!updateData.updated_at) updateData.updated_at = new Date().toISOString();

        // Remove Mongoose special operators
        const cleanData = {};
        for (const [key, value] of Object.entries(updateData)) {
            if (!key.startsWith('$')) {
                cleanData[key] = value;
            }
        }

        const query = this.db(table);
        this.applyFilter(query, filter);
        const modifiedCount = await query.update(cleanData);
        return { modifiedCount };
    }

    // ──────────────────────────── DELETE ────────────────────────────

    async delete(table, filter) {
        const query = this.db(table);
        this.applyFilter(query, filter);
        const deletedCount = await query.del();
        return { deletedCount };
    }

    // ──────────────────────────── JOINS (populate) ────────────────────────────

    /**
     * Simulate Mongoose-style populate via LEFT JOINs.
     *
     * @param {string} table - Main table
     * @param {Array<Object>} joins - Array of join configs:
     *   { table: 'users', localField: 'student_id', foreignField: 'id', as: 'student', select: ['personal_info_first_name', 'email'] }
     * @param {Object} filter - Filter for the main table
     * @param {Object} options - sort, limit, skip, select, exclude
     * @returns {Array} Results with joined data nested under `as` key
     */
    async withJoin(table, joins, filter = {}, options = {}) {
        const query = this.db(table);

        // Build column aliases to avoid name collisions
        const mainAlias = table;

        // Select main table columns
        if (options.select) {
            options.select.forEach(col => query.select(`${mainAlias}.${col} as ${col}`));
        } else {
            query.select(`${mainAlias}.*`);
        }

        // Add joins
        joins.forEach((join, idx) => {
            const joinAlias = join.as || `j${idx}`;
            const joinTable = `${join.table} as ${joinAlias}`;

            query.leftJoin(joinTable, `${mainAlias}.${join.localField}`, `${joinAlias}.${join.foreignField || 'id'}`);

            // Select specified columns from joined table with prefix
            if (join.select && Array.isArray(join.select)) {
                join.select.forEach(col => {
                    query.select(`${joinAlias}.${col} as ${joinAlias}__${col}`);
                });
            }
        });

        this.applyFilter(query, filter, mainAlias);
        this.applySort(query, options.sort, mainAlias);
        this.applyPagination(query, options);

        const rows = await query;

        // Post-process: nest joined columns under their `as` key
        return rows.map(row => {
            const result = {};
            const nested = {};

            for (const [key, value] of Object.entries(row)) {
                const sepIdx = key.indexOf('__');
                if (sepIdx > -1) {
                    const joinName = key.substring(0, sepIdx);
                    const colName = key.substring(sepIdx + 2);
                    if (!nested[joinName]) nested[joinName] = {};
                    nested[joinName][colName] = value;
                } else {
                    result[key] = value;
                }
            }

            // Merge nested joins
            for (const [joinName, joinData] of Object.entries(nested)) {
                // If all values are null, the join found no match
                const allNull = Object.values(joinData).every(v => v === null || v === undefined);
                result[joinName] = allNull ? null : joinData;
            }

            return result;
        });
    }

    // ──────────────────────────── SELECT HELPERS ────────────────────────────

    applySelect(query, select) {
        if (Array.isArray(select) && select.length > 0) {
            query.select(select);
        }
    }

    /**
     * Negative select: exclude specified columns.
     * In SQL we need to know the table schema, so we accept column names to exclude.
     */
    applyNegativeSelect(query, table, exclude) {
        // This is handled by NOT selecting excluded columns; since we cannot
        // dynamically introspect, the model layer should resolve column lists.
        // If exclude is provided as array, we do raw column exclusion at JS level
        // in the model wrapper. This is a no-op here.
    }

    // ──────────────────────────── SORT ────────────────────────────

    applySort(query, sort, tableAlias) {
        if (!sort) {
            return;
        }
        if (typeof sort === 'string') {
            // Mongoose-style string: '-createdAt title'
            sort.split(/\s+/).forEach(field => {
                if (field.startsWith('-')) {
                    const col = toSnakeCase(field.substring(1));
                    query.orderBy(tableAlias ? `${tableAlias}.${col}` : col, 'desc');
                } else {
                    const col = toSnakeCase(field);
                    query.orderBy(tableAlias ? `${tableAlias}.${col}` : col, 'asc');
                }
            });
        } else {
            Object.entries(sort).forEach(([field, order]) => {
                const col = toSnakeCase(field);
                query.orderBy(tableAlias ? `${tableAlias}.${col}` : col, order === -1 ? 'desc' : 'asc');
            });
        }
    }

    // ──────────────────────────── PAGINATION ────────────────────────────

    applyPagination(query, options) {
        if (options.limit != null) {
            query.limit(options.limit);
        }
        if (options.skip != null) {
            query.offset(options.skip);
        }
    }

    // ──────────────────────────── FILTER ────────────────────────────

    applyFilter(query, filter, tableAlias) {
        if (!filter || Object.keys(filter).length === 0) {
            return;
        }

        Object.entries(filter).forEach(([key, value]) => {
            const col = tableAlias ? `${tableAlias}.${key}` : key;

            if (key === '$or' && Array.isArray(value)) {
                query.andWhere((builder) => {
                    value.forEach((condition) => {
                        builder.orWhere((nested) => {
                            this.applyFilter(nested, condition, tableAlias);
                        });
                    });
                });
                return;
            }

            if (key === '$and' && Array.isArray(value)) {
                query.andWhere((builder) => {
                    value.forEach((condition) => {
                        builder.andWhere((nested) => {
                            this.applyFilter(nested, condition, tableAlias);
                        });
                    });
                });
                return;
            }

            // RegExp → LIKE
            if (value instanceof RegExp) {
                const pattern = `%${value.source}%`;
                if (value.flags.includes('i')) {
                    query.whereRaw(`LOWER(${col}) LIKE LOWER(?)`, [pattern]);
                } else {
                    query.where(col, 'like', pattern);
                }
                return;
            }

            if (value && typeof value === 'object' && !Array.isArray(value)) {
                this.applyOperatorFilter(query, col, value);
                return;
            }

            query.andWhere(col, value);
        });
    }

    applyOperatorFilter(query, field, operatorMap) {
        const handlers = {
            $in: (values) => query.whereIn(field, values),
            $nin: (values) => query.whereNotIn(field, values),
            $ne: (val) => query.whereNot(field, val),
            $gt: (val) => query.where(field, '>', val),
            $gte: (val) => query.where(field, '>=', val),
            $lt: (val) => query.where(field, '<', val),
            $lte: (val) => query.where(field, '<=', val),
            $like: (val) => query.where(field, 'like', val),
            $regex: (val) => {
                const pattern = val instanceof RegExp ? val.source : val;
                query.whereRaw(`${field} LIKE ?`, [`%${pattern}%`]);
            },
            $exists: (val) => {
                if (val) {
                    query.whereNotNull(field);
                } else {
                    query.whereNull(field);
                }
            },
            $text: (val) => {
                // Simple text search via LIKE
                const search = val.$search || val;
                query.where(field, 'like', `%${search}%`);
            }
        };

        Object.entries(operatorMap).forEach(([op, val]) => {
            const handler = handlers[op];
            if (handler) {
                handler(val);
            }
        });
    }

    // ──────────────────────────── RAW ────────────────────────────

    raw(sql, bindings) {
        return this.db.raw(sql, bindings);
    }

    /**
     * Execute a function within a transaction.
     */
    async transaction(fn) {
        return this.db.transaction(fn);
    }
}

export default QueryAdapter;
