/**
 * Unit tests for ObjectIdMapper.
 */

import knex from 'knex';
import ObjectIdMapper from '../ObjectIdMapper.js';

describe('ObjectIdMapper', () => {
    let db;
    let mapper;

    beforeEach(() => {
        db = knex({
            client: 'better-sqlite3',
            connection: { filename: ':memory:' },
            useNullAsDefault: true
        });
        mapper = new ObjectIdMapper(db);
    });

    afterEach(async () => {
        await db.destroy();
    });

    it('should create mappings and return consistent ids', async () => {
        const id1 = await mapper.getOrCreateId('users', 'abc123');
        const id2 = await mapper.getOrCreateId('users', 'abc123');
        const id3 = await mapper.getOrCreateId('users', 'def456');

        expect(id1).toBe(1);
        expect(id2).toBe(1);
        expect(id3).toBe(2);

        const fetched = await mapper.getId('users', 'abc123');
        expect(fetched).toBe(1);

        const objectId = await mapper.getObjectId('users', 2);
        expect(objectId).toBe('def456');
    });

    it('should map object ids in batch', async () => {
        const mapping = await mapper.mapObjectIds('courses', ['a', 'b', 'c', 'a']);

        expect(mapping.get('a')).toBe(1);
        expect(mapping.get('b')).toBe(2);
        expect(mapping.get('c')).toBe(3);

        const second = await mapper.mapObjectIds('courses', ['b', 'd']);
        expect(second.get('b')).toBe(2);
        expect(second.get('d')).toBe(4);
    });
});
