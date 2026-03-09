import * as vscode from 'vscode';
import { SessionManager } from './managers/sessionManager';
import { CohortManager } from './managers/cohortManager';
import { SessionTreeProvider } from './views/sessionTreeProvider';
import { BoardViewProvider } from './views/boardViewProvider';
import { loadSessions, loadCohorts, setupPersistence, loadHistoricalSessions } from './managers/sessionLoader';
import { registerCommands } from './commands/index';
import { installHooks } from './hooks/hookInstaller';
import { HookServer } from './hooks/hookServer';
import { handleHookEvent } from './hooks/hookEventHandler';

export function activate(context: vscode.ExtensionContext) {
    installHooks();

    const sessionManager = new SessionManager();
    const cohortManager = new CohortManager();
    const treeProvider = new SessionTreeProvider(sessionManager, cohortManager);
    const boardProvider = new BoardViewProvider(context, sessionManager, cohortManager);

    const hookServer = new HookServer((event) => {
        handleHookEvent(event, sessionManager);
    });
    context.subscriptions.push({ dispose: () => hookServer.dispose() });

    loadCohorts(context, cohortManager);
    loadSessions(context, sessionManager);
    setupPersistence(context, sessionManager, cohortManager);
    loadHistoricalSessions(context, sessionManager);

    vscode.window.registerTreeDataProvider('agentdock.sessionsView', treeProvider);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(BoardViewProvider.viewType, boardProvider)
    );

    registerCommands(context, sessionManager, cohortManager, boardProvider);
}

export function deactivate() {}
