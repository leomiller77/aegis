# Contributing to Aegis

Thank you for your interest in contributing to Aegis! This guide covers everything you need to build the project from source, make changes, and submit a pull request.

---

## Prerequisites

- **Node.js** ≥ 20.12.0
- **pnpm** ≥ 9.0.0 — Aegis uses pnpm workspaces. Install it with:
  ```bash
  npm install -g pnpm
  ```

---

## Cloning the Repository

Fork the repository on GitHub, then clone your fork:

```bash
git clone https://github.com/<your-username>/aegis.git
cd aegis
git remote add upstream https://github.com/<upstream-org>/aegis.git
```

Replace `<your-username>` and `<upstream-org>` with the appropriate GitHub usernames. The upstream remote lets you pull in future changes from the main repository.

---

## Installing Dependencies

From the repository root, install all workspace dependencies:

```bash
pnpm install
```

This installs dependencies for every package in the monorepo, including `packages/aegis-cli`.

---

## Project Structure

```
aegis/
├── packages/
│   └── aegis-cli/          ← The CLI source code
│       ├── src/            ← TypeScript source files
│       │   ├── cli.ts      ← Entry point / command registration
│       │   ├── modules/    ← Core command modules (init, spec, clear, status)
│       │   ├── prompts/    ← Interactive prompt helpers
│       │   ├── templates/  ← File templates written by `aegis init`
│       │   └── utils/      ← Shared utilities
│       ├── bin/
│       │   └── aegis.js    ← Thin executable wrapper
│       ├── dist/           ← Compiled output (generated, not committed)
│       ├── package.json
│       └── tsconfig.json
└── pnpm-workspace.yaml
```

---

## Building

The CLI is written in TypeScript and must be compiled before it can run. From the repo root:

```bash
pnpm --filter aegis-cli run build
```

Or from inside the package directory:

```bash
cd packages/aegis-cli
pnpm run build
```

This runs `tsc` and outputs compiled JavaScript to `packages/aegis-cli/dist/`.

### Type-checking without emitting files

```bash
pnpm --filter aegis-cli run typecheck
```

---

## Running Locally

After building, you can link the CLI to your PATH for local testing:

```bash
cd packages/aegis-cli
npm link
```

Then use the `aegis` command as you normally would:

```bash
aegis --version
aegis init
```

To unlink when you're done:

```bash
npm unlink -g aegis-cli
```

Alternatively, run the TypeScript source directly (without building) using the dev script:

```bash
pnpm --filter aegis-cli run dev -- --version
```

---

## Running Tests

> **Note:** A dedicated automated test suite is being added. See the open task in the project board.

For now, test your changes manually by running the CLI commands against a scratch project:

```bash
mkdir /tmp/aegis-test && cd /tmp/aegis-test
npm init -y
aegis init
aegis --version
```

Check that `aegis init` generates the expected files:

```
.aegis/
├── task.md
├── state.json
└── specs/

aegis.config.json
```

---

## Making Changes

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Edit source files** under `packages/aegis-cli/src/`.

3. **Rebuild** after each change:
   ```bash
   pnpm --filter aegis-cli run build
   ```

4. **Typecheck** to catch type errors early:
   ```bash
   pnpm --filter aegis-cli run typecheck
   ```

5. **Test manually** using the steps in [Running Tests](#running-tests).

---

## Submitting a Pull Request

1. Push your branch and open a PR against `main`.
2. Fill in the PR description with:
   - What changed and why
   - Steps to reproduce the problem you're fixing (if a bug)
   - Manual test steps you ran
3. Keep PRs focused — one feature or fix per PR.
4. A maintainer will review and merge once CI passes and the change looks good.

---

## Code Style

- All source is TypeScript with `strict` mode enabled.
- Use ES module syntax (`import`/`export`) — the project uses `"type": "module"`.
- Follow the existing file and naming conventions in `src/`.
- Avoid adding runtime dependencies unless absolutely necessary; keep the CLI lightweight.

---

## Questions?

Open a GitHub Discussion or file an issue if you get stuck. We're happy to help.
