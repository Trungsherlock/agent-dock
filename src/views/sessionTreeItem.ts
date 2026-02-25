import * as vscode from 'vscode';
import { Session } from '../models/session';
import { getCategoryById } from '../constants/categories';

export class SessionTreeItem extends vscode.TreeItem {
    constructor(public readonly session: Session) {
        super(session.name, vscode.TreeItemCollapsibleState.None);

        const category = getCategoryById(session.categoryId);

        this.id = session.id;
        this.tooltip = `${session.name} * ${category.label} * ${session.status}`;
        this.description = session.status;
        this.iconPath = new vscode.ThemeIcon(category.icon);
        this.contextValue = 'session';
    }
}