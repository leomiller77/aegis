import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureDir, fileExists, atomicWrite } from '../../utils/fs-helpers.js';
import { log } from '../../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '../../../src/templates');

interface ScaffoldResult {
  created: string[];
  skipped: string[];
}

export function scaffoldWorkspace(projectRoot: string): ScaffoldResult {
  const ominDir = path.join(projectRoot, '.omin');
  const specsDir = path.join(ominDir, 'specs');
  const result: ScaffoldResult = { created: [], skipped: [] };

  ensureDir(ominDir);
  ensureDir(specsDir);

  const files: Array<{ rel: string; content: string }> = [
    {
      rel: '.omin/task.md',
      content: '',
    },
    {
      rel: '.omin/state.json',
      content: getStateInitContent(),
    },
    {
      rel: '.omin/specs/architecture.md',
      content: getSpecTemplate('architecture'),
    },
    {
      rel: '.omin/specs/conventions.md',
      content: getSpecTemplate('conventions'),
    },
    {
      rel: '.omin/specs/gotchas.md',
      content: getSpecTemplate('gotchas'),
    },
  ];

  for (const file of files) {
    const fullPath = path.join(projectRoot, file.rel);
    if (fileExists(fullPath)) {
      result.skipped.push(file.rel);
    } else {
      atomicWrite(fullPath, file.content);
      result.created.push(file.rel);
    }
  }

  return result;
}

function getStateInitContent(): string {
  const templatePath = path.join(TEMPLATES_DIR, 'state-init.json');
  try {
    return fs.readFileSync(templatePath, 'utf8');
  } catch {
    return JSON.stringify(
      {
        $schema: 'http://json-schema.org/draft-07/schema#',
        omin_version: '1.0.0',
        milestones: [],
        stash_queue: [],
      },
      null,
      2,
    ) + '\n';
  }
}

function getSpecTemplate(name: 'architecture' | 'conventions' | 'gotchas'): string {
  const titles: Record<string, string> = {
    architecture: '# 架构边界规范\n\n> 由 Omin 自动创建。执行 /omin:spec <需求> 后将由宿主 LLM 自动填充。\n\n## 微服务/模块划分\n\n_待填充_\n\n## API 路由设计\n\n_待填充_\n\n## 数据库约定\n\n_待填充_\n\n## 核心数据流向\n\n_待填充_\n',
    conventions: '# 编码落地规约\n\n> 由 Omin 自动创建。执行 /omin:spec <需求> 后将由宿主 LLM 自动填充。\n\n## 异常封装标准\n\n_待填充_\n\n## 错误码体系\n\n_待填充_\n\n## 日志脱敏规则\n\n_待填充_\n\n## 缓存策略\n\n_待填充_\n\n## 命名规范\n\n_待填充_\n',
    gotchas: '# 历史规避指南\n\n> 由 Omin 自动创建。记录历次踩坑，格式：【日期】【模块】踩坑描述 → 正确做法\n\n_暂无记录_\n',
  };
  return titles[name] ?? '';
}

export function printScaffoldResult(result: ScaffoldResult): void {
  for (const f of result.created) {
    log.info(`  创建 ${log.path(f)}`);
  }
  for (const f of result.skipped) {
    log.dim(`  跳过（已存在）${f}`);
  }
}
