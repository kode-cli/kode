"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printReport = printReport;
function printReport(results) {
    console.log('\n── Quality Gate Results ─────────────────────');
    for (const r of results) {
        const icon = r.passed ? '✅' : '❌';
        const duration = `${r.duration}ms`;
        console.log(`${icon}  ${r.name.padEnd(25)} ${duration}`);
        if (!r.passed && r.output) {
            console.log('\n' + r.output.split('\n').map((l) => '   ' + l).join('\n'));
        }
    }
    console.log('─────────────────────────────────────────────\n');
}
//# sourceMappingURL=reporter.js.map