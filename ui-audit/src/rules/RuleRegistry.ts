/**
 * Rule Registry Interface
 * Manages registration and retrieval of guideline rules
 */

import type { GuidelineRule, GuidelineCategory, PriorityLevel } from '../types/core.js';

export interface IRuleRegistry {
    /**
     * Register a new guideline rule
     * @param rule - Rule to register
     */
    register(rule: GuidelineRule): void;

    /**
     * Get all rules for a specific category
     * @param category - Guideline category
     * @returns Array of rules in that category
     */
    getByCategory(category: GuidelineCategory): GuidelineRule[];

    /**
     * Get all rules with a specific priority level
     * @param priority - Priority level
     * @returns Array of rules with that priority
     */
    getByPriority(priority: PriorityLevel): GuidelineRule[];

    /**
     * Get a rule by its ID
     * @param id - Rule ID
     * @returns Rule if found, undefined otherwise
     */
    getById(id: string): GuidelineRule | undefined;

    /**
     * Get all registered rules
     * @returns Array of all rules
     */
    getAllRules(): GuidelineRule[];
}
