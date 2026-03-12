import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface AgentConfig {
    name: string;
    description: string;
    model: string;
    tools: string[];
    skills: string[];
    systemPrompt: string;
    scope: 'global' | 'project';
    projectRoot: string;
    cohortId: string;
}

export class AgentWriter {
    async write(config: AgentConfig): Promise<string> {
        const slug = this._slugify(config.name);
        const agentsDir = path.join(config.projectRoot, '.claude', 'agents');

        fs.mkdirSync(agentsDir, { recursive: true });

        const filePath = path.join(agentsDir, `${slug}.md`);
        fs.writeFileSync(filePath, this._buildContent(config), 'utf-8');
        return filePath;
    }

    private _buildContent(config: AgentConfig): string {
        const lines: string[] = ['---'];
        lines.push(`name: ${config.name}`);
        lines.push(`description: ${config.description}`);
        if (config.model) { lines.push(`model: ${config.model}`); }
        if (config.tools.length > 0) { lines.push(`tools: ${config.tools.join(', ')}`); }
        if (config.skills.length > 0) {
            lines.push('skills:');
            for (const skill of config.skills) {
                lines.push(`  - ${skill}`);
            }
        }
        lines.push('---');
        lines.push('');
        if (config.systemPrompt) { lines.push(config.systemPrompt); }
        return lines.join('\n');
    }

    private _slugify(name: string): string {
        return name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }
}
