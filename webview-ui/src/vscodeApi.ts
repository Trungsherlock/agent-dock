declare function acquireVsCodeApi(): {
    postMessage(message: unknown): void;
    getState(): unknown;
    setState(state: unknown): void;
};

const vscode = typeof acquireVsCodeApi === 'function'
    ? acquireVsCodeApi()
    : { postMessage: () => {}, getState: () => null, setState: () => {} };

export default vscode;