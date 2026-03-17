import { SessionManager } from '../managers/sessionManager';
import { HookEvent } from './hookServer';

function extractTarget(input?: Record<string, unknown>): string {
    if (!input) { return ''; }
    const val = input['file_path'] ?? input['notebook_path'] ?? input['command'] ?? input['path'] ?? '';
    return String(val);
}

export function handleHookEvent(event: HookEvent, sessionManager: SessionManager): void {
    console.log('[HookEvent] received:', event.hook_event_name, 'session:', event.session_id?.slice(0, 8));
    const session = sessionManager.getById(event.session_id);
    if (!session) { return; }

    switch (event.hook_event_name) {
        case 'PreToolUse':
            sessionManager.setStatus(event.session_id, 'running');
            if (event.tool_name) {
                sessionManager.setCurrentTool(event.session_id, {
                    name: event.tool_name,
                    target: extractTarget(event.tool_input),
                });
            }
            break;

        case 'PostToolUse':
            sessionManager.setPermissionRequest(event.session_id, false);
            break;

        case 'PermissionRequest':
            console.log('[HookEvent] PermissionRequest received, session:', event.session_id, 'tool:', event.tool_name);
            sessionManager.setPermissionRequest(event.session_id, true);
            if (event.tool_name) {
                const session = sessionManager.getById(event.session_id);
                if (!session?.currentTool) {
                    sessionManager.setCurrentTool(event.session_id, {
                        name: event.tool_name,
                        target: extractTarget(event.tool_input),
                    });
                }
            }
            break;

        case 'Stop':
        case 'SubagentStop':
            sessionManager.setCurrentTool(event.session_id, undefined);
            sessionManager.setPermissionRequest(event.session_id, false);
            sessionManager.setStatus(event.session_id, 'idle');
            break;
    }
}
