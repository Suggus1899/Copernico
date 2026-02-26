/**
 * BaseModel - Mongoose-compatible wrapper around QueryAdapter for a single table.
 * Supports lifecycle hooks and field mapping.
 */

import QueryAdapter, { toTableName } from './QueryAdapter.js';
import { unflattenRow, flattenObject, flattenUpdateData, convertFilter, camelToSnake } from './fieldMapper.js';

class BaseModel {
    constructor(modelName, adapter = new QueryAdapter()) {
        this.modelName = modelName;
        this.tableName = toTableName(modelName);
        this.adapter = adapter;
        // Fields to exclude from responses by default (similar to Mongoose select: false)
        this.defaultExclude = [];
        // Join definitions for populate simulation
        this.joinDefinitions = {};
    }

    // ──────────────────────────── HOOKS ────────────────────────────
    // Override in subclasses to add pre/post processing

    /** Called before create. Return modified data. */
    async beforeCreate(data) { return data; }
    /** Called after create with the inserted row. */
    async afterCreate(row) { return row; }
    /** Called before update. Return modified data. */
    async beforeUpdate(data) { return data; }

    // ──────────────────────────── RESPONSE MAPPING ────────────────────────────

    /**
     * Convert a flat SQLite row to a nested response object.
     * Override in subclasses for model-specific mapping.
     */
    toResponse(row) {
        if (!row) return null;
        return unflattenRow(row);
    }

    /**
     * Convert multiple rows.
     */
    toResponseArray(rows) {
        if (!rows) return [];
        return rows.map(row => this.toResponse(row));
    }

    /**
     * Convert incoming nested data (from request body) to flat SQLite columns.
     */
    toDbData(data) {
        if (!data) return {};
        return flattenObject(data);
    }

    /**
     * Convert a Mongoose-style filter to SQLite-compatible filter.
     */
    toDbFilter(filter) {
        if (!filter) return {};
        return convertFilter(filter);
    }

    // ──────────────────────────── READ ────────────────────────────

    async find(filter = {}, options = {}) {
        const dbFilter = this.toDbFilter(filter);
        const rows = await this.adapter.find(this.tableName, dbFilter, options);
        return this.toResponseArray(rows);
    }

    async findRaw(filter = {}, options = {}) {
        const dbFilter = this.toDbFilter(filter);
        return this.adapter.find(this.tableName, dbFilter, options);
    }

    async findOne(filter = {}, options = {}) {
        const dbFilter = this.toDbFilter(filter);
        const row = await this.adapter.findOne(this.tableName, dbFilter, options);
        return this.toResponse(row);
    }

    async findOneRaw(filter = {}, options = {}) {
        const dbFilter = this.toDbFilter(filter);
        return this.adapter.findOne(this.tableName, dbFilter, options);
    }

    async findById(id, options = {}) {
        const row = await this.adapter.findById(this.tableName, id, options);
        return this.toResponse(row);
    }

    async findByIdRaw(id, options = {}) {
        return this.adapter.findById(this.tableName, id, options);
    }

    async countDocuments(filter = {}) {
        const dbFilter = this.toDbFilter(filter);
        return this.adapter.countDocuments(this.tableName, dbFilter);
    }

    // ──────────────────────────── WRITE ────────────────────────────

    async create(data) {
        let dbData = this.toDbData(data);
        dbData = await this.beforeCreate(dbData);
        const row = await this.adapter.create(this.tableName, dbData);
        const result = await this.afterCreate(row);
        return this.toResponse(result || row);
    }

    async update(filter, data) {
        const dbFilter = this.toDbFilter(filter);
        let dbData = flattenUpdateData(data);
        dbData = await this.beforeUpdate(dbData);
        return this.adapter.update(this.tableName, dbFilter, dbData);
    }

    async findByIdAndUpdate(id, data, options = {}) {
        let dbData = flattenUpdateData(data);
        dbData = await this.beforeUpdate(dbData);
        const row = await this.adapter.findByIdAndUpdate(this.tableName, id, dbData, options);
        return this.toResponse(row);
    }

    async findByIdAndDelete(id) {
        const row = await this.adapter.findByIdAndDelete(this.tableName, id);
        return this.toResponse(row);
    }

    async updateMany(filter, data) {
        const dbFilter = this.toDbFilter(filter);
        let dbData = flattenUpdateData(data);
        dbData = await this.beforeUpdate(dbData);
        return this.adapter.updateMany(this.tableName, dbFilter, dbData);
    }

    // ──────────────────────────── DELETE ────────────────────────────

    async delete(filter) {
        const dbFilter = this.toDbFilter(filter);
        return this.adapter.delete(this.tableName, dbFilter);
    }

    // ──────────────────────────── JOINS (populate) ────────────────────────────

    /**
     * Find with JOINs (populate simulation).
     *
     * @param {Array<Object>} joins - Join configs
     * @param {Object} filter - Filter for the main table
     * @param {Object} options - Sort, limit, skip
     * @returns {Array} Results with joined nested data
     */
    async withJoin(joins, filter = {}, options = {}) {
        const dbFilter = this.toDbFilter(filter);
        const rows = await this.adapter.withJoin(this.tableName, joins, dbFilter, options);
        return rows.map(row => {
            const mainResult = {};
            const joinResults = {};

            for (const [key, value] of Object.entries(row)) {
                // Check if this is a join result
                const isJoin = joins.some(j => key === (j.as || j.table));
                if (isJoin && typeof value === 'object' && value !== null) {
                    joinResults[key] = unflattenRow(value);
                } else if (isJoin) {
                    joinResults[key] = value;
                } else {
                    mainResult[key] = value;
                }
            }

            const response = unflattenRow(mainResult);
            Object.assign(response, joinResults);
            return response;
        });
    }

    // ──────────────────────────── TRANSACTION ────────────────────────────

    async transaction(fn) {
        return this.adapter.transaction(fn);
    }

    // ──────────────────────────── RAW ────────────────────────────

    raw(sql, bindings) {
        return this.adapter.raw(sql, bindings);
    }
}

export default BaseModel;
