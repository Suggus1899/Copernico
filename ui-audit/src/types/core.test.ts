/**
 * Basic test to verify Jest configuration
 */

import type { GuidelineCategory, PriorityLevel } from './core.js';

describe('Core Types', () => {
    it('should have valid guideline categories', () => {
        const categories: GuidelineCategory[] = [
            'interactions',
            'animations',
            'layout',
            'content',
            'forms',
            'performance',
            'design',
        ];

        expect(categories).toHaveLength(7);
        expect(categories).toContain('interactions');
        expect(categories).toContain('design');
    });

    it('should have valid priority levels', () => {
        const priorities: PriorityLevel[] = ['critical', 'high', 'medium', 'low'];

        expect(priorities).toHaveLength(4);
        expect(priorities).toContain('critical');
        expect(priorities).toContain('low');
    });
});
