import * as vscode from 'vscode';
export declare const diagnosticCollection: vscode.DiagnosticCollection;
export declare function analyzeDocument(document: vscode.TextDocument): Promise<void>;
export declare class KodeCodeActionProvider implements vscode.CodeActionProvider {
    provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[];
}
//# sourceMappingURL=codeActionProvider.d.ts.map