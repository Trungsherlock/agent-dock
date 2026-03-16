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
    subtype?: string;
    message?: {
        roles?: string;
        content?: string | ContentBlock[];
        usage?: { input_tokens?: number; output_tokens?: number };
    };
}

function isHumanTurn(entry: ClaudeEntry): boolean {
    const content = entry.message?.content;
    if (typeof content === 'string') { return true; }
    if (!Array.isArray(content) || content.length === 0) { return false; }
    return content.some(b => b.type === 'text');
}

export function processTranscriptLine(
    raw: string,
    sessionId: string,
    sessionManager: SessionManager,
    skipStatus = false,
): boolean {
    let entry: ClaudeEntry;
    try { entry = JSON.parse(raw); } catch { return false; }

    if (entry.type === 'system' && entry.subtype === 'stop_hook_summary') {
        sessionManager.updateMetrics(sessionId, { status: 'idle' });
        return true;
    }

    if (entry.type === 'user') {
        if (!skipStatus && isHumanTurn(entry)) {
            sessionManager.updateMetrics(sessionId, { status: 'thinking' });
            sessionManager.setCurrentTool(sessionId, undefined);
        } else if (!skipStatus) {
            // Tool result: tool just completed, clear currentTool
            sessionManager.setCurrentTool(sessionId, undefined);
        }
        return true;
    }

    if (entry.type !== 'assistant') { return false; }

    const content = entry.message?.content;
    if (!Array.isArray(content)) { return false; }

    const session = sessionManager.getById(sessionId);
    if (!session) { return false; }

    let currentTask: string | undefined;
    const newToolCalls: ToolCall[] = [];
    const newFiles: string[] = [];

    for (const block of content) {
        if (block.type === 'text' && block.text) {
            const first = block.text.split('\n').find(l => l.trim());
            if (first)  { currentTask = first.trim().slice(0, 120); }
        }
        if (block.type === 'tool_use' && block.id && block.name) {
            newToolCalls.push({
                id: block.id, 
                name: block.name,
                input: block.input ? JSON.stringify(block.input) : '',
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

    if (newToolCalls.length > 0 && !skipStatus) {
        const firstTool = content.find(b => b.type === 'tool_use');
        if (firstTool?.name) {
            const fileKey = FILE_TOOLS[firstTool.name];
            const target = fileKey && firstTool.input ? String(firstTool.input[fileKey] ?? '') : '';
            sessionManager.setCurrentTool(sessionId, { name: firstTool.name, target });
        }
    }

    const usage = entry.message?.usage;
    const addedInput = usage?.input_tokens ?? 0;
    const addedOutput = usage?.output_tokens ?? 0;

    const patch: Parameters<SessionManager['updateMetrics']>[1] = {};
    if (newToolCalls.length > 0 && !skipStatus) { patch.status = 'running'; }
    if (currentTask) { patch.currentTask = currentTask; }
    if (newToolCalls.length > 0) { patch.toolCalls = [...session.toolCalls, ...newToolCalls].slice(-50); }
    if (newFiles.length > 0) { patch.filesTouched = [...new Set([...session.filesTouched, ...newFiles])]; }
    if (addedInput > 0 || addedOutput > 0) {
        patch.tokensInput = session.tokensInput + addedInput;
        patch.tokensOutput = session.tokensOutput + addedOutput;
        patch.contextWindowUsed = session.contextWindowUsed + addedInput + addedOutput;
    }
    if (Object.keys(patch).length > 0) {
        sessionManager.updateMetrics(sessionId, patch);
    }
    return false;
}