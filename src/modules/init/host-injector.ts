import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite, fileExists, ensureDir } from '../../utils/fs-helpers.js';
import { log } from '../../utils/logger.js';
import { SPEC_PROMPT } from '../../prompts/spec.prompt.js';
import { EXEC_PROMPT } from '../../prompts/exec.prompt.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '../../../src/templates');

export type HostType = 'claude-code' | 'codex-cli';

export interface InjectionResult {
  written: string[];
  skipped: string[];
}

export function injectHost(
  projectRoot: string,
  host: HostType,
  force = false,
): InjectionResult {
  if (host === 'claude-code') {
    return injectClaudeCode(projectRoot, force);
  } else {
    return injectCodexCli(projectRoot, force);
  }
}

function injectClaudeCode(projectRoot: string, force: boolean): InjectionResult {
  const result: InjectionResult = { written: [], skipped: [] };
  const skillDir = path.join(projectRoot, '.claude', 'skills', 'omin');
  const skillPath = path.join(skillDir, 'SKILL.md');

  ensureDir(skillDir);

  if (!force && fileExists(skillPath)) {
    log.warn(`宿主配置已存在，跳过写入 → ${skillPath}`);
    log.info('如需强制覆盖，请使用 omin init --force');
    result.skipped.push(skillPath);
    return result;
  }

  const template = readTemplate('claude-skill.md.tpl');
  atomicWrite(skillPath, template);
  result.written.push(skillPath);
  return result;
}

function injectCodexCli(projectRoot: string, force: boolean): InjectionResult {
  const result: InjectionResult = { written: [], skipped: [] };
  const pluginDir = path.join(projectRoot, '.codex', 'plugins', 'omin');
  const pluginJsonPath = path.join(pluginDir, 'plugin.json');

  ensureDir(pluginDir);
  ensureDir(path.join(pluginDir, 'prompts'));
  ensureDir(path.join(pluginDir, 'scripts'));

  if (!force && fileExists(pluginJsonPath)) {
    log.warn(`宿主配置已存在，跳过写入 → ${pluginJsonPath}`);
    log.info('如需强制覆盖，请使用 omin init --force');
    const allFiles = [
      pluginJsonPath,
      path.join(pluginDir, 'hook.js'),
      path.join(pluginDir, 'prompts', 'spec.txt'),
      path.join(pluginDir, 'prompts', 'exec.txt'),
      path.join(pluginDir, 'scripts', 'clear.js'),
      path.join(pluginDir, 'scripts', 'status.js'),
      path.join(pluginDir, 'scripts', 'scaffold.js'),
    ];
    result.skipped.push(...allFiles);
    return result;
  }

  const template = readTemplate('codex-plugin.json.tpl');
  atomicWrite(pluginJsonPath, template);
  result.written.push(pluginJsonPath);

  const hookJsPath = path.join(pluginDir, 'hook.js');
  atomicWrite(hookJsPath, `#!/usr/bin/env node
// .codex/plugins/omin/hook.js
// 由 Codex 在捕获到 [OMIN_SUCCESS] 后自动调用

const { execSync } = require('child_process');

execSync('omin _internal-teardown', { stdio: 'inherit' });
`);
  result.written.push(hookJsPath);

  const specTxtPath = path.join(pluginDir, 'prompts', 'spec.txt');
  atomicWrite(specTxtPath, SPEC_PROMPT);
  result.written.push(specTxtPath);

  const execTxtPath = path.join(pluginDir, 'prompts', 'exec.txt');
  atomicWrite(execTxtPath, EXEC_PROMPT);
  result.written.push(execTxtPath);

  const clearJsPath = path.join(pluginDir, 'scripts', 'clear.js');
  atomicWrite(clearJsPath, `#!/usr/bin/env node
// .codex/plugins/omin/scripts/clear.js
// 由 /omin:clear 触发，强制中断当前任务

const { execSync } = require('child_process');

execSync('omin _internal-teardown --mode=interrupt', { stdio: 'inherit' });
`);
  result.written.push(clearJsPath);

  const statusJsPath = path.join(pluginDir, 'scripts', 'status.js');
  atomicWrite(statusJsPath, `#!/usr/bin/env node
// .codex/plugins/omin/scripts/status.js
// 由 /omin:status 触发，显示系统状态

const { execSync } = require('child_process');

execSync('omin _internal-status', { stdio: 'inherit' });
`);
  result.written.push(statusJsPath);

  const scaffoldJsPath = path.join(pluginDir, 'scripts', 'scaffold.js');
  atomicWrite(scaffoldJsPath, `#!/usr/bin/env node
// .codex/plugins/omin/scripts/scaffold.js
// afterInit hook — scaffolding is handled by 'omin init', this is a no-op placeholder.
`);
  result.written.push(scaffoldJsPath);

  return result;
}

function readTemplate(filename: string): string {
  const templatePath = path.join(TEMPLATES_DIR, filename);
  try {
    return fs.readFileSync(templatePath, 'utf8');
  } catch {
    throw new Error(`无法读取模板文件：${templatePath}`);
  }
}

export function getHostLabel(host: HostType): string {
  return host === 'claude-code' ? 'Claude Code' : 'Codex CLI';
}

export function getHostConfigPath(projectRoot: string, host: HostType): string {
  if (host === 'claude-code') {
    return path.join(projectRoot, '.claude', 'skills', 'omin', 'SKILL.md');
  }
  return path.join(projectRoot, '.codex', 'plugins', 'omin', 'plugin.json');
}
