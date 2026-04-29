---
name: omin
description: AI workflow harness — spec-driven autonomous coding loop with self-healing test iteration
---

# Omin Workflow Harness

Omin enforces a spec-driven, self-healing coding loop inside Codex CLI. When invoked, read the user's input and determine the sub-command from the first token(s).

## Sub-commands

### `spec <path or description>` — Define architecture specs

Write or update spec files in `.omin/specs/`. You may ONLY write to `.omin/specs/` — no business code, no `src/` changes.

1. Read the user's input or load the specified file path.
2. Update the following files:
   - `.omin/specs/architecture.md` — service boundaries, API routes, DB schema, data flow
   - `.omin/specs/conventions.md` — error handling, logging rules, caching strategy, naming
   - `.omin/specs/gotchas.md` — known pitfalls (format: `[date][module] issue → correct approach`)
3. Output the list of updated files. Nothing else.

### `clear` — Interrupt the active task

Run via shell: `omin _internal-teardown --mode=interrupt`

### `status` — Show system snapshot

Run via shell: `omin _internal-status`

### (default) `<task description>` — Execute a task in closed loop

1. Read `.omin/task.md`. If it is non-empty, refuse execution and tell the user to run `/omin clear` first.
2. Write the task description to `.omin/task.md` via shell.
3. Load all `.md` files from `.omin/specs/` as hard constraints. Every line of code you write must comply with them.
4. Read `omin.config.json` to get `maxRetries`.
5. Detect the project's test command by inspecting these files (in order of priority):
   - `package.json` → `scripts.test`
   - `Makefile` → `make test`
   - `pytest.ini` or `pyproject.toml` → `pytest`
   - `Cargo.toml` → `cargo test`
   - Fall back to asking the user only if none of the above exist.
6. Enter the closed loop:
   - Write code changes that satisfy the task and all spec constraints.
   - Run the detected test command via shell.
   - **On failure**: analyze the full stderr, identify the root cause, fix the code, retry. Track retry count internally as `<omin-retry-count>`.
   - **On `<omin-retry-count>` reaching `maxRetries`**: stop immediately and report — the last full stderr, your analysis of the root cause, and what requires human intervention.
   - **On all tests passing (Exit Code 0)**:
     1. Output exactly this line and nothing else before it: `[OMIN_SUCCESS]`
     2. Run via shell: `omin _internal-teardown`
     3. Stop all output.
