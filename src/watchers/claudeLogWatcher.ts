import * as fs from 'fs';
import { SessionManager } from '../managers/sessionManager';
import { processTranscriptLine } from '../parsers/transcriptParser';

export class ClaudeLogWatcher {
    private offset = 0;
    private watcher?: fs.FSWatcher;
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
            for (const line of lines) { 
                processTranscriptLine(line, this.sessionId, this.sessionManager, this.skipStatus);
             }
        } catch {}
    }

    dispose() {
        this.disposed = true;
        this.watcher?.close();
    }
}