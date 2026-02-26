/**
 * DataMigrator - migrates MongoDB documents into SQLite tables.
 */

import ObjectIdMapper from './ObjectIdMapper.js';

class DataMigrator {
    constructor(db, options = {}) {
        if (!db) {
            throw new Error('Database instance is required');
        }

        this.db = db;
        this.mapper = options.mapper || new ObjectIdMapper(db);
        this.batchSize = options.batchSize || 500;
        this.logger = options.logger || console;
    }

    async migrateCollection(model, mapping, options = {}) {
        if (!model || !mapping) {
            throw new Error('Model and mapping are required');
        }

        const batchSize = options.batchSize || this.batchSize;
        const report = this.createReport(mapping.sourceCollection || model.modelName);
        const totalDocuments = await this.countDocuments(model);

        for (let offset = 0; offset < totalDocuments; offset += batchSize) {
            const documents = await this.readDocuments(model, offset, batchSize);

            for (const doc of documents) {
                try {
                    const { primary, related } = await this.transformDocument(doc, mapping);
                    const inserted = await this.insertRecords(mapping, primary, related);
                    report.documentsProcessed += 1;
                    report.recordsCreated += inserted;
                } catch (error) {
                    report.errors.push({
                        documentId: String(doc._id || ''),
                        field: error.field,
                        error: error.message || String(error),
                        document: doc
                    });
                }
            }
        }

        report.durationMs = Date.now() - report.startedAt;
        return report;
    }

    async migrateDocuments(documents, mapping) {
        const report = this.createReport(mapping.sourceCollection || 'documents');

        for (const doc of documents) {
            const { primary, related } = await this.transformDocument(doc, mapping);
            const inserted = await this.insertRecords(mapping, primary, related);
            report.documentsProcessed += 1;
            report.recordsCreated += inserted;
        }

        report.durationMs = Date.now() - report.startedAt;
        return report;
    }

    async transformDocument(doc, mapping) {
        const primary = {};
        const related = {};
        const collectionName = mapping.sourceCollection || mapping.primaryTable;

        if (doc?._id && mapping.primaryKey !== false) {
            primary.id = await this.mapper.getOrCreateId(collectionName, doc._id);
        }

        this.applyFieldMappings(primary, doc, mapping.fields || []);
        this.applyFieldMappings(primary, doc, mapping.embedded || []);

        for (const ref of mapping.references || []) {
            const rawValue = this.getValue(doc, ref.source);
            if (!rawValue) {
                continue;
            }
            const mappedId = await this.mapper.getOrCreateId(ref.refCollection || ref.targetTable, rawValue);
            primary[ref.target] = mappedId;
        }

        for (const arrayMap of mapping.arrays || []) {
            const values = this.getValue(doc, arrayMap.source) || [];
            related[arrayMap.table] = values
                .filter((value) => value !== undefined && value !== null)
                .map((value) => ({
                    [arrayMap.parentKey]: primary.id,
                    [arrayMap.valueColumn]: this.normalizeValue(value)
                }));
        }

        for (const arrayRef of mapping.arrayReferences || []) {
            const values = this.getValue(doc, arrayRef.source) || [];
            const records = [];

            for (const value of values) {
                if (!value) {
                    continue;
                }
                const mappedId = await this.mapper.getOrCreateId(arrayRef.refCollection || arrayRef.valueColumn, value);
                records.push({
                    [arrayRef.parentKey]: primary.id,
                    [arrayRef.valueColumn]: mappedId
                });
            }

            related[arrayRef.table] = records;
        }

        for (const embeddedArray of mapping.embeddedArrays || []) {
            const values = this.getValue(doc, embeddedArray.source) || [];
            const records = [];

            for (const value of values) {
                if (!value) {
                    continue;
                }
                const record = {
                    [embeddedArray.parentKey]: primary.id
                };
                this.applyFieldMappings(record, value, embeddedArray.fields || [], embeddedArray.prefix || embeddedArray.source);
                records.push(record);
            }

            related[embeddedArray.table] = records;
        }

        return { primary, related };
    }

    async insertRecords(mapping, primary, related) {
        let inserted = 0;

        await this.db.transaction(async (trx) => {
            if (primary && Object.keys(primary).length > 0) {
                if (primary.id) {
                    const exists = await trx(mapping.primaryTable)
                        .where({ id: primary.id })
                        .first();

                    if (exists) {
                        await trx(mapping.primaryTable)
                            .where({ id: primary.id })
                            .update(primary);
                    } else {
                        await trx(mapping.primaryTable).insert(primary);
                        inserted += 1;
                    }
                } else {
                    await trx(mapping.primaryTable).insert(primary);
                    inserted += 1;
                }
            }

            for (const [table, records] of Object.entries(related || {})) {
                if (!records || records.length === 0) {
                    continue;
                }
                await trx(table).insert(records);
                inserted += records.length;
            }
        });

        return inserted;
    }

    createReport(collection) {
        return {
            collection,
            documentsProcessed: 0,
            recordsCreated: 0,
            errors: [],
            startedAt: Date.now(),
            durationMs: 0
        };
    }

    async countDocuments(model) {
        if (typeof model.countDocuments === 'function') {
            return model.countDocuments();
        }
        if (Array.isArray(model)) {
            return model.length;
        }
        return 0;
    }

    async readDocuments(model, offset, limit) {
        if (typeof model.find === 'function') {
            const query = model.find();
            if (typeof query.skip === 'function') {
                query.skip(offset);
            }
            if (typeof query.limit === 'function') {
                query.limit(limit);
            }
            if (typeof query.lean === 'function') {
                return query.lean();
            }
            return query;
        }

        if (Array.isArray(model)) {
            return model.slice(offset, offset + limit);
        }

        return [];
    }

    applyFieldMappings(target, source, mappings) {
        for (const mapping of mappings) {
            const value = this.getValue(source, mapping.source);
            if (value === undefined) {
                continue;
            }
            const normalized = this.normalizeValue(
                typeof mapping.transform === 'function' ? mapping.transform(value) : value
            );
            target[mapping.target] = normalized;
        }
    }

    getValue(source, path) {
        if (!source || !path) {
            return undefined;
        }
        const parts = path.split('.');
        let current = source;
        for (const part of parts) {
            if (current == null) {
                return undefined;
            }
            current = current[part];
        }
        return current;
    }

    normalizeValue(value) {
        if (value instanceof Date) {
            return value.toISOString();
        }
        return value;
    }
}

export default DataMigrator;
