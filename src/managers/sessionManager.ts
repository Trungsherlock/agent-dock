import * as vscode from 'vscode';
import { Session, SessionStatus } from '../models/session';

export class SessionManager {
    private sessions: Session[] = [];
    private _onDidChange = new vscode.EventEmitter<void>();
    readonly onDidChange = this._onDidChange.event;
    private _pendingByName = new Map<string, { cohortId: string; skills: string[] }>();

    registerPendingAgent(terminalName: string, cohortId: string, skills: string[]): void {
        this._pendingByName.set(terminalName, { cohortId, skills });
    }

    consumePendingAgent(terminalName: string): { cohortId: string; skills: string[] } | undefined {
        const config = this._pendingByName.get(terminalName);
        if (config) { this._pendingByName.delete(terminalName); }
        return config;
    }

    add(id: string, name: string, cohortId: string, terminal?: vscode.Terminal, createdAt?: Date, framework = 'claude', contextWindowMax = 200_000): Session {
        const session: Session = {
            id,
            name,
            cohortId,
            status: 'thinking',
            createdAt: createdAt ?? new Date(),
            terminal,
            note: '',
            framework,
            filesTouched: [],
            toolCalls: [],
            tokensInput: 0,
            tokensOutput: 0,
            costUsd: 0,
            contextWindowUsed: 0,
            contextWindowMax,
            updatedAt: new Date(),
        };
        this.sessions.push(session);
        this._onDidChange.fire();
        return session;
    }

    remove(id: string): void {
        this.sessions = this.sessions.filter(s => s.id !== id);
        this._onDidChange.fire();
    }

    removeByTerminal(terminal: vscode.Terminal): void {
        this.sessions = this.sessions.filter(s => s.terminal !== terminal);
        this._onDidChange.fire();
    }

    getAll(): Session[] {
        return this.sessions; 
    }

    getById(id: string): Session | undefined {
        return this.sessions.find(s => s.id === id);
    }

    rename(id: string, newName: string): void {
        const session = this.getById(id);
        if (session) {
            session.name = newName;
            this._onDidChange.fire();
        }
    }

    setCohort(id: string, cohortId: string): void {
        const session = this.getById(id);
        if (session) {
            session.cohortId = cohortId;
            this._onDidChange.fire();
        }
    }

    setStatus(id: string, status: SessionStatus): void {
        const session = this.getById(id);
        if (session) {
            session.status = status;
            this._onDidChange.fire();
        }
    }

    setClaudeLogFile(id: string, logFile: string): void {
        const session = this.getById(id);
        if (session) {
            session.claudeLogFile = logFile;
            this._onDidChange.fire();
        }
    }

    setTerminal(id: string, terminal: vscode.Terminal): void {
        const session = this.getById(id);
        if (session) {
            session.terminal = terminal;
            this._onDidChange.fire();
        }
    }

    setCurrentTool(id: string, tool: { name: string; target: string } | undefined): void {
        const session = this.getById(id);
        if (session) {
            session.currentTool = tool;
            this._onDidChange.fire();
        }
    }

    setPermissionRequest(id: string, value: boolean): void {
        const session = this.getById(id);
        if (session) {
            session.waitingForPermission = value;
            this._onDidChange.fire();
        }
    }

    setSkills(id: string, skills: string[]): void {
        const session = this.getById(id);
        if (session) {
            session.skills = skills;
            this._onDidChange.fire();
        }
    }

    setNote(id: string, note: string): void {
        const session = this.getById(id);
        if (session) {
            session.note = note;
            this._onDidChange.fire();
        }
    }

    updateMetrics(id: string, patch: Partial<Pick<Session,
        'currentTask' | 'filesTouched' | 'toolCalls' |
        'tokensInput' | 'tokensOutput' | 'costUsd' |
        'contextWindowUsed' | 'pid' | 'status'
    >>): void {
        const session = this.getById(id);
        if (session) {
            Object.assign(session, patch, { updatedAt: new Date() });
            this._onDidChange.fire();
        }
    }

    dispose(): void {
        this._onDidChange.dispose();
    }
}