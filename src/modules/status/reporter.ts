import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { AegisConfig } from '../../utils/config.js';
import { readTask, isTaskEmpty } from '../context/task-writer.js';
import { readState } from '../archiver/state-writer.js';
import { getFileStat } from '../../utils/fs-helpers.js';

const BOX_WIDTH = 61;
const INNER_WIDTH = BOX_WIDTH - 4;

function pad(s: string, width: number = INNER_WIDTH): string {
  if (s.length >= width) return s.slice(0, width);
  return s + ' '.repeat(width - s.length);
}

function row(content: string): string {
  return chalk.bold('│') + '  ' + content + '  ' + chalk.bold('│');
}

function blank(): string {
  return row(pad(''));
}

function divider(): string {
  return chalk.bold('├' + '─'.repeat(BOX_WIDTH - 2) + '┤');
}

function formatDate(d: Date): string {
  const pad2 = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
    `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  );
}

export function renderStatus(config: AegisConfig, projectRoot: string): string {
  const lines: string[] = [];
  const top = chalk.bold('┌' + '─'.repeat(23) + ' Aegis Status ' + '─'.repeat(BOX_WIDTH - 39) + '┐');
  const bottom = chalk.bold('└' + '─'.repeat(BOX_WIDTH - 2) + '┘');

  lines.push(top);

  const hostLabel = config.host === 'claude-code' ? 'Claude Code' : 'Codex CLI';
  lines.push(row(pad(`宿主引擎：  ${hostLabel}`)));

  const taskContent = readTask(config, projectRoot);
  const idle = isTaskEmpty(taskContent);
  const statusStr = idle
    ? '🟢 Idle（无活跃任务）'
    : '🔴 活跃中（任务运行中）';
  lines.push(row(pad(`系统状态：  ${statusStr}`)));

  lines.push(blank());

  lines.push(row(pad('活跃任务（task.md）：')));

  if (idle) {
    lines.push(row(pad('  暂无活跃任务')));
  } else {
    const taskLines = taskContent.trim().split('\n').slice(0, 5);
    lines.push(row(pad('  ┌' + '─'.repeat(INNER_WIDTH - 4) + '┐')));
    for (const tl of taskLines) {
      lines.push(row(pad('  │ ' + tl.slice(0, INNER_WIDTH - 6).padEnd(INNER_WIDTH - 6) + ' │')));
    }
    lines.push(row(pad('  └' + '─'.repeat(INNER_WIDTH - 4) + '┘')));
  }

  lines.push(blank());

  const specsDir = path.join(projectRoot, config.specsDir);
  lines.push(row(pad('已挂载规范（specs/）：')));

  let specEntries: string[] = [];
  try {
    specEntries = fs
      .readdirSync(specsDir)
      .filter((f) => f.endsWith('.md'))
      .sort();
  } catch {
    /* dir doesn't exist */
  }

  if (specEntries.length === 0) {
    lines.push(row(pad('  ⚠ 尚未生成任何规范文件')));
  } else {
    for (const filename of specEntries) {
      const fullPath = path.join(specsDir, filename);
      const stat = getFileStat(fullPath);
      const dateStr = stat ? formatDate(stat.mtime) : '—';
      const entry = `· ${filename.padEnd(20)} ✔  (最后更新：${dateStr})`;
      lines.push(row(pad('  ' + entry)));
    }
  }

  lines.push(blank());

  const state = readState(config, projectRoot);
  const milestoneCount = state?.milestones?.length ?? 0;
  lines.push(row(pad(`里程碑累计（state.json）：${milestoneCount} 条`)));

  if (milestoneCount > 0 && state) {
    const last = state.milestones[state.milestones.length - 1];
    const ts = new Date(last.timestamp);
    const tsStr = formatDate(ts);
    const eventPreview = last.event.slice(0, 30);
    lines.push(row(pad(`最近一条：${tsStr} — "${eventPreview}"`)));
  }

  lines.push(bottom);
  return lines.join('\n');
}
