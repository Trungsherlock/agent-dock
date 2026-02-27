import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SessionManager } from '../managers/sessionManager';
import { CATEGORIES } from '../constants/categories';
import { serializeSession, WebviewMessage, ExtensionMessage } from '../utils/messageProtocol';

export class BoardViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'agentdock.boardView';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _sessionManager: SessionManager,
    ) {}

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _content: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ): void {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'webview-ui', 'dist'),
            ],
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage((message: WebviewMessage) => {
            this._handleMessage(message);
        });

        this._sessionManager.onDidChange(() => {
            this._postStateUpdate();
        });
    }

    public postStateUpdate(): void {
        this._postStateUpdate();
    }

    private _handleMessage(message: WebviewMessage): void {
        switch (message.command) {
            case 'ready': {
                this._postStateUpdate();
                break;
            }
            case 'focusSession': {
                const s = this._sessionManager.getById(message.sessionId);
                s?.terminal.show();
                break;
            }
            case 'endSession': {
                const s = this._sessionManager.getById(message.sessionId);
                if (s) {
                    s.terminal.dispose();
                    this._sessionManager.remove(message.sessionId);
                }
                break;
            }
            case 'renameSession': {
                this._sessionManager.rename(message.sessionId, message.newName);
                break;
            }
            case 'moveSession': {
                this._sessionManager.setCategory(message.sessionId, message.newCategoryId);
                break;
            }
            case 'setNote': {
                this._sessionManager.setNote(message.sessionId, message.note);
                break;
            }
            case 'newSession': {
                vscode.commands.executeCommand('agentdock.newSession');
                break;
            }
        }
    }

    private _postStateUpdate(): void {
        if (!this._view) { return; }

        const msg: ExtensionMessage = {
            command: 'stateUpdate',
            sessions: this._sessionManager.getAll().map(serializeSession),
            categories: CATEGORIES.map(c => ({
                id: c.id,
                label: c.label,
                icon: c.icon,
                color: c.color,
            })),
        };
        this._view.webview.postMessage(msg);
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const distPath = vscode.Uri.joinPath(this._extensionUri, 'webview-ui', 'dist');
        const indexHtmlPath = path.join(distPath.fsPath, 'index.html');

        if (!fs.existsSync(indexHtmlPath)) {
            return `<!DOCTYPE html><body style="color:var(--vscode-foreground);padding:16px">
                    <p>Webview not built. Run:</p>
                    <pre>npm run build-webview</pre>
                </body>`;
        }

        let html = fs.readFileSync(indexHtmlPath, 'utf-8');

         // Vite builds with base './' — rewrite to proper webview URIs
        const assetsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(distPath, 'assets')
        ).toString();
        html = html.replace(/\.\/assets\//g, `${assetsUri}/`);

        // Inject Content-Security-Policy
        const csp = [
            `default-src 'none'`,
            `script-src ${webview.cspSource}`,
            `style-src ${webview.cspSource} 'unsafe-inline'`,
            `img-src ${webview.cspSource} data:`,
            `font-src ${webview.cspSource}`,
        ].join('; ');

        html = html.replace(
            '<head>',
            `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}">`
        );

        return html;
    }
}