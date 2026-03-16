import * as vscode from 'vscode';
import * as fs from 'fs';
import { AgentDriver } from './AgentDriver';
import { SessionManager } from '../managers/sessionManager';
import { getAllClaudeLogFiles, watchForNewClaudeSessions, isConversationFile } from '../claudeWatcher';
import { processTranscriptLine } from '../parsers/transcriptParser';
import { installHooks as doInstallHooks } from '../hooks/hookInstaller';

export class ClaudeDriver implements AgentDriver {
    readonly id = 'claude';
    readonly displayName = 'Claude Code';
    readonly contextWindowDefault = 200_000;
    readonly usesLogFiles = true;

    getLaunchCommand(): string {
        return 'claude "hi"';
    }

    getResumeCommand(sessionId: string): string {
        return `claude --resume ${sessionId}`;
    }

    /**
     * Claude sessions are discovered via log files, not terminal name matching.
     * detectTerminal is not used for session creation but is available for
     * drivers that use terminal-open detection.
     */
    detectTerminal(_terminalName: string): boolean {
        return false;
    }

    getLogFiles(workspacePath?: string): string[] {
        return getAllClaudeLogFiles(workspacePath);
    }

    watchForNewSessions(context: vscode.ExtensionContext, onNew: (filePath: string) => void): void {
        watchForNewClaudeSessions(context, (filePath) => {
            if (isConversationFile(filePath)) {
                onNew(filePath);
                return;
            }
            // File exists but no user/assistant entry yet (Claude just started).
            // Watch it until the first message is written, then promote it.
            let promoted = false;
            const watcher = fs.watch(filePath, () => {
                if (promoted) { return; }
                if (isConversationFile(filePath)) {
                    promoted = true;
                    watcher.close();
                    onNew(filePath);
                }
            });
            context.subscriptions.push({ dispose: () => watcher.close() });
        });
    }

    parseLogLine(line: string, sessionId: string, sessionManager: SessionManager): void {
        processTranscriptLine(line, sessionId, sessionManager);
    }

    installHooks(): void {
        doInstallHooks();
    }
}
