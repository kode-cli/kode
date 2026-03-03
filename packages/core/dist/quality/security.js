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
exports.runSecurityScan = runSecurityScan;
async function runSecurityScan(cwd) {
    const start = Date.now();
    const { execa } = await Promise.resolve().then(() => __importStar(require('execa')));
    // Check if semgrep is installed
    try {
        await execa('semgrep', ['--version'], { cwd });
    }
    catch {
        return {
            name: 'Security (Semgrep)',
            passed: true,
            output: 'Semgrep not installed — skipping. Install with: pip install semgrep',
            duration: Date.now() - start,
        };
    }
    try {
        const { stdout } = await execa('semgrep', ['--config=auto', '--json', 'src/'], { cwd });
        const report = JSON.parse(stdout);
        const critical = report.results.filter((r) => r.extra.severity === 'ERROR');
        return {
            name: 'Security (Semgrep)',
            passed: critical.length === 0,
            output: critical.length === 0
                ? `No critical issues found (${report.results.length} total findings)`
                : critical
                    .map((r) => `${r.path}:${r.start.line} — ${r.extra.message}`)
                    .join('\n'),
            duration: Date.now() - start,
        };
    }
    catch (err) {
        const error = err;
        // Semgrep exits with code 1 when findings exist — parse stdout anyway
        if (error.stdout) {
            try {
                const report = JSON.parse(error.stdout);
                const critical = report.results.filter((r) => r.extra.severity === 'ERROR');
                return {
                    name: 'Security (Semgrep)',
                    passed: critical.length === 0,
                    output: critical
                        .map((r) => `${r.path}:${r.start.line} — ${r.extra.message}`)
                        .join('\n'),
                    duration: Date.now() - start,
                };
            }
            catch {
                // fall through
            }
        }
        return {
            name: 'Security (Semgrep)',
            passed: false,
            output: error.message ?? String(err),
            duration: Date.now() - start,
        };
    }
}
//# sourceMappingURL=security.js.map