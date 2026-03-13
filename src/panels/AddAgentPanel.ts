import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SkillScanner } from '../services/SkillScanner';
import { AgentWriter, AgentConfig } from '../services/AgentWriter';

export type AddAgentExtensionMessage =
    | { command: 'initData'; skills: import('../services/SkillScanner').SkillInfo[]; projectName: string }
    | { command: 'createError'; message: string };

export type AddAgentWebviewMessage =
    | { command: 'ready' }
    | { command: 'createAgent'; config: AgentConfig }
    | { command: 'cancel' };

export class AddAgentPanel {
    private static _current: AddAgentPanel | undefined;

    private readonly _panel: vscode.WebviewPanel;
    private readonly _skillScanner = new SkillScanner();
    private readonly _agentWriter = new AgentWriter();

    static createOrShow(
        context: vscode.ExtensionContext,
        projectRoot: string,
        cohortId: string,
        onAgentCreated: (config: AgentConfig, filePath: string) => void,
    ): void {
        if (AddAgentPanel._current) {
            AddAgentPanel._current._panel.reveal();
            return;
        }

        const projectName = path.basename(projectRoot) || 'Project';

        const panel = vscode.window.createWebviewPanel(
            'agentdock.addAgent',
            `Add Agent — ${projectName}`,
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'webview-ui', 'dist'),
                ],
            },
        );

        AddAgentPanel._current = new AddAgentPanel(
            panel, context, projectRoot, cohortId, projectName, onAgentCreated,
        );
    }

    private constructor(
        panel: vscode.WebviewPanel,
        private readonly _context: vscode.ExtensionContext,
        private readonly _projectRoot: string,
        private readonly _cohortId: string,
        private readonly _projectName: string,
        private readonly _onAgentCreated: (config: AgentConfig, filePath: string) => void,
    ) {
        this._panel = panel;
        this._panel.webview.html = this._getHtml(panel.webview);

        this._panel.webview.onDidReceiveMessage(async (msg: AddAgentWebviewMessage) => {
            if (msg.command === 'ready') {
                await this._sendInitData();
            } else if (msg.command === 'createAgent') {
                await this._handleCreateAgent(msg.config);
            } else if (msg.command === 'cancel') {
                this._panel.dispose();
            }
        });

        this._panel.onDidDispose(() => {
            AddAgentPanel._current = undefined;
        });
    }

    private async _sendInitData(): Promise<void> {
        const skills = await this._skillScanner.scanAll(this._projectRoot);
        this._panel.webview.postMessage({
            command: 'initData',
            skills,
            projectName: this._projectName,
        } satisfies AddAgentExtensionMessage);
    }

    private async _handleCreateAgent(config: AgentConfig): Promise<void> {
        try {
            const filePath = await this._agentWriter.write({
                ...config,
                projectRoot: this._projectRoot,
                cohortId: this._cohortId,
            });
            this._onAgentCreated({ ...config, cohortId: this._cohortId }, filePath);
            this._panel.dispose();
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            this._panel.webview.postMessage({
                command: 'createError',
                message,
            } satisfies AddAgentExtensionMessage);
        }
    }

    private _getHtml(webview: vscode.Webview): string {
        const distPath = vscode.Uri.joinPath(this._context.extensionUri, 'webview-ui', 'dist');
        const htmlPath = path.join(distPath.fsPath, 'add-agent.html');

        if (!fs.existsSync(htmlPath)) {
            return `<!DOCTYPE html><body style="color:var(--vscode-foreground);padding:16px">
                <p>Webview not built. Run:</p>
                <pre>npm run build-webview</pre>
            </body>`;
        }

        let html = fs.readFileSync(htmlPath, 'utf-8');
        const assetsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(distPath, 'assets')
        ).toString();
        html = html.replace(/\.\/assets\//g, `${assetsUri}/`);

        const csp = [
            `default-src 'none'`,
            `script-src ${webview.cspSource}`,
            `style-src ${webview.cspSource} 'unsafe-inline'`,
            `img-src ${webview.cspSource} data:`,
            `font-src ${webview.cspSource}`,
        ].join('; ');

        html = html.replace(
            '<head>',
            `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}">`,
        );

        return html;
    }
}
