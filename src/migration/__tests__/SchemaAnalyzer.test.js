/**
 * Unit tests for SchemaAnalyzer
 * 
 * Tests parsing of Mongoose schemas including:
 * - Each Mongoose type
 * - Nested object detection
 * - Array field detection
 * - Relationship extraction
 * - Index extraction
 * - Constraint extraction
 */

import mongoose from 'mongoose';
import SchemaAnalyzer from '../SchemaAnalyzer.js';

describe('SchemaAnalyzer', () => {
    let analyzer;

    beforeEach(() => {
        analyzer = new SchemaAnalyzer();
    });

    afterEach(() => {
        // Clean up any models created during tests
        Object.keys(mongoose.models).forEach(modelName => {
            delete mongoose.models[modelName];
        });
    });

    describe('analyzeSchema', () => {
        it('should throw error for invalid model', () => {
            expect(() => analyzer.analyzeSchema(null)).toThrow('Invalid Mongoose model provided');
            expect(() => analyzer.analyzeSchema({})).toThrow('Invalid Mongoose model provided');
        });

        it('should extract basic schema information', () => {
            const schema = new mongoose.Schema({
                name: String,
                age: Number
            });
            const TestModel = mongoose.model('Test1', schema);

            const result = analyzer.analyzeSchema(TestModel);

            expect(result.modelName).toBe('Test1');
            expect(result.fields).toBeDefined();
            expect(result.relationships).toBeDefined();
            expect(result.indexes).toBeDefined();
            expect(result.constraints).toBeDefined();
        });
    });

    describe('extractFields - Mongoose types', () => {
        it('should parse String type', () => {
            const schema = new mongoose.Schema({
                name: { type: String, required: true, unique: true }
            });
            const TestModel = mongoose.model('Test2', schema);

            const result = analyzer.analyzeSchema(TestModel);
            const nameField = result.fields.find(f => f.name === 'name');

            expect(nameField).toBeDefined();
            expect(nameField.type).toBe('String');
            expect(nameField.required).toBe(true);
            expect(nameField.unique).toBe(true);
            expect(nameField.isArray).toBe(false);
        });

        it('should parse Number type', () => {
            const schema = new mongoose.Schema({
                age: { type: Number, min: 0, max: 120 }
            });
            const TestModel = mongoose.model('Test3', schema);

            const result = analyzer.analyzeSchema(TestModel);
            const ageField = result.fields.find(f => f.name === 'age');

            expect(ageField).toBeDefined();
            expect(ageField.type).toBe('Number');
            expect(ageField.min).toBe(0);
            expect(ageField.max).toBe(120);
        });

        it('should parse Boolean type', () => {
            const schema = new mongoose.Schema({
                isActive: { type: Boolean, default: true }
            });
            const TestModel = mongoose.model('Test4', schema);

            const result = analyzer.analyzeSchema(TestModel);
            const field = result.fields.find(f => f.name === 'isActive');

            expect(field).toBeDefined();
            expect(field.type).toBe('Boolean');
            expect(field.default).toBe(true);
        });

        it('should parse Date type', () => {
            const schema = new mongoose.Schema({
                createdAt: { type: Date, default: Date.now }
            });
            const TestModel = mongoose.model('Test5', schema);

            const result = analyzer.analyzeSchema(TestModel);
            const field = result.fields.find(f => f.name === 'createdAt');

            expect(field).toBeDefined();
            expect(field.type).toBe('Date');
        });

        it('should parse ObjectId type with reference', () => {
            const schema = new mongoose.Schema({
                userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
            });
            const TestModel = mongoose.model('Test6', schema);

            const result = analyzer.analyzeSchema(TestModel);
            const field = result.fields.find(f => f.name === 'userId');

            expect(field).toBeDefined();
            expect(field.type).toBe('ObjectID');
        });

        it('should parse enum constraint', () => {
            const schema = new mongoose.Schema({
                role: { type: String, enum: ['student', 'teacher', 'admin'] }
            });
            const TestModel = mongoose.model('Test7', schema);

            const result = analyzer.analyzeSchema(TestModel);
            const field = result.fields.find(f => f.name === 'role');

            expect(field).toBeDefined();
            expect(field.enum).toEqual(['student', 'teacher', 'admin']);
        });

        it('should parse string options (lowercase, trim, maxlength)', () => {
            const schema = new mongoose.Schema({
                email: { type: String, lowercase: true, trim: true, maxlength: 100 }
            });
            const TestModel = mongoose.model('Test8', schema);

            const result = analyzer.analyzeSchema(TestModel);
            const field = result.fields.find(f => f.name === 'email');

            expect(field).toBeDefined();
            expect(field.lowercase).toBe(true);
            expect(field.trim).toBe(true);
            expect(field.maxlength).toBe(100);
        });
    });

    describe('extractFields - Nested objects', () => {
        it('should detect nested objects', () => {
            const schema = new mongoose.Schema({
                profile: {
                    firstName: String,
                    lastName: String,
                    age: Number
                }
            });
            const TestModel = mongoose.model('Test9', schema);

            const result = analyzer.analyzeSchema(TestModel);
            const profileField = result.fields.find(f => f.name === 'profile');

            expect(profileField).toBeDefined();
            expect(profileField.type).toBe('Embedded');
            expect(profileField.nested).toBeDefined();
            expect(profileField.nested.length).toBe(3);
            expect(profileField.nested.find(f => f.name === 'firstName')).toBeDefined();
            expect(profileField.nested.find(f => f.name === 'lastName')).toBeDefined();
            expect(profileField.nested.find(f => f.name === 'age')).toBeDefined();
        });

        it('should handle deeply nested objects', () => {
            const schema = new mongoose.Schema({
                settings: {
                    notifications: {
                        email: Boolean,
                        sms: Boolean
                    }
                }
            });
            const TestModel = mongoose.model('Test10', schema);

            const result = analyzer.analyzeSchema(TestModel);
            const settingsField = result.fields.find(f => f.name === 'settings');

            expect(settingsField).toBeDefined();
            expect(settingsField.type).toBe('Embedded');
            expect(settingsField.nested).toBeDefined();

            const notificationsField = settingsField.nested.find(f => f.name === 'notifications');
            expect(notificationsField).toBeDefined();
            expect(notificationsField.type).toBe('Embedded');
            expect(notificationsField.nested.length).toBe(2);
        });
    });

    describe('extractFields - Arrays', () => {
        it('should detect array of primitives', () => {
            const schema = new mongoose.Schema({
                tags: [String]
            });
            const TestModel = mongoose.model('Test11', schema);

            const result = analyzer.analyzeSchema(TestModel);
            const tagsField = result.fields.find(f => f.name === 'tags');

            expect(tagsField).toBeDefined();
            expect(tagsField.isArray).toBe(true);
            expect(tagsField.arrayElementType).toBe('String');
        });

        it('should detect array of ObjectIds with references', () => {
            const schema = new mongoose.Schema({
                students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
            });
            const TestModel = mongoose.model('Test12', schema);

            const result = analyzer.analyzeSchema(TestModel);
            const studentsField = result.fields.find(f => f.name === 'students');

            expect(studentsField).toBeDefined();
            expect(studentsField.isArray).toBe(true);
            expect(studentsField.arrayElementType).toBe('ObjectID');
            expect(studentsField.ref).toBe('User');
        });

        it('should detect array of embedded documents', () => {
            const schema = new mongoose.Schema({
                comments: [{
                    text: String,
                    author: String,
                    date: Date
                }]
            });
            const TestModel = mongoose.model('Test13', schema);

            const result = analyzer.analyzeSchema(TestModel);
            const commentsField = result.fields.find(f => f.name === 'comments');

            expect(commentsField).toBeDefined();
            expect(commentsField.isArray).toBe(true);
            expect(commentsField.arrayElementType).toBe('Embedded');
            expect(commentsField.nested).toBeDefined();
            expect(commentsField.nested.length).toBe(3);
        });

        it('should detect array with enum values', () => {
            const schema = new mongoose.Schema({
                roles: [{ type: String, enum: ['admin', 'user', 'guest'] }]
            });
            const TestModel = mongoose.model('Test14', schema);

            const result = analyzer.analyzeSchema(TestModel);
            const rolesField = result.fields.find(f => f.name === 'roles');

            expect(rolesField).toBeDefined();
            expect(rolesField.isArray).toBe(true);
            expect(rolesField.enum).toEqual(['admin', 'user', 'guest']);
        });
    });

    describe('extractRelationships', () => {
        it('should extract one-to-one relationships', () => {
            const schema = new mongoose.Schema({
                author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
            });
            const TestModel = mongoose.model('Test15', schema);

            const result = analyzer.analyzeSchema(TestModel);
            const relationship = result.relationships.find(r => r.sourceField === 'author');

            expect(relationship).toBeDefined();
            expect(relationship.type).toBe('one-to-one');
            expect(relationship.sourceModel).toBe('Test15');
            expect(relationship.targetModel).toBe('User');
            expect(relationship.targetField).toBe('_id');
        });

        it('should extract one-to-many relationships', () => {
            const schema = new mongoose.Schema({
                students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
            });
            const TestModel = mongoose.model('Test16', schema);

            const result = analyzer.analyzeSchema(TestModel);
            const relationship = result.relationships.find(r => r.sourceField === 'students');

            expect(relationship).toBeDefined();
            expect(relationship.type).toBe('one-to-many');
            expect(relationship.sourceModel).toBe('Test16');
            expect(relationship.targetModel).toBe('User');
        });

        it('should extract relationships from nested objects', () => {
            const schema = new mongoose.Schema({
                metadata: {
                    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
                }
            });
            const TestModel = mongoose.model('Test17', schema);

            const result = analyzer.analyzeSchema(TestModel);
            const relationship = result.relationships.find(r => r.sourceField === 'metadata.createdBy');

            expect(relationship).toBeDefined();
            expect(relationship.targetModel).toBe('User');
        });

        it('should extract relationships from arrays of embedded documents', () => {
            const schema = new mongoose.Schema({
                reviews: [{
                    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                    rating: Number
                }]
            });
            const TestModel = mongoose.model('Test18', schema);

            const result = analyzer.analyzeSchema(TestModel);
            const relationship = result.relationships.find(r => r.sourceField === 'reviews.user');

            expect(relationship).toBeDefined();
            expect(relationship.targetModel).toBe('User');
        });
    });

    describe('extractIndexes', () => {
        it('should extract field-level indexes', () => {
            const schema = new mongoose.Schema({
                email: { type: String, index: true },
                username: { type: String, unique: true }
            });
            const TestModel = mongoose.model('Test19', schema);

            const result = analyzer.analyzeSchema(TestModel);

            const emailIndex = result.indexes.find(idx =>
                idx.fields.some(f => f.field === 'email')
            );
            expect(emailIndex).toBeDefined();
            expect(emailIndex.unique).toBe(false);

            const usernameIndex = result.indexes.find(idx =>
                idx.fields.some(f => f.field === 'username')
            );
            expect(usernameIndex).toBeDefined();
            expect(usernameIndex.unique).toBe(true);
        });

        it('should extract compound indexes', () => {
            const schema = new mongoose.Schema({
                firstName: String,
                lastName: String
            });
            schema.index({ firstName: 1, lastName: 1 });
            const TestModel = mongoose.model('Test20', schema);

            const result = analyzer.analyzeSchema(TestModel);
            const compoundIndex = result.indexes.find(idx => idx.fields.length === 2);

            expect(compoundIndex).toBeDefined();
            expect(compoundIndex.fields).toHaveLength(2);
            expect(compoundIndex.fields[0].field).toBe('firstName');
            expect(compoundIndex.fields[1].field).toBe('lastName');
        });

        it('should extract text indexes', () => {
            const schema = new mongoose.Schema({
                title: String,
                description: String
            });
            schema.index({ title: 'text', description: 'text' });
            const TestModel = mongoose.model('Test21', schema);

            const result = analyzer.analyzeSchema(TestModel);
            const textIndex = result.indexes.find(idx =>
                idx.fields.some(f => f.order === 'text')
            );

            expect(textIndex).toBeDefined();
        });
    });

    describe('extractConstraints', () => {
        it('should extract required constraints', () => {
            const schema = new mongoose.Schema({
                name: { type: String, required: true }
            });
            const TestModel = mongoose.model('Test22', schema);

            const result = analyzer.analyzeSchema(TestModel);
            const constraint = result.constraints.find(c =>
                c.type === 'required' && c.field === 'name'
            );

            expect(constraint).toBeDefined();
        });

        it('should extract unique constraints', () => {
            const schema = new mongoose.Schema({
                email: { type: String, unique: true }
            });
            const TestModel = mongoose.model('Test23', schema);

            const result = analyzer.analyzeSchema(TestModel);
            const constraint = result.constraints.find(c =>
                c.type === 'unique' && c.field === 'email'
            );

            expect(constraint).toBeDefined();
        });

        it('should extract enum constraints', () => {
            const schema = new mongoose.Schema({
                status: { type: String, enum: ['active', 'inactive'] }
            });
            const TestModel = mongoose.model('Test24', schema);

            const result = analyzer.analyzeSchema(TestModel);
            const constraint = result.constraints.find(c =>
                c.type === 'enum' && c.field === 'status'
            );

            expect(constraint).toBeDefined();
            expect(constraint.values).toEqual(['active', 'inactive']);
        });

        it('should extract min/max constraints', () => {
            const schema = new mongoose.Schema({
                age: { type: Number, min: 0, max: 120 }
            });
            const TestModel = mongoose.model('Test25', schema);

            const result = analyzer.analyzeSchema(TestModel);

            const minConstraint = result.constraints.find(c =>
                c.type === 'min' && c.field === 'age'
            );
            expect(minConstraint).toBeDefined();
            expect(minConstraint.value).toBe(0);

            const maxConstraint = result.constraints.find(c =>
                c.type === 'max' && c.field === 'age'
            );
            expect(maxConstraint).toBeDefined();
            expect(maxConstraint.value).toBe(120);
        });

        it('should extract length constraints', () => {
            const schema = new mongoose.Schema({
                username: { type: String, minlength: 3, maxlength: 20 }
            });
            const TestModel = mongoose.model('Test26', schema);

            const result = analyzer.analyzeSchema(TestModel);

            const minConstraint = result.constraints.find(c =>
                c.type === 'minlength' && c.field === 'username'
            );
            expect(minConstraint).toBeDefined();
            expect(minConstraint.value).toBe(3);

            const maxConstraint = result.constraints.find(c =>
                c.type === 'maxlength' && c.field === 'username'
            );
            expect(maxConstraint).toBeDefined();
            expect(maxConstraint.value).toBe(20);
        });
    });

    describe('Complex schema analysis', () => {
        it('should analyze a complex schema with multiple features', () => {
            const schema = new mongoose.Schema({
                title: { type: String, required: true, maxlength: 200 },
                author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
                tags: [String],
                metadata: {
                    views: { type: Number, default: 0 },
                    likes: { type: Number, default: 0 }
                },
                comments: [{
                    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                    text: { type: String, required: true },
                    date: { type: Date, default: Date.now }
                }],
                status: { type: String, enum: ['draft', 'published'], default: 'draft' }
            });
            schema.index({ title: 'text' });
            const TestModel = mongoose.model('Test27', schema);

            const result = analyzer.analyzeSchema(TestModel);

            // Check fields
            expect(result.fields.length).toBeGreaterThan(0);
            expect(result.fields.find(f => f.name === 'title')).toBeDefined();
            expect(result.fields.find(f => f.name === 'tags')).toBeDefined();
            expect(result.fields.find(f => f.name === 'metadata')).toBeDefined();
            expect(result.fields.find(f => f.name === 'comments')).toBeDefined();

            // Check relationships
            expect(result.relationships.length).toBeGreaterThan(0);
            expect(result.relationships.find(r => r.sourceField === 'author')).toBeDefined();
            expect(result.relationships.find(r => r.sourceField === 'comments.user')).toBeDefined();

            // Check indexes
            expect(result.indexes.length).toBeGreaterThan(0);

            // Check constraints
            expect(result.constraints.find(c => c.type === 'required' && c.field === 'title')).toBeDefined();
            expect(result.constraints.find(c => c.type === 'enum' && c.field === 'status')).toBeDefined();
        });
    });
});
