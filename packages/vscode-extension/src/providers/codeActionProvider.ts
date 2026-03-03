import * as vscode from 'vscode';
import { reviewCode } from '../ai/aiClient';

export const diagnosticCollection =
    vscode.languages.createDiagnosticCollection('kode');

export async function analyzeDocument(
    document: vscode.TextDocument
): Promise<void> {
    const config = vscode.workspace.getConfiguration('kode');
    const threshold = config.get<string>('reviewSeverityThreshold', 'warning');

    const issues = await reviewCode(document.getText());

    const severityMap: Record<string, number> = { error: 0, warning: 1, info: 2 };
    const thresholdLevel = severityMap[threshold] ?? 1;

    const diagnostics = issues
        .filter((issue) => (severityMap[issue.severity] ?? 1) <= thresholdLevel)
        .map((issue) => {
            const lineIndex = Math.max(0, issue.line - 1);
            const line = document.lineAt(Math.min(lineIndex, document.lineCount - 1));
            const range = new vscode.Range(
                lineIndex,
                line.firstNonWhitespaceCharacterIndex,
                lineIndex,
                line.text.length
            );

            const severity =
                issue.severity === 'error'
                    ? vscode.DiagnosticSeverity.Error
                    : issue.severity === 'warning'
                        ? vscode.DiagnosticSeverity.Warning
                        : vscode.DiagnosticSeverity.Information;

            const diagnostic = new vscode.Diagnostic(range, issue.message, severity);
            diagnostic.source = `Kode AI (${issue.category})`;
            diagnostic.code = issue.category;
            return diagnostic;
        });

    diagnosticCollection.set(document.uri, diagnostics);
}

export class KodeCodeActionProvider implements vscode.CodeActionProvider {
    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range
    ): vscode.CodeAction[] {
        // Only show actions when there are diagnostics on this range
        const diagnostics = vscode.languages
            .getDiagnostics(document.uri)
            .filter(
                (d) =>
                    d.source?.startsWith('Kode') &&
                    d.range.intersection(range)
            );

        if (diagnostics.length === 0) return [];

        const fix = new vscode.CodeAction(
            '$(sparkle) Fix with Kode AI',
            vscode.CodeActionKind.QuickFix
        );
        fix.command = {
            command: 'kode.fixIssue',
            title: 'Fix with Kode AI',
            arguments: [document, range],
        };
        fix.diagnostics = diagnostics;
        fix.isPreferred = true;

        const explain = new vscode.CodeAction(
            '$(question) Explain this issue',
            vscode.CodeActionKind.Empty
        );
        explain.command = {
            command: 'kode.explainIssue',
            title: 'Explain this issue',
            arguments: [document, range],
        };

        return [fix, explain];
    }
}