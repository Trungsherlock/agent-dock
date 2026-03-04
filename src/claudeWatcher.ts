import type * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

const POLL_INTERVAL_MS = 2000;

function getClaudeProjectDirs(): string[] {
    const projectsRoot = path.join(os.homedir(), '.claude', 'projects');
    try {
        return fs.readdirSync(projectsRoot, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => path.join(projectsRoot, d.name));
    } catch {
        return [];
    }
}

function scanForNewFiles(
    dirs: string[],
    knownFiles: Set<string>,
    onNewSession: () => void,
): void {
    for (const dir of dirs) {
        let files: string[];
        try {
            files = fs.readdirSync(dir)
                .filter(f => f.endsWith('.jsonl'))
                .map(f => path.join(dir, f));
        } catch { continue; }

        for (const file of files) {
            if (!knownFiles.has(file)) {
                knownFiles.add(file);
                onNewSession();
            }
        }
    }
}

export function watchForNewClaudeSessions(
    context: vscode.ExtensionContext,
    onNewSession: () => void,
): void {
    const dirs = getClaudeProjectDirs();
    if (dirs.length === 0) { return; }

    const knownFiles = new Set<string>();
    scanForNewFiles(dirs, knownFiles, () => {});

    const fsWatchers: fs.FSWatcher[] = [];
    for (const dir of dirs) {
        try {
            const w = fs.watch(dir, () => {
                scanForNewFiles(getClaudeProjectDirs(), knownFiles, onNewSession);
            });
            fsWatchers.push(w);
        } catch { /* fs.watch not supported, polling will cover it */ }
    }

    const pollTimer = setInterval(() => {
        scanForNewFiles(getClaudeProjectDirs(), knownFiles, onNewSession);
    }, POLL_INTERVAL_MS);

    context.subscriptions.push({
        dispose() {
            for (const w of fsWatchers) { w.close(); }
            clearInterval(pollTimer);
        },
    });
}
