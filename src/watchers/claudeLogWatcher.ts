import * as fs from 'fs';
import { SessionManager } from '../managers/sessionManager';
import { processTranscriptLine } from '../parsers/transcriptParser';

const POLL_INTERVAL_MS = 2000;
const IDLE_TO_DONE_MS = 10000;

export class ClaudeLogWatcher {
    private offset = 0;
    private lineBuffer = '';
    private watcher?: fs.FSWatcher;
    private pollTimer?: NodeJS.Timeout;
    private idleTimer?: NodeJS.Timeout;
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

            // New data arrived — cancel any pending idle-to-done timer
            clearTimeout(this.idleTimer);
            this.idleTimer = undefined;

            const fd = fs.openSync(this.filePath, 'r');
            const buf = Buffer.alloc(stat.size - this.offset);
            fs.readSync(fd, buf, 0, buf.length, this.offset);
            fs.closeSync(fd);
            this.offset = stat.size;

            // Prepend any partial line saved from the previous read
            const text = this.lineBuffer + buf.toString('utf-8');
            const lines = text.split('\n');
            this.lineBuffer = lines.pop() ?? '';

            let sawTurnDuration = false;
            for (const line of lines) {
                if (!line.trim()) { continue; }
                const done = processTranscriptLine(line, this.sessionId, this.sessionManager, this.skipStatus);
                if (done) { sawTurnDuration = true; }
            }

            // If no turn_duration arrived but the session is now active, start
            // an idle timer as a fallback for text-only turns where Claude does
            // not emit turn_duration.
            if (!sawTurnDuration && !this.skipStatus) {
                const session = this.sessionManager.getById(this.sessionId);
                if (session?.status === 'active') {
                    this.idleTimer = setTimeout(() => {
                        this.sessionManager.updateMetrics(this.sessionId, { status: 'done' });
                    }, IDLE_TO_DONE_MS);
                }
            }
        } catch {}
    }

    dispose() {
        this.disposed = true;
        this.watcher?.close();
        clearInterval(this.pollTimer);
        clearTimeout(this.idleTimer);
    }
}