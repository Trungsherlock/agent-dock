import * as vscode from 'vscode';
import { SessionManager } from '../managers/sessionManager';

/**
 * Abstraction for a coding agent. Each supported agent (Claude, Codex, Gemini, …)
 * provides one implementation. The rest of the extension only depends on this interface.
 */
export interface AgentDriver {
    readonly id: string;
    readonly displayName: string;
    readonly contextWindowDefault: number;
    readonly usesLogFiles: boolean;

    getLaunchCommand(): string;
    getResumeCommand(sessionId: string): string;
    detectTerminal(terminalName: string): boolean;

    getLogFiles(workspacePath?: string): string[];
    watchForNewSessions(context: vscode.ExtensionContext, onNew: (filePath: string) => void): void;
    parseLogLine(line: string, sessionId: string, sessionManager: SessionManager): void;

    installHooks?(): void;
}
