import * as vscode from 'vscode';
import { SessionManager } from '../managers/sessionManager';
import { CohortManager } from '../managers/cohortManager';
import { SessionTreeItem } from './sessionTreeItem';

export class SessionTreeProvider implements vscode.TreeDataProvider<SessionTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(
        private sessionManager: SessionManager,
        private cohortManager: CohortManager,
    ) {
        sessionManager.onDidChange(() => this._onDidChangeTreeData.fire());
        cohortManager.onDidChange(() => this._onDidChangeTreeData.fire());
    }

    getTreeItem(element: SessionTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(): SessionTreeItem[] {
        const allCohorts = this.cohortManager.getAll();
        return this.sessionManager.getAll().map(s => {
            const cohort = allCohorts.find(c => c.id === s.cohortId);
            return new SessionTreeItem(s, cohort?.label ?? 'Uncategorized');
        });
    }
}
