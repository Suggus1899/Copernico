# SQLite Database Infrastructure

This directory contains the SQLite database configuration, migrations, and connection management for the MongoDB to SQLite migration.

## Structure

```
src/db/
├── connection.js       # Database connection and utility functions
├── knexfile.js        # Knex configuration for different environments
├── migrations/        # Database schema migrations
├── seeds/            # Database seed files for testing
└── test-connection.js # Connection test script
```

## Configuration

The database is configured using Knex.js with better-sqlite3 driver. Configuration is environment-specific:

- **Development**: `data/dev.sqlite3`
- **Test**: In-memory database (`:memory:`)
- **Production**: `data/production.sqlite3`

## Usage

### Test Connection

```bash
node src/db/test-connection.js
```

### Run Migrations

```javascript
import { runMigrations } from './src/db/connection.js';
await runMigrations();
```

### Rollback Migrations

```javascript
import { rollbackMigrations } from './src/db/connection.js';
await rollbackMigrations();
```

### Using the Database

```javascript
import db from './src/db/connection.js';

// Query example
const users = await db('users').select('*');

// Insert example
await db('users').insert({ username: 'john', email: 'john@example.com' });

// Update example
await db('users').where({ id: 1 }).update({ username: 'jane' });

// Delete example
await db('users').where({ id: 1 }).del();
```

## Migration System

Migrations are managed by Knex and stored in the `migrations/` directory. Each migration file contains `up()` and `down()` functions to apply and rollback schema changes.

### Creating a Migration

```bash
npx knex migrate:make migration_name --knexfile src/db/knexfile.js
```

### Running Migrations

```bash
npx knex migrate:latest --knexfile src/db/knexfile.js
```

### Rolling Back Migrations

```bash
npx knex migrate:rollback --knexfile src/db/knexfile.js
```

## Requirements Satisfied

This infrastructure setup satisfies:
- **Requirement 7.2**: Application connects to SQLite without container dependencies
- **Requirement 7.3**: Development environment requires only Node.js and SQLite
