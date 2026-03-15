import type * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

const POLL_INTERVAL_MS = 2000;

export function isConversationFile(filePath: string): boolean {
    try {
        const buf = Buffer.alloc(16384);
        const fd = fs.openSync(filePath, 'r');
        const bytesRead = fs.readSync(fd, buf, 0, buf.length, 0);
        fs.closeSync(fd);
        const lines = buf.subarray(0, bytesRead).toString('utf-8').split('\n');
        for (const line of lines) {
            if (!line.trim()) { continue; }
            try {
                const entry = JSON.parse(line);
                if (entry.type === 'user' || entry.type === 'assistant') { return true; }
            } catch { continue; }
        }
        return false;
    } catch {
        return false;
    }
}

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
        } catch (e) {
            console.warn(`[ClaudeWatcher] Could not read directory: ${dir}`, e);
            continue;
        }

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
            .replace(/[^a-zA-Z0-9-]/g, '-');
    }
    return absolutePath.replace(/[^a-zA-Z0-9-]/g, '-');
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
        } catch (e) {
            console.warn(`[ClaudeWatcher] Could not read directory: ${dir}`, e);
        }
    }
    return files;
}

export function watchForNewClaudeSessions(
    context: vscode.ExtensionContext,
    onNewSession: (filePath: string) => void,
): void {
    const projectsRoot = path.join(os.homedir(), '.claude', 'projects');

    // Ensure the root directory exists so we can watch it even before Claude has run.
    try { fs.mkdirSync(projectsRoot, { recursive: true }); } catch { /* ignore */ }

    const knownFiles = new Set<string>();
    const watchedDirs = new Set<string>();
    const fsWatchers: fs.FSWatcher[] = [];

    // Seed known files and return a list of dirs we failed to watch (for polling).
    const unwatchedDirs: string[] = [];

    function watchDir(dir: string): void {
        if (watchedDirs.has(dir)) { return; }
        watchedDirs.add(dir);
        try {
            const w = fs.watch(dir, () => {
                scanForNewFiles([dir], knownFiles, onNewSession);
            });
            fsWatchers.push(w);
        } catch (e) {
            console.warn(`[ClaudeWatcher] Could not watch directory: ${dir}`, e);
            unwatchedDirs.push(dir);
        }
    }

    // Watch all project subdirectories that already exist.
    const existingDirs = getClaudeProjectDirs();
    scanForNewFiles(existingDirs, knownFiles, () => {});
    for (const dir of existingDirs) { watchDir(dir); }

    // Watch the root projects/ directory so new subdirectories are detected
    // (e.g. first time Claude runs in a workspace — the subdir doesn't exist yet).
    try {
        const rootWatcher = fs.watch(projectsRoot, () => {
            const currentDirs = getClaudeProjectDirs();
            for (const dir of currentDirs) {
                watchDir(dir); // no-op if already watched
                scanForNewFiles([dir], knownFiles, onNewSession);
            }
        });
        fsWatchers.push(rootWatcher);
    } catch (e) {
        console.warn(`[ClaudeWatcher] Could not watch projects root: ${projectsRoot}`, e);
        // Fall back to polling the root by re-checking all dirs periodically.
        unwatchedDirs.push(projectsRoot);
    }

    // Polling fallback for any dirs that couldn't be watched with fs.watch().
    let pollTimer: NodeJS.Timeout | undefined;
    if (unwatchedDirs.length > 0) {
        pollTimer = setInterval(() => {
            const currentDirs = getClaudeProjectDirs();
            for (const dir of currentDirs) { watchDir(dir); }
            scanForNewFiles(currentDirs, knownFiles, onNewSession);
        }, POLL_INTERVAL_MS);
    }

    context.subscriptions.push({
        dispose() {
            for (const w of fsWatchers) { w.close(); }
            if (pollTimer) { clearInterval(pollTimer); }
        },
    });
}
