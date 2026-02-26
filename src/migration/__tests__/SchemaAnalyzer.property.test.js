/**
 * Property-based tests for SchemaAnalyzer.
 */

import mongoose from 'mongoose';
import SchemaAnalyzer from '../SchemaAnalyzer.js';

describe('SchemaAnalyzer property tests', () => {
    const analyzer = new SchemaAnalyzer();

    afterEach(() => {
        Object.keys(mongoose.models).forEach(modelName => {
            delete mongoose.models[modelName];
        });
    });

    const pick = (items) => items[Math.floor(Math.random() * items.length)];

    const buildRandomSchema = (iteration) => {
        const fields = {};
        const expectations = [];
        const fieldCount = 6;

        for (let i = 0; i < fieldCount; i += 1) {
            const name = `field${iteration}_${i}`;
            const kind = pick([
                'String',
                'Number',
                'Boolean',
                'Date',
                'ObjectID',
                'ArrayString',
                'ArrayObjectID',
                'Nested'
            ]);

            if (kind === 'String') {
                fields[name] = { type: String, required: true };
                expectations.push({ name, type: 'String', isArray: false });
                continue;
            }

            if (kind === 'Number') {
                fields[name] = { type: Number };
                expectations.push({ name, type: 'Number', isArray: false });
                continue;
            }

            if (kind === 'Boolean') {
                fields[name] = { type: Boolean, default: false };
                expectations.push({ name, type: 'Boolean', isArray: false });
                continue;
            }

            if (kind === 'Date') {
                fields[name] = { type: Date, default: Date.now };
                expectations.push({ name, type: 'Date', isArray: false });
                continue;
            }

            if (kind === 'ObjectID') {
                fields[name] = { type: mongoose.Schema.Types.ObjectId, ref: 'User' };
                expectations.push({ name, type: 'ObjectID', isArray: false });
                continue;
            }

            if (kind === 'ArrayString') {
                fields[name] = [String];
                expectations.push({ name, isArray: true, arrayElementType: 'String' });
                continue;
            }

            if (kind === 'ArrayObjectID') {
                fields[name] = [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }];
                expectations.push({ name, isArray: true, arrayElementType: 'ObjectID', ref: 'User' });
                continue;
            }

            if (kind === 'Nested') {
                fields[name] = {
                    childA: String,
                    childB: Number,
                    deep: {
                        flag: Boolean
                    }
                };
                expectations.push({
                    name,
                    type: 'Embedded',
                    nested: ['childA', 'childB', 'deep']
                });
            }
        }

        return { fields, expectations };
    };

    it('should include all root fields in analysis output', () => {
        const iterations = 50;

        for (let i = 0; i < iterations; i += 1) {
            const { fields, expectations } = buildRandomSchema(i);
            const schema = new mongoose.Schema(fields);
            const modelName = `PropertyModel${i}`;
            const TestModel = mongoose.model(modelName, schema);

            const result = analyzer.analyzeSchema(TestModel);

            expectations.forEach((expected) => {
                const field = result.fields.find(f => f.name === expected.name);
                expect(field).toBeDefined();

                if (expected.type) {
                    expect(field.type).toBe(expected.type);
                }

                if (expected.isArray) {
                    expect(field.isArray).toBe(true);
                    expect(field.arrayElementType).toBe(expected.arrayElementType);
                }

                if (expected.nested) {
                    expect(field.type).toBe('Embedded');
                    const nestedNames = field.nested.map(n => n.name);
                    expected.nested.forEach(child => {
                        expect(nestedNames).toContain(child);
                    });
                }

                if (expected.ref) {
                    expect(field.ref).toBe(expected.ref);
                }
            });
        }
    });
});
