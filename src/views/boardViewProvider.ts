import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SessionManager } from '../managers/sessionManager';
import { CohortManager } from '../managers/cohortManager';
import { serializeSession, WebviewMessage, ExtensionMessage } from '../utils/messageProtocol';
import { getArchivedSessions } from '../managers/sessionLoader';
import { ClaudeLogWatcher } from '../watchers/claudeLogWatcher';
import { NAMES_KEY, SKILLS_KEY } from '../constants';
import { AddAgentPanel } from '../panels/AddAgentPanel';

export class BoardViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'agentdock.boardView';
    private _view?: vscode.WebviewView;
    private _panelWebviews = new Set<vscode.Webview>();
    private _nextAgentIdx = 1;
    private _renamingSessionId: string | undefined;

    constructor(
        private readonly _context: vscode.ExtensionContext,
        private readonly _sessionManager: SessionManager,
        private readonly _cohortManager: CohortManager,
    ) {}

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
            this._handleMessage(message);
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

        // Poll for terminal renames — VSCode has no onDidRenameTerminal event
        const pollInterval = setInterval(() => {
            if (this._renamingSessionId) { return; }
            for (const session of this._sessionManager.getAll()) {
                if (session.terminal && session.terminal.name !== session.name) {
                    this._sessionManager.rename(session.id, session.terminal.name);
                }
            }
        }, 500);
        this._context.subscriptions.push({ dispose: () => clearInterval(pollInterval) });
    }

    public postStateUpdate(): void {
        this._postStateUpdate();
    }

    private async _handleMessage(message: WebviewMessage): Promise<void> {
        switch (message.command) {
            case 'ready': {
                this._postStateUpdate();
                break;
            }
            case 'focusSession': {
                const s = this._sessionManager.getById(message.sessionId);
                if (!s) { break; }
                if (s.terminal) {
                    s.terminal.show();
                } else {
                    const found = vscode.window.terminals.find(t => t.name === s.name);
                    if (found) {
                        found.show();
                        this._sessionManager.setTerminal(s.id, found);
                    }
                }
                break;
            }
            case 'endSession': {
                const s = this._sessionManager.getById(message.sessionId);
                if (s) {
                    s.terminal?.dispose();
                    this._sessionManager.remove(message.sessionId);
                }
                break;
            }
            case 'renameSession': {
                this._sessionManager.rename(message.sessionId, message.newName);
                const s = this._sessionManager.getById(message.sessionId);
                if (s?.terminal) {
                    this._renamingSessionId = message.sessionId;
                    s.terminal.show(true);
                    await vscode.commands.executeCommand(
                        'workbench.action.terminal.renameWithArg',
                        { name: message.newName }
                    );
                    this._renamingSessionId = undefined;
                }
                break;
            }
            case 'moveSession': {
                this._sessionManager.setCohort(message.sessionId, message.newCohortId);
                break;
            }
            case 'setNote': {
                this._sessionManager.setNote(message.sessionId, message.note);
                break;
            }
            case 'setStatus': {
                this._sessionManager.setStatus(message.sessionId, message.status);
                break;
            }
            case 'resumeSession': {
                const s = this._sessionManager.getById(message.sessionId);
                if (!s) { break; }
                const terminal = vscode.window.createTerminal({
                    name: s.name,
                    cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
                });
                terminal.show();
                terminal.sendText(`claude --resume ${message.sessionId}`);
                this._sessionManager.setTerminal(message.sessionId, terminal);
                break;
            }
            case 'newSession': {
                const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                const name = `Claude Code #${this._nextAgentIdx++}`;
                const terminal = vscode.window.createTerminal({ name, cwd });
                terminal.show();
                terminal.sendText('claude');
                this._sessionManager.registerPendingAgent(name, message.cohortId, []);
                break;
            }
            case 'createCohort': {
                this._cohortManager.add(message.label);
                break;
            }
            case 'renameCohort': {
                this._cohortManager.rename(message.cohortId, message.newLabel);
                break;
            }
            case 'deleteCohort': {
                for (const s of this._sessionManager.getAll()) {
                    if (s.cohortId === message.cohortId) {
                        this._sessionManager.setCohort(s.id, 'uncategorized');
                    }
                }
                this._cohortManager.remove(message.cohortId);
                break;
            }
            case 'getArchivedSessions': {
                const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                const nameMap = this._context.workspaceState.get<Record<string, string>>(NAMES_KEY, {});
                const skillsMap = this._context.workspaceState.get<Record<string, string[]>>(SKILLS_KEY, {});
                const sessions = getArchivedSessions(this._sessionManager, workspacePath, nameMap, skillsMap);
                this._view?.webview.postMessage({ command: 'archivedSessionsUpdate', sessions });
                break;
            }
            case 'openAddAgentPanel': {
                const projectRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
                AddAgentPanel.createOrShow(
                    this._context,
                    projectRoot,
                    message.cohortId,
                    (config, filePath) => {
                        const terminal = vscode.window.createTerminal({
                            name: config.name,
                            cwd: projectRoot,
                        });
                        terminal.show();
                        terminal.sendText('claude');
                        this._sessionManager.registerPendingAgent(
                            config.name,
                            config.cohortId ?? 'uncategorized',
                            config.skills ?? [],
                        );
                        vscode.window.showInformationMessage(
                            `Agent '${config.name}' created at ${filePath}`,
                        );
                    },
                );
                break;
            }
            case 'openFile': {
                const wsPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
                const filePath = path.isAbsolute(message.filePath)
                    ? message.filePath
                    : path.join(wsPath, message.filePath);
                vscode.workspace.openTextDocument(vscode.Uri.file(filePath)).then(doc => {
                    vscode.window.showTextDocument(doc, { preserveFocus: false });
                });
                break;
            }
            case 'addExistingSession': {
                const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                const nameMap = this._context.workspaceState.get<Record<string, string>>(NAMES_KEY, {});
                const skillsMap = this._context.workspaceState.get<Record<string, string[]>>(SKILLS_KEY, {});
                const archived = getArchivedSessions(this._sessionManager, workspacePath, nameMap, skillsMap);
                const found = archived.find(a => a.id === message.sessionId);
                if (!found) { break; }
                const session = this._sessionManager.add(found.id, found.name, 'uncategorized');
                this._sessionManager.setClaudeLogFile(session.id, found.claudeLogFile);
                this._sessionManager.setStatus(session.id, 'idle');
                if (found.skills?.length) { this._sessionManager.setSkills(session.id, found.skills); }
                const terminal = vscode.window.createTerminal({
                    name: found.name,
                    cwd: vscode.workspace.workspaceFolders?.[0].uri.fsPath,
                });
                terminal.sendText(`claude --resume ${found.id}`);
                terminal.show();
                this._sessionManager.setTerminal(found.id, terminal);
                const watcher = new ClaudeLogWatcher(session.id, found.claudeLogFile, this._sessionManager, true);
                this._context.subscriptions.push({ dispose: () => watcher.dispose() });
                break;
            }
        }
    }

    private _postStateUpdate(): void {
        const msg: ExtensionMessage = {
            command: 'stateUpdate',
            sessions: this._sessionManager.getAll().map(serializeSession),
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
            this._handleMessage(message);
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
        for (const session of this._sessionManager.getAll()) {
            session.terminal?.dispose();
        }
    }
}