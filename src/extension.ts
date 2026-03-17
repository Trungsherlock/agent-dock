import * as vscode from 'vscode';
import { SessionManager } from './managers/sessionManager';
import { CohortManager } from './managers/cohortManager';
import { BoardViewProvider } from './views/boardViewProvider';
import { loadSessions, loadCohorts, setupPersistence } from './managers/sessionLoader';
import { registerCommands } from './commands/index';
import { HookServer } from './hooks/hookServer';
import { handleHookEvent } from './hooks/hookEventHandler';
import { AgentRegistry } from './agents/AgentRegistry';
import { ClaudeDriver } from './agents/ClaudeDriver';

export function activate(context: vscode.ExtensionContext) {
    const registry = new AgentRegistry();
    const claudeDriver = new ClaudeDriver();
    registry.register(claudeDriver);

    claudeDriver.installHooks?.();

    const projectRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';


    const sessionManager = new SessionManager();
    const cohortManager = new CohortManager();
    const boardProvider = new BoardViewProvider(context, sessionManager, cohortManager, registry, projectRoot);

    const hookServer = new HookServer((event) => {
        handleHookEvent(event, sessionManager);
    });
    context.subscriptions.push({ dispose: () => hookServer.dispose() });

    loadCohorts(context, cohortManager);
    loadSessions(context, sessionManager);
    context.subscriptions.push(
        vscode.window.onDidCloseTerminal((closed) => {
            const session = sessionManager.getAll().find(s =>
                s.terminal === closed ||
                (s.name && s.name === closed.name)
            );
            if (session) { sessionManager.remove(session.id); }
        })
    );
    setupPersistence(context, sessionManager, cohortManager);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(BoardViewProvider.viewType, boardProvider)
    );

    registerCommands(context, sessionManager, cohortManager, registry);
}

export function deactivate() {}
