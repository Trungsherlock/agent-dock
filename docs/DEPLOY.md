# AgentDock — Deploy & Test Guide

## Prerequisites

- Node.js 18+
- VS Code 1.109.0+
- Claude Code installed (`npm install -g @anthropic-ai/claude-code`)
- A VS Code Marketplace publisher account with ID `trungsherlock2002`

---

## 1. Build

```bash
# Install root dependencies
npm install

# Install webview dependencies
cd webview-ui && npm install && cd ..

# Compile everything (TypeScript + Vite)
npm run compile
```

Make sure `npm run compile` exits with no errors before proceeding.

---

## 2. Package (.vsix)

```bash
npx vsce package
```

This produces `agentdock-<version>.vsix` in the project root.

---

## 3. Test the .vsix locally

1. Open VS Code
2. Go to **Extensions** sidebar → click `···` (top-right) → **Install from VSIX...**
3. Select the generated `.vsix` file
4. Open a workspace where Claude Code is installed and active

**Checklist:**
- [ ] AgentDock icon appears in the Activity Bar
- [ ] Opening the panel shows existing Claude sessions (if any)
- [ ] "New Session" creates a terminal and starts Claude
- [ ] Session status updates (running / thinking / idle) as Claude works
- [ ] Drag-and-drop between cohort columns works
- [ ] Session notes can be saved
- [ ] Reloading the window (`Ctrl+Shift+P` → **Reload Window**) does not duplicate terminals
- [ ] Hook server receives events (check VS Code Output → AgentDock)

---

## 4. Set up the marketplace publisher (first time only)

1. Go to https://marketplace.visualstudio.com/manage
2. Sign in with your Microsoft account
3. Create publisher with ID `trungsherlock2002`
4. Go to https://dev.azure.com → your org → **User Settings** → **Personal Access Tokens**
5. Create a token with scope: **Marketplace → Manage**
6. Copy the token — you'll need it in the next step

---

## 5. Publish

```bash
npx vsce publish
```

Enter your Personal Access Token when prompted.

Or publish with a specific version bump:

```bash
npx vsce publish patch   # 0.1.0 → 0.1.1
npx vsce publish minor   # 0.1.0 → 0.2.0
npx vsce publish major   # 0.1.0 → 1.0.0
```

After publishing, the extension appears at:
`https://marketplace.visualstudio.com/items?itemName=trungsherlock2002.agentdock`

---

## 6. Post-publish

- [ ] Create a GitHub release tagged `v<version>` with the `.vsix` attached
- [ ] Verify the marketplace listing shows the correct README and CHANGELOG
- [ ] Install from the marketplace directly (`ext install trungsherlock2002.agentdock`) and re-run the test checklist

---

## Updating an existing release

1. Make your changes
2. Update `CHANGELOG.md` with what changed under the new version
3. Bump the version in `package.json`
4. Run `npm run compile` to verify no errors
5. Run `npx vsce publish` (or `patch`/`minor`/`major`)

---

## Known issues

- `yauzl` inside `@vscode/vsce` has a moderate vulnerability with no upstream fix — does not affect published extension or end users, only the local packaging tool.
