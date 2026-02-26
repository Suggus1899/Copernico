/**
 * Property-based tests for MigrationValidator.
 */

import knex from 'knex';
import MigrationValidator from '../MigrationValidator.js';

describe('MigrationValidator property tests', () => {
    let db;
    let validator;

    beforeEach(async () => {
        db = knex({
            client: 'better-sqlite3',
            connection: { filename: ':memory:' },
            useNullAsDefault: true
        });

        await db.schema.createTable('items', (table) => {
            table.integer('id').primary();
            table.text('name');
        });

        await db('items').insert([
            { id: 1, name: 'a' },
            { id: 2, name: 'b' }
        ]);

        validator = new MigrationValidator(db);
    });

    afterEach(async () => {
        await db.destroy();
    });

    it('should pass when counts match', async () => {
        const fakeModel = { countDocuments: () => 2 };
        const result = await validator.validateRecordCounts([
            { model: fakeModel, table: 'items' }
        ]);

        expect(result.passed).toBe(true);
        expect(result.checks[0].expected).toBe(2);
    });

    it('should fail when counts differ', async () => {
        const fakeModel = { countDocuments: () => 3 };
        const result = await validator.validateRecordCounts([
            { model: fakeModel, table: 'items' }
        ]);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
    });
});
