import * as vscode from 'vscode';
import { SessionManager } from '../managers/sessionManager';
import { SessionTreeItem } from './sessionTreeItem';
import { CATEGORIES } from '../constants/categories';

export class SessionTreeProvider implements vscode.TreeDataProvider<SessionTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private sessionManager: SessionManager) {
        sessionManager.onDidChange(() => {
            this._onDidChangeTreeData.fire();
        });
    }

    getTreeItem(element: SessionTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(): SessionTreeItem[] {
        return this.sessionManager.getAll().map(s => new SessionTreeItem(s));
    }
}