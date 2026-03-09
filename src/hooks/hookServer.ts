import * as http from 'http';

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
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try { onEvent(JSON.parse(body)); } catch {}
                res.writeHead(200).end('ok');
            });
        });
        this.server.listen(3456, '127.0.0.1');
    }

    dispose() {
        this.server.close();
    }
}