import * as vscode from 'vscode';
import * as path from 'path';
import { SessionManager } from '../managers/sessionManager';
import { CohortManager } from '../managers/cohortManager';
import { ClaudeLogWatcher } from '../watchers/claudeLogWatcher';
import { watchForNewClaudeSessions, isConversationFile } from '../claudeWatcher';
import { CLAUDE_CODE_AGENT_PREFIX } from '../constants';

export function registerCommands(
    context: vscode.ExtensionContext,
    sessionManager: SessionManager,
    cohortManager: CohortManager,
): void {
    let lastClaudeTerminal: vscode.Terminal | undefined;
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTerminal(t => { lastClaudeTerminal = t ?? lastClaudeTerminal; })
    );

    watchForNewClaudeSessions(context, (filePath: string) => {
        if (!isConversationFile(filePath)) { return; }

        const id = path.basename(filePath, '.jsonl');
        if (sessionManager.getById(id)) { return; }

        const terminal = vscode.window.activeTerminal ?? lastClaudeTerminal;
        const existingSession = sessionManager.getAll().find(s => s.terminal === terminal);
        const resolvedTerminal = existingSession ? undefined : terminal;

        const pending = resolvedTerminal ? sessionManager.consumePendingAgent(resolvedTerminal.name) : undefined;
        const cohortId = pending?.cohortId ?? 'uncategorized';
        const session = sessionManager.add(id, resolvedTerminal?.name ?? `Claude ${id.slice(0, 8)}`, cohortId, resolvedTerminal);
        sessionManager.setClaudeLogFile(session.id, filePath);
        if (pending?.skills?.length) {
            sessionManager.setSkills(session.id, pending.skills);
        }
        const watcher = new ClaudeLogWatcher(session.id, filePath, sessionManager);
        context.subscriptions.push({ dispose: () => watcher.dispose() });
    });

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

    context.subscriptions.push(
        vscode.window.onDidCloseTerminal(terminal => {
            sessionManager.removeByTerminal(terminal);
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
}
