import * as fs from 'fs';
import { SessionManager } from '../managers/sessionManager';
import { processTranscriptLine } from '../parsers/transcriptParser';

const POLL_INTERVAL_MS = 2000;

export class ClaudeLogWatcher {
    private offset = 0;
    private lineBuffer = '';
    private watcher?: fs.FSWatcher;
    private pollTimer?: NodeJS.Timeout;
    private disposed = false;
    private skipStatus = false;

    constructor(
        private readonly sessionId: string,
        private readonly filePath: string,
        private readonly sessionManager: SessionManager,
        skipInitialStatus = false,
    ) {
        this.skipStatus = skipInitialStatus;
        this.readNewLines();
        this.skipStatus = false;
        try {
            this.watcher = fs.watch(this.filePath, () => {
                if (!this.disposed) { this.readNewLines(); }
            });
        } catch {}
        this.pollTimer = setInterval(() => {
            if (!this.disposed) { this.readNewLines(); }
        }, POLL_INTERVAL_MS);
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

            // Prepend any partial line saved from the previous read
            const text = this.lineBuffer + buf.toString('utf-8');
            const lines = text.split('\n');
            this.lineBuffer = lines.pop() ?? '';

            for (const line of lines) {
                if (!line.trim()) { continue; }
                processTranscriptLine(line, this.sessionId, this.sessionManager, this.skipStatus);
            }

        } catch {}
    }

    dispose() {
        this.disposed = true;
        this.watcher?.close();
        clearInterval(this.pollTimer);
    }
}