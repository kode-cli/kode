import { vi } from 'vitest';

const vscode = {
    window: {
        createStatusBarItem: vi.fn(() => ({
            text: '',
            tooltip: '',
            show: vi.fn(),
            hide: vi.fn(),
            dispose: vi.fn(),
        })),
        activeTextEditor: undefined,
        showWarningMessage: vi.fn(),
        showInformationMessage: vi.fn(),
        showInputBox: vi.fn(),
        showQuickPick: vi.fn(),
        showTextDocument: vi.fn(),
        withProgress: vi.fn(),
        onDidChangeActiveTextEditor: vi.fn(() => ({ dispose: vi.fn() })),
        createWebviewPanel: vi.fn(() => ({
            webview: {
                html: '',
                onDidReceiveMessage: vi.fn(() => ({ dispose: vi.fn() })),
                postMessage: vi.fn(),
            },
            onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
            reveal: vi.fn(),
            dispose: vi.fn(),
        })),
    },
    commands: {
        registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
        executeCommand: vi.fn(),
    },
    workspace: {
        workspaceFolders: undefined,
        openTextDocument: vi.fn(),
        getConfiguration: vi.fn(() => ({
            get: vi.fn((key: string, defaultValue?: unknown) => defaultValue),
        })),
        onDidSaveTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
    },
    languages: {
        createDiagnosticCollection: vi.fn(() => ({
            set: vi.fn(),
            clear: vi.fn(),
            dispose: vi.fn(),
        })),
        registerCodeActionsProvider: vi.fn(() => ({ dispose: vi.fn() })),
        getDiagnostics: vi.fn(() => []),
    },
    Uri: {
        parse: vi.fn((s: string) => ({ toString: () => s })),
        file: vi.fn((s: string) => ({ toString: () => s, fsPath: s })),
    },
    Range: vi.fn((startLine: number, startChar: number, endLine: number, endChar: number) => ({
        start: { line: startLine, character: startChar },
        end: { line: endLine, character: endChar },
        intersection: vi.fn(),
    })),
    Position: vi.fn((line: number, character: number) => ({ line, character })),
    Diagnostic: vi.fn((range: unknown, message: string, severity: unknown) => ({
        range,
        message,
        severity,
        source: '',
        code: '',
    })),
    DiagnosticSeverity: {
        Error: 0,
        Warning: 1,
        Information: 2,
        Hint: 3,
    },
    CodeActionKind: {
        QuickFix: { value: 'quickfix', append: vi.fn() },
        Empty: { value: '', append: vi.fn() },
        Refactor: { value: 'refactor', append: vi.fn() },
    },
    CodeAction: vi.fn((title: string, kind: unknown) => ({
        title,
        kind,
        command: undefined,
        diagnostics: [],
        isPreferred: false,
    })),
    ProgressLocation: {
        Notification: 15,
        SourceControl: 1,
        Window: 10,
    },
    ViewColumn: {
        One: 1,
        Two: 2,
        Beside: -2,
        Active: -1,
    },
    StatusBarAlignment: {
        Left: 1,
        Right: 2,
    },
    EventEmitter: vi.fn(() => ({
        event: vi.fn(),
        fire: vi.fn(),
        dispose: vi.fn(),
    })),
};

export default vscode;
export const {
    window,
    commands,
    workspace,
    languages,
    Uri,
    Range,
    Position,
    Diagnostic,
    DiagnosticSeverity,
    CodeActionKind,
    CodeAction,
    ProgressLocation,
    ViewColumn,
    StatusBarAlignment,
    EventEmitter,
} = vscode;

