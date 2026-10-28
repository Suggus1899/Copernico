/**
 * Analyzer Engine Interface
 * Coordinates analysis of components against guideline rules
 */

import type {
    ParsedComponent,
    AnalysisResult,
    GuidelineCategory,
    RuleResult,
} from '../types/core.js';

export interface IAnalyzerEngine {
    /**
     * Analyze a component against all registered rules
     * @param component - Parsed component to analyze
     * @returns Analysis result with violations and score
     */
    analyze(component: ParsedComponent): Promise<AnalysisResult>;

    /**
     * Apply rules from a specific category to a component
     * @param component - Parsed component to analyze
     * @param category - Guideline category to check
     * @returns Array of rule results
     */
    applyRules(component: ParsedComponent, category: GuidelineCategory): RuleResult[];

    /**
     * Aggregate multiple rule results into a single analysis result
     * @param results - Array of rule results
     * @returns Aggregated analysis result
     */
    aggregateResults(results: RuleResult[]): AnalysisResult;
}
