import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite, fileExists, ensureDir } from '../../utils/fs-helpers.js';
import { log } from '../../utils/logger.js';

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
  const skillDir = path.join(projectRoot, '.codex', 'skills', 'omin');
  const skillPath = path.join(skillDir, 'SKILL.md');

  ensureDir(skillDir);

  if (!force && fileExists(skillPath)) {
    log.warn(`宿主配置已存在，跳过写入 → ${skillPath}`);
    log.info('如需强制覆盖，请使用 omin init --force');
    result.skipped.push(skillPath);
    return result;
  }

  const template = readTemplate('codex-skill.md.tpl');
  atomicWrite(skillPath, template);
  result.written.push(skillPath);
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
  return path.join(projectRoot, '.codex', 'skills', 'omin', 'SKILL.md');
}
