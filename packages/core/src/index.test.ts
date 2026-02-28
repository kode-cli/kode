import { describe, it, expect } from 'vitest';
import { CONFIG_VERSION } from './config';
import { TEMPLATE_VERSION } from './templates';
import { GIT_VERSION } from './git';
import { AI_VERSION } from './ai';
import { QUALITY_VERSION } from './quality';

describe('Stage 1.1 — Core package smoke test', () => {
    it('exports CONFIG_VERSION', () => {
        expect(CONFIG_VERSION).toBe('0.0.1');
    });

    it('exports TEMPLATE_VERSION', () => {
        expect(TEMPLATE_VERSION).toBe('0.0.1');
    });

    it('exports GIT_VERSION', () => {
        expect(GIT_VERSION).toBe('0.0.1');
    });

    it('exports AI_VERSION', () => {
        expect(AI_VERSION).toBe('0.0.1');
    });

    it('exports QUALITY_VERSION', () => {
        expect(QUALITY_VERSION).toBe('0.0.1');
    });
});
