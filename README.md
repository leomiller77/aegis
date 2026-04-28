# Aegis

[中文版 README](README.zh.md)

**AI Workflow Harness for Claude Code & Codex CLI**

Aegis is a lightweight CLI tool that turns Claude Code and Codex CLI into a disciplined, self-healing coding agent. It injects structured constraints directly into your AI session — so your AI writes code, runs tests, fixes failures, and only stops when everything is green.

```
npm install -g aegis-cli
```

> Requires Node.js ≥ 20.12.0

---

## Why Aegis?

Without constraints, AI coding assistants tend to drift — changing architecture mid-session, ignoring conventions, or spinning in endless loops. Aegis solves this by:

- **Anchoring every session** to a persistent spec layer (`.aegis/specs/`) that survives between conversations.
- **Driving a closed loop**: code → test → auto-fix, up to a configurable retry limit.
- **Never touching LLM APIs itself** — Aegis is a pure orchestration harness that delegates all AI work to your existing host CLI.

---

## Installation

```bash
npm install -g aegis-cli
```

Verify the installation:

```bash
aegis --version
# 1.0.0
```

---

## Quick Start (5 Minutes)

### Step 1 — Initialize Aegis in your project

Navigate to your project root and run:

```bash
aegis init
```

You'll be prompted to:

1. **Choose a host engine** — Claude Code or Codex CLI
2. **Set your test command** — defaults to `npm test`
3. **Set max retries** — defaults to `5`

```
  ┌─────────────────────────────────────────┐
  │  Aegis Engine v1.0.0                    │
  │  AI Workflow Harness — aegis init       │
  └─────────────────────────────────────────┘

  [?] Select your AI host engine:
    > Claude Code
      Codex CLI

  [?] Test command (default: npm test): ____

  [?] Max retries (default: 5): ____

  ✔ Host config written → .claude/skills/aegis/SKILL.md
  ✔ Workspace ready    → .aegis/
  ✔ aegis.config.json generated

  ┌─────────────────────────────────────────┐
  │  ✅ Aegis initialized                    │
  │                                         │
  │  Next: open Claude Code and run         │
  │  /aegis:spec <path-to-requirements>     │
  └─────────────────────────────────────────┘
```

Aegis generates two things:

- **Host config** — a SKILL.md (Claude Code) or plugin.json (Codex CLI) that registers the `/aegis` command namespace in your AI session.
- **Workspace** — a `.aegis/` directory that holds your specs, active task, and milestone history.

### Step 2 — Define your architecture specs

In Claude Code, run:

```
/aegis:spec PRD.md
```

Or paste requirements directly:

```
/aegis:spec Build a REST API with JWT auth, PostgreSQL, and Express
```

Aegis constrains the AI to **only write to `.aegis/specs/`** during this phase — no business code, no surprises. The AI acts as a pure architect, producing:

```
.aegis/specs/
  architecture.md   ← service boundaries, API routes, DB schema
  conventions.md    ← error handling, logging, caching rules
  gotchas.md        ← known pitfalls and hard prohibitions
```

### Step 3 — Start a task

In Claude Code, run:

```
/aegis Implement the POST /auth/login endpoint with JWT token generation
```

Aegis takes over:

1. Writes your requirement to `.aegis/task.md`
2. Loads all spec files and injects them as hard constraints into the AI context
3. The AI enters a closed loop: write code → run tests → fix failures → repeat
4. When tests pass, the AI outputs `[AEGIS_SUCCESS]` and stops
5. Aegis archives a milestone to `state.json`, clears the task file, and reports back:

```
  ✅ Task complete!
  ─────────────────────────────────────────
  Milestone recorded:
  "Implemented POST /auth/login with JWT generation, 3 iterations"
  System is now Idle ✔
  ─────────────────────────────────────────
```

---

## All Four Commands

### `/aegis:spec <path or description>`

Generate or update the anti-corruption spec layer. The AI is locked into architect mode and can only touch `.aegis/specs/`.

```
/aegis:spec requirements/auth.md
/aegis:spec Users must log in with email + password, sessions use JWT, no third-party auth
```

### `/aegis <task description>`

Fire a task into the closed loop. The AI codes, tests, self-heals, and exits only on green.

```
/aegis Add input validation to the registration endpoint using zod
/aegis Fix the failing test in auth.test.ts — JWT expiry check is broken
```

One task runs at a time. If a task is already active, Aegis rejects new submissions until you clear.

### `/aegis:clear`

Interrupt and discard the current task. Prompts for confirmation, then resets the system to Idle.

```
/aegis:clear
```

```
[?] A task is running. Force interrupt? (y/N): y

✔ Task interrupted. System is now Idle.
  Cleared .aegis/task.md
  Draft saved to state.json → stash_queue
```

Stashed tasks are preserved in `state.json` for later review.

### `/aegis:status`

View a full system snapshot — active task, loaded specs, milestone count, and last milestone.

```
/aegis:status
```

```
  ┌─────────────────────── Aegis Status ────────────────────────┐
  │  Host engine:   Claude Code                                  │
  │  System state:  🔴 Active (1 task running)                   │
  │                                                              │
  │  Active task (task.md):                                      │
  │  ┌──────────────────────────────────────────────────────┐    │
  │  │ Add input validation to the registration endpoint    │    │
  │  └──────────────────────────────────────────────────────┘    │
  │                                                              │
  │  Loaded specs (specs/):                                      │
  │  · architecture.md  ✔  (last updated: 2024-01-15 14:32)     │
  │  · conventions.md   ✔  (last updated: 2024-01-15 14:32)     │
  │  · gotchas.md       ✔  (last updated: 2024-01-14 09:01)     │
  │                                                              │
  │  Milestones (state.json): 12 total                           │
  │  Latest: 2024-01-15 13:45 — "Implemented JWT login route"   │
  └──────────────────────────────────────────────────────────────┘
```

---

## End-to-End Example

Here's a complete session building a user authentication feature from scratch.

**Project setup**

```bash
mkdir my-api && cd my-api
npm init -y
npm install express jsonwebtoken bcrypt zod
npm install -D jest ts-jest typescript @types/node
aegis init
# → Select: Claude Code
# → Test command: npx jest
# → Max retries: 5
```

**Session in Claude Code**

```
# 1. Define the spec from your requirements doc
/aegis:spec docs/auth-requirements.md

# Aegis constrains Claude to architect mode.
# Claude writes:
#   .aegis/specs/architecture.md  → route map, JWT config, DB schema
#   .aegis/specs/conventions.md   → error envelope format, logging rules
#   .aegis/specs/gotchas.md       → "never store plain-text passwords"

✔ Spec files updated:
  · .aegis/specs/architecture.md
  · .aegis/specs/conventions.md
  · .aegis/specs/gotchas.md

# 2. Run the first task
/aegis Scaffold the Express app with health check route and Jest test suite

# Claude writes code, runs `npx jest`, sees 0 failures, outputs [AEGIS_SUCCESS].
✅ Task complete! Milestone recorded: "Express app scaffolded with health check"

# 3. Build the auth routes one task at a time
/aegis Implement POST /auth/register — hash password with bcrypt, validate with zod schema

✅ Task complete! Milestone recorded: "POST /auth/register implemented, 2 iterations"

/aegis Implement POST /auth/login — verify password, return signed JWT

✅ Task complete! Milestone recorded: "POST /auth/login implemented, 1 iteration"

/aegis Implement GET /auth/me — verify JWT middleware, return user profile

✅ Task complete! Milestone recorded: "GET /auth/me implemented with auth middleware"

# 4. Check your progress at any time
/aegis:status
# Shows all 4 milestones, all 3 spec files loaded, system Idle.
```

In about 20 minutes, you have a fully tested auth module — built task by task, each one locked to your spec constraints, each one green before moving on.

---

## `aegis.config.json` Reference

Generated at your project root by `aegis init`. Safe to commit.

```json
{
  "host": "claude-code",
  "maxRetries": 5,
  "testCommand": "npm test",
  "specsDir": ".aegis/specs",
  "taskFile": ".aegis/task.md",
  "stateFile": ".aegis/state.json"
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `host` | `"claude-code"` \| `"codex-cli"` | — | The AI host engine you selected during `aegis init`. Determines which config files are injected. |
| `maxRetries` | `number` | `5` | Maximum code-test-fix iterations before Aegis halts and asks for human review. Increase for complex integration test suites, decrease for fast unit tests. |
| `testCommand` | `string` | `"npm test"` | The shell command Aegis instructs the AI to run after each code change. Must exit 0 on success and non-zero on failure. |
| `specsDir` | `string` | `".aegis/specs"` | Directory where spec Markdown files live. All `.md` files here are injected into the AI context on every task run. |
| `taskFile` | `string` | `".aegis/task.md"` | Path to the active task file. Non-empty means a task is running; empty means Idle. |
| `stateFile` | `string` | `".aegis/state.json"` | Append-only event log. Stores completed milestones and stashed (interrupted) tasks. |

---

## Workspace Layout

After `aegis init`, your project gets a `.aegis/` directory:

```
.aegis/
├── task.md          ← Active task (one at a time). Empty = Idle.
├── state.json       ← Milestone history and stash queue (append-only).
└── specs/
    ├── architecture.md   ← Service boundaries, API routes, DB conventions
    ├── conventions.md    ← Error handling, logging, caching rules
    └── gotchas.md        ← Hard prohibitions from past mistakes
```

The spec files are yours to edit directly. They are loaded fresh on every `/aegis` task run, so any changes you make are picked up immediately.

---

## Integration with Claude Code

Aegis writes a SKILL.md to `.claude/skills/aegis/SKILL.md`. Claude Code auto-discovers and registers all `/aegis` commands when it starts in your project directory.

No manual configuration is needed beyond `aegis init`.

Once initialized, the `/aegis` command namespace appears directly in your Claude Code session:

```
┌─────────────────────────────────────────────────────────────┐
│  Claude Code — my-api/                                       │
│                                                              │
│  > /aegis Implement POST /auth/login with JWT               │
│                                                              │
│  [Aegis] Loading specs from .aegis/specs/ (3 files)...      │
│  [Aegis] Task written to .aegis/task.md                     │
│  [Aegis] Entering closed-loop execution...                   │
│                                                              │
│  ● Writing auth/login route...                               │
│  ● Running: npx jest                                         │
│    ✔ 14 tests passed (0 failed)                              │
│  [AEGIS_SUCCESS]                                             │
│                                                              │
│  ✅ Task complete! Milestone recorded.                        │
└─────────────────────────────────────────────────────────────┘
```

The `.claude/skills/aegis/SKILL.md` file injects all Aegis constraints and the `/aegis` command definitions into the Claude Code session at startup. You can inspect this file to understand exactly what instructions Claude is operating under.

---

## Integration with Codex CLI

Aegis writes a plugin manifest to `.codex/plugins/aegis/plugin.json` and a hook script to `.codex/plugins/aegis/hook.js`. Codex CLI loads the plugin automatically on startup.

The hook script uses Codex's `onOutputMatch` mechanism to detect `[AEGIS_SUCCESS]` in real time and trigger the archival teardown without any polling.

When running inside Codex CLI, the experience looks like this:

```
┌─────────────────────────────────────────────────────────────┐
│  Codex CLI — my-api/                                         │
│  Plugin loaded: aegis v1.0.0                                 │
│                                                              │
│  > /aegis Add zod validation to POST /auth/register         │
│                                                              │
│  [Aegis] Specs injected (architecture.md, conventions.md,   │
│           gotchas.md)                                        │
│  [Aegis] Task active — retry budget: 5                       │
│                                                              │
│  Iteration 1/5                                               │
│  ● Updating src/routes/auth.ts with zod schema...           │
│  ● Running: npm test → Exit 1 (1 test failed)               │
│                                                              │
│  Iteration 2/5                                               │
│  ● Fixing schema field mismatch on `confirmPassword`...     │
│  ● Running: npm test → Exit 0                               │
│  [AEGIS_SUCCESS]                                             │
│                                                              │
│  [hook.js] Teardown triggered                                │
│  ✅ Task complete! Milestone recorded. System is Idle ✔       │
└─────────────────────────────────────────────────────────────┘
```

---

## Forcing a Re-initialization

If you switch host engines or need to reset the injected config files:

```bash
aegis init --force
```

This overwrites the host config files (SKILL.md or plugin.json) but leaves your `.aegis/specs/` and `state.json` intact.

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for instructions on how to clone the repo, install dependencies, build from source, and submit a pull request.

---

## License

MIT
