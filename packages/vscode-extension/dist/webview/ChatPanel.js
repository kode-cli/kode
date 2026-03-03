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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatPanel = void 0;
const vscode = __importStar(require("vscode"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
class ChatPanel {
    static createOrShow(extensionUri) {
        const column = vscode.window.activeTextEditor
            ? vscode.ViewColumn.Beside
            : vscode.ViewColumn.One;
        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel._panel.reveal(column);
            return;
        }
        const panel = vscode.window.createWebviewPanel(ChatPanel.viewType, 'Kode AI Chat', column, {
            enableScripts: true,
            retainContextWhenHidden: true,
        });
        ChatPanel.currentPanel = new ChatPanel(panel, extensionUri);
    }
    constructor(panel, _extensionUri) {
        this._disposables = [];
        this._history = [];
        this._panel = panel;
        this._client = new sdk_1.default();
        this._panel.webview.html = this._getHtml();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(async (message) => {
            if (message.type === 'userMessage' && message.text) {
                await this._handleUserMessage(message.text);
            }
            else if (message.type === 'clearHistory') {
                this._history = [];
                this._panel.webview.postMessage({ type: 'cleared' });
            }
        }, null, this._disposables);
    }
    async _handleUserMessage(text) {
        // Include current file context
        const editor = vscode.window.activeTextEditor;
        let systemPrompt = 'You are Kode, an expert AI coding assistant built into VS Code. Be concise and helpful.';
        if (editor) {
            const fileContent = editor.document.getText();
            const fileName = editor.document.fileName.split('/').pop();
            systemPrompt += `\n\nCurrent file: ${fileName}\n\`\`\`${editor.document.languageId}\n${fileContent.slice(0, 8000)}\n\`\`\``;
        }
        this._history.push({ role: 'user', content: text });
        // Send typing indicator
        this._panel.webview.postMessage({ type: 'assistantStart' });
        try {
            let response = '';
            const stream = this._client.messages.stream({
                model: vscode.workspace.getConfiguration('kode').get('aiModel', 'claude-sonnet-4-6'),
                max_tokens: 2048,
                system: systemPrompt,
                messages: this._history,
            });
            for await (const chunk of stream) {
                if (chunk.type === 'content_block_delta' &&
                    chunk.delta.type === 'text_delta') {
                    response += chunk.delta.text;
                    this._panel.webview.postMessage({
                        type: 'assistantChunk',
                        text: chunk.delta.text,
                    });
                }
            }
            this._history.push({ role: 'assistant', content: response });
            this._panel.webview.postMessage({ type: 'assistantEnd' });
        }
        catch (err) {
            this._panel.webview.postMessage({
                type: 'error',
                text: err instanceof Error ? err.message : 'An error occurred',
            });
        }
    }
    _getHtml() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kode AI Chat</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            display: flex;
            flex-direction: column;
            height: 100vh;
            overflow: hidden;
        }
        #toolbar {
            padding: 8px 12px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        #clear-btn {
            background: none;
            border: 1px solid var(--vscode-button-border, transparent);
            color: var(--vscode-button-foreground);
            background: var(--vscode-button-secondaryBackground);
            padding: 2px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
        }
        #messages {
            flex: 1;
            overflow-y: auto;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .message {
            max-width: 90%;
            padding: 8px 12px;
            border-radius: 6px;
            line-height: 1.5;
            white-space: pre-wrap;
            word-break: break-word;
        }
        .user {
            align-self: flex-end;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .assistant {
            align-self: flex-start;
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
        }
        .assistant.streaming { opacity: 0.85; }
        .typing { color: var(--vscode-descriptionForeground); font-style: italic; font-size: 12px; }
        #input-area {
            padding: 12px;
            border-top: 1px solid var(--vscode-panel-border);
            display: flex;
            gap: 8px;
        }
        #input {
            flex: 1;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border, transparent);
            border-radius: 4px;
            padding: 6px 10px;
            font-family: inherit;
            font-size: inherit;
            resize: none;
            min-height: 36px;
            max-height: 120px;
        }
        #input:focus { outline: 1px solid var(--vscode-focusBorder); }
        #send-btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            padding: 6px 14px;
            cursor: pointer;
            font-size: 13px;
            align-self: flex-end;
        }
        #send-btn:hover { background: var(--vscode-button-hoverBackground); }
        #send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        code {
            font-family: var(--vscode-editor-font-family);
            background: var(--vscode-textCodeBlock-background);
            padding: 1px 4px;
            border-radius: 3px;
            font-size: 0.9em;
        }
        pre {
            background: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
            margin: 6px 0;
        }
        pre code { background: none; padding: 0; }
    </style>
</head>
<body>
    <div id="toolbar">
        <span>Kode AI — context-aware chat</span>
        <button id="clear-btn">Clear</button>
    </div>
    <div id="messages">
        <div class="message assistant">👋 Hi! I'm Kode, your AI coding assistant. I can see your current file for context. Ask me anything!</div>
    </div>
    <div id="input-area">
        <textarea id="input" placeholder="Ask anything about your code…" rows="1"></textarea>
        <button id="send-btn">Send</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const messagesEl = document.getElementById('messages');
        const inputEl = document.getElementById('input');
        const sendBtn = document.getElementById('send-btn');
        const clearBtn = document.getElementById('clear-btn');

        let currentAssistantEl = null;
        let isStreaming = false;

        function scrollToBottom() {
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        function addMessage(role, text) {
            const el = document.createElement('div');
            el.className = 'message ' + role;
            el.textContent = text;
            messagesEl.appendChild(el);
            scrollToBottom();
            return el;
        }

        function sendMessage() {
            const text = inputEl.value.trim();
            if (!text || isStreaming) return;

            addMessage('user', text);
            inputEl.value = '';
            inputEl.style.height = 'auto';
            sendBtn.disabled = true;
            isStreaming = true;

            vscode.postMessage({ type: 'userMessage', text });
        }

        sendBtn.addEventListener('click', sendMessage);

        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        inputEl.addEventListener('input', () => {
            inputEl.style.height = 'auto';
            inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
        });

        clearBtn.addEventListener('click', () => {
            vscode.postMessage({ type: 'clearHistory' });
        });

        window.addEventListener('message', (event) => {
            const msg = event.data;
            if (msg.type === 'assistantStart') {
                currentAssistantEl = document.createElement('div');
                currentAssistantEl.className = 'message assistant streaming';
                currentAssistantEl.textContent = '';
                messagesEl.appendChild(currentAssistantEl);
                scrollToBottom();
            } else if (msg.type === 'assistantChunk') {
                if (currentAssistantEl) {
                    currentAssistantEl.textContent += msg.text;
                    scrollToBottom();
                }
            } else if (msg.type === 'assistantEnd') {
                if (currentAssistantEl) {
                    currentAssistantEl.classList.remove('streaming');
                    currentAssistantEl = null;
                }
                sendBtn.disabled = false;
                isStreaming = false;
            } else if (msg.type === 'error') {
                if (currentAssistantEl) {
                    currentAssistantEl.textContent = '❌ Error: ' + msg.text;
                    currentAssistantEl.classList.remove('streaming');
                    currentAssistantEl = null;
                }
                sendBtn.disabled = false;
                isStreaming = false;
            } else if (msg.type === 'cleared') {
                messagesEl.innerHTML = '<div class="message assistant">History cleared. Ask me anything!</div>';
            }
        });
    </script>
</body>
</html>`;
    }
    dispose() {
        ChatPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const d = this._disposables.pop();
            if (d)
                d.dispose();
        }
    }
}
exports.ChatPanel = ChatPanel;
ChatPanel.viewType = 'kodeChat';
//# sourceMappingURL=ChatPanel.js.map