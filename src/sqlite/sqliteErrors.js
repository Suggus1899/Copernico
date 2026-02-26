/**
 * sqliteErrors.js — Maps SQLite error codes to HTTP-friendly error objects.
 */

/**
 * Convert a SQLite/Knex error into a structured HTTP error.
 *
 * @param {Error} error - The original error
 * @returns {{ status: number, message: string, original: Error }}
 */
export function mapSqliteError(error) {
    const msg = error.message || '';
    const code = error.code || '';

    // UNIQUE constraint violation
    if (code === 'SQLITE_CONSTRAINT_UNIQUE' || msg.includes('UNIQUE constraint failed')) {
        const match = msg.match(/UNIQUE constraint failed: (\S+)/);
        const field = match ? match[1].split('.').pop() : 'field';
        return {
            status: 409,
            message: `Duplicate value: ${field} already exists`,
            original: error
        };
    }

    // FOREIGN KEY constraint violation
    if (code === 'SQLITE_CONSTRAINT_FOREIGNKEY' || msg.includes('FOREIGN KEY constraint failed')) {
        return {
            status: 400,
            message: 'Referenced record does not exist or cannot be removed due to dependencies',
            original: error
        };
    }

    // NOT NULL constraint violation
    if (code === 'SQLITE_CONSTRAINT_NOTNULL' || msg.includes('NOT NULL constraint failed')) {
        const match = msg.match(/NOT NULL constraint failed: (\S+)/);
        const field = match ? match[1].split('.').pop() : 'field';
        return {
            status: 400,
            message: `Missing required field: ${field}`,
            original: error
        };
    }

    // CHECK constraint violation
    if (code === 'SQLITE_CONSTRAINT_CHECK' || msg.includes('CHECK constraint failed')) {
        return {
            status: 400,
            message: 'Invalid value: does not satisfy validation constraints',
            original: error
        };
    }

    // Table does not exist
    if (msg.includes('no such table')) {
        const match = msg.match(/no such table: (\S+)/);
        const table = match ? match[1] : 'unknown';
        return {
            status: 500,
            message: `Database table "${table}" not found. Run migrations first.`,
            original: error
        };
    }

    // Column does not exist
    if (msg.includes('no such column') || msg.includes('has no column')) {
        return {
            status: 500,
            message: `Database schema mismatch: ${msg}`,
            original: error
        };
    }

    // Database is locked
    if (code === 'SQLITE_BUSY' || msg.includes('database is locked')) {
        return {
            status: 503,
            message: 'Database is temporarily busy. Please try again.',
            original: error
        };
    }

    // Default: internal server error
    return {
        status: 500,
        message: 'An unexpected database error occurred',
        original: error
    };
}

/**
 * Express error-handling middleware for SQLite errors.
 */
export function sqliteErrorMiddleware(err, req, res, next) {
    // Only handle database-related errors
    if (err.code && err.code.startsWith('SQLITE_')) {
        const mapped = mapSqliteError(err);
        console.error(`[SQLite Error] ${mapped.message}`, err.message);
        return res.status(mapped.status).json({
            success: false,
            error: mapped.message
        });
    }

    // Knex-specific errors
    if (err.constructor && err.constructor.name === 'KnexTimeoutError') {
        console.error('[SQLite Error] Query timeout', err.message);
        return res.status(503).json({
            success: false,
            error: 'Database query timed out. Please try again.'
        });
    }

    // Pass to next error handler
    next(err);
}

export default { mapSqliteError, sqliteErrorMiddleware };
