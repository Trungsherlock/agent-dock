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
    onNewSession: (filePath: string) => void,
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
                onNewSession(file);
            }
        }
    }
}

function encodeProjectPath(absolutePath: string): string {
    if (process.platform === 'win32') {
        return absolutePath
            .replace(/^([A-Za-z]):/, (_, drive: string) => drive.toLowerCase() + '-')
            .replace(/[\\/]/g, '-');
    }
    return absolutePath.replace(/\//g, '-');
}

export function getAllClaudeLogFiles(workspacePath?: string): string[] {
    const projectsRoot = path.join(os.homedir(), '.claude', 'projects');
    let dirs: string[];

    if (workspacePath) {
        const encoded = encodeProjectPath(workspacePath);
        const matched = path.join(projectsRoot, encoded);
        dirs = fs.existsSync(matched) ? [matched] : [];
    } else {
        dirs = getClaudeProjectDirs();
    }

    const files: string[] = [];
    for (const dir of dirs) {
        try {
            fs.readdirSync(dir)
                .filter(f => f.endsWith('.jsonl'))
                .forEach(f => files.push(path.join(dir, f)));
        } catch {}
    }
    return files;
}

export function watchForNewClaudeSessions(
    context: vscode.ExtensionContext,
    onNewSession: (filePath: string) => void,
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
        } catch {}
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
