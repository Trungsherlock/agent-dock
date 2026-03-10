import * as vscode from 'vscode';
import * as path from 'path';
import { SessionManager } from '../managers/sessionManager';
import { CohortManager } from '../managers/cohortManager';
import { BoardViewProvider } from '../views/boardViewProvider';
import { SessionTreeItem } from '../views/sessionTreeItem';
import { ClaudeLogWatcher } from '../watchers/claudeLogWatcher';
import { watchForNewClaudeSessions, isConversationFile } from '../claudeWatcher';
import { CLAUDE_CODE_AGENT_PREFIX } from '../constants';

export function registerCommands(
    context: vscode.ExtensionContext,
    sessionManager: SessionManager,
    cohortManager: CohortManager,
    boardProvider: BoardViewProvider,
): void {
    // Track the last terminal used to run a Claude command so we can associate it
    // with the session when the JSONL file appears (activeTerminal may have changed by then)
    let lastClaudeTerminal: vscode.Terminal | undefined;
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTerminal(t => { lastClaudeTerminal = t ?? lastClaudeTerminal; })
    );

    // Watch for new Claude sessions (live terminal → new .jsonl file)
    watchForNewClaudeSessions(context, (filePath: string) => {
        if (!isConversationFile(filePath)) { return; }

        const id = path.basename(filePath, '.jsonl');
        if (sessionManager.getById(id)) { return; }

        // Try to find the terminal: prefer active, fall back to last known
        const terminal = vscode.window.activeTerminal ?? lastClaudeTerminal;
        const existingSession = sessionManager.getAll().find(s => s.terminal === terminal);
        const resolvedTerminal = existingSession ? undefined : terminal;

        const session = sessionManager.add(id, resolvedTerminal?.name ?? `Claude ${id.slice(0, 8)}`, 'uncategorized', resolvedTerminal);
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
            sessionManager.add(crypto.randomUUID(), name, 'uncategorized', terminal);
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

    let nextIdx = 1;
    context.subscriptions.push(
        vscode.commands.registerCommand('agentdock.newSession', async () => {
            const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            const name = `${CLAUDE_CODE_AGENT_PREFIX} #${nextIdx++}`;
            const terminal = vscode.window.createTerminal({ name, cwd });
            terminal.show();
            terminal.sendText('claude');
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
