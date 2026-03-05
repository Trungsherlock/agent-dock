import * as fs from 'fs';
import { SessionManager } from '../managers/sessionManager';
import { ToolCall } from '../models/session';

const FILE_TOOLS: Record<string, string> = {
    'Read': 'file_path',
    'Write': 'file_path', 
    'Edit': 'file_path',
    'MultiEdit': 'file_path',
    'NotebookEdit': 'notebook_path',
    'NotebookRead': 'notebook_path',
};

interface ContentBlock {
    type: 'text' | 'tool_use' | 'tool_result';
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
}

interface ClaudeEntry {
    type: string;
    message?: {
        content?: string | ContentBlock[];
        usage?: { input_tokens?: number; output_tokens?: number };
    };
}

export class ClaudeLogWatcher {
    private offset = 0;
    private watcher?: fs.FSWatcher;
    private disposed = false;

    constructor(
        private readonly sessionId: string,
        private readonly filePath: string, 
        private readonly sessionManager: SessionManager,
    ) {
        this.readNewLines();
        try {
            this.watcher = fs.watch(this.filePath, () => {
                if (!this.disposed) { this.readNewLines(); }
            });
        } catch {}
    }

    private readNewLines() {
        try {
            const stat = fs.statSync(this.filePath);
            if (stat.size <= this.offset) { return; }

            const fd = fs.openSync(this.filePath, 'r');
            const buf = Buffer.alloc(stat.size - this.offset);
            fs.readSync(fd, buf, 0, buf.length, this.offset);
            fs.closeSync(fd);
            this.offset = stat.size;

            const lines = buf.toString('utf-8').split('\n').filter(l => l.trim());
            for (const line of lines) { this.processLine(line); }
        } catch {

        }
    }

    private processLine(raw: string) {
        let entry: ClaudeEntry;
        try { entry = JSON.parse(raw); } catch { return; }

        if (entry.type !== 'assistant') { return; }

        const content = entry.message?.content;
        if (!Array.isArray(content)) { return; }

        const session = this.sessionManager.getById(this.sessionId);
        if (!session) { return; }

        let currentTask: string | undefined;
        const newToolCalls: ToolCall[] = [];
        const newFiles: string[] = [];

        for (const block of content) {
            if (block.type === 'text' && block.text) {
                const first = block.text.split('\n').find(l => l.trim());
                if (first) { currentTask = first.trim().slice(0, 120); }
            }

            if (block.type === 'tool_use' && block.id && block.name) {
                newToolCalls.push({
                    id: block.id,
                    name: block.name,
                    input: block.input ? JSON.stringify(block.input) : "",
                    status: 'done',
                    startedAt: Date.now(),
                });

                const fileKey = FILE_TOOLS[block.name];
                if (fileKey && block.input) {
                    const fp = block.input[fileKey];
                    if (typeof fp === 'string') { newFiles.push(fp); }
                }
            }
        }

        const usage = entry.message?.usage;
        const addedInput = usage?.input_tokens ?? 0;
        const addedOutput = usage?.output_tokens ?? 0;

        const patch: Parameters<SessionManager['updateMetrics']>[1] = {};

        if (currentTask) {
            patch.currentTask = currentTask;
        }
        if (newToolCalls.length > 0) {
            patch.toolCalls = [...session.toolCalls, ...newToolCalls].slice(-50);
        }
        if (newFiles.length > 0) {
            patch.filesTouched = [...new Set([...session.filesTouched, ...newFiles])];
        }
        if (addedInput > 0 || addedOutput > 0) {
            patch.tokensInput = session.tokensInput + addedInput;
            patch.tokensOutput = session.tokensOutput + addedOutput;
            patch.contextWindowUsed = session.contextWindowUsed + addedOutput;
        }

        if (Object.keys(patch).length > 0) {
            this.sessionManager.updateMetrics(this.sessionId, patch);
        }
    }

    dispose() {
        this.disposed = true;
        this.watcher?.close();
    }
}