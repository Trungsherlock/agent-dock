import * as vscode from 'vscode';
import * as path from 'path';
import { SessionManager } from './sessionManager';
import { CohortManager, type Cohort } from './cohortManager';
import { ClaudeLogWatcher } from '../watchers/claudeLogWatcher';
import { getAllClaudeLogFiles } from '../claudeWatcher';
import { SESSIONS_KEY, COHORTS_KEY, type PersistedSession } from '../constants';
import type { SessionStatus } from '../models/session';

export function loadSessions(
    context: vscode.ExtensionContext,
    sessionManager: SessionManager,
): void {
    const saved = context.workspaceState.get<PersistedSession[]>(SESSIONS_KEY, []);
    for (const s of saved) {
        if (s.claudeLogFile) {
            // Claude sessions are identified by their log file — no terminal needed
            const session = sessionManager.add(s.name, s.cohortId);
            if (s.note) { sessionManager.setNote(session.id, s.note); }
            if (s.status && s.status !== 'active') {
                sessionManager.setStatus(session.id, s.status as SessionStatus);
            }
            session.claudeLogFile = s.claudeLogFile;
            const watcher = new ClaudeLogWatcher(session.id, s.claudeLogFile, sessionManager, true);
            context.subscriptions.push({ dispose: () => watcher.dispose() });
        } else {
            // Non-Claude agents (Aider, etc.) — reconnect by terminal name
            const existing = vscode.window.terminals.find(t => t.name === s.name);
            const terminal = existing ?? vscode.window.createTerminal({ name: s.name });
            if (!existing) { terminal.sendText(s.name.toLowerCase()); }
            const session = sessionManager.add(s.name, s.cohortId, terminal);
            if (s.note) { sessionManager.setNote(session.id, s.note); }
            if (s.status && s.status !== 'active') {
                sessionManager.setStatus(session.id, s.status as SessionStatus);
            }
        }
    }
}

export function loadCohorts(
    context: vscode.ExtensionContext,
    cohortManager: CohortManager,
): void {
    const saved = context.workspaceState.get<Cohort[]>(COHORTS_KEY, []);
    cohortManager.load(saved);
}

export function setupPersistence(
    context: vscode.ExtensionContext,
    sessionManager: SessionManager,
    cohortManager: CohortManager,
): void {
    context.subscriptions.push(
        sessionManager.onDidChange(() => {
            const data: PersistedSession[] = sessionManager.getAll().map(s => ({
                name: s.name,
                cohortId: s.cohortId,
                note: s.note,
                status: s.status,
                claudeLogFile: s.claudeLogFile,
            }));
            context.workspaceState.update(SESSIONS_KEY, data);
        })
    );
    context.subscriptions.push(
        cohortManager.onDidChange(() => {
            context.workspaceState.update(COHORTS_KEY, cohortManager.getUserCohorts());
        })
    );
}

export function loadHistoricalSessions(
    context: vscode.ExtensionContext,
    sessionManager: SessionManager,
): void {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const trackedFiles = new Set(sessionManager.getAll().map(s => s.claudeLogFile).filter(Boolean));
    for (const filePath of workspacePath ? getAllClaudeLogFiles(workspacePath) : []) {
        if (trackedFiles.has(filePath)) { continue; }
        const name = path.basename(filePath, '.jsonl').slice(0, 8);
        const session = sessionManager.add(name, 'uncategorized');
        session.claudeLogFile = filePath;
        session.status = 'done';
        const watcher = new ClaudeLogWatcher(session.id, filePath, sessionManager, true);
        context.subscriptions.push({ dispose: () => watcher.dispose() });
    }
}
