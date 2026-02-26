import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = {
    development: {
        client: 'better-sqlite3',
        connection: {
            filename: join(__dirname, '../../data/dev.sqlite3')
        },
        useNullAsDefault: true,
        migrations: {
            directory: join(__dirname, './migrations'),
            tableName: 'knex_migrations'
        },
        seeds: {
            directory: join(__dirname, './seeds')
        }
    },

    test: {
        client: 'better-sqlite3',
        connection: {
            filename: ':memory:'
        },
        useNullAsDefault: true,
        migrations: {
            directory: join(__dirname, './migrations'),
            tableName: 'knex_migrations'
        },
        seeds: {
            directory: join(__dirname, './seeds')
        }
    },

    production: {
        client: 'better-sqlite3',
        connection: {
            filename: join(__dirname, '../../data/production.sqlite3')
        },
        useNullAsDefault: true,
        migrations: {
            directory: join(__dirname, './migrations'),
            tableName: 'knex_migrations'
        }
    }
};

export default config;
