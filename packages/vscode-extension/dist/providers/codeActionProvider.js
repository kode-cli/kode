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
exports.KodeCodeActionProvider = exports.diagnosticCollection = void 0;
exports.analyzeDocument = analyzeDocument;
const vscode = __importStar(require("vscode"));
const aiClient_1 = require("../ai/aiClient");
exports.diagnosticCollection = vscode.languages.createDiagnosticCollection('kode');
async function analyzeDocument(document) {
    const config = vscode.workspace.getConfiguration('kode');
    const threshold = config.get('reviewSeverityThreshold', 'warning');
    const issues = await (0, aiClient_1.reviewCode)(document.getText());
    const severityMap = { error: 0, warning: 1, info: 2 };
    const thresholdLevel = severityMap[threshold] ?? 1;
    const diagnostics = issues
        .filter((issue) => (severityMap[issue.severity] ?? 1) <= thresholdLevel)
        .map((issue) => {
        const lineIndex = Math.max(0, issue.line - 1);
        const line = document.lineAt(Math.min(lineIndex, document.lineCount - 1));
        const range = new vscode.Range(lineIndex, line.firstNonWhitespaceCharacterIndex, lineIndex, line.text.length);
        const severity = issue.severity === 'error'
            ? vscode.DiagnosticSeverity.Error
            : issue.severity === 'warning'
                ? vscode.DiagnosticSeverity.Warning
                : vscode.DiagnosticSeverity.Information;
        const diagnostic = new vscode.Diagnostic(range, issue.message, severity);
        diagnostic.source = `Kode AI (${issue.category})`;
        diagnostic.code = issue.category;
        return diagnostic;
    });
    exports.diagnosticCollection.set(document.uri, diagnostics);
}
class KodeCodeActionProvider {
    provideCodeActions(document, range) {
        // Only show actions when there are diagnostics on this range
        const diagnostics = vscode.languages
            .getDiagnostics(document.uri)
            .filter((d) => d.source?.startsWith('Kode') &&
            d.range.intersection(range));
        if (diagnostics.length === 0)
            return [];
        const fix = new vscode.CodeAction('$(sparkle) Fix with Kode AI', vscode.CodeActionKind.QuickFix);
        fix.command = {
            command: 'kode.fixIssue',
            title: 'Fix with Kode AI',
            arguments: [document, range],
        };
        fix.diagnostics = diagnostics;
        fix.isPreferred = true;
        const explain = new vscode.CodeAction('$(question) Explain this issue', vscode.CodeActionKind.Empty);
        explain.command = {
            command: 'kode.explainIssue',
            title: 'Explain this issue',
            arguments: [document, range],
        };
        return [fix, explain];
    }
}
exports.KodeCodeActionProvider = KodeCodeActionProvider;
//# sourceMappingURL=codeActionProvider.js.map