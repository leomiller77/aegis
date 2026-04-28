import path from 'path';
import { atomicWrite, safeReadFile } from '../../utils/fs-helpers.js';
import { AegisConfig } from '../../utils/config.js';

export function readTask(config: AegisConfig, projectRoot: string): string {
  const taskPath = path.join(projectRoot, config.taskFile);
  return safeReadFile(taskPath) ?? '';
}

export function isTaskEmpty(content: string): boolean {
  return content.trim() === '';
}

export function writeTask(config: AegisConfig, projectRoot: string, content: string): void {
  const taskPath = path.join(projectRoot, config.taskFile);
  atomicWrite(taskPath, content);
}

export function clearTask(config: AegisConfig, projectRoot: string): void {
  const taskPath = path.join(projectRoot, config.taskFile);
  atomicWrite(taskPath, '');
}
