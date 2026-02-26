// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { SessionManager } from './managers/sessionManager';
import { SessionTreeProvider } from './views/sessionTreeProvider';
import { SessionTreeItem } from './views/sessionTreeItem';
import { CATEGORIES } from './constants/categories';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const sessionManager = new SessionManager();
	const treeProvider = new SessionTreeProvider(sessionManager);

	vscode.window.registerTreeDataProvider('agentdock.sessionsView', treeProvider);

	vscode.window.onDidCloseTerminal(terminal => {
		sessionManager.removeByTerminal(terminal);
	}, null, context.subscriptions);

	context.subscriptions.push(
		vscode.commands.registerCommand('agentdock.newSession', async () => {
			const name = await vscode.window.showInputBox({
				prompt: 'Session name',
				placeHolder: 'e.g. Fix login bug',
			});
			if (!name) {
				return;
			}

			const picked = await vscode.window.showQuickPick(
				CATEGORIES.map(c => ({ label: `$(${c.icon}) ${c.label}`, id: c.id })),
				{ placeHolder: 'Select a category' }
			);
			if (!picked) {
				return;
			}

			const terminal = vscode.window.createTerminal({
				name,
				iconPath: new vscode.ThemeIcon(
					CATEGORIES.find(c => c.id === picked.id)!.icon
				),
			});
			terminal.show();

			sessionManager.add(name, picked.id, terminal);
		})
	);

	context.subscriptions.push(
        vscode.commands.registerCommand('agentdock.focusSession', (item: SessionTreeItem) => {
            item.session.terminal.show();
        })
    );
	
	context.subscriptions.push(
		vscode.commands.registerCommand('agentdock.endSession', (item: SessionTreeItem) => {
			item.session.terminal.dispose();
			sessionManager.remove(item.session.id);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('agentdock.renameSession', async (item: SessionTreeItem) => {
			const newName = await vscode.window.showInputBox({
				prompt: 'New session name',
				value: item.session.name,
			});
			if (!newName) { return;}
			sessionManager.rename(item.session.id, newName);
		})
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
