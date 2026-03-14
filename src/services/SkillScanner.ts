import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface SkillInfo {
    name: string;
    description: string;
    scope: 'global' | 'project';
    dirPath: string;
    hasScripts: boolean;
}

export class SkillScanner {
    async scanAll(projectRoot: string): Promise<SkillInfo[]> {
        const globalDir = path.join(os.homedir(), '.claude', 'skills');
        const projectDir = path.join(projectRoot, '.claude', 'skills');

        const [projectSkills, globalSkills] = await Promise.all([
            this._scanDir(projectDir, 'project'),
            this._scanDir(globalDir, 'global'),
        ]);

        const seen = new Set<string>();
        const result: SkillInfo[] = [];
        for (const skill of [...projectSkills, ...globalSkills]) {
            if (!seen.has(skill.name)) {
                seen.add(skill.name);
                result.push(skill);
            }
        }
        return result;
    }

    private async _scanDir(dir: string, scope: 'global' | 'project'): Promise<SkillInfo[]> {
        if (!fs.existsSync(dir)) { return []; }

        let entries: string[];
        try {
            entries = fs.readdirSync(dir);
        } catch (e) {
            console.warn(`[SkillScanner] Could not read skills directory: ${dir}`, e);
            return [];
        }

        const skills: SkillInfo[] = [];
        for (const entry of entries) {
            const dirPath = path.join(dir, entry);
            try {
                if (!fs.statSync(dirPath).isDirectory()) { continue; }

                const skillMdPath = path.join(dirPath, 'SKILL.md');
                if (!fs.existsSync(skillMdPath)) { continue; }

                const content = fs.readFileSync(skillMdPath, 'utf-8');
                const frontmatter = this._parseFrontmatter(content);
                if (!frontmatter) {
                    console.warn(`[SkillScanner] No frontmatter in ${skillMdPath}, skipping`);
                    continue;
                }

                skills.push({
                    name: frontmatter['name'] || entry,
                    description: frontmatter['description'] || '',
                    scope,
                    dirPath,
                    hasScripts: fs.existsSync(path.join(dirPath, 'scripts')),
                });
            } catch (e) {
                console.warn(`[SkillScanner] Error reading skill at ${dirPath}:`, e);
            }
        }
        return skills;
    }

    private _parseFrontmatter(content: string): Record<string, string> | null {
        const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!match) { return null; }

        const result: Record<string, string> = {};
        for (const line of match[1].split('\n')) {
            const colonIdx = line.indexOf(':');
            if (colonIdx === -1) { continue; }
            const key = line.slice(0, colonIdx).trim();
            const value = line.slice(colonIdx + 1).trim();
            if (key) { result[key] = value; }
        }
        return result;
    }
}
