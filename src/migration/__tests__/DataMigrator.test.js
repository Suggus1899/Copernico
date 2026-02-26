/**
 * Unit tests for DataMigrator.
 */

import knex from 'knex';
import DataMigrator from '../DataMigrator.js';
import ObjectIdMapper from '../ObjectIdMapper.js';

describe('DataMigrator', () => {
    let db;
    let mapper;
    let migrator;

    beforeEach(async () => {
        db = knex({
            client: 'better-sqlite3',
            connection: { filename: ':memory:' },
            useNullAsDefault: true
        });

        await db.schema.createTable('users', (table) => {
            table.integer('id').primary();
            table.text('email');
        });

        await db.schema.createTable('users_tags', (table) => {
            table.integer('users_id');
            table.text('tags_value');
        });

        mapper = new ObjectIdMapper(db);
        migrator = new DataMigrator(db, { mapper });
    });

    afterEach(async () => {
        await db.destroy();
    });

    it('should migrate documents with arrays', async () => {
        const mapping = {
            sourceCollection: 'users',
            primaryTable: 'users',
            fields: [
                { source: 'email', target: 'email' }
            ],
            arrays: [
                { source: 'tags', table: 'users_tags', parentKey: 'users_id', valueColumn: 'tags_value' }
            ]
        };

        const docs = [
            { _id: 'u1', email: 'one@example.com', tags: ['a', 'b'] },
            { _id: 'u2', email: 'two@example.com', tags: ['c'] }
        ];

        const report = await migrator.migrateDocuments(docs, mapping);
        const users = await db('users').select();
        const tags = await db('users_tags').select();

        expect(report.documentsProcessed).toBe(2);
        expect(report.recordsCreated).toBe(5);
        expect(users.length).toBe(2);
        expect(tags.length).toBe(3);
    });
});
