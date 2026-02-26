/**
 * Unit tests for MigrationValidator.
 */

import knex from 'knex';
import MigrationValidator from '../MigrationValidator.js';

describe('MigrationValidator', () => {
    let db;
    let validator;

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

        await db('users').insert([
            { id: 1, email: 'a@example.com' },
            { id: 2, email: 'b@example.com' }
        ]);

        validator = new MigrationValidator(db);
    });

    afterEach(async () => {
        await db.destroy();
    });

    it('should validate record counts', async () => {
        const fakeModel = { countDocuments: () => 2 };
        const result = await validator.validateRecordCounts([
            { model: fakeModel, table: 'users' }
        ]);

        expect(result.passed).toBe(true);
        expect(result.checks[0].actual).toBe(2);
    });

    it('should generate report summary', async () => {
        const summary = await validator.generateReport([
            { checks: [{ passed: true }, { passed: false }] }
        ]);

        expect(summary.overallStatus).toBe('FAIL');
        expect(summary.summary.totalChecks).toBe(2);
        expect(summary.summary.failed).toBe(1);
    });
});
