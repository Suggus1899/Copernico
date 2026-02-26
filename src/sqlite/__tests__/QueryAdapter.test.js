/**
 * Unit tests for QueryAdapter.
 */

import knex from 'knex';
import QueryAdapter from '../QueryAdapter.js';

describe('QueryAdapter', () => {
    let db;
    let adapter;

    beforeEach(async () => {
        db = knex({
            client: 'better-sqlite3',
            connection: { filename: ':memory:' },
            useNullAsDefault: true
        });
        adapter = new QueryAdapter(db);

        await db.schema.createTable('users', (table) => {
            table.integer('id').primary();
            table.text('email');
            table.integer('age');
        });

        await db('users').insert([
            { id: 1, email: 'a@example.com', age: 20 },
            { id: 2, email: 'b@example.com', age: 30 },
            { id: 3, email: 'c@example.com', age: 40 }
        ]);
    });

    afterEach(async () => {
        await db.destroy();
    });

    it('should filter and sort results', async () => {
        const results = await adapter.find('users', { age: { $gte: 30 } }, { sort: { age: -1 } });
        expect(results.length).toBe(2);
        expect(results[0].age).toBe(40);
    });

    it('should create and update records', async () => {
        const created = await adapter.create('users', { email: 'd@example.com', age: 22 });
        expect(created.email).toBe('d@example.com');

        const update = await adapter.update('users', { email: 'd@example.com' }, { age: 25 });
        expect(update.affectedRows).toBe(1);

        const updated = await adapter.findOne('users', { email: 'd@example.com' });
        expect(updated.age).toBe(25);
    });

    it('should delete records', async () => {
        const result = await adapter.delete('users', { id: 1 });
        expect(result.deletedCount).toBe(1);

        const remaining = await adapter.find('users');
        expect(remaining.length).toBe(2);
    });
});
