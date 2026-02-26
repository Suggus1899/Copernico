/**
 * Property-based tests for DataMigrator.
 */

import knex from 'knex';
import DataMigrator from '../DataMigrator.js';
import ObjectIdMapper from '../ObjectIdMapper.js';

describe('DataMigrator property tests', () => {
    const buildRng = (seed) => {
        let value = seed >>> 0;
        return () => {
            value = (value * 1664525 + 1013904223) >>> 0;
            return value / 4294967296;
        };
    };

    const pick = (rng, items) => items[Math.floor(rng() * items.length)];

    let db;
    let mapper;
    let migrator;

    beforeEach(async () => {
        db = knex({
            client: 'better-sqlite3',
            connection: { filename: ':memory:' },
            useNullAsDefault: true
        });

        await db.schema.createTable('posts', (table) => {
            table.integer('id').primary();
            table.text('title');
            table.text('created_at');
        });

        await db.schema.createTable('posts_tags', (table) => {
            table.integer('posts_id');
            table.text('tags_value');
        });

        mapper = new ObjectIdMapper(db);
        migrator = new DataMigrator(db, { mapper });
    });

    afterEach(async () => {
        await db.destroy();
    });

    it('should preserve record counts and array elements', async () => {
        const rng = buildRng(2026);
        const docs = [];

        for (let i = 0; i < 10; i += 1) {
            const tagCount = Math.floor(rng() * 4);
            docs.push({
                _id: `p${i}`,
                title: `Post ${i}`,
                createdAt: new Date(2026, 1, i + 1),
                tags: Array.from({ length: tagCount }, () => pick(rng, ['a', 'b', 'c']))
            });
        }

        const mapping = {
            sourceCollection: 'posts',
            primaryTable: 'posts',
            fields: [
                { source: 'title', target: 'title' },
                { source: 'createdAt', target: 'created_at' }
            ],
            arrays: [
                { source: 'tags', table: 'posts_tags', parentKey: 'posts_id', valueColumn: 'tags_value' }
            ]
        };

        const report = await migrator.migrateDocuments(docs, mapping);
        const posts = await db('posts').select();
        const tags = await db('posts_tags').select();
        const expectedTags = docs.reduce((sum, doc) => sum + doc.tags.length, 0);

        expect(report.documentsProcessed).toBe(10);
        expect(posts.length).toBe(10);
        expect(tags.length).toBe(expectedTags);
    });

    it('should map ObjectIds consistently', async () => {
        const mapping = {
            sourceCollection: 'posts',
            primaryTable: 'posts',
            fields: [{ source: 'title', target: 'title' }]
        };

        const docs = [
            { _id: 'x1', title: 'One' },
            { _id: 'x1', title: 'Duplicate' }
        ];

        await migrator.migrateDocuments(docs, mapping);
        const rows = await db('posts').select();
        expect(rows.length).toBe(1);
        expect(rows[0].id).toBe(1);
    });
});
