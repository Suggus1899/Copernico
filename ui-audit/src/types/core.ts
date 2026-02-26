/**
 * Core type definitions for UI Guidelines Audit system
 */

import type { Node } from '@babel/types';

// ============================================================================
// Component Types
// ============================================================================

export interface ComponentFile {
    path: string;
    name: string;
    content: string;
    size: number;
}

export interface ParsedComponent {
    file: ComponentFile;
    ast: Node;
    imports: Import[];
    exports: Export[];
    jsx: JSXElement[];
}

export interface ComponentMetadata {
    name: string;
    type: 'class' | 'functional';
    hooks: string[];
    props: PropDefinition[];
    state: StateDefinition[];
    hasStyles: boolean;
    dependencies: string[];
}

export interface Import {
    source: string;
    specifiers: string[];
    isDefault: boolean;
}

export interface Export {
    name: string;
    isDefault: boolean;
}

export interface JSXElement {
    type: string;
    props: Record<string, unknown>;
    children: JSXElement[];
    location: CodeLocation;
}

export interface PropDefinition {
    name: string;
    type?: string;
    required: boolean;
}

export interface StateDefinition {
    name: string;
    initialValue?: unknown;
}

// ============================================================================
// Guideline Rule Types
// ============================================================================

export type GuidelineCategory =
    | 'interactions'
    | 'animations'
    | 'layout'
    | 'content'
    | 'forms'
    | 'performance'
    | 'design';

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';

export interface GuidelineRule {
    id: string;
    category: GuidelineCategory;
    name: string;
    description: string;
    check(component: ParsedComponent): RuleResult;
    priority: PriorityLevel;
}

export interface RuleResult {
    rule: GuidelineRule;
    passed: boolean;
    violations: Violation[];
    suggestions: string[];
}

// ============================================================================
// Violation Types
// ============================================================================

export interface Violation {
    rule: GuidelineRule;
    component: string;
    location: CodeLocation;
    message: string;
    priority: PriorityLevel;
    category: GuidelineCategory;
    codeSnippet: string;
    suggestedFix: string;
}

export interface CodeLocation {
    file: string;
    line: number;
    column: number;
    endLine?: number;
    endColumn?: number;
}

export interface PrioritizedViolation extends Violation {
    score: number; // 0-100, higher = more urgent
    impact: 'accessibility' | 'ux' | 'performance' | 'maintainability';
    effort: 'small' | 'medium' | 'large';
}

export interface GroupedViolations {
    byCategory: Map<GuidelineCategory, Violation[]>;
    byPriority: Map<PriorityLevel, Violation[]>;
    byComponent: Map<string, Violation[]>;
    byRule: Map<string, Violation[]>;
}

// ============================================================================
// Analysis Types
// ============================================================================

export interface AnalysisResult {
    component: ComponentMetadata;
    violations: Violation[];
    warnings: Warning[];
    passedChecks: Check[];
    score: number; // 0-100
    timestamp: Date;
}

export interface Warning {
    message: string;
    location?: CodeLocation;
}

export interface Check {
    rule: GuidelineRule;
    message: string;
}

// ============================================================================
// Report Types
// ============================================================================

export interface AuditReport {
    metadata: ReportMetadata;
    summary: ReportSummary;
    violations: GroupedViolations;
    recommendations: Recommendation[];
    statistics: Statistics;
}

export interface ReportMetadata {
    timestamp: Date;
    componentsAnalyzed: number;
    rulesApplied: number;
    version: string;
}

export interface ReportSummary {
    totalViolations: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    averageScore: number;
    worstComponents: ComponentScore[];
}

export interface ComponentScore {
    name: string;
    score: number;
    violationCount: number;
    criticalCount: number;
}

export interface Recommendation {
    title: string;
    description: string;
    priority: PriorityLevel;
    affectedComponents: string[];
    estimatedEffort: string;
    codeExample: CodeExample;
}

export interface CodeExample {
    before: string;
    after: string;
    explanation: string;
}

export interface Statistics {
    violationsByCategory: Record<GuidelineCategory, number>;
    violationsByPriority: Record<PriorityLevel, number>;
    mostCommonViolations: Array<{ rule: string; count: number }>;
    componentCoverage: number;
}

// ============================================================================
// Remediation Plan Types
// ============================================================================

export interface RemediationPlan {
    phases: Phase[];
    totalEstimate: string;
    quickWins: Fix[];
    longTermImprovements: Fix[];
}

export interface Phase {
    name: string;
    description: string;
    fixes: Fix[];
    estimatedTime: string;
    priority: PriorityLevel;
}

export interface Fix {
    id: string;
    violation: Violation;
    component: string;
    description: string;
    codeExample: CodeExample;
    effort: EffortEstimate;
    dependencies: string[];
    testingNotes: string;
}

export interface EffortEstimate {
    size: 'small' | 'medium' | 'large';
    hours: number;
    complexity: 'low' | 'medium' | 'high';
}

export interface FixDependency {
    fixId: string;
    dependsOn: string[];
    reason: string;
}

// ============================================================================
// Error Handling Types
// ============================================================================

export interface AuditError {
    type: 'parsing' | 'analysis' | 'filesystem' | 'configuration';
    file?: string;
    component?: string;
    rule?: string;
    path?: string;
    message: string;
    severity: 'error' | 'warning';
}
