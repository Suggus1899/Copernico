/**
 * Violation Detector Interface
 * Identifies and classifies violations from rule results
 */

import type {
    RuleResult,
    Violation,
    PrioritizedViolation,
    GroupedViolations,
} from '../types/core.js';

export interface IViolationDetector {
    /**
     * Extract violations from rule results
     * @param results - Array of rule results
     * @returns Array of violations
     */
    detect(results: RuleResult[]): Violation[];

    /**
     * Prioritize violations by scoring them
     * @param violations - Array of violations
     * @returns Array of prioritized violations with scores
     */
    prioritize(violations: Violation[]): PrioritizedViolation[];

    /**
     * Group violations by different dimensions
     * @param violations - Array of violations
     * @returns Grouped violations
     */
    group(violations: Violation[]): GroupedViolations;
}
