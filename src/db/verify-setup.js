import db, { testConnection, runMigrations, closeConnection } from './connection.js';

/**
 * Comprehensive verification script for SQLite infrastructure setup
 * Tests connection, migrations, and basic CRUD operations
 */
async function verifySetup() {
    console.log('\n=== SQLite Infrastructure Verification ===\n');

    let allTestsPassed = true;

    try {
        // Test 1: Connection
        console.log('Test 1: Database Connection');
        await testConnection();
        console.log('✓ Connection test passed\n');

        // Test 2: Migrations
        console.log('Test 2: Migration System');
        await runMigrations();
        console.log('✓ Migration system working\n');

        // Test 3: Table exists
        console.log('Test 3: Verify Table Creation');
        const tableExists = await db.schema.hasTable('migration_test');
        if (!tableExists) {
            throw new Error('migration_test table was not created');
        }
        console.log('✓ Table created successfully\n');

        // Test 4: Insert data
        console.log('Test 4: Insert Operation');
        const [insertedId] = await db('migration_test').insert({
            name: 'Test Record'
        });
        console.log(`✓ Inserted record with ID: ${insertedId}\n`);

        // Test 5: Select data
        console.log('Test 5: Select Operation');
        const records = await db('migration_test').select('*');
        if (records.length === 0) {
            throw new Error('No records found after insert');
        }
        console.log(`✓ Retrieved ${records.length} record(s)`);
        console.log(`  Record: ${JSON.stringify(records[0])}\n`);

        // Test 6: Update data
        console.log('Test 6: Update Operation');
        await db('migration_test')
            .where({ id: insertedId })
            .update({ name: 'Updated Test Record' });
        const updatedRecord = await db('migration_test')
            .where({ id: insertedId })
            .first();
        if (updatedRecord.name !== 'Updated Test Record') {
            throw new Error('Record was not updated correctly');
        }
        console.log('✓ Record updated successfully\n');

        // Test 7: Delete data
        console.log('Test 7: Delete Operation');
        await db('migration_test').where({ id: insertedId }).del();
        const deletedRecord = await db('migration_test')
            .where({ id: insertedId })
            .first();
        if (deletedRecord) {
            throw new Error('Record was not deleted');
        }
        console.log('✓ Record deleted successfully\n');

        // Test 8: Transaction support
        console.log('Test 8: Transaction Support');
        await db.transaction(async (trx) => {
            await trx('migration_test').insert({ name: 'Transaction Test 1' });
            await trx('migration_test').insert({ name: 'Transaction Test 2' });
        });
        const transactionRecords = await db('migration_test').select('*');
        if (transactionRecords.length !== 2) {
            throw new Error('Transaction did not commit correctly');
        }
        console.log('✓ Transaction support verified\n');

        // Cleanup
        await db('migration_test').del();

        console.log('=== All Tests Passed! ===\n');
        console.log('SQLite infrastructure is properly set up and ready for use.');
        console.log('\nRequirements Satisfied:');
        console.log('✓ Requirement 7.2: Application connects to SQLite without container dependencies');
        console.log('✓ Requirement 7.3: Development requires only Node.js and SQLite\n');

    } catch (error) {
        console.error('\n✗ Test failed:', error.message);
        console.error(error.stack);
        allTestsPassed = false;
    } finally {
        await closeConnection();
    }

    process.exit(allTestsPassed ? 0 : 1);
}

verifySetup();
