/**
 * Property-based tests for SchemaConverter.
 */

import SchemaConverter from '../SchemaConverter.js';

describe('SchemaConverter property tests', () => {
    const buildRng = (seed) => {
        let value = seed >>> 0;
        return () => {
            value = (value * 1664525 + 1013904223) >>> 0;
            return value / 4294967296;
        };
    };

    const pick = (rng, items) => items[Math.floor(rng() * items.length)];

    it('should convert ObjectID fields to INTEGER with foreign keys', () => {
        const converter = new SchemaConverter();
        const iterations = 40;
        const rng = buildRng(1337);

        for (let i = 0; i < iterations; i += 1) {
            const fieldName = `owner${i}`;
            const target = pick(rng, ['User', 'Course', 'Report']);
            const definition = {
                modelName: `Entity${i}`,
                fields: [
                    { name: fieldName, type: 'ObjectID', required: false, ref: target, isArray: false }
                ],
                indexes: [],
                constraints: []
            };

            const result = converter.convertSchema(definition);
            const column = result.primaryTable.columns.find(col => col.name === fieldName);
            expect(column).toBeDefined();
            expect(column.type).toBe('INTEGER');

            const fk = result.primaryTable.foreignKeys.find(key => key.column === fieldName);
            expect(fk).toBeDefined();
            expect(fk.referencesTable).toBe(`${target.toLowerCase()}s`);
        }
    });

    it('should flatten nested objects into prefixed columns', () => {
        const converter = new SchemaConverter();
        const iterations = 30;
        const rng = buildRng(9001);

        for (let i = 0; i < iterations; i += 1) {
            const base = pick(rng, ['profile', 'metadata', 'settings']);
            const definition = {
                modelName: `NestedEntity${i}`,
                fields: [
                    {
                        name: base,
                        type: 'Embedded',
                        isArray: false,
                        nested: [
                            { name: 'firstName', type: 'String', required: false, isArray: false },
                            { name: 'lastName', type: 'String', required: false, isArray: false },
                            {
                                name: 'flags',
                                type: 'Embedded',
                                isArray: false,
                                nested: [
                                    { name: 'email', type: 'Boolean', required: false, isArray: false }
                                ]
                            }
                        ]
                    }
                ],
                indexes: [],
                constraints: []
            };

            const result = converter.convertSchema(definition);
            const columns = result.primaryTable.columns.map(col => col.name);

            expect(columns).toContain(`${base}_first_name`);
            expect(columns).toContain(`${base}_last_name`);
            expect(columns).toContain(`${base}_flags_email`);
        }
    });

    it('should create junction tables for primitive arrays', () => {
        const converter = new SchemaConverter();
        const iterations = 30;
        const rng = buildRng(4242);

        for (let i = 0; i < iterations; i += 1) {
            const field = pick(rng, ['tags', 'labels', 'codes']);
            const definition = {
                modelName: `Item${i}`,
                fields: [
                    { name: field, type: 'String', isArray: true, arrayElementType: 'String' }
                ],
                indexes: [],
                constraints: []
            };

            const result = converter.convertSchema(definition);
            const parentTable = result.primaryTable.name;
            const junction = result.relatedTables.find(table => table.name === `${parentTable}_${field}`);
            expect(junction).toBeDefined();
            expect(junction.columns.find(col => col.name === `${parentTable}_id`)).toBeDefined();
            expect(junction.columns.find(col => col.name === `${field}_value`)).toBeDefined();

            const constraint = junction.constraints.find(item => item.type === 'primary');
            expect(constraint).toBeDefined();
        }
    });

    it('should create tables for arrays of embedded documents', () => {
        const converter = new SchemaConverter();
        const iterations = 30;
        const rng = buildRng(7777);

        for (let i = 0; i < iterations; i += 1) {
            const field = pick(rng, ['comments', 'entries', 'events']);
            const definition = {
                modelName: `Post${i}`,
                fields: [
                    {
                        name: field,
                        type: 'Embedded',
                        isArray: true,
                        arrayElementType: 'Embedded',
                        nested: [
                            { name: 'text', type: 'String', required: false, isArray: false },
                            { name: 'createdAt', type: 'Date', required: false, isArray: false }
                        ]
                    }
                ],
                indexes: [],
                constraints: []
            };

            const result = converter.convertSchema(definition);
            const parentTable = result.primaryTable.name;
            const table = result.relatedTables.find(item => item.name === `${parentTable}_${field}`);
            expect(table).toBeDefined();
            expect(table.columns.find(col => col.name === `${parentTable}_id`)).toBeDefined();
            expect(table.columns.find(col => col.name === `${field}_text`)).toBeDefined();
            expect(table.columns.find(col => col.name === `${field}_created_at`)).toBeDefined();
        }
    });
});
