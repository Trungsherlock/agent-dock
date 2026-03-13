import * as vscode from 'vscode';
import { SessionManager } from './managers/sessionManager';
import { CohortManager } from './managers/cohortManager';
import { BoardViewProvider } from './views/boardViewProvider';
import { loadSessions, loadCohorts, setupPersistence } from './managers/sessionLoader';
import { registerCommands } from './commands/index';
import { installHooks } from './hooks/hookInstaller';
import { HookServer } from './hooks/hookServer';
import { handleHookEvent } from './hooks/hookEventHandler';

export function activate(context: vscode.ExtensionContext) {
    installHooks();

    const sessionManager = new SessionManager();
    const cohortManager = new CohortManager();
    const boardProvider = new BoardViewProvider(context, sessionManager, cohortManager);

    const hookServer = new HookServer((event) => {
        handleHookEvent(event, sessionManager);
    });
    context.subscriptions.push({ dispose: () => hookServer.dispose() });

    loadCohorts(context, cohortManager);
    loadSessions(context, sessionManager);
    context.subscriptions.push(
        vscode.window.onDidCloseTerminal((closed) => {
            const session = sessionManager.getAll().find(s => s.terminal === closed);
            if (session) {
                sessionManager.remove(session.id);
            }
        })
    );
    setupPersistence(context, sessionManager, cohortManager);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(BoardViewProvider.viewType, boardProvider)
    );

    registerCommands(context, sessionManager, cohortManager);
}

export function deactivate() {}
