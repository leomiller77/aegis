import fs from 'fs';
import path from 'path';
import { AegisConfig } from '../../utils/config.js';

export interface SpecFile {
  name: string;
  content: string;
  mtime: Date;
}

export function loadSpecs(config: AegisConfig, projectRoot: string): SpecFile[] {
  const specsDir = path.join(projectRoot, config.specsDir);

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(specsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const specs: SpecFile[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const fullPath = path.join(specsDir, entry.name);
    try {
      const stat = fs.statSync(fullPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      specs.push({ name: entry.name, content, mtime: stat.mtime });
    } catch {
      /* skip unreadable files */
    }
  }

  specs.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  return specs;
}

export function buildSystemPayload(specs: SpecFile[], taskContent: string): string {
  const parts: string[] = [];

  for (const spec of specs) {
    parts.push(`=== AEGIS SPEC: ${spec.name} ===\n${spec.content}`);
  }

  parts.push(`=== AEGIS TASK ===\n${taskContent}`);
  return parts.join('\n\n');
}
