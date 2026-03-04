import * as vscode from 'vscode';

export interface Cohort {
    id: string;
    label: string;
}

export const UNCATEGORIZED: Cohort = { id: 'uncategorized', label: 'Uncategorized' };

export class CohortManager {
    private cohorts: Cohort[] = [];
    private _onDidChange = new vscode.EventEmitter<void>();
    readonly onDidChange = this._onDidChange.event;

    load(cohorts: Cohort[]): void {
        this.cohorts = cohorts;
    }

    add(label: string): Cohort {
        const cohort: Cohort = { id: `cohort-${Date.now()}`, label };
        this.cohorts.push(cohort);
        this._onDidChange.fire();
        return cohort;
    }

    rename(id: string, label: string): void {
        const cohort = this.cohorts.find(c => c.id === id);
        if (cohort) {
            cohort.label = label;
            this._onDidChange.fire();
        }
    }

    remove(id: string): void {
        this.cohorts = this.cohorts.filter(c => c.id !== id);
        this._onDidChange.fire();
    }

    getAll(): Cohort[] {
        return [UNCATEGORIZED, ...this.cohorts];
    }

    getUserCohorts(): Cohort[] {
        return this.cohorts;
    }

    dispose(): void {
        this._onDidChange.dispose();
    }
}
