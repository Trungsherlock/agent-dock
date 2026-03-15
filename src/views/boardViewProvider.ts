import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SessionManager } from '../managers/sessionManager';
import { CohortManager } from '../managers/cohortManager';
import { serializeSession, WebviewMessage, ExtensionMessage } from '../utils/messageProtocol';
import { MessageHandler } from './messageHandler';
import { AgentRegistry } from '../agents/AgentRegistry';

export class BoardViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'agentdock.boardView';
    private _view?: vscode.WebviewView;
    private _panelWebviews = new Set<vscode.Webview>();
    private _messageHandler: MessageHandler;

    constructor(
        private readonly _context: vscode.ExtensionContext,
        private readonly _sessionManager: SessionManager,
        private readonly _cohortManager: CohortManager,
        registry: AgentRegistry,
    ) {
        this._messageHandler = new MessageHandler(
            _context,
            _sessionManager,
            _cohortManager,
            (msg) => this._view?.webview.postMessage(msg),
            () => this._postStateUpdate(),
            registry,
        );
    }

    private get _extensionUri() { return this._context.extensionUri; }

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

        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage((message: WebviewMessage) => {
            this._messageHandler.handle(message);
        });

        this._sessionManager.onDidChange(() => this._postStateUpdate());
        this._cohortManager.onDidChange(() => this._postStateUpdate());

        vscode.window.onDidChangeActiveTerminal((terminal) => {
            if (!terminal) { return; }
            const session = this._sessionManager.getAll().find(s => s.terminal === terminal);
            if (session) {
                this._view?.webview.postMessage({ command: 'sessionFocused', sessionId: session.id });
            }
        });

        const pollInterval = setInterval(() => {
            if (this._messageHandler.renamingSessionId) { return; }
            for (const session of this._sessionManager.getAll()) {
                if (!session.terminal) { continue; }
                if (session.terminal.name === session.name) { continue; }
                // Skip if the terminal is still at its original creation name — not user-renamed.
                // After VS Code reload, terminal.name always returns the creation name.
                if (session.terminal.name === session.terminalCreationName) { continue; }
                this._sessionManager.rename(session.id, session.terminal.name);
            }
        }, 500);
        this._context.subscriptions.push({ dispose: () => clearInterval(pollInterval) });
    }

    public postStateUpdate(): void {
        this._postStateUpdate();
    }

    private _postStateUpdate(): void {
        const sessions: ReturnType<typeof serializeSession>[] = [];
        for (const s of this._sessionManager.getAll()) {
            try { sessions.push(serializeSession(s)); } catch (e) {
                console.warn('[BoardViewProvider] Failed to serialize session', s.id, e);
            }
        }
        const msg: ExtensionMessage = {
            command: 'stateUpdate',
            sessions,
            cohorts: this._cohortManager.getAll().map(c => ({ id: c.id, label: c.label })),
        };
        this._view?.webview.postMessage(msg);
        for (const wv of this._panelWebviews) {
            wv.postMessage(msg);
        }
    }

    public wirePanel(panel: vscode.WebviewPanel): void {
        this._panelWebviews.add(panel.webview);
        panel.webview.onDidReceiveMessage((message: WebviewMessage) => {
            this._messageHandler.handle(message);
        });
        panel.onDidDispose(() => {
            this._panelWebviews.delete(panel.webview);
        });
    }

    public getHtmlForWebview(webview: vscode.Webview): string {
        const distPath = vscode.Uri.joinPath(this._extensionUri, 'webview-ui', 'dist');
        const indexHtmlPath = path.join(distPath.fsPath, 'index.html');

        if (!fs.existsSync(indexHtmlPath)) {
            return `<!DOCTYPE html><body style="color:var(--vscode-foreground);padding:16px">
                    <p>Webview not built. Run:</p>
                    <pre>npm run build-webview</pre>
                </body>`;
        }

        let html = fs.readFileSync(indexHtmlPath, 'utf-8');
        const assetsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(distPath, 'assets')
        ).toString();
        html = html.replace(/\.\/assets\//g, `${assetsUri}/`);

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

    dispose() {
        // Do NOT dispose terminals here — they belong to the user, not the extension.
        // VS Code manages terminal lifecycle independently.
    }
}
