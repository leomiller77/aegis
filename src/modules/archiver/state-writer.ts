import path from 'path';
import { safeReadJson, atomicWrite, acquireLock, releaseLock } from '../../utils/fs-helpers.js';
import { log } from '../../utils/logger.js';
import { AegisConfig } from '../../utils/config.js';

export interface Milestone {
  event: string;
  timestamp: string;
  tags: string[];
  retries: number;
}

export interface StashEntry {
  task: string;
  interrupted_at: string;
  reason: 'user_interrupt' | 'max_retries_exceeded';
}

export interface StateJson {
  $schema: string;
  aegis_version: string;
  milestones: Milestone[];
  stash_queue: StashEntry[];
}

export function readState(config: AegisConfig, projectRoot: string): StateJson | null {
  const statePath = path.join(projectRoot, config.stateFile);
  return safeReadJson<StateJson>(statePath);
}

export function appendMilestone(
  config: AegisConfig,
  projectRoot: string,
  milestone: Milestone,
): void {
  const statePath = path.join(projectRoot, config.stateFile);
  const lockPath = path.join(projectRoot, '.aegis', 'state.lock');

  const acquired = acquireLock(lockPath, 5000);
  if (!acquired) {
    log.warn('获取 state.json 写入锁超时，跳过里程碑写入');
    return;
  }

  try {
    const state = safeReadJson<StateJson>(statePath) ?? defaultState();
    state.milestones.push(milestone);
    atomicWrite(statePath, JSON.stringify(state, null, 2) + '\n');
  } finally {
    releaseLock(lockPath);
  }
}

export function appendStash(
  config: AegisConfig,
  projectRoot: string,
  entry: StashEntry,
): void {
  const statePath = path.join(projectRoot, config.stateFile);
  const lockPath = path.join(projectRoot, '.aegis', 'state.lock');

  const acquired = acquireLock(lockPath, 5000);
  if (!acquired) {
    log.warn('获取 state.json 写入锁超时，跳过暂存写入');
    return;
  }

  try {
    const state = safeReadJson<StateJson>(statePath) ?? defaultState();
    state.stash_queue.push(entry);
    atomicWrite(statePath, JSON.stringify(state, null, 2) + '\n');
  } finally {
    releaseLock(lockPath);
  }
}

function defaultState(): StateJson {
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    aegis_version: '1.0.0',
    milestones: [],
    stash_queue: [],
  };
}
