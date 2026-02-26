/**
 * Report Generator Interface
 * Generates audit reports in various formats
 */

import type { AnalysisResult, AuditReport } from '../types/core.js';

export interface IReportGenerator {
    /**
     * Generate an audit report from analysis results
     * @param analysis - Array of analysis results
     * @returns Audit report
     */
    generate(analysis: AnalysisResult[]): AuditReport;

    /**
     * Format report as Markdown
     * @param report - Audit report
     * @returns Markdown string
     */
    formatMarkdown(report: AuditReport): string;

    /**
     * Format report as JSON
     * @param report - Audit report
     * @returns JSON string
     */
    formatJSON(report: AuditReport): string;

    /**
     * Format report as HTML
     * @param report - Audit report
     * @returns HTML string
     */
    formatHTML(report: AuditReport): string;
}
