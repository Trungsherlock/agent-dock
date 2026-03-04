import * as vscode from 'vscode';
import { Session } from '../models/session';

export class SessionTreeItem extends vscode.TreeItem {
    constructor(public readonly session: Session, cohortLabel: string) {
        super(session.name, vscode.TreeItemCollapsibleState.None);

        this.id = session.id;
        this.tooltip = `${session.name} · ${cohortLabel} · ${session.status}`;
        this.description = session.status;
        this.iconPath = new vscode.ThemeIcon('folder');
        this.contextValue = 'session';
        this.command = {
            command: 'agentdock.focusSession',
            title: 'Focus Session',
            arguments: [this],
        };
    }
}
