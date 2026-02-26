/**
 * Remediation Plan Generator Interface
 * Creates prioritized remediation plans from audit reports
 */

import type {
    AuditReport,
    RemediationPlan,
    Violation,
    EffortEstimate,
    Fix,
    FixDependency,
} from '../types/core.js';

export interface IRemediationPlanGenerator {
    /**
     * Generate a remediation plan from an audit report
     * @param report - Audit report
     * @returns Remediation plan
     */
    generate(report: AuditReport): RemediationPlan;

    /**
     * Estimate effort required to fix a violation
     * @param violation - Violation to estimate
     * @returns Effort estimate
     */
    estimateEffort(violation: Violation): EffortEstimate;

    /**
     * Find dependencies between fixes
     * @param fixes - Array of fixes
     * @returns Array of fix dependencies
     */
    findDependencies(fixes: Fix[]): FixDependency[];

    /**
     * Order fixes optimally based on priority and dependencies
     * @param fixes - Array of fixes
     * @returns Ordered array of fixes
     */
    orderFixes(fixes: Fix[]): Fix[];
}
