/**
 * SchemaConverter - Converts SchemaAnalyzer output to SQLite table definitions.
 */

class SchemaConverter {
    constructor(options = {}) {
        this.onDelete = options.onDelete || 'RESTRICT';
        this.onUpdate = options.onUpdate || 'CASCADE';
    }

    /**
     * Convert a SchemaDefinition into SQLite table definitions.
     * @param {SchemaDefinition} definition
     * @returns {{ primaryTable: SQLiteTable, relatedTables: SQLiteTable[], tables: SQLiteTable[] }}
     */
    convertSchema(definition) {
        if (!definition || !definition.modelName || !Array.isArray(definition.fields)) {
            throw new Error('Invalid schema definition provided');
        }

        const primaryTable = this.createPrimaryTable(definition);
        const relatedTables = [];

        for (const field of definition.fields) {
            if (field.isArray) {
                const tables = this.handleArrayField(definition, field);
                relatedTables.push(...tables);
                continue;
            }

            if (field.type === 'Embedded' && Array.isArray(field.nested)) {
                const embeddedColumns = this.flattenEmbeddedFields(field, field.name);
                primaryTable.columns.push(...embeddedColumns);
                continue;
            }

            const column = this.convertFieldToColumn(field, field.name);
            if (!column) {
                continue;
            }

            primaryTable.columns.push(column);
            this.addFieldConstraints(primaryTable, field, column.name);
            this.addFieldForeignKeys(primaryTable, field, column.name);
        }

        primaryTable.indexes = this.convertIndexes(definition.indexes || [], primaryTable);

        return {
            primaryTable,
            relatedTables,
            tables: [primaryTable, ...relatedTables]
        };
    }

    createPrimaryTable(definition) {
        const tableName = this.toTableName(definition.modelName);
        return {
            name: tableName,
            columns: [
                {
                    name: 'id',
                    type: 'INTEGER',
                    nullable: false,
                    primaryKey: true,
                    autoIncrement: true,
                    unique: true
                }
            ],
            foreignKeys: [],
            indexes: [],
            constraints: []
        };
    }

    handleArrayField(definition, field) {
        const tables = [];
        const parentTable = this.toTableName(definition.modelName);
        const fieldName = this.toColumnName(field.name);

        if (field.arrayElementType === 'ObjectID' && field.ref) {
            const targetTable = this.toTableName(field.ref);
            const tableName = `${parentTable}_${fieldName}`;
            tables.push({
                name: tableName,
                columns: [
                    this.buildIntegerColumn(`${parentTable}_id`, false),
                    this.buildIntegerColumn(`${targetTable}_id`, false)
                ],
                foreignKeys: [
                    this.buildForeignKey(`${parentTable}_id`, parentTable),
                    this.buildForeignKey(`${targetTable}_id`, targetTable)
                ],
                indexes: [],
                constraints: [
                    { type: 'primary', fields: [`${parentTable}_id`, `${targetTable}_id`] }
                ]
            });
            return tables;
        }

        if (field.arrayElementType === 'Embedded' && Array.isArray(field.nested)) {
            const tableName = `${parentTable}_${fieldName}`;
            const embeddedColumns = this.flattenNestedFields(field.nested, fieldName);
            tables.push({
                name: tableName,
                columns: [
                    {
                        name: 'id',
                        type: 'INTEGER',
                        nullable: false,
                        primaryKey: true,
                        autoIncrement: true,
                        unique: true
                    },
                    this.buildIntegerColumn(`${parentTable}_id`, false),
                    ...embeddedColumns
                ],
                foreignKeys: [
                    this.buildForeignKey(`${parentTable}_id`, parentTable)
                ],
                indexes: [],
                constraints: []
            });
            return tables;
        }

        // Array of primitives
        const tableName = `${parentTable}_${fieldName}`;
        const valueColumn = this.convertArrayPrimitiveColumn(field);
        tables.push({
            name: tableName,
            columns: [
                this.buildIntegerColumn(`${parentTable}_id`, false),
                valueColumn
            ],
            foreignKeys: [
                this.buildForeignKey(`${parentTable}_id`, parentTable)
            ],
            indexes: [],
            constraints: [
                { type: 'primary', fields: [`${parentTable}_id`, valueColumn.name] }
            ]
        });

        return tables;
    }

    convertFieldToColumn(field, nameOverride) {
        if (!field || !field.type) {
            return null;
        }

        const columnName = this.toColumnName(nameOverride || field.name);
        const sqliteType = this.mapMongooseTypeToSQLite(field.type);

        return {
            name: columnName,
            type: sqliteType,
            nullable: !field.required,
            primaryKey: false,
            autoIncrement: false,
            unique: !!field.unique,
            default: this.normalizeDefault(field)
        };
    }

    convertArrayPrimitiveColumn(field) {
        const sqliteType = this.mapMongooseTypeToSQLite(field.arrayElementType || 'Mixed');
        const columnName = `${this.toColumnName(field.name)}_value`;
        return {
            name: columnName,
            type: sqliteType,
            nullable: false,
            primaryKey: false,
            autoIncrement: false,
            unique: false,
            default: undefined
        };
    }

    flattenEmbeddedFields(field, prefix) {
        return this.flattenNestedFields(field.nested || [], prefix);
    }

    flattenNestedFields(nestedFields, prefix) {
        const columns = [];
        for (const nestedField of nestedFields) {
            const columnPrefix = `${this.toColumnName(prefix)}_${this.toColumnName(nestedField.name)}`;
            if (nestedField.type === 'Embedded' && Array.isArray(nestedField.nested)) {
                columns.push(...this.flattenNestedFields(nestedField.nested, columnPrefix));
                continue;
            }

            const column = this.convertFieldToColumn(nestedField, columnPrefix);
            if (column) {
                columns.push(column);
            }
        }
        return columns;
    }

    addFieldConstraints(table, field, columnName) {
        if (!table || !Array.isArray(table.constraints) || !field) {
            return;
        }

        if (Array.isArray(field.enum) && field.enum.length > 0) {
            table.constraints.push({
                type: 'enum',
                field: columnName,
                values: field.enum
            });
        }

        if (field.min !== undefined) {
            table.constraints.push({
                type: 'min',
                field: columnName,
                value: field.min
            });
        }

        if (field.max !== undefined) {
            table.constraints.push({
                type: 'max',
                field: columnName,
                value: field.max
            });
        }

        if (field.minlength !== undefined) {
            table.constraints.push({
                type: 'minlength',
                field: columnName,
                value: field.minlength
            });
        }

        if (field.maxlength !== undefined) {
            table.constraints.push({
                type: 'maxlength',
                field: columnName,
                value: field.maxlength
            });
        }
    }

    addFieldForeignKeys(table, field, columnName) {
        if (!table || !Array.isArray(table.foreignKeys) || !field) {
            return;
        }

        if (field.type === 'ObjectID' && field.ref) {
            table.foreignKeys.push(this.buildForeignKey(columnName, this.toTableName(field.ref)));
        }
    }

    convertIndexes(indexes, table) {
        if (!Array.isArray(indexes)) {
            return [];
        }

        const columnNames = new Set(table.columns.map(col => col.name));

        return indexes.map(index => {
            const fields = index.fields.map(field => {
                const normalizedField = this.toColumnName(field.field);
                return {
                    field: columnNames.has(normalizedField) ? normalizedField : field.field,
                    order: field.order
                };
            });

            return {
                fields,
                unique: !!index.unique,
                sparse: !!index.sparse,
                type: index.type || 'btree',
                name: index.name
            };
        });
    }

    mapMongooseTypeToSQLite(mongooseType) {
        switch (mongooseType) {
            case 'String':
                return 'TEXT';
            case 'Number':
                return 'REAL';
            case 'Boolean':
                return 'INTEGER';
            case 'Date':
                return 'DATETIME';
            case 'ObjectID':
                return 'INTEGER';
            case 'Buffer':
                return 'BLOB';
            case 'Mixed':
            default:
                return 'TEXT';
        }
    }

    normalizeDefault(field) {
        if (!field) {
            return undefined;
        }

        if (field.type === 'Date' && typeof field.default === 'function') {
            return 'CURRENT_TIMESTAMP';
        }

        return field.default;
    }

    buildIntegerColumn(name, nullable) {
        return {
            name,
            type: 'INTEGER',
            nullable,
            primaryKey: false,
            autoIncrement: false,
            unique: false
        };
    }

    buildForeignKey(column, referencesTable) {
        return {
            column,
            referencesTable,
            referencesColumn: 'id',
            onDelete: this.onDelete,
            onUpdate: this.onUpdate
        };
    }

    toTableName(modelName) {
        const snake = this.toSnakeCase(modelName);
        return snake.endsWith('s') ? snake : `${snake}s`;
    }

    toColumnName(name) {
        return this.toSnakeCase(name).replace(/\./g, '_');
    }

    toSnakeCase(value) {
        return String(value)
            .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
            .replace(/\s+/g, '_')
            .toLowerCase();
    }
}

export default SchemaConverter;
