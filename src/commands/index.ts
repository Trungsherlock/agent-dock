import * as vscode from 'vscode';
import { SessionManager } from '../managers/sessionManager';
import { CohortManager } from '../managers/cohortManager';
import { BoardViewProvider } from '../views/boardViewProvider';
import { SessionTreeItem } from '../views/sessionTreeItem';
import { ClaudeLogWatcher } from '../watchers/claudeLogWatcher';
import { watchForNewClaudeSessions } from '../claudeWatcher';

export function registerCommands(
    context: vscode.ExtensionContext,
    sessionManager: SessionManager,
    cohortManager: CohortManager,
    boardProvider: BoardViewProvider,
): void {
    // Watch for new Claude sessions (live terminal → new .jsonl file)
    watchForNewClaudeSessions(context, (filePath: string) => {
        const terminal = vscode.window.activeTerminal;
        if (!terminal) { return; }
        if (sessionManager.getAll().some(s => s.terminal === terminal)) { return; }

        const session = sessionManager.add(terminal.name, 'uncategorized', terminal);
        sessionManager.setClaudeLogFile(session.id, filePath);
        const watcher = new ClaudeLogWatcher(session.id, filePath, sessionManager);
        context.subscriptions.push({ dispose: () => watcher.dispose() });
    });

    // Auto-detect non-Claude agents opening in terminal
    context.subscriptions.push(
        vscode.window.onDidOpenTerminal(terminal => {
            if (sessionManager.getAll().some(s => s.terminal === terminal)) { return; }
            const name = terminal.name;
            const isNonClaudeAgent =
                /aider/i.test(name) ||
                /cursor/i.test(name) ||
                /cody/i.test(name);
            if (!isNonClaudeAgent) { return; }
            sessionManager.add(name, 'uncategorized', terminal);
        })
    );

    // Remove session when terminal closes
    context.subscriptions.push(
        vscode.window.onDidCloseTerminal(terminal => {
            sessionManager.removeByTerminal(terminal);
        })
    );

    // Panel management
    let agentDockPanel: vscode.WebviewPanel | undefined;
    context.subscriptions.push(
        vscode.commands.registerCommand('agentdock.openPanel', () => {
            if (agentDockPanel) { agentDockPanel.reveal(); return; }
            agentDockPanel = vscode.window.createWebviewPanel(
                'agentdock.panel', 'Agent Dock', vscode.ViewColumn.Beside,
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
        vscode.commands.registerCommand('agentdock.newSession', async () => {
            const name = await vscode.window.showInputBox({
                prompt: 'Session name',
                placeHolder: 'e.g. Fix login bug',
            });
            if (!name) { return; }
            const picked = await vscode.window.showQuickPick(
                cohortManager.getAll().map(c => ({ label: c.label, id: c.id })),
                { placeHolder: 'Select a cohort' }
            );
            if (!picked) { return; }
            const terminal = vscode.window.createTerminal({ name });
            terminal.show();
            terminal.sendText('claude');
            sessionManager.add(name, picked.id, terminal);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('agentdock.focusSession', (item: SessionTreeItem) => {
            item.session.terminal?.show();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('agentdock.endSession', (item: SessionTreeItem) => {
            item.session.terminal?.dispose();
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
