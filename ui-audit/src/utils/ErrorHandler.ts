/**
 * Error Handler Interface
 * Handles errors gracefully during audit process
 */

import type { ComponentFile, ParsedComponent, GuidelineRule, AuditError } from '../types/core.js';

export interface IErrorHandler {
    /**
     * Handle parsing errors for component files
     * @param file - Component file that failed to parse
     * @param error - Error that occurred
     */
    handleParsingError(file: ComponentFile, error: Error): void;

    /**
     * Handle analysis errors when rules fail
     * @param component - Component being analyzed
     * @param rule - Rule that failed
     * @param error - Error that occurred
     */
    handleAnalysisError(component: ParsedComponent, rule: GuidelineRule, error: Error): void;

    /**
     * Handle file system errors
     * @param path - Path that caused the error
     * @param error - Error that occurred
     */
    handleFileSystemError(path: string, error: Error): void;

    /**
     * Handle configuration errors
     * @param config - Configuration that caused the error
     * @param error - Error that occurred
     */
    handleConfigurationError(config: unknown, error: Error): void;

    /**
     * Get all errors that have occurred
     * @returns Array of audit errors
     */
    getErrors(): AuditError[];

    /**
     * Check if any errors have occurred
     * @returns True if errors exist
     */
    hasErrors(): boolean;
}
