import * as vscode from 'vscode';
import { generateCodeStreaming, reviewCode, fixCode } from './ai/aiClient';
import { GitClient } from '@kode/core';
import { MyToolCodeActionProvider, diagnosticCollection, analyzeDocument } from './providers/codeActionProvider';
import { ChatPanel } from './webview/ChatPanel';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext): void {
    console.log('Kode extension activated');

    // ── Status Bar ────────────────────────────────────────────────────────────
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = '$(kode-icon) Kode';
    statusBarItem.tooltip = 'Kode AI Assistant';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    updateStatusBar();

    // ── Commands ──────────────────────────────────────────────────────────────

    // Generate Code
    const generateCmd = vscode.commands.registerCommand('kode.generateCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found.');
            return;
        }

        const selection = editor.document.getText(editor.selection);
        const prompt = selection.trim() ||
            await vscode.window.showInputBox({ prompt: 'Describe what to generate:' });

        if (!prompt) return;

        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Kode: Generating code…', cancellable: false },
            async () => {
                const position = editor.selection.end;
                await editor.edit((builder) => builder.insert(position, '\n'));

                let insertPosition = new vscode.Position(position.line + 1, 0);

                await generateCodeStreaming(prompt, editor.document.languageId, async (chunk) => {
                    await editor.edit((builder) => {
                        builder.insert(insertPosition, chunk);
                    });
                    const lines = chunk.split('\n');
                    if (lines.length > 1) {
                        insertPosition = new vscode.Position(
                            insertPosition.line + lines.length - 1,
                            lines[lines.length - 1].length
                        );
                    } else {
                        insertPosition = new vscode.Position(
                            insertPosition.line,
                            insertPosition.character + chunk.length
                        );
                    }
                });
            }
        );
    });

    // Explain Code
    const explainCmd = vscode.commands.registerCommand('kode.explainCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const code = editor.document.getText(editor.selection) || editor.document.getText();
        if (!code.trim()) {
            vscode.window.showWarningMessage('Nothing to explain.');
            return;
        }

        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Kode: Explaining code…', cancellable: false },
            async () => {
                let explanation = '';
                await generateCodeStreaming(
                    `Explain this code in plain English:\n\n${code}`,
                    'markdown',
                    (chunk) => { explanation += chunk; }
                );

                const doc = await vscode.workspace.openTextDocument({
                    content: `# Code Explanation\n\n${explanation}`,
                    language: 'markdown',
                });
                await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
            }
        );
    });

    // Refactor Code
    const refactorCmd = vscode.commands.registerCommand('kode.refactorCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const code = editor.document.getText(editor.selection);
        if (!code.trim()) {
            vscode.window.showWarningMessage('Select code to refactor first.');
            return;
        }

        const refactorType = await vscode.window.showQuickPick(
            ['Extract Function', 'Simplify', 'Add Types', 'Add Error Handling', 'Add Comments'],
            { placeHolder: 'Choose refactor type' }
        );
        if (!refactorType) return;

        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: `Kode: Refactoring (${refactorType})…`, cancellable: false },
            async () => {
                let refactored = '';
                await generateCodeStreaming(
                    `Refactor this code — ${refactorType}. Return ONLY the refactored code, no explanation:\n\n${code}`,
                    editor.document.languageId,
                    (chunk) => { refactored += chunk; }
                );

                await editor.edit((builder) => {
                    builder.replace(editor.selection, refactored);
                });
            }
        );
    });

    // Review File
    const reviewCmd = vscode.commands.registerCommand('kode.reviewFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Kode: Reviewing file…', cancellable: false },
            async () => {
                await analyzeDocument(editor.document);
            }
        );

        vscode.window.showInformationMessage('Kode: Review complete. Check the Problems panel.');
    });

    // Fix Issue
    const fixIssueCmd = vscode.commands.registerCommand(
        'kode.fixIssue',
        async (document: vscode.TextDocument, range: vscode.Range) => {
            const original = document.getText(range);
            const fixed = await fixCode(original);

            const originalUri = vscode.Uri.parse(`untitled:Original-${Date.now()}`);
            const fixedUri = vscode.Uri.parse(`untitled:Fixed-${Date.now()}`);

            await vscode.workspace.openTextDocument({ content: original });
            await vscode.workspace.openTextDocument({ content: fixed });

            await vscode.commands.executeCommand('vscode.diff', originalUri, fixedUri, 'Kode: Review Fix');

            const apply = await vscode.window.showInformationMessage(
                'Apply this fix?', 'Apply', 'Dismiss'
            );

            if (apply === 'Apply') {
                const editor = await vscode.window.showTextDocument(document);
                await editor.edit((builder) => builder.replace(range, fixed));
            }
        }
    );

    // Explain Issue
    const explainIssueCmd = vscode.commands.registerCommand(
        'kode.explainIssue',
        async (document: vscode.TextDocument, range: vscode.Range) => {
            const code = document.getText(range);
            let explanation = '';

            await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: 'Kode: Explaining issue…', cancellable: false },
                async () => {
                    await generateCodeStreaming(
                        `Explain what is wrong with this code and how to fix it:\n\n${code}`,
                        'markdown',
                        (chunk) => { explanation += chunk; }
                    );
                }
            );

            const doc = await vscode.workspace.openTextDocument({
                content: `# Issue Explanation\n\n${explanation}`,
                language: 'markdown',
            });
            await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
        }
    );

    // Open Chat
    const chatCmd = vscode.commands.registerCommand('kode.openChat', () => {
        ChatPanel.createOrShow(context.extensionUri);
    });

    // ── Code Actions Provider ─────────────────────────────────────────────────
    const codeActionProvider = vscode.languages.registerCodeActionsProvider(
        [
            { scheme: 'file', language: 'typescript' },
            { scheme: 'file', language: 'typescriptreact' },
            { scheme: 'file', language: 'javascript' },
            { scheme: 'file', language: 'javascriptreact' },
        ],
        new MyToolCodeActionProvider(),
        { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix, vscode.CodeActionKind.Empty] }
    );

    // ── Auto-review on save ───────────────────────────────────────────────────
    let reviewTimeout: NodeJS.Timeout | undefined;
    const onSave = vscode.workspace.onDidSaveTextDocument(async (document) => {
        const config = vscode.workspace.getConfiguration('kode');
        if (!config.get<boolean>('reviewOnSave', true)) return;

        const supportedLanguages = ['typescript', 'typescriptreact', 'javascript', 'javascriptreact'];
        if (!supportedLanguages.includes(document.languageId)) return;

        // Debounce — wait 500ms after save
        if (reviewTimeout) clearTimeout(reviewTimeout);
        reviewTimeout = setTimeout(async () => {
            await analyzeDocument(document);
        }, 500);
    });

    // ── Git status bar update ─────────────────────────────────────────────────
    const onChangeEditor = vscode.window.onDidChangeActiveTextEditor(() => {
        updateStatusBar();
    });

    context.subscriptions.push(
        generateCmd,
        explainCmd,
        refactorCmd,
        reviewCmd,
        fixIssueCmd,
        explainIssueCmd,
        chatCmd,
        codeActionProvider,
        diagnosticCollection,
        onSave,
        onChangeEditor,
    );
}

async function updateStatusBar(): Promise<void> {
    try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return;

        const git = new GitClient(workspaceFolders[0].uri.fsPath);
        if (!(await git.isRepo())) return;

        const branch = await git.getCurrentBranch();
        statusBarItem.text = `$(git-branch) ${branch.trim()}`;
    } catch {
        statusBarItem.text = '$(kode-icon) Kode';
    }
}

export function deactivate(): void {
    diagnosticCollection?.dispose();
}