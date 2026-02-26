import mongoose from 'mongoose';
import SchemaAnalyzer from '../../migration/SchemaAnalyzer.js';
import SchemaConverter from '../../migration/SchemaConverter.js';

import User from '../../models/User.js';
import Course from '../../models/Course.js';
import Appointment from '../../models/Appointment.js';
import Note from '../../models/Note.js';
import Assignment from '../../models/Assignment.js';
import ClassVideo from '../../models/ClassVideo.js';
import EducationalMaterial from '../../models/EducationalMaterial.js';
import ProgressTracking from '../../models/ProgressTracking.js';
import Report from '../../models/Report.js';
import Notification from '../../models/Notification.js';
import ActivityLog from '../../models/ActivityLog.js';
import AvailabilitySlot from '../../models/AvailabilitySlot.js';
import VideoProgress from '../../models/VideoProgress.js';

const MODEL_LIST = [
    User,
    Course,
    AvailabilitySlot,
    Appointment,
    Note,
    Assignment,
    ClassVideo,
    EducationalMaterial,
    ProgressTracking,
    VideoProgress,
    Report,
    Notification,
    ActivityLog
];

const ensureForeignKeys = async (knex) => {
    await knex.raw('PRAGMA foreign_keys = ON');
};

const toTableColumn = (tableBuilder, knex, column) => {
    let builder;
    switch (column.type) {
        case 'INTEGER':
            builder = tableBuilder.integer(column.name);
            break;
        case 'REAL':
            builder = tableBuilder.float(column.name);
            break;
        case 'BLOB':
            builder = tableBuilder.binary(column.name);
            break;
        case 'DATETIME':
            builder = tableBuilder.dateTime(column.name);
            break;
        case 'TEXT':
        default:
            builder = tableBuilder.text(column.name);
            break;
    }

    if (column.default !== undefined) {
        if (column.type === 'DATETIME' && column.default === 'CURRENT_TIMESTAMP') {
            builder.defaultTo(knex.fn.now());
        } else {
            builder.defaultTo(column.default);
        }
    }

    if (column.nullable === false) {
        builder.notNullable();
    }

    return builder;
};

const createTableFromDefinition = async (knex, tableDef) => {
    const hasTable = await knex.schema.hasTable(tableDef.name);
    if (hasTable) {
        return;
    }

    await knex.schema.createTable(tableDef.name, (table) => {
        tableDef.columns.forEach((column) => {
            if (column.primaryKey && column.autoIncrement && column.name === 'id') {
                table.increments('id');
                return;
            }

            const builder = toTableColumn(table, knex, column);
            if (column.primaryKey) {
                builder.primary();
            }
        });

        tableDef.constraints
            .filter((constraint) => constraint.type === 'primary')
            .forEach((constraint) => {
                table.primary(constraint.fields);
            });

        tableDef.foreignKeys.forEach((foreignKey) => {
            table
                .foreign(foreignKey.column)
                .references(foreignKey.referencesColumn)
                .inTable(foreignKey.referencesTable)
                .onDelete(foreignKey.onDelete)
                .onUpdate(foreignKey.onUpdate);
        });

        const columnNames = new Set(tableDef.columns.map((column) => column.name));

        tableDef.indexes.forEach((index) => {
            const fields = index.fields.map((field) => field.field);
            const allColumnsExist = fields.every((field) => columnNames.has(field));

            if (!allColumnsExist) {
                return;
            }

            if (index.unique) {
                table.unique(fields, index.name);
            } else {
                table.index(fields, index.name);
            }
        });
    });
};

const orderPrimaryTables = (tables) => {
    const tableNames = new Set(tables.map((table) => table.name));
    const deps = new Map();
    const dependents = new Map();

    tables.forEach((table) => {
        const refs = new Set(
            table.foreignKeys
                .map((key) => key.referencesTable)
                .filter((name) => tableNames.has(name))
        );
        deps.set(table.name, refs);
        refs.forEach((ref) => {
            if (!dependents.has(ref)) {
                dependents.set(ref, new Set());
            }
            dependents.get(ref).add(table.name);
        });
    });

    const queue = Array.from(tableNames).filter((name) => deps.get(name)?.size === 0);
    const ordered = [];

    while (queue.length) {
        const name = queue.shift();
        ordered.push(name);
        const outgoing = dependents.get(name);
        if (!outgoing) {
            continue;
        }

        outgoing.forEach((child) => {
            deps.get(child).delete(name);
            if (deps.get(child).size === 0) {
                queue.push(child);
            }
        });
    }

    if (ordered.length < tables.length) {
        const remaining = tables
            .map((table) => table.name)
            .filter((name) => !ordered.includes(name));
        ordered.push(...remaining);
    }

    const tableMap = new Map(tables.map((table) => [table.name, table]));
    return ordered.map((name) => tableMap.get(name));
};

const buildDefinitions = () => {
    const analyzer = new SchemaAnalyzer();
    const converter = new SchemaConverter();
    const primaryTables = [];
    const relatedTables = [];

    MODEL_LIST.forEach((model) => {
        const definition = analyzer.analyzeSchema(model);
        const result = converter.convertSchema(definition);
        primaryTables.push(result.primaryTable);
        relatedTables.push(...result.relatedTables);
    });

    return { primaryTables, relatedTables };
};

export async function up(knex) {
    await ensureForeignKeys(knex);

    const { primaryTables, relatedTables } = buildDefinitions();
    const orderedPrimaryTables = orderPrimaryTables(primaryTables);

    for (const tableDef of orderedPrimaryTables) {
        await createTableFromDefinition(knex, tableDef);
    }

    for (const tableDef of relatedTables) {
        await createTableFromDefinition(knex, tableDef);
    }
}

export async function down(knex) {
    await ensureForeignKeys(knex);

    const { primaryTables, relatedTables } = buildDefinitions();
    const orderedPrimaryTables = orderPrimaryTables(primaryTables);

    for (const tableDef of relatedTables.slice().reverse()) {
        await knex.schema.dropTableIfExists(tableDef.name);
    }

    for (const tableDef of orderedPrimaryTables.slice().reverse()) {
        await knex.schema.dropTableIfExists(tableDef.name);
    }

    mongoose.deleteModel(/.+/);
}
