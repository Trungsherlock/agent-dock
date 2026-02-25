export interface CategoryDefinition {
    id: string;
    label: string;
    icon: string;
    color: string;
}

export const CATEGORIES: CategoryDefinition[] = [
    {id: 'bug', label: 'Bug Fix', icon: 'bug', color: 'terminal.ansiRed'},
    {id: 'feature', label: 'Feature', icon: 'star', color: 'terminal.ansiGreen'},
    {id: 'refactor', label: 'Refactor', icon: 'tools', color: 'terminal.ansiCyan'},
    {id: 'test', label: 'Testing', icon: 'beaker', color: 'terminal.ansiMagenta'},
    {id: 'read', label: 'Reading', icon: 'book', color: 'terminal.ansiBlue'},
    {id: 'service', label: 'Service', icon: 'server', color: 'terminal.ansiYellow'},
    {id: 'other', label: 'Other', icon: 'question', color: 'terminal.ansiWhite'},
];

export const DEFAULT_CATEGORY = CATEGORIES[5];

export function getCategoryById(id: string): CategoryDefinition {
    return CATEGORIES.find(cat => cat.id === id) || DEFAULT_CATEGORY;
}
