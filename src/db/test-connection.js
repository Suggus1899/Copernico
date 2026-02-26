import { testConnection, closeConnection } from './connection.js';

/**
 * Test script to verify SQLite database connection
 */
async function main() {
    console.log('\n=== Testing SQLite Connection ===\n');

    try {
        // Test connection
        await testConnection();

        console.log('\n✓ All connection tests passed!\n');

        // Close connection
        await closeConnection();

        process.exit(0);
    } catch (error) {
        console.error('\n✗ Connection test failed:', error.message);
        process.exit(1);
    }
}

main();
