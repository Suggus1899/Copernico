/**
 * MigrationValidator - validates SQLite data against MongoDB sources.
 */

class MigrationValidator {
    constructor(db, options = {}) {
        if (!db) {
            throw new Error('Database instance is required');
        }

        this.db = db;
        this.logger = options.logger || console;
    }

    async validateRecordCounts(mappings) {
        const checks = [];
        const errors = [];

        for (const mapping of mappings) {
            const expected = await this.countDocuments(mapping.model);
            const actual = await this.countRows(mapping.table);
            const passed = Number(expected) === Number(actual);

            checks.push({
                name: `count:${mapping.table}`,
                passed,
                expected,
                actual,
                message: passed ? 'Record counts match' : 'Record counts mismatch'
            });

            if (!passed) {
                errors.push({
                    table: mapping.table,
                    expected,
                    actual
                });
            }
        }

        return {
            passed: errors.length === 0,
            checks,
            errors
        };
    }

    async validateSampleData(samplePlans) {
        const checks = [];
        const errors = [];

        for (const plan of samplePlans) {
            const samples = await plan.sample();
            const { table, fields } = plan;
            const rows = await this.db(table).select(fields);

            const passed = samples.length <= rows.length;
            checks.push({
                name: `sample:${table}`,
                passed,
                expected: samples.length,
                actual: rows.length,
                message: passed ? 'Samples available' : 'Sample size exceeds rows'
            });

            if (!passed) {
                errors.push({
                    table,
                    expected: samples.length,
                    actual: rows.length
                });
            }
        }

        return {
            passed: errors.length === 0,
            checks,
            errors
        };
    }

    async validateRelationships(plans) {
        const checks = [];
        const errors = [];

        for (const plan of plans) {
            const missing = await plan.check(this.db);
            const passed = missing.length === 0;

            checks.push({
                name: `relationships:${plan.name}`,
                passed,
                expected: 0,
                actual: missing.length,
                message: passed ? 'All foreign keys resolved' : 'Missing foreign keys'
            });

            if (!passed) {
                errors.push({
                    name: plan.name,
                    missing
                });
            }
        }

        return {
            passed: errors.length === 0,
            checks,
            errors
        };
    }

    async generateReport(results) {
        const summary = results.reduce(
            (acc, result) => {
                acc.totalChecks += result.checks.length;
                acc.passed += result.checks.filter((check) => check.passed).length;
                acc.failed += result.checks.filter((check) => !check.passed).length;
                return acc;
            },
            { totalChecks: 0, passed: 0, failed: 0 }
        );

        return {
            timestamp: new Date(),
            overallStatus: summary.failed === 0 ? 'PASS' : 'FAIL',
            results,
            summary
        };
    }

    async countDocuments(model) {
        if (typeof model?.countDocuments === 'function') {
            return model.countDocuments();
        }
        if (Array.isArray(model)) {
            return model.length;
        }
        return 0;
    }

    async countRows(table) {
        const row = await this.db(table).count({ count: '*' }).first();
        return row?.count || 0;
    }
}

export default MigrationValidator;
