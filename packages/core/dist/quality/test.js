"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTests = runTests;
async function runTests(cwd) {
    const start = Date.now();
    const { execa } = await Promise.resolve().then(() => __importStar(require('execa')));
    try {
        const result = await execa('npx', ['vitest', 'run'], { cwd, all: true });
        return {
            name: 'Tests',
            passed: true,
            output: result.all ?? result.stdout,
            duration: Date.now() - start,
        };
    }
    catch (err) {
        const error = err;
        const output = error.all ?? error.stdout ?? error.stderr ?? error.message ?? String(err);
        // No test files — treat as pass
        if (output.includes('No test files found') ||
            output.includes('no tests') ||
            output.includes('No tests ran')) {
            return {
                name: 'Tests',
                passed: true,
                output: 'No test files found — skipping.',
                duration: Date.now() - start,
            };
        }
        return {
            name: 'Tests',
            passed: false,
            output,
            duration: Date.now() - start,
        };
    }
}
//# sourceMappingURL=test.js.map