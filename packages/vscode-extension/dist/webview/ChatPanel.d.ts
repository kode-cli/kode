import * as vscode from 'vscode';
export declare class ChatPanel {
    static currentPanel: ChatPanel | undefined;
    private static readonly viewType;
    private readonly _panel;
    private _disposables;
    private _history;
    private readonly _client;
    static createOrShow(extensionUri: vscode.Uri): void;
    private constructor();
    private _handleUserMessage;
    private _getHtml;
    dispose(): void;
}
//# sourceMappingURL=ChatPanel.d.ts.map