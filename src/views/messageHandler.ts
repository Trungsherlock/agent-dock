import * as vscode from 'vscode';
import * as path from 'path';
import { SessionManager } from '../managers/sessionManager';
import { CohortManager } from '../managers/cohortManager';
import { WebviewMessage } from '../utils/messageProtocol';
import { getArchivedSessions } from '../managers/sessionLoader';
import { ClaudeLogWatcher } from '../watchers/claudeLogWatcher';
import { NAMES_KEY, SKILLS_KEY } from '../constants';
import { AddAgentPanel } from '../panels/AddAgentPanel';
import { AgentRegistry } from '../agents/AgentRegistry';

export class MessageHandler {
    renamingSessionId: string | undefined;

    constructor(
        private readonly _context: vscode.ExtensionContext,
        private readonly _sessionManager: SessionManager,
        private readonly _cohortManager: CohortManager,
        private readonly _postMessage: (msg: unknown) => void,
        private readonly _triggerStateUpdate: () => void,
        private readonly _registry: AgentRegistry,
        private readonly _onAgentsChanged: () => Promise<void> = async () => {},
    ) {}

    async handle(message: WebviewMessage): Promise<void> {
        switch (message.command) {
            case 'ready': {
                this._triggerStateUpdate();
                await this._onAgentsChanged();
                break;
            }
            case 'focusSession': {
                const s = this._sessionManager.getById(message.sessionId);
                if (!s) { break; }
                if (s.terminal) {
                    s.terminal.show();
                } else if (s.name) {
                    const found = vscode.window.terminals.find(t => t.name === s.name);
                    if (found) { found.show(); this._sessionManager.setTerminal(s.id, found); }
                }
                break;
            }
            case 'endSession': {
                const s = this._sessionManager.getById(message.sessionId);
                if (s) {
                    const terminal = s.terminal
                        ?? vscode.window.terminals.find(t => t.name === s.name);
                    terminal?.dispose();
                    this._sessionManager.remove(message.sessionId);
                }
                break;
            }
            case 'renameSession': {
                this._sessionManager.rename(message.sessionId, message.newName);
                const s = this._sessionManager.getById(message.sessionId);
                if (s?.terminal) {
                    this.renamingSessionId = message.sessionId;
                    try {
                        s.terminal.show(true);
                        await vscode.commands.executeCommand(
                            'workbench.action.terminal.renameWithArg',
                            { name: message.newName }
                        );
                    } finally {
                        this.renamingSessionId = undefined;
                    }
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
                const driver = this._registry.getById(s.framework) ?? this._registry.getDefault();
                if (!driver) { break; }
                const terminal = vscode.window.createTerminal({
                    name: s.name,
                    cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
                });
                terminal.show();
                terminal.sendText(driver.getResumeCommand(message.sessionId));
                this._sessionManager.setTerminal(message.sessionId, terminal);
                break;
            }
            case 'newSession': {
                const driver = this._registry.getDefault();
                if (!driver) { break; }
                const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                const terminalCreationName = `${driver.displayName} #${crypto.randomUUID().slice(0, 8)}`;
                const terminal = vscode.window.createTerminal({ name: terminalCreationName, cwd });
                terminal.show();
                terminal.sendText(driver.getLaunchCommand());
                this._sessionManager.registerPendingAgent(terminalCreationName, message.cohortId, []);
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
                this._postMessage({ command: 'archivedSessionsUpdate', sessions });
                break;
            }
            case 'openAddAgentPanel': {
                const projectRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
                AddAgentPanel.createOrShow(
                    this._context,
                    projectRoot,
                    message.cohortId,
                    async (config, filePath) => {
                        vscode.window.showInformationMessage(
                            `Agent '${config.name}' created at ${filePath}`,
                        );
                        await this._onAgentsChanged();
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
                const driver = this._registry.getDefault();
                if (!driver) { break; }
                const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                const nameMap = this._context.workspaceState.get<Record<string, string>>(NAMES_KEY, {});
                const skillsMap = this._context.workspaceState.get<Record<string, string[]>>(SKILLS_KEY, {});
                const archived = getArchivedSessions(this._sessionManager, workspacePath, nameMap, skillsMap);
                const found = archived.find(a => a.id === message.sessionId);
                if (!found) { break; }
                // Guard: don't create a duplicate if the session is already active.
                if (this._sessionManager.getById(found.id)) { break; }
                const session = this._sessionManager.add(found.id, found.name, message.cohortId);
                this._sessionManager.setClaudeLogFile(session.id, found.claudeLogFile);
                this._sessionManager.setStatus(session.id, 'idle');
                if (found.skills?.length) { this._sessionManager.setSkills(session.id, found.skills); }
                const terminal = vscode.window.createTerminal({
                    name: found.name,
                    cwd: vscode.workspace.workspaceFolders?.[0].uri.fsPath,
                });
                terminal.sendText(driver.getResumeCommand(found.id));
                terminal.show();
                this._sessionManager.setTerminal(found.id, terminal);
                const watcher = new ClaudeLogWatcher(session.id, found.claudeLogFile, this._sessionManager, true);
                this._context.subscriptions.push({ dispose: () => watcher.dispose() });
                break;
            }
        }
    }
}
