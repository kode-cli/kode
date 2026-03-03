export type CheckResult = {
    name: string;
    passed: boolean;
    output: string;
    duration: number;
};
export interface QualityCheck {
    run(): Promise<CheckResult>;
}
export declare function runQualityGate(checks: QualityCheck[]): Promise<CheckResult[]>;
export { runLint } from './lint.js';
export { runTests } from './test.js';
export { runSecurityScan } from './security.js';
export { printReport } from './reporter.js';
//# sourceMappingURL=index.d.ts.map