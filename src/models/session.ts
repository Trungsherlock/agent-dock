import * as vscode from 'vscode';

export type SessionStatus = 'active' | 'idle' | 'done';

export interface Session {
    id: string;
    name: string;
    cohortId: string;
    status: SessionStatus;
    createdAt: Date;
    terminal: vscode.Terminal;
    note: string;
}