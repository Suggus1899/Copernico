/**
 * Unit tests for SchemaConverter.
 */

import SchemaConverter from '../SchemaConverter.js';

describe('SchemaConverter', () => {
    let converter;

    beforeEach(() => {
        converter = new SchemaConverter();
    });

    it('should convert basic fields and embedded objects', () => {
        const definition = {
            modelName: 'User',
            fields: [
                { name: 'username', type: 'String', required: true, unique: true, isArray: false },
                { name: 'age', type: 'Number', required: false, isArray: false },
                { name: 'isActive', type: 'Boolean', required: false, default: true, isArray: false },
                { name: 'createdAt', type: 'Date', required: true, default: Date.now, isArray: false },
                { name: 'role', type: 'String', required: true, enum: ['student', 'admin'], isArray: false },
                { name: 'advisor', type: 'ObjectID', required: false, ref: 'User', isArray: false },
                {
                    name: 'profile',
                    type: 'Embedded',
                    isArray: false,
                    nested: [
                        { name: 'firstName', type: 'String', required: false, isArray: false },
                        { name: 'lastName', type: 'String', required: false, isArray: false }
                    ]
                }
            ],
            indexes: [
                { fields: [{ field: 'username', order: 1 }], unique: true }
            ],
            constraints: []
        };

        const result = converter.convertSchema(definition);
        const primary = result.primaryTable;

        expect(primary.name).toBe('users');
        expect(primary.columns.find(col => col.name === 'id')).toBeDefined();

        const username = primary.columns.find(col => col.name === 'username');
        expect(username.type).toBe('TEXT');
        expect(username.nullable).toBe(false);
        expect(username.unique).toBe(true);

        const age = primary.columns.find(col => col.name === 'age');
        expect(age.type).toBe('REAL');

        const isActive = primary.columns.find(col => col.name === 'is_active');
        expect(isActive.type).toBe('INTEGER');

        const createdAt = primary.columns.find(col => col.name === 'created_at');
        expect(createdAt.default).toBe('CURRENT_TIMESTAMP');

        const profileFirst = primary.columns.find(col => col.name === 'profile_first_name');
        const profileLast = primary.columns.find(col => col.name === 'profile_last_name');
        expect(profileFirst).toBeDefined();
        expect(profileLast).toBeDefined();

        const advisor = primary.columns.find(col => col.name === 'advisor');
        expect(advisor.type).toBe('INTEGER');

        const foreignKey = primary.foreignKeys.find(fk => fk.column === 'advisor');
        expect(foreignKey).toBeDefined();
        expect(foreignKey.referencesTable).toBe('users');

        const index = primary.indexes.find(idx => idx.fields.some(f => f.field === 'username'));
        expect(index).toBeDefined();
        expect(index.unique).toBe(true);
    });

    it('should create tables for arrays of primitives, references, and embedded docs', () => {
        const definition = {
            modelName: 'User',
            fields: [
                { name: 'tags', type: 'String', isArray: true, arrayElementType: 'String' },
                { name: 'courses', type: 'ObjectID', isArray: true, arrayElementType: 'ObjectID', ref: 'Course' },
                {
                    name: 'notes',
                    type: 'Embedded',
                    isArray: true,
                    arrayElementType: 'Embedded',
                    nested: [
                        { name: 'text', type: 'String', required: true, isArray: false },
                        { name: 'createdAt', type: 'Date', required: false, isArray: false }
                    ]
                }
            ],
            indexes: [],
            constraints: []
        };

        const result = converter.convertSchema(definition);
        const related = result.relatedTables;

        const tagsTable = related.find(table => table.name === 'users_tags');
        expect(tagsTable).toBeDefined();
        expect(tagsTable.columns.find(col => col.name === 'users_id')).toBeDefined();
        expect(tagsTable.columns.find(col => col.name === 'tags_value')).toBeDefined();

        const coursesTable = related.find(table => table.name === 'users_courses');
        expect(coursesTable).toBeDefined();
        expect(coursesTable.columns.find(col => col.name === 'users_id')).toBeDefined();
        expect(coursesTable.columns.find(col => col.name === 'courses_id')).toBeDefined();
        expect(coursesTable.foreignKeys.find(fk => fk.referencesTable === 'courses')).toBeDefined();

        const notesTable = related.find(table => table.name === 'users_notes');
        expect(notesTable).toBeDefined();
        expect(notesTable.columns.find(col => col.name === 'notes_text')).toBeDefined();
        expect(notesTable.columns.find(col => col.name === 'notes_created_at')).toBeDefined();
    });

    it('should throw for invalid schema definition', () => {
        expect(() => converter.convertSchema(null)).toThrow('Invalid schema definition provided');
        expect(() => converter.convertSchema({ modelName: 'Test' })).toThrow('Invalid schema definition provided');
    });
});
