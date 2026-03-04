import * as vscode from 'vscode';
import { SessionManager } from './managers/sessionManager';
import { CohortManager, type Cohort } from './managers/cohortManager';
import { SessionTreeProvider } from './views/sessionTreeProvider';
import { SessionTreeItem } from './views/sessionTreeItem';
import { BoardViewProvider } from './views/boardViewProvider';
import { watchForNewClaudeSessions } from './claudeWatcher';

const SESSIONS_KEY = 'agentdock.sessions';
const COHORTS_KEY = 'agentdock.cohorts';

interface PersistedSession {
    name: string;
    cohortId: string;
    note: string;
    status: string;
}

export function activate(context: vscode.ExtensionContext) {
    const sessionManager = new SessionManager();
    const cohortManager = new CohortManager();
    const treeProvider = new SessionTreeProvider(sessionManager, cohortManager);
    const boardProvider = new BoardViewProvider(context, sessionManager, cohortManager);

    const savedCohorts = context.workspaceState.get<Cohort[]>(COHORTS_KEY, []);
    cohortManager.load(savedCohorts);

    const saved = context.workspaceState.get<PersistedSession[]>(SESSIONS_KEY, []);
    for (const s of saved) {
        const existing = vscode.window.terminals.find(t => t.name === s.name);
        const terminal = existing ?? vscode.window.createTerminal({
            name: s.name
        });
        if (!existing) {
            terminal.sendText('claude');
        }
        const session = sessionManager.add(s.name, s.cohortId, terminal);
        if (s.note) { sessionManager.setNote(session.id, s.note); }
        if (s.status && s.status !== 'active') {
            sessionManager.setStatus(session.id, s.status as import('./models/session').SessionStatus);
        }
    }

    context.subscriptions.push(
        sessionManager.onDidChange(() => {
            const data: PersistedSession[] = sessionManager.getAll().map(s => ({
                name: s.name,
                cohortId: s.cohortId,
                note: s.note,
                status: s.status,
            }));
            context.workspaceState.update(SESSIONS_KEY, data);
        })
    );

    context.subscriptions.push(
        cohortManager.onDidChange(() => {
            context.workspaceState.update(COHORTS_KEY, cohortManager.getUserCohorts());
        })
    );

    vscode.window.registerTreeDataProvider('agentdock.sessionsView', treeProvider);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(BoardViewProvider.viewType, boardProvider)
    );

    context.subscriptions.push(
        vscode.window.onDidOpenTerminal(async terminal => {
            if (sessionManager.getAll().some(s => s.terminal === terminal)) { return; }
            const name = terminal.name;
            const isCodingAgentTerminal =
                /claude/i.test(name) ||
                /aider/i.test(name) ||
                /cursor/i.test(name) ||
                /cody/i.test(name);

            if (!isCodingAgentTerminal) { return; }

            const cohorts = cohortManager.getAll();
            const picked = await vscode.window.showQuickPick(
                cohorts.map(c => ({ label: c.label, id: c.id })),
                { placeHolder: `Add "${name}" to Agent Dock — pick a cohort (Escape to skip)` }
            );
            if (!picked) { return; }

            sessionManager.add(name, picked.id, terminal);
        })
    );

    watchForNewClaudeSessions(context, async () => {
        const terminal = vscode.window.activeTerminal;
        if (!terminal) { return; }
        if (sessionManager.getAll().some(s => s.terminal === terminal)) { return; }

        const cohorts = cohortManager.getAll();
        const picked = await vscode.window.showQuickPick(
            cohorts.map(c => ({ label: c.label, id: c.id })),
            { placeHolder: 'New Claude session detected — add to Agent Dock? (Escape to skip)' }
        );
        if (!picked) { return; }

        sessionManager.add(terminal.name, picked.id, terminal);
    });

    vscode.window.onDidCloseTerminal(terminal => {
        sessionManager.removeByTerminal(terminal);
    }, null, context.subscriptions);

    context.subscriptions.push(
        vscode.commands.registerCommand('agentdock.newSession', async () => {
            const name = await vscode.window.showInputBox({
                prompt: 'Session name',
                placeHolder: 'e.g. Fix login bug',
            });
            if (!name) { return; }

            const cohort = cohortManager.getAll();
            const picked = await vscode.window.showQuickPick(
                cohort.map(c => ({ label: c.label, id: c.id })),
                { placeHolder: 'Select a cohort' }
            );
            if (!picked) { return; }

            const terminal = vscode.window.createTerminal({
                name
            });
            terminal.show();
            terminal.sendText('claude');
            sessionManager.add(name, picked.id, terminal);
        })
    );

    let agentDockPanel: vscode.WebviewPanel | undefined;
    context.subscriptions.push(
        vscode.commands.registerCommand('agentdock.openPanel', () => {
            if (agentDockPanel) {
                agentDockPanel.reveal();
                return;
            }
            agentDockPanel = vscode.window.createWebviewPanel(
                'agentdock.panel',
                'Agent Dock',
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'webview-ui', 'dist')],
                }
            );
            agentDockPanel.webview.html = boardProvider.getHtmlForWebview(agentDockPanel.webview);
            boardProvider.wirePanel(agentDockPanel);
            agentDockPanel.onDidDispose(() => { agentDockPanel = undefined; });
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('agentdock.focusSession', (item: SessionTreeItem) => {
            item.session.terminal.show();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('agentdock.endSession', (item: SessionTreeItem) => {
            item.session.terminal.dispose();
            sessionManager.remove(item.session.id);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('agentdock.renameSession', async (item: SessionTreeItem) => {
            const newName = await vscode.window.showInputBox({
                prompt: 'New session name',
                value: item.session.name,
            });
            if (!newName) { return; }
            sessionManager.rename(item.session.id, newName);
        })
    );
}

export function deactivate() {}