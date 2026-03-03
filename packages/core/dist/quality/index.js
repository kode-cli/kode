"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printReport = exports.runSecurityScan = exports.runTests = exports.runLint = void 0;
exports.runQualityGate = runQualityGate;
async function runQualityGate(checks) {
    const results = [];
    for (const check of checks) {
        const result = await check.run();
        results.push(result);
        if (!result.passed)
            break; // stop on first failure
    }
    return results;
}
var lint_js_1 = require("./lint.js");
Object.defineProperty(exports, "runLint", { enumerable: true, get: function () { return lint_js_1.runLint; } });
var test_js_1 = require("./test.js");
Object.defineProperty(exports, "runTests", { enumerable: true, get: function () { return test_js_1.runTests; } });
var security_js_1 = require("./security.js");
Object.defineProperty(exports, "runSecurityScan", { enumerable: true, get: function () { return security_js_1.runSecurityScan; } });
var reporter_js_1 = require("./reporter.js");
Object.defineProperty(exports, "printReport", { enumerable: true, get: function () { return reporter_js_1.printReport; } });
//# sourceMappingURL=index.js.map