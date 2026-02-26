import knex from 'knex';
import knexConfig from './knexfile.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get environment
const environment = process.env.NODE_ENV || 'development';

// Ensure data directory exists
const dataDir = join(__dirname, '../../data');
if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
    console.log('✓ Created data directory');
}

// Initialize Knex with the appropriate configuration
const db = knex(knexConfig[environment]);

/**
 * Test database connection
 * @returns {Promise<boolean>} True if connection is successful
 */
export async function testConnection() {
    try {
        // Try a simple query to verify connection
        await db.raw('SELECT 1');
        console.log(`✓ SQLite Connected: ${knexConfig[environment].connection.filename || ':memory:'}`);
        console.log(`✓ Environment: ${environment}`);
        return true;
    } catch (error) {
        console.error('✗ Error connecting to SQLite:', error.message);
        throw error;
    }
}

/**
 * Run pending migrations
 * @returns {Promise<void>}
 */
export async function runMigrations() {
    try {
        const [batchNo, log] = await db.migrate.latest();
        if (log.length === 0) {
            console.log('✓ Database is already up to date');
        } else {
            console.log(`✓ Batch ${batchNo} run: ${log.length} migrations`);
            log.forEach(migration => console.log(`  - ${migration}`));
        }
    } catch (error) {
        console.error('✗ Error running migrations:', error.message);
        throw error;
    }
}

/**
 * Rollback the last batch of migrations
 * @returns {Promise<void>}
 */
export async function rollbackMigrations() {
    try {
        const [batchNo, log] = await db.migrate.rollback();
        if (log.length === 0) {
            console.log('✓ Already at the base migration');
        } else {
            console.log(`✓ Batch ${batchNo} rolled back: ${log.length} migrations`);
            log.forEach(migration => console.log(`  - ${migration}`));
        }
    } catch (error) {
        console.error('✗ Error rolling back migrations:', error.message);
        throw error;
    }
}

/**
 * Close database connection
 * @returns {Promise<void>}
 */
export async function closeConnection() {
    try {
        await db.destroy();
        console.log('✓ SQLite connection closed');
    } catch (error) {
        console.error('✗ Error closing SQLite connection:', error.message);
        throw error;
    }
}

// Export the knex instance as default
export default db;
