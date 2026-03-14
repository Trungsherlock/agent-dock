# Changelog

All notable changes to AgentDock will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-03-14

### Added
- Kanban-style board view in the Activity Bar for managing multiple AI coding agent sessions
- Create, resume, rename, and end Claude Code sessions from the board
- Real-time session status tracking: `running`, `thinking`, `idle`, `error`
- Live tool-call feed — see the current tool name and target file as Claude works
- Token usage, estimated USD cost, and context window fill % per session
- Cohorts — horizontal swim lanes for grouping related sessions
- Skills — attach `.md` skill files from `.claude/skills/` to inject context into sessions
- Permission alerts — inline notification when an agent is waiting for approval
- Auto-discovery of existing Claude Code sessions on startup via log-file scanning
- Hook integration — installs a lightweight Python hook into `~/.claude/settings.json` for real-time events; falls back to log polling if Python is unavailable
- Cross-platform support: Windows, macOS, and Linux
- Agent architecture — extensible `AgentDriver` interface and `AgentRegistry` for future support of additional coding agents (Codex, Gemini, Copilot, etc.)
- `fs.watch()` with polling fallback — polling only activates when native file watching is unavailable

[Unreleased]: https://github.com/Trungsherlock/agent-dock/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Trungsherlock/agent-dock/releases/tag/v0.1.0
