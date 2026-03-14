import * as vscode from 'vscode';
import * as path from 'path';
import { SessionManager } from '../managers/sessionManager';
import { ClaudeLogWatcher } from '../watchers/claudeLogWatcher';
import { AgentRegistry } from '../agents/AgentRegistry';

export function registerCommands(
    context: vscode.ExtensionContext,
    sessionManager: SessionManager,
    _cohortManager: unknown,
    registry: AgentRegistry,
): void {
    let lastActiveTerminal: vscode.Terminal | undefined;
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTerminal(t => { lastActiveTerminal = t ?? lastActiveTerminal; })
    );

    for (const driver of registry.getAll()) {
        if (!driver.usesLogFiles) { continue; }
        driver.watchForNewSessions(context, (filePath: string) => {
            const id = path.basename(filePath, '.jsonl');
            if (sessionManager.getById(id)) { return; }

            const terminal = vscode.window.activeTerminal ?? lastActiveTerminal;
            const existingSession = sessionManager.getAll().find(s => s.terminal === terminal);
            const resolvedTerminal = existingSession ? undefined : terminal;

            const pending = resolvedTerminal ? sessionManager.consumePendingAgent(resolvedTerminal.name) : undefined;
            const cohortId = pending?.cohortId ?? 'uncategorized';
            const session = sessionManager.add(
                id,
                resolvedTerminal?.name ?? `${driver.displayName} ${id.slice(0, 8)}`,
                cohortId,
                resolvedTerminal,
                undefined,
                driver.id,
                driver.contextWindowDefault,
            );
            sessionManager.setClaudeLogFile(session.id, filePath);
            if (pending?.skills?.length) {
                sessionManager.setSkills(session.id, pending.skills);
            }
            const watcher = new ClaudeLogWatcher(session.id, filePath, sessionManager);
            context.subscriptions.push({ dispose: () => watcher.dispose() });
        });
    }

    context.subscriptions.push(
        vscode.window.onDidOpenTerminal(terminal => {
            if (sessionManager.getAll().some(s => s.terminal === terminal)) { return; }
            const name = terminal.name;

            const driver = registry.detectTerminal(name);
            if (driver && !driver.usesLogFiles) {
                sessionManager.add(crypto.randomUUID(), name, 'uncategorized', terminal, undefined, driver.id, driver.contextWindowDefault);
                return;
            }

            const isLegacyAgent = /aider/i.test(name) || /cursor/i.test(name) || /cody/i.test(name);
            if (isLegacyAgent) {
                sessionManager.add(crypto.randomUUID(), name, 'uncategorized', terminal);
            }
        })
    );

    context.subscriptions.push(
        vscode.window.onDidCloseTerminal(terminal => {
            sessionManager.removeByTerminal(terminal);
        })
    );

    let nextIdx = 1;
    const defaultDriver = registry.getDefault();
    context.subscriptions.push(
        vscode.commands.registerCommand('agentdock.newSession', async () => {
            if (!defaultDriver) { return; }
            const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            const name = `${defaultDriver.displayName} #${nextIdx++}`;
            const terminal = vscode.window.createTerminal({ name, cwd });
            terminal.show();
            terminal.sendText(defaultDriver.getLaunchCommand());
        })
    );
}
