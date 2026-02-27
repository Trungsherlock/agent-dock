import * as vscode from 'vscode';
import { Session, SessionStatus } from '../models/session';
import { getCategoryById } from '../constants/categories';

export class SessionManager {
    private sessions: Session[] = [];
    private _onDidChange = new vscode.EventEmitter<void>();
    readonly onDidChange = this._onDidChange.event;

    add(name: string, categoryId: string, terminal: vscode.Terminal): Session {
        const session: Session = {
            id: `session-${Date.now()}`,
            name,
            categoryId,
            status: 'active',
            createdAt: new Date(),
            terminal,
            note: '',
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

    setCategory(id: string, categoryId: string): void {
        const session = this.getById(id);
        if (session) {
            session.categoryId = categoryId;
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

    dispose(): void {
        this._onDidChange.dispose();
    }
}