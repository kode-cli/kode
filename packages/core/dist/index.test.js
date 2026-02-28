"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const config_1 = require("./config");
const templates_1 = require("./templates");
const git_1 = require("./git");
const ai_1 = require("./ai");
const quality_1 = require("./quality");
(0, vitest_1.describe)('Stage 1.1 — Core package smoke test', () => {
    (0, vitest_1.it)('exports CONFIG_VERSION', () => {
        (0, vitest_1.expect)(config_1.CONFIG_VERSION).toBe('0.0.1');
    });
    (0, vitest_1.it)('exports TEMPLATE_VERSION', () => {
        (0, vitest_1.expect)(templates_1.TEMPLATE_VERSION).toBe('0.0.1');
    });
    (0, vitest_1.it)('exports GIT_VERSION', () => {
        (0, vitest_1.expect)(git_1.GIT_VERSION).toBe('0.0.1');
    });
    (0, vitest_1.it)('exports AI_VERSION', () => {
        (0, vitest_1.expect)(ai_1.AI_VERSION).toBe('0.0.1');
    });
    (0, vitest_1.it)('exports QUALITY_VERSION', () => {
        (0, vitest_1.expect)(quality_1.QUALITY_VERSION).toBe('0.0.1');
    });
});
//# sourceMappingURL=index.test.js.map