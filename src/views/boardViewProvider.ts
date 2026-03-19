import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SessionManager } from '../managers/sessionManager';
import { CohortManager } from '../managers/cohortManager';
import { serializeSession, WebviewMessage, ExtensionMessage } from '../utils/messageProtocol';
import { MessageHandler } from './messageHandler';
import { AgentRegistry } from '../agents/AgentRegistry';
import { AgentScanner } from '../services/AgentScanner';

export class BoardViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'agentdock.boardView';
    private _view?: vscode.WebviewView;
    private _panelWebviews = new Set<vscode.Webview>();
    private _messageHandler: MessageHandler;
    private readonly _agentScanner = new AgentScanner();
    private _projectRoot: string = '';

    constructor(
        private readonly _context: vscode.ExtensionContext,
        private readonly _sessionManager: SessionManager,
        private readonly _cohortManager: CohortManager,
        registry: AgentRegistry,
        projectRoot: string = '',
    ) {
        this._projectRoot = projectRoot;
        this._messageHandler = new MessageHandler(
            _context,
            _sessionManager,
            _cohortManager,
            (msg) => this._view?.webview.postMessage(msg),
            () => this._postStateUpdate(),
            registry,
            () => this.postAgentsUpdate(),
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

        this.postAgentsUpdate();
        if(this._projectRoot) {
            const watcher = vscode.workspace.createFileSystemWatcher(
                new vscode.RelativePattern(this._projectRoot, '.claude/agents/*.md')
            );
            watcher.onDidCreate(() => this.postAgentsUpdate());
            watcher.onDidChange(() => this.postAgentsUpdate());
            watcher.onDidDelete(() => this.postAgentsUpdate());
            this._context.subscriptions.push(watcher);
        }

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
                this._sessionManager.rename(session.id, session.terminal.name);
            }
        }, 500);

        // Watch global agents
        const globalAgentsPath = path.join(os.homedir(), '.claude', 'agents');
        const globalWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(vscode.Uri.file(globalAgentsPath), '**/*.md')
        );
        globalWatcher.onDidCreate(() => this.postAgentsUpdate());
        globalWatcher.onDidDelete(() => this.postAgentsUpdate());
        globalWatcher.onDidChange(() => this.postAgentsUpdate());
        this._context.subscriptions.push(globalWatcher);


        this._context.subscriptions.push({ dispose: () => clearInterval(pollInterval) });
    }

    public async postAgentsUpdate(): Promise<void> {
        const agents = await this._agentScanner.scanAll(this._projectRoot);
        console.log('[BoardViewProvider] postAgentsUpdate', agents.length, agents);
        const msg: ExtensionMessage = { command: 'agentsUpdate', agents };
        this._view?.webview.postMessage(msg);
        for (const wv of this._panelWebviews) {
            wv.postMessage(msg);
        }
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

    dispose() {}
}
