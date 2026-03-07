import * as vscode from 'vscode';
import { Session, SessionStatus } from '../models/session';

export class SessionManager {
    private sessions: Session[] = [];
    private _onDidChange = new vscode.EventEmitter<void>();
    readonly onDidChange = this._onDidChange.event;
    private _counter = 0;

    add(name: string, cohortId: string, terminal?: vscode.Terminal): Session {
        const session: Session = {
            id: `session-${Date.now()}-${this._counter++}`,
            name,
            cohortId,
            status: 'active',
            createdAt: new Date(),
            terminal,
            note: '',
            framework: 'claude',
            filesTouched: [],
            toolCalls: [],
            tokensInput: 0,
            tokensOutput: 0,
            costUsd: 0,
            contextWindowUsed: 0,
            contextWindowMax: 200000,
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