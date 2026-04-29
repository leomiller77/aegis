# omin

**AI Workflow Harness for Claude Code & Codex CLI**

`omin` is a lightweight CLI that turns Claude Code and Codex CLI into a disciplined, self-healing coding agent. It injects structured constraints directly into your AI session — so the AI writes code, runs tests, fixes failures, and only stops when everything is green.

```bash
npm install -g @leomiller/omin@latest
```

> Requires Node.js ≥ 20.12.0

---

## Commands

| Command | Description |
|---|---|
| `omin init` | Initialize the workspace, inject host config (Claude Code or Codex CLI), set test command and retry budget |
| `omin init --force` | Re-initialize and overwrite existing host config files |
| `omin status` | Display a full system snapshot: active task, loaded specs, milestone count, last milestone |
| `/omin:spec <path or description>` | Lock the AI into architect mode and generate or update `.omin/specs/` from a requirements doc or description |
| `/omin <task description>` | Fire a task into the closed loop — the AI codes, tests, self-heals, and exits only on green |
| `/omin:clear` | Interrupt the current task, stash the draft to `state.json`, reset the system to Idle |
| `/omin:status` | View the system snapshot from inside the AI session (same as `omin status`) |

---

## License

MIT
