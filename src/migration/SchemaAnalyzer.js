/**
 * SchemaAnalyzer - Extracts Mongoose schema definitions
 * 
 * This class analyzes Mongoose models to extract:
 * - Field types, constraints, and default values
 * - ObjectId references and their target models
 * - Indexes and unique constraints
 * - Nested objects and arrays
 * - Relationships between models
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

class SchemaAnalyzer {
    /**
     * Analyze a Mongoose model and extract its schema definition
     * @param {mongoose.Model} model - The Mongoose model to analyze
     * @returns {SchemaDefinition} The extracted schema definition
     */
    analyzeSchema(model) {
        if (!model || !model.schema) {
            throw new Error('Invalid Mongoose model provided');
        }

        const schema = model.schema;
        const modelName = model.modelName;

        return {
            modelName,
            fields: this.extractFields(schema),
            relationships: this.extractRelationships(schema, modelName),
            indexes: this.extractIndexes(schema),
            constraints: this.extractConstraints(schema)
        };
    }

    /**
     * Extract field definitions from a Mongoose schema
     * @param {mongoose.Schema} schema - The Mongoose schema
     * @returns {FieldDefinition[]} Array of field definitions
     */
    extractFields(schema, basePath = '') {
        const fields = [];
        const paths = schema.paths;
        const processedPaths = new Set();
        const prefix = basePath ? `${basePath}.` : '';

        // Group paths by their root (to handle nested objects)
        const pathGroups = {};

        for (const path of Object.keys(paths)) {
            // Skip internal Mongoose fields
            if (path === '_id' || path === '__v') {
                continue;
            }

            if (prefix && !path.startsWith(prefix)) {
                continue;
            }

            const relativePath = prefix ? path.substring(prefix.length) : path;

            const rootPath = relativePath.split('.')[0];
            if (!pathGroups[rootPath]) {
                pathGroups[rootPath] = [];
            }
            pathGroups[rootPath].push(relativePath);
        }

        // Process each root path
        for (const [rootPath, relatedPaths] of Object.entries(pathGroups)) {
            if (processedPaths.has(rootPath)) {
                continue;
            }

            const fullPath = prefix ? `${prefix}${rootPath}` : rootPath;
            const schemaType = paths[fullPath];

            // Check if this is a nested object (has child paths)
            const childPaths = relatedPaths.filter(p => p !== rootPath && p.startsWith(rootPath + '.'));

            if (childPaths.length > 0 && schemaType?.instance !== 'Array') {
                // This is a nested object
                const nestedFields = this.extractFields(schema, fullPath);

                fields.push({
                    name: rootPath,
                    type: 'Embedded',
                    required: !!schemaType?.options?.required,
                    unique: false,
                    isArray: false,
                    nested: nestedFields
                });

                processedPaths.add(rootPath);
                childPaths.forEach(p => processedPaths.add(p));
            } else {
                // Skip if schemaType is undefined
                if (!schemaType) {
                    continue;
                }

                // Regular field or array
                const fieldDef = this.analyzeField(rootPath, schemaType);
                if (fieldDef) {
                    fields.push(fieldDef);
                    processedPaths.add(rootPath);
                }
            }
        }

        return fields;
    }


    /**
     * Analyze a simple field (non-nested, non-array)
     * @param {string} name - The field name
     * @param {mongoose.SchemaType} schemaType - The schema type object
     * @returns {FieldDefinition} The field definition
     */
    analyzeSimpleField(name, schemaType) {
        const instance = schemaType.instance;
        const options = schemaType.options || {};

        return {
            name,
            type: instance,
            required: !!options.required,
            unique: !!options.unique,
            default: options.default,
            enum: options.enum,
            min: options.min,
            max: options.max,
            minlength: options.minlength,
            maxlength: options.maxlength,
            lowercase: options.lowercase,
            uppercase: options.uppercase,
            trim: options.trim,
            index: !!options.index,
            select: options.select !== false,
            isArray: false
        };
    }

    /**
     * Analyze a single field from the schema
     * @param {string} path - The field path
     * @param {mongoose.SchemaType} schemaType - The schema type object
     * @returns {FieldDefinition|null} The field definition or null if should be skipped
     */
    analyzeField(path, schemaType) {
        const instance = schemaType.instance;
        const options = schemaType.options || {};

        // Handle arrays
        if (instance === 'Array') {
            return this.analyzeArrayField(path, schemaType);
        }

        // Handle nested schemas (for embedded documents)
        if (schemaType.schema) {
            return {
                name: path,
                type: 'Embedded',
                required: !!options.required,
                unique: !!options.unique,
                default: options.default,
                nested: this.extractFields(schemaType.schema),
                isArray: false
            };
        }

        // Handle regular fields
        return {
            name: path,
            type: instance,
            required: !!options.required,
            unique: !!options.unique,
            default: options.default,
            enum: options.enum,
            min: options.min,
            max: options.max,
            minlength: options.minlength,
            maxlength: options.maxlength,
            lowercase: options.lowercase,
            uppercase: options.uppercase,
            trim: options.trim,
            index: !!options.index,
            select: options.select !== false, // default is true
            isArray: false
        };
    }

    /**
     * Analyze an array field
     * @param {string} path - The field path
     * @param {mongoose.SchemaType} schemaType - The schema type object
     * @returns {FieldDefinition} The field definition for the array
     */
    analyzeArrayField(path, schemaType) {
        const caster = schemaType.caster;
        const options = schemaType.options || {};

        if (!caster) {
            // Mixed array
            return {
                name: path,
                type: 'Mixed',
                required: !!options.required,
                unique: false,
                isArray: true,
                arrayElementType: 'Mixed'
            };
        }

        // Check if it's an array of ObjectIds (references)
        if (caster.instance === 'ObjectID' && caster.options?.ref) {
            return {
                name: path,
                type: 'ObjectID',
                required: !!options.required,
                unique: false,
                isArray: true,
                arrayElementType: 'ObjectID',
                ref: caster.options.ref
            };
        }

        // Check if it's an array of embedded documents
        if (caster.schema) {
            return {
                name: path,
                type: 'Embedded',
                required: !!options.required,
                unique: false,
                isArray: true,
                arrayElementType: 'Embedded',
                nested: this.extractFields(caster.schema)
            };
        }

        // Array of primitives
        return {
            name: path,
            type: caster.instance,
            required: !!options.required,
            unique: false,
            isArray: true,
            arrayElementType: caster.instance,
            enum: caster.options?.enum
        };
    }

    /**
     * Extract relationships from the schema
     * @param {mongoose.Schema} schema - The Mongoose schema
     * @param {string} modelName - The name of the model
     * @returns {Relationship[]} Array of relationships
     */
    extractRelationships(schema, modelName) {
        const relationships = [];
        const paths = schema.paths;

        for (const [path, schemaType] of Object.entries(paths)) {
            // Check for ObjectId references
            if (schemaType.instance === 'ObjectID' && schemaType.options?.ref) {
                relationships.push({
                    type: 'one-to-one',
                    sourceModel: modelName,
                    targetModel: schemaType.options.ref,
                    sourceField: path,
                    targetField: '_id'
                });
            }

            // Check for arrays of ObjectId references
            if (schemaType.instance === 'Array' && schemaType.caster) {
                const caster = schemaType.caster;
                if (caster.instance === 'ObjectID' && caster.options?.ref) {
                    relationships.push({
                        type: 'one-to-many',
                        sourceModel: modelName,
                        targetModel: caster.options.ref,
                        sourceField: path,
                        targetField: '_id'
                    });
                }
            }

            // Check for embedded documents with references
            if (schemaType.schema) {
                const nestedRels = this.extractRelationships(schemaType.schema, modelName);
                nestedRels.forEach(rel => {
                    rel.sourceField = `${path}.${rel.sourceField}`;
                    relationships.push(rel);
                });
            }

            // Check for arrays of embedded documents with references
            if (schemaType.instance === 'Array' && schemaType.caster?.schema) {
                const nestedRels = this.extractRelationships(schemaType.caster.schema, modelName);
                nestedRels.forEach(rel => {
                    rel.sourceField = `${path}.${rel.sourceField}`;
                    relationships.push(rel);
                });
            }
        }

        return relationships;
    }

    /**
     * Extract indexes from the schema
     * @param {mongoose.Schema} schema - The Mongoose schema
     * @returns {Index[]} Array of index definitions
     */
    extractIndexes(schema) {
        const indexes = [];

        // Get indexes defined on the schema
        const schemaIndexes = schema.indexes();

        for (const indexDef of schemaIndexes) {
            const [fields, options = {}] = indexDef;

            indexes.push({
                fields: this.normalizeIndexFields(fields),
                unique: !!options.unique,
                sparse: !!options.sparse,
                type: options.type || 'btree',
                name: options.name
            });
        }

        // Also check for individual field indexes
        const paths = schema.paths;
        for (const [path, schemaType] of Object.entries(paths)) {
            const options = schemaType.options || {};

            if (options.index && !this.isFieldInIndexes(path, indexes)) {
                indexes.push({
                    fields: [{ field: path, order: 1 }],
                    unique: false,
                    sparse: false,
                    type: 'btree'
                });
            }

            if (options.unique && !this.isFieldInIndexes(path, indexes)) {
                indexes.push({
                    fields: [{ field: path, order: 1 }],
                    unique: true,
                    sparse: false,
                    type: 'btree'
                });
            }
        }

        return indexes;
    }

    /**
     * Normalize index field definitions
     * @param {Object} fields - The index fields object
     * @returns {Array} Normalized field definitions
     */
    normalizeIndexFields(fields) {
        const normalized = [];

        for (const [field, order] of Object.entries(fields)) {
            normalized.push({
                field,
                order: order === 'text' ? 'text' : (order === -1 ? -1 : 1)
            });
        }

        return normalized;
    }

    /**
     * Check if a field is already in the indexes list
     * @param {string} field - The field name
     * @param {Index[]} indexes - The indexes array
     * @returns {boolean} True if field is in indexes
     */
    isFieldInIndexes(field, indexes) {
        return indexes.some(index =>
            index.fields.some(f => f.field === field)
        );
    }

    /**
     * Extract constraints from the schema
     * @param {mongoose.Schema} schema - The Mongoose schema
     * @returns {Constraint[]} Array of constraint definitions
     */
    extractConstraints(schema) {
        const constraints = [];
        const paths = schema.paths;

        for (const [path, schemaType] of Object.entries(paths)) {
            const options = schemaType.options || {};

            // Required constraint
            if (options.required) {
                constraints.push({
                    type: 'required',
                    field: path,
                    message: typeof options.required === 'object' ? options.required[1] : undefined
                });
            }

            // Unique constraint
            if (options.unique) {
                constraints.push({
                    type: 'unique',
                    field: path
                });
            }

            // Enum constraint
            if (options.enum) {
                constraints.push({
                    type: 'enum',
                    field: path,
                    values: Array.isArray(options.enum) ? options.enum : options.enum.values
                });
            }

            // Min/Max constraints
            if (options.min !== undefined) {
                constraints.push({
                    type: 'min',
                    field: path,
                    value: options.min
                });
            }

            if (options.max !== undefined) {
                constraints.push({
                    type: 'max',
                    field: path,
                    value: options.max
                });
            }

            // Length constraints
            if (options.minlength !== undefined) {
                constraints.push({
                    type: 'minlength',
                    field: path,
                    value: options.minlength
                });
            }

            if (options.maxlength !== undefined) {
                constraints.push({
                    type: 'maxlength',
                    field: path,
                    value: options.maxlength
                });
            }
        }

        return constraints;
    }
}

export default SchemaAnalyzer;
