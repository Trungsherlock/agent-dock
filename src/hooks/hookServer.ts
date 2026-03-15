import * as http from 'http';

const MAX_BODY_BYTES = 1024 * 1024; // 1 MB

export interface HookEvent {
    hook_event_name: string;
    session_id: string;
    tool_name?: string;
    tool_input?: Record<string, unknown>;
}

export class HookServer {
    private server: http.Server;

    constructor(onEvent: (event: HookEvent) => void) {
        this.server = http.createServer((req, res) => {
            if (req.method !== 'POST' || req.url !== '/hook') {
                res.writeHead(404).end();
                return;
            }
            let body = '';
            let bodyBytes = 0;
            req.on('data', (chunk: Buffer) => {
                bodyBytes += chunk.length;
                if (bodyBytes > MAX_BODY_BYTES) {
                    res.writeHead(413).end();
                    req.destroy();
                    return;
                }
                body += chunk;
            });
            req.on('end', () => {
                try { onEvent(JSON.parse(body)); } catch (e) { console.warn('[HookServer] Failed to parse hook event body:', e); }
                res.writeHead(200).end('ok');
            });
        });
        this.server.listen(3456, '127.0.0.1');
    }

    dispose() {
        this.server.close();
    }
}