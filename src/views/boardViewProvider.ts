// import * as vscode from 'vscode';
// import * as fs from 'fs';
// import * as path from 'path';
// import { SessionManager } from '../managers/sessionManager';
// import { CATEGORIES } from '../constants/categories';
// import { serializeSession, WebviewMessage, ExtensionMessage } from '../utils/messageProtocol';

// export class BoardViewProvider implements vscode.WebviewViewProvider {
//     public static readonly viewType = 'agentdock.boardView';
//     private _view?: vscode.Webview;

//     constructor(
//         private readonly _extensionUri: vscode.Uri,
//         private readonly _sessionManager: SessionManager,
//     ) {}

//     resolveWebviewView(
//         webviewView: vscode.WebviewView,
//         _content: vscode.WebviewViewResolveContext,
//         _token: vscode.CancellationToken,
//     ): void {
//         this._view = webviewView;

//         webviewView.webview.options = {
//             enableScripts: true,
//             localResourceRoots: [
//                 vscode.Uri.joinPath(this._extensionUri, 'webview-ui', 'dist'),
//             ],
//         };

//         webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
//     }
// }