import fs from 'fs';
import path from 'path';
import os from 'os';

export function atomicWrite(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  const tmp = path.join(dir, `.aegis-tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, filePath);
}

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function fileExists(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export function safeReadFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

export function safeReadJson<T>(filePath: string): T | null {
  const raw = safeReadFile(filePath);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function resolveProjectRoot(): string {
  return process.cwd();
}

export function acquireLock(lockPath: string, timeoutMs = 5000): boolean {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const fd = fs.openSync(lockPath, 'wx');
      fs.closeSync(fd);
      return true;
    } catch {
      const sleepMs = 50;
      const end = Date.now() + sleepMs;
      while (Date.now() < end) {
        /* spin */
      }
    }
  }
  return false;
}

export function releaseLock(lockPath: string): void {
  try {
    fs.unlinkSync(lockPath);
  } catch {
    /* ignore */
  }
}

export function getFileStat(filePath: string): fs.Stats | null {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}
