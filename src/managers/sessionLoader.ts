import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { SessionManager } from './sessionManager';
import { CohortManager, type Cohort } from './cohortManager';
import { ClaudeLogWatcher } from '../watchers/claudeLogWatcher';
import { getAllClaudeLogFiles, isConversationFile } from '../claudeWatcher';
import { SESSIONS_KEY, COHORTS_KEY, NAMES_KEY, SKILLS_KEY, type PersistedSession, type ArchivedSession } from '../constants';
import type { SessionStatus } from '../models/session';

export function loadSessions(
    context: vscode.ExtensionContext,
    sessionManager: SessionManager,
): void {
    const saved = context.workspaceState.get<PersistedSession[]>(SESSIONS_KEY, []);
    for (const s of saved) {
        if (s.claudeLogFile) {
            const id = path.basename(s.claudeLogFile, '.jsonl');
            const session = sessionManager.add(id, s.name, s.cohortId);
            if (s.note) { sessionManager.setNote(session.id, s.note); }
            if (s.skills?.length) { sessionManager.setSkills(session.id, s.skills); }
            const autoStatuses = ['running', 'thinking'];
            if (s.status && !autoStatuses.includes(s.status)) {
                sessionManager.setStatus(session.id, s.status as SessionStatus);
            }
            sessionManager.setClaudeLogFile(session.id, s.claudeLogFile);
            const existing = vscode.window.terminals.find(t => t.name === s.name);
            const terminal = existing ?? vscode.window.createTerminal({
                name: s.name,
                cwd: vscode.workspace.workspaceFolders?.[0].uri.fsPath,
            });
            if (!existing) {
                terminal.sendText(`claude --resume ${session.id}`);
            }
            sessionManager.setTerminal(session.id, terminal);
            const watcher = new ClaudeLogWatcher(session.id, s.claudeLogFile, sessionManager, true);
            context.subscriptions.push({ dispose: () => watcher.dispose() });
        } else {
            // // Non-Claude agents (Aider, etc.) — reconnect by terminal name
            // const existing = vscode.window.terminals.find(t => t.name === s.name);
            // const terminal = existing ?? vscode.window.createTerminal({ name: s.name });
            // if (!existing) { terminal.sendText(s.name.toLowerCase()); }
            // const session = sessionManager.add(s.id, s.name, s.cohortId, terminal);
            // if (s.note) { sessionManager.setNote(session.id, s.note); }
            // if (s.status && s.status !== 'active') {
            //     sessionManager.setStatus(session.id, s.status as SessionStatus);
            // }
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
                id: s.id,
                name: s.name,
                cohortId: s.cohortId,
                note: s.note,
                status: s.status,
                claudeLogFile: s.claudeLogFile,
                skills: s.skills,
            }));
            context.workspaceState.update(SESSIONS_KEY, data);

            const existingName = context.workspaceState.get<Record<string, string>>(NAMES_KEY, {});
            const existingSkills = context.workspaceState.get<Record<string, string[]>>(SKILLS_KEY, {});
            for (const s of sessionManager.getAll()) {
                existingName[s.id] = s.name;
                if (s.skills?.length) { existingSkills[s.id] = s.skills; }
            }
            context.workspaceState.update(NAMES_KEY, existingName);
            context.workspaceState.update(SKILLS_KEY, existingSkills);
        })
    );
    context.subscriptions.push(
        cohortManager.onDidChange(() => {
            context.workspaceState.update(COHORTS_KEY, cohortManager.getUserCohorts());
        })
    );
}

// export function loadHistoricalSessions(
//     context: vscode.ExtensionContext,
//     sessionManager: SessionManager,
// ): void {
//     const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
//     for (const filePath of workspacePath ? getAllClaudeLogFiles(workspacePath) : []) {
//         const id = path.basename(filePath, '.jsonl');
//         if (sessionManager.getById(id)) { continue; }
//         if (!isConversationFile(filePath)) { continue; }
//         const name = id.slice(0, 8);
//         const birthtime = fs.statSync(filePath).birthtime;
//         const session = sessionManager.add(id, name, 'uncategorized', undefined, birthtime);
//         sessionManager.setClaudeLogFile(session.id, filePath);
//         sessionManager.setStatus(session.id, 'idle');
//         const watcher = new ClaudeLogWatcher(session.id, filePath, sessionManager, true);
//         context.subscriptions.push({ dispose: () => watcher.dispose() });
//     }
// }

export function getArchivedSessions(
    sessionManager: SessionManager,
    workspacePath?: string,
    nameMap: Record<string, string> = {},
    skillsMap: Record<string, string[]> = {},
): ArchivedSession[] {
    let archiveSessions: ArchivedSession[] = [];
    for (const filePath of workspacePath ? getAllClaudeLogFiles(workspacePath) : []) {
        const id = path.basename(filePath, '.jsonl');
        if (sessionManager.getById(id)) { continue; }
        if (!isConversationFile(filePath)) { continue; }
        const name = nameMap[id] ?? id.slice(0, 8);
        const birthtime = fs.statSync(filePath).birthtime.toISOString();
        const skills = skillsMap[id];
        archiveSessions.push({id, name, claudeLogFile: filePath, createdAt: birthtime, ...(skills?.length ? { skills } : {})});
    }
    return archiveSessions;
}
