# Aegis Engine (CLI Plugin) 产品需求文档 (PRD)

**版本：** 1.0.0  
**状态：** 正式版  
**语言：** Node.js / TypeScript  
**分发方式：** npm 全局包（`aegis-cli`）

---

## 目录

1. [产品定位与目标](#1-产品定位与目标)
2. [npm 包架构与模块设计](#2-npm-包架构与模块设计)
3. [安装与初始化引擎](#3-安装与初始化引擎-aegis-init)
4. [指令集完整规格](#4-指令集完整规格)
5. [自治闭环工作流](#5-自治闭环工作流-autonomous-loop)
6. [后台监听器机制](#6-后台监听器机制-stdout-watcher)
7. [内置提示词与文件规约](#7-内置提示词与文件规约)
8. [数据结构完整规约](#8-数据结构完整规约)
9. [宿主配置文件完整模板](#9-宿主配置文件完整模板)
10. [CLI UX 规格](#10-cli-ux-规格)
11. [工程约束与防护机制](#11-工程约束与防护机制)

---

## 1. 产品定位与目标

**Aegis** 是一款以 npm 包形式全局分发的本地 AI 工作流脚手架（Agent Harness）。它深度整合 Codex CLI、Claude Code 等原生支持多智能体（Multi-Agent）架构的宿主环境的官方扩展机制，在终端内注册原生斜杠指令。

**核心设计哲学：**

- **绝不重复造轮子**：彻底复用宿主 CLI 原生的工具调用能力（文件读写、终端执行、代码搜索），不自行实现任何 LLM 调用路径。
- **物理离合器**：Aegis 自身不具备任何 AI 能力，它是宿主 LLM 与项目代码库之间的强约束执行上下文，负责权限收拢与工作流编排。
- **防腐层**：通过持久化的规范文件（`.aegis/specs/`）将架构决策与每次编码会话解耦，防止 LLM 在无约束状态下自由发散。
- **单点任务、持续闭环**：每次执行只处理一个原子任务，驱动宿主自主完成"编码 → 测试 → 自愈"的全闭环，直至测试全绿再退出。

**Aegis 不做什么：**

- 不托管任何 LLM API，不消耗独立 Token 配额（仅归档阶段发起一次极轻量调用）。
- 不替代宿主 CLI 的基础能力（文件编辑、终端执行由宿主自行完成）。
- 不管理多个并发任务（任意时刻 `.aegis/task.md` 仅有一个活跃任务）。

---

## 2. npm 包架构与模块设计

### 2.1 目录结构

```text
aegis-cli/
├── bin/
│   └── aegis.js              # CLI 入口（shebang: #!/usr/bin/env node）
├── src/
│   ├── cli.ts                # Commander.js 指令注册（aegis init / aegis run）
│   ├── modules/
│   │   ├── init/
│   │   │   ├── host-injector.ts    # 宿主环境检测与配置文件写入
│   │   │   └── scaffolder.ts       # .aegis/ 工作区目录生成
│   │   ├── watcher/
│   │   │   ├── stdout-watcher.ts   # 宿主 CLI 进程的 stdout 监听器
│   │   │   └── line-scanner.ts     # [AEGIS_SUCCESS] 标识扫描
│   │   ├── archiver/
│   │   │   ├── summarizer.ts       # 归档阶段的轻量 LLM 调用（通过宿主 CLI）
│   │   │   └── state-writer.ts     # state.json 追加写入
│   │   ├── context/
│   │   │   ├── spec-loader.ts      # 加载 .aegis/specs/ 所有 Markdown
│   │   │   └── task-writer.ts      # 写入 / 清空 .aegis/task.md
│   │   └── status/
│   │       └── reporter.ts         # /aegis:status 输出渲染
│   ├── templates/
│   │   ├── claude-skill.md.tpl     # Claude Code SKILL.md 模板
│   │   ├── codex-plugin.json.tpl   # Codex CLI plugin.json 模板
│   │   └── state-init.json         # state.json 初始结构
│   ├── prompts/
│   │   ├── spec.prompt.ts          # /aegis:spec 注入提示词
│   │   ├── exec.prompt.ts          # /aegis 闭环执行提示词
│   │   └── archive.prompt.ts       # 归档静默提示词
│   └── utils/
│       ├── logger.ts               # chalk 着色 + ora spinner 封装
│       ├── fs-helpers.ts           # 安全的原子写入、路径断言
│       └── config.ts               # aegis.config.json 读写
├── package.json
├── tsconfig.json
└── README.md
```

### 2.2 核心模块职责

| 模块 | 文件 | 职责 |
|------|------|------|
| **CLI 入口** | `bin/aegis.js` → `src/cli.ts` | 解析命令行参数，路由至各子命令处理器 |
| **宿主注入器** | `host-injector.ts` | 检测选定宿主类型，写入对应配置文件，幂等可重入 |
| **脚手架生成器** | `scaffolder.ts` | 创建 `.aegis/` 目录树，跳过已存在文件 |
| **stdout 监听器** | `stdout-watcher.ts` | 以 `spawn` 启动宿主 CLI，逐行扫描输出流 |
| **行扫描器** | `line-scanner.ts` | 识别 `[AEGIS_SUCCESS]` 标识，触发收尾钩子 |
| **归档器** | `archiver/` | 触发静默摘要调用，追加写入 `state.json` |
| **上下文装配** | `context/` | 将 `specs/` + `task.md` 打包为提示词上下文 |
| **状态报告** | `reporter.ts` | 渲染 `/aegis:status` 的格式化输出 |

### 2.3 `package.json` 关键字段规格

```json
{
  "name": "aegis-cli",
  "version": "1.0.0",
  "description": "AI workflow harness for Codex CLI and Claude Code",
  "bin": {
    "aegis": "./bin/aegis.js"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": [
    "dist/",
    "bin/",
    "src/templates/"
  ],
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "build": "tsc",
    "dev": "ts-node src/cli.ts",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "chalk": "^5.3.0",
    "commander": "^12.0.0",
    "inquirer": "^9.0.0",
    "ora": "^7.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.4.0"
  }
}
```

### 2.4 可选配置文件 `aegis.config.json`

位于项目根目录，由 `aegis init` 生成，可手动修改：

```json
{
  "host": "claude-code",
  "maxRetries": 5,
  "testCommand": "npm test",
  "specsDir": ".aegis/specs",
  "taskFile": ".aegis/task.md",
  "stateFile": ".aegis/state.json"
}
```

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `host` | `"claude-code" \| "codex-cli"` | — | 挂载的宿主引擎（init 时选定） |
| `maxRetries` | `number` | `5` | 闭环最大重试次数，超限后强制挂起 |
| `testCommand` | `string` | `"npm test"` | 自动化测试命令 |
| `specsDir` | `string` | `".aegis/specs"` | 规范文件目录路径 |
| `taskFile` | `string` | `".aegis/task.md"` | 活跃任务文件路径 |
| `stateFile` | `string` | `".aegis/state.json"` | 持久化事件流文件路径 |

---

## 3. 安装与初始化引擎（`aegis init`）

### 3.1 安装

```bash
npm install -g aegis-cli
```

安装完成后，`aegis` 命令在全局可用。

### 3.2 初始化触发

在目标项目根目录执行：

```bash
aegis init
```

### 3.3 初始化交互流程（完整序列）

```
  ┌─────────────────────────────────────────┐
  │  Aegis Engine v1.0.0                    │
  │  AI Workflow Harness — aegis init       │
  └─────────────────────────────────────────┘

  [?] 请选择当前 Aegis 需挂载的宿主 AI 引擎：
    > Claude Code
      Codex CLI

  [?] 自动化测试命令（默认：npm test）：____

  [?] 闭环最大重试次数（默认：5）：____

  ⠋ 正在写入宿主配置文件...
  ✔ 宿主配置已写入 → .claude/skills/aegis/SKILL.md

  ⠋ 正在生成工作区目录...
  ✔ 工作区已就绪 → .aegis/

  ✔ aegis.config.json 已生成

  ┌─────────────────────────────────────────┐
  │  ✅ Aegis 初始化完成                     │
  │                                         │
  │  下一步：在 Claude Code 中输入           │
  │  /aegis:spec <需求文档路径>  设置规范     │
  │  /aegis <需求描述>           启动闭环     │
  └─────────────────────────────────────────┘
```

### 3.4 宿主环境自适应挂载（Host Injection）

**若选择 `Claude Code`：**

在项目根目录创建 `.claude/skills/aegis/SKILL.md`，写入完整的 Skill 定义（见第 9.1 节）。Claude Code 启动后将原生识别并注册 `/aegis` 命名空间下的所有指令。

参考官方文档：`https://code.claude.com/docs/en/plugins`

**若选择 `Codex CLI`：**

在项目根目录创建以下两个文件：
- `.codex/plugins/aegis/plugin.json`（见第 9.2 节）
- `.codex/plugins/aegis/hook.js`（`[AEGIS_SUCCESS]` 钩子脚本，见第 6.3 节）

参考官方文档：`https://developers.openai.com/codex/plugins`

**幂等保障：** 若目标文件已存在，`host-injector.ts` 不覆盖，打印警告后跳过。如需强制覆盖：

```bash
aegis init --force
```

### 3.5 工作区脚手架（Workspace Scaffolding）

挂载完成后，`scaffolder.ts` 在项目根目录生成以下结构（已存在则跳过）：

```text
.aegis/
├── task.md         # 【动态任务层】当前执行上下文。执行游标，空态即停机。
├── state.json      # 【状态纪要层】持久化事件流，记录里程碑，仅追加。
└── specs/
    ├── architecture.md   # 宏观架构边界（微服务划分、API 路由、数据库约定）
    ├── conventions.md    # 编码落地规约（异常封装、日志脱敏、缓存策略）
    └── gotchas.md        # 历史规避指南（历次踩坑的强制性禁区）
```

`state.json` 的初始内容由 `src/templates/state-init.json` 复制生成（详见第 8.1 节）。

---

## 4. 指令集完整规格

Aegis 通过宿主 CLI 暴露 4 个精简的原生斜杠指令。本章节给出每个指令的完整行为规格，包括参数、成功路径、以及全部异常场景的 CLI 输出。

### 4.0 指令映射关系

| 用户调用（宿主斜杠指令） | 宿主 Bash Tool 执行的内部 CLI 命令 | 说明 |
|------------------------|----------------------------------|------|
| `/aegis:spec <文档>`    | 无（纯提示词注入，宿主直接操作文件） | 宿主 LLM 被约束为仅操作 `.aegis/specs/` |
| `/aegis <需求>`         | `aegis _internal-teardown`（成功后） | 闭环期间无 CLI 调用，成功后触发收尾 |
| `/aegis:clear`          | `aegis _internal-teardown --mode=interrupt` | 由宿主 Bash Tool 或用户直接在终端执行 |
| `/aegis:status`         | `aegis _internal-status` | 渲染状态快照并打印至终端 |

**说明：** 斜杠指令是宿主 CLI（Claude Code / Codex CLI）识别的用户侧指令；`aegis _internal-*` 系列是 Aegis 包本身暴露的内部子命令，供宿主 Bash Tool 或钩子脚本回调，不对最终用户直接开放。

### 4.1 `/aegis:spec <文档路径或需求描述>`

**职责：** 防腐层生成。强制宿主进入「架构师」角色，仅允许向 `.aegis/specs/` 输出规范文件，绝对禁止生成业务代码。

**参数：**
- `<文档路径>`：指向项目内 Markdown / 文本文件的相对路径；或
- `<自然语言需求>`：直接粘贴的需求描述文本。

**成功路径：**
1. Aegis 读取参数，将 `/aegis:spec` 的内置提示词（见第 7.1 节）与参数内容合并，注入宿主上下文。
2. 宿主 LLM 在「Aegis Architect」角色下，仅操作 `.aegis/specs/` 目录内的文件。
3. 宿主完成输出后，终端打印：
   ```
   ✔ 规范文件已更新：
     · .aegis/specs/architecture.md
     · .aegis/specs/conventions.md
   ```

**异常场景：**

| 场景 | CLI 输出 |
|------|----------|
| 参数为空 | `✖ 错误：请提供需求文档路径或描述文本。用法：/aegis:spec <文档路径/需求>` |
| 指定文件路径不存在 | `✖ 错误：找不到文件 "<路径>"，请检查路径是否正确。` |
| 宿主生成了 `src/` 下的业务代码（违规检测） | `⚠ 警告：检测到宿主修改了 src/ 目录下的文件，已自动回滚。请重新执行 /aegis:spec。` |
| `.aegis/specs/` 目录不存在（未初始化） | `✖ 错误：工作区未初始化。请先在项目根目录执行 aegis init。` |

---

### 4.2 `/aegis <自然语言需求>`

**职责：** 任务点火与持续闭环。将需求写入 `.aegis/task.md`，注入规范上下文，驱动宿主进入自动化测试驱动的持续修复循环。

**参数：**
- `<自然语言需求>`：描述本次需要完成的单个原子任务。

**成功路径：**
1. 检查当前 `task.md` 是否为空（空态检测）。
2. 将需求写入 `.aegis/task.md`。
3. 加载 `.aegis/specs/` 所有 Markdown，与闭环执行提示词（见第 7.2 节）合并，注入宿主上下文。
4. 宿主进入自治循环（编码 → 测试 → 自愈，详见第 5 章）。
5. 监听器捕获 `[AEGIS_SUCCESS]` 后触发收尾钩子：
   - 清空 `task.md`
   - 追加里程碑至 `state.json`
   - 打印绿灯报告

**异常场景：**

| 场景 | CLI 输出 |
|------|----------|
| 参数为空 | `✖ 错误：请描述需要完成的任务。用法：/aegis <需求描述>` |
| `task.md` 不为空（已有活跃任务） | `✖ 错误：当前已有活跃任务在运行。请先执行 /aegis:clear 中断后再重新提交。` |
| 未找到 `aegis.config.json` | `✖ 错误：项目未初始化，请先执行 aegis init。` |
| 达到最大重试次数（`maxRetries`）仍失败 | 详见第 11.2 节熔断机制 |

---

### 4.3 `/aegis:clear`

**职责：** 物理中断。强制清空 `.aegis/task.md`，解除所有活跃闭环状态，使系统归于 Idle 空闲态。

**参数：** 无

**成功路径：**
1. 检测 `task.md` 当前内容。
2. 若有内容，提示确认：
   ```
   [?] 当前任务正在运行，确认强制中断？(y/N)：
   ```
3. 用户确认后执行清空：`fs.writeFileSync('.aegis/task.md', '')`
4. 向宿主发送终止信号（`SIGTERM` / 宿主原生中断机制）。
5. 打印中断报告：
   ```
   ✔ 任务已中断，系统归于 Idle 状态。
     已清空 .aegis/task.md
     任务草稿已暂存至 state.json → stash_queue（不计入 milestones）
   ```

**异常场景：**

| 场景 | CLI 输出 |
|------|----------|
| `task.md` 本已为空 | `ℹ 当前无活跃任务，系统已处于 Idle 状态。` |
| 用户在确认提示中输入 `N` | `ℹ 操作已取消，任务继续运行。` |
| 无法写入 `task.md`（权限问题） | `✖ 错误：无法清空 .aegis/task.md，请检查文件权限。` |

---

### 4.4 `/aegis:status`

**职责：** 状态遥测。输出系统当前健康度的完整快照。

**参数：** 无

**成功路径：** 渲染以下格式的状态报告（详见第 10.3 节）：

```
  ┌─────────────────────── Aegis Status ───────────────────────┐
  │  宿主引擎：  Claude Code                                     │
  │  系统状态：  🔴 活跃中（1 个任务运行中）                       │
  │                                                             │
  │  活跃任务（task.md）：                                       │
  │  ┌─────────────────────────────────────────────────────┐   │
  │  │ 实现用户登录功能，使用 JWT，不依赖第三方 Auth 服务     │   │
  │  └─────────────────────────────────────────────────────┘   │
  │                                                             │
  │  已挂载规范（specs/）：                                      │
  │  · architecture.md  ✔  (最后更新：2024-01-15 14:32)         │
  │  · conventions.md   ✔  (最后更新：2024-01-15 14:32)         │
  │  · gotchas.md       ✔  (最后更新：2024-01-14 09:01)         │
  │                                                             │
  │  里程碑累计（state.json）：12 条                              │
  │  最近一条：2024-01-15 13:45 — "完成订单查询 API 接口实现"     │
  └─────────────────────────────────────────────────────────────┘
```

**异常场景：**

| 场景 | CLI 输出 |
|------|----------|
| `.aegis/` 目录不存在 | `✖ 错误：工作区未初始化，请先执行 aegis init。` |
| `state.json` 损坏（JSON 解析失败） | `⚠ 警告：state.json 格式异常，里程碑数据可能已损坏。` |
| `specs/` 目录为空 | `⚠ 警告：尚未生成任何规范文件。建议先执行 /aegis:spec 定义架构约束。` |

---

## 5. 自治闭环工作流（Autonomous Loop）

### 5.1 阶段总览

```
  用户执行 /aegis <需求>
        │
        ▼
  ┌─────────────────────────────────────────┐
  │  阶段 1：上下文精准装配                  │
  │  task.md ← 写入需求                     │
  │  specs/* ← 加载所有规范                  │
  │  System Payload 打包 → 注入宿主上下文    │
  └──────────────────┬──────────────────────┘
                     │
                     ▼
  ┌─────────────────────────────────────────┐
  │  阶段 2：宿主自治闭环（Native Loop）     │
  │                                         │
  │  ┌───────────┐   失败（stderr）          │
  │  │ 编写代码   │ ◄────────────────────┐  │
  │  └─────┬─────┘                       │  │
  │        │                             │  │
  │        ▼                             │  │
  │  ┌───────────┐   Exit Code ≠ 0       │  │
  │  │ 运行测试   ├──────────────────────►│  │
  │  └─────┬─────┘   retries < maxRetries│  │
  │        │                             │  │
  │        │ Exit Code = 0               │  │
  │        ▼                             │  │
  │  输出 [AEGIS_SUCCESS]                │  │
  │                       retries ≥ maxRetries
  │                             │           │
  │                             ▼           │
  │                       强制挂起，人工介入 │
  └──────────────────┬──────────────────────┘
                     │ 捕获 [AEGIS_SUCCESS]
                     ▼
  ┌─────────────────────────────────────────┐
  │  阶段 3：收尾归档                        │
  │  触发静默 Summarizer → 追加 state.json   │
  │  清空 task.md                           │
  │  打印绿灯报告 → 系统归 Idle              │
  └─────────────────────────────────────────┘
```

### 5.2 阶段 1：上下文精准装配（Context Assembly）

`context/spec-loader.ts` 按文件修改时间降序加载 `.aegis/specs/` 下所有 `.md` 文件，拼接为结构化 System Payload：

```text
=== AEGIS SPEC: architecture.md ===
{architecture.md 内容}

=== AEGIS SPEC: conventions.md ===
{conventions.md 内容}

=== AEGIS SPEC: gotchas.md ===
{gotchas.md 内容}

=== AEGIS TASK ===
{task.md 内容}
```

此 Payload 与第 7.2 节的执行提示词合并，作为最高优先级注入宿主上下文。

### 5.3 阶段 2：宿主原生闭环（Native Autonomous Loop）

宿主 LLM 在「Aegis Execution Engine」角色约束下运行：

1. **编写代码**：读取 `task.md` 中的需求，结合 `specs/` 约束，输出代码变更。
2. **运行测试**：自主调用宿主原生 Terminal Tool，执行 `aegis.config.json` 中配置的 `testCommand`（默认 `npm test`）。
3. **自愈修复**：
   - 若 Exit Code ≠ 0：宿主读取完整 `stderr`，**禁止向人类提问**，直接根据堆栈分析原因，修改代码，将当前迭代次数写入内部计数器，再次触发测试。
   - 若 Exit Code = 0：在终端单独输出一行 `[AEGIS_SUCCESS]`，停止一切操作。
4. **重试计数**：宿主提示词中强制要求维护 `<aegis-retry-count>` 内部变量，每次失败后递增，达到 `maxRetries` 时主动挂起并说明失败原因（详见第 11.2 节）。

### 5.4 阶段 3：收尾归档（Archival & Teardown）

后台监听器（第 6 章）捕获到 `[AEGIS_SUCCESS]` 后，顺序执行：

1. 发起静默 Summarizer 调用（第 7.3 节），获取 JSON 格式的里程碑记录。
2. 调用 `state-writer.ts`，将里程碑追加至 `state.json` 的 `milestones` 数组。
3. 执行 `fs.writeFileSync('.aegis/task.md', '')`，清空任务文件。
4. 终端打印绿灯报告：

```
  ✅ 任务完成！
  ─────────────────────────────────────────
  里程碑已记录：
  "完成用户登录功能，JWT 鉴权，无第三方依赖"
  耗时：约 3 次迭代
  系统已归 Idle ✔
  ─────────────────────────────────────────
```

---

## 6. 后台监听器机制（Stdout Watcher）

### 6.1 设计原理

Aegis 通过 Node.js 的 `child_process.spawn` 以子进程方式启动宿主 CLI（或以管道方式接入宿主 CLI 的输出流），逐行扫描 `stdout`，识别 `[AEGIS_SUCCESS]` 标识字符串，触发后续的收尾钩子。

这是 Aegis 实现工作流自动流转的核心机制，无需对宿主 CLI 进行任何侵入式修改。

### 6.2 `stdout-watcher.ts` 实现规格

```typescript
import { spawn, ChildProcess } from 'child_process';
import { createInterface } from 'readline';
import { onSuccess } from './line-scanner';

export function startWatcher(hostCommand: string, args: string[]): ChildProcess {
  const child = spawn(hostCommand, args, {
    stdio: ['inherit', 'pipe', 'inherit'],
    shell: false,
  });

  const rl = createInterface({ input: child.stdout! });

  rl.on('line', (line: string) => {
    // 透传原始输出到终端
    process.stdout.write(line + '\n');
    // 扫描成功标识
    if (line.trim() === '[AEGIS_SUCCESS]') {
      onSuccess();
    }
  });

  child.on('exit', (code) => {
    rl.close();
    if (code !== 0 && code !== null) {
      // 宿主非正常退出（非成功闭环）不触发 onSuccess
    }
  });

  return child;
}
```

**关键设计决策：**
- `stdio: ['inherit', 'pipe', 'inherit']`：`stdin` 与 `stderr` 直接透传到用户终端，仅 `stdout` 被管道截获供扫描。用户与宿主的正常交互不受影响。
- 扫描采用 **精确匹配**（`line.trim() === '[AEGIS_SUCCESS]'`），不使用子串匹配，防止代码注释或日志输出意外触发钩子。

### 6.3 Codex CLI 的钩子脚本（`.codex/plugins/aegis/hook.js`）

Codex CLI 的 Plugin 机制支持在本地注册钩子脚本，由 Codex 主进程在输出特定标识后调用：

```javascript
#!/usr/bin/env node
// .codex/plugins/aegis/hook.js
// 由 Codex 在捕获到 [AEGIS_SUCCESS] 后自动调用

const { execSync } = require('child_process');

// 调用 Aegis 收尾流程
execSync('aegis _internal-teardown', { stdio: 'inherit' });
```

`aegis _internal-teardown` 是 Aegis CLI 内部隐藏指令，仅供钩子调用，完成归档与清空操作。

### 6.4 Claude Code 的钩子（SKILL.md 内嵌触发）

Claude Code 的 Skill 机制不支持直接调用本地脚本，因此通过 SKILL.md 中的指令约定实现：

宿主在输出 `[AEGIS_SUCCESS]` 后，SKILL.md 约定其**立即调用内置 Bash Tool** 执行：

```bash
aegis _internal-teardown
```

此行为通过第 9.1 节的 SKILL.md 模板中的结束条件描述强制约束。

---

## 7. 内置提示词与文件规约

本章是唯一的提示词权威来源。Aegis 硬编码了三套系统级提示词，在不同指令触发时注入宿主上下文，作为最高优先级的 System Message，强制 LLM 遵守角色边界与输出格式。

### 7.1 `/aegis:spec` 内置提示词（防腐层生成向导）

**触发时机：** 执行 `/aegis:spec <文档>` 时，作为最高优先级 System Message 注入给 Planner 智能体。

```text
[System Role: Aegis Architect]

你现在是系统的首席架构师。你的唯一职责是读取用户提供的需求文档，提炼技术规范，并生成或更新 .aegis/specs/ 目录下的 Markdown 文件。

绝对禁止生成任何业务代码。严禁创建、修改或删除 src/、lib/、app/ 或任何非 .aegis/ 目录下的文件。

输出约束（严格执行，缺一不可）：
1. 更新 .aegis/specs/architecture.md：
   - 提炼宏观架构边界（微服务/模块划分、API 路由设计、数据库事务级别）
   - 说明核心数据流向
   - 定义外部依赖边界
2. 更新 .aegis/specs/conventions.md：
   - 编码落地规约（异常封装标准、错误码体系、日志脱敏规则）
   - 缓存策略与失效规则
   - 命名规范与文件组织约定
3. 如果需求包含对历史错误的修正或特别注意事项，更新 .aegis/specs/gotchas.md：
   - 每条记录格式：【日期】【模块】踩坑描述 → 正确做法
4. 所有输出必须是结构清晰的纯净 Markdown 格式，作为后续所有编码阶段的最高宪法。

完成后，在终端输出文件列表（已更新/新建）。不要输出其他任何内容。
```

### 7.2 `/aegis` 内置提示词（持续闭环执行规约）

**触发时机：** 执行 `/aegis <需求>` 时，随同 `.aegis/specs/` 内容的 System Payload 一并注入给 Coder / Reviewer 智能体。

```text
[System Role: Aegis Execution Engine]

你现在处于自动闭环执行态。请严格按照以下法则运行，不得偏离：

【最高宪法】
在你输出的每一行代码之前，确认它不违反 .aegis/specs/ 中的任何约定。违背其中任何一条，将被视为不可接受的致命错误，必须立即回滚并重新设计。

【唯一目标】
读取 .aegis/task.md 中的完整需求，完成代码修改。不得扩展需求范围，不得引入 task.md 未提及的功能。

【自愈原则】
1. 编写代码后，必须立即调用 Terminal Tool 运行测试命令。
2. 收到测试失败的 stderr 时，绝对不要向用户提问，绝对不要输出分析摘要后停止。
3. 立即分析完整错误堆栈，定位根因，修改代码，然后再次调用 Terminal Tool 运行测试。
4. 在内心维护一个重试计数器（<aegis-retry-count>），每次失败后递增。

【熔断条件】
若 <aegis-retry-count> 达到 {maxRetries}，立即停止尝试，向用户报告：
- 已达到最大重试次数（{maxRetries}）
- 最后一次错误的完整 stderr 输出
- 你目前的分析与推测的根因
- 你认为需要人工介入的具体问题

【结束条件】
当且仅当所有测试用例返回 Exit Code 0 时：
1. 在终端单独输出一行（前后无其他字符）：[AEGIS_SUCCESS]
2. 然后调用 Bash Tool 执行：aegis _internal-teardown
3. 停止一切输出。
```

### 7.3 静默归档提示词（Summarizer）

**触发时机：** 后台监听器捕获到 `[AEGIS_SUCCESS]` 后，`summarizer.ts` 静默发起一次极轻量级的宿主 LLM 调用（通过宿主 CLI 的 API 层）。

```text
[System Role: Aegis Archivist]

请根据刚刚完成的代码变更，生成一条高度凝练的里程碑记录。

规则：
1. 提取本次完成的核心业务价值，用一句话概括。
2. 忽略技术实现细节（代码行数、文件名、方法名）。
3. 忽略测试修复过程的中间状态，只描述最终达成的业务能力。

严格按照以下 JSON 格式输出，不得包含任何其他内容：
{"event": "一句话核心业务描述", "timestamp": "ISO8601格式", "tags": ["模块名", "特性类型"]}

示例输出（格式参考，非真实数据）：
{"event": "实现用户邮箱登录与 JWT 刷新机制", "timestamp": "2024-01-15T14:32:00.000Z", "tags": ["auth", "feature"]}
```

---

## 8. 数据结构完整规约

### 8.1 `state.json` 完整 JSON Schema

`aegis init` 生成的初始文件内容：

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "aegis_version": "1.0.0",
  "milestones": [],
  "stash_queue": []
}
```

**完整字段说明：**

| 字段 | 类型 | 语义 |
|------|------|------|
| `$schema` | `string` | JSON Schema 版本标识，供编辑器校验 |
| `aegis_version` | `string` | 生成此文件的 Aegis 版本号，用于未来迁移兼容 |
| `milestones` | `Milestone[]` | 每次成功闭环的里程碑记录，**仅追加，不删除，不修改** |
| `stash_queue` | `StashEntry[]` | 被 `/aegis:clear` 中断的未完成任务草稿队列（详见 8.3 节） |

**`Milestone` 对象结构：**

```json
{
  "event": "实现用户邮箱登录与 JWT 刷新机制",
  "timestamp": "2024-01-15T14:32:00.000Z",
  "tags": ["auth", "feature"],
  "retries": 2
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `event` | `string` | 一句话业务描述（由 Summarizer 生成） |
| `timestamp` | `string` | ISO 8601 格式的完成时间（UTC） |
| `tags` | `string[]` | 模块名与特性类型标签，便于过滤查询 |
| `retries` | `number` | 本次任务实际消耗的重试次数（0 表示首次即成功） |

**JSON Schema 完整定义（供校验工具使用）：**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://aegis-cli/schemas/state.json",
  "type": "object",
  "required": ["aegis_version", "milestones", "stash_queue"],
  "additionalProperties": false,
  "properties": {
    "$schema": { "type": "string" },
    "aegis_version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "milestones": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["event", "timestamp", "tags", "retries"],
        "additionalProperties": false,
        "properties": {
          "event":     { "type": "string", "minLength": 1 },
          "timestamp": { "type": "string", "format": "date-time" },
          "tags":      { "type": "array", "items": { "type": "string" } },
          "retries":   { "type": "integer", "minimum": 0 }
        }
      }
    },
    "stash_queue": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["task", "interrupted_at", "reason"],
        "additionalProperties": false,
        "properties": {
          "task":           { "type": "string", "minLength": 1 },
          "interrupted_at": { "type": "string", "format": "date-time" },
          "reason":         { "type": "string" }
        }
      }
    }
  }
}
```

### 8.2 `task.md` 格式规约

`.aegis/task.md` 是单一的纯文本文件，无固定格式要求。

- **空态（Idle）：** 文件内容为空字符串（`""`），不是空行，不是空格。这是系统的停机状态判断依据。
- **活跃态（Active）：** 包含用户传入的原始自然语言需求，不由 Aegis 对内容格式做任何规范化处理。
- **原子性保证：** `task-writer.ts` 使用先写临时文件再 `rename` 的原子操作，防止写入过程中宿主读取到半成品内容。

### 8.3 `stash_queue` 语义与使用时机

`stash_queue` 是一个任务草稿队列，用于保存被 `/aegis:clear` **强制中断**的未完成任务信息。

**设计目的：** 防止用户在中断任务后彻底丢失需求描述，支持日后手动回查与重新提交。

**触发时机：** 当用户执行 `/aegis:clear` 并确认中断时，若 `task.md` 不为空，`state-writer.ts` 在清空文件之前，自动将以下结构追加至 `stash_queue`：

```json
{
  "task": "（原 task.md 的完整内容）",
  "interrupted_at": "2024-01-15T13:20:00.000Z",
  "reason": "user_interrupt"
}
```

**`reason` 枚举值：**

| 值 | 说明 |
|----|------|
| `"user_interrupt"` | 用户主动执行 `/aegis:clear` |
| `"max_retries_exceeded"` | 达到最大重试次数后系统自动放弃 |

**重要约束：** `stash_queue` 不提供自动重试机制。Aegis 不会自动重新提交 stash 中的任务，需用户手动复制 `task` 内容后重新执行 `/aegis <需求>`。

---

## 9. 宿主配置文件完整模板

### 9.1 Claude Code：`.claude/skills/aegis/SKILL.md`

```markdown
# Aegis Engine Skill

## 注册信息
- **命名空间**：`/aegis`
- **版本**：1.0.0
- **描述**：AI 工作流脚手架，提供规范驱动的自治闭环编码能力

## 指令注册

### `/aegis:spec <文档路径或需求>`
**职责**：防腐层生成。读取需求文档，仅向 .aegis/specs/ 输出架构规范文件。

执行时，注入以下系统角色并替换 {input} 为用户参数：

```
[System Role: Aegis Architect]
你现在是系统的首席架构师。你的唯一职责是读取用户提供的需求文档，提炼技术规范，并生成或更新 .aegis/specs/ 目录下的 Markdown 文件。

绝对禁止生成任何业务代码。严禁创建、修改或删除 src/、lib/、app/ 或任何非 .aegis/ 目录下的文件。

输出约束（严格执行，缺一不可）：
1. 更新 .aegis/specs/architecture.md：提炼宏观架构边界（微服务/模块划分、API 路由设计、数据库事务级别）
2. 更新 .aegis/specs/conventions.md：提炼编码落地规约（异常封装标准、日志脱敏规则、缓存策略）
3. 如包含历史错误修正，更新 .aegis/specs/gotchas.md（格式：【日期】【模块】踩坑 → 正确做法）
所有输出必须是纯净的 Markdown 格式。完成后输出已更新的文件列表，不输出其他内容。

用户输入文档内容如下：
{input}
```

---

### `/aegis <需求描述>`
**职责**：任务点火与持续闭环。

步骤：
1. 读取 .aegis/task.md，若不为空则拒绝执行并提示用户先运行 /aegis:clear
2. 将 {input} 写入 .aegis/task.md（通过 Bash Tool 执行）
3. 读取 .aegis/specs/ 下所有 .md 文件内容
4. 注入以下系统角色（{maxRetries} 替换为 aegis.config.json 中的值，{testCommand} 替换为配置的测试命令）：

```
[System Role: Aegis Execution Engine]
你现在处于自动闭环执行态。请严格按照以下法则运行：

【最高宪法】在每一行代码输出前，确认不违反 .aegis/specs/ 中任何约定。
【唯一目标】完成 .aegis/task.md 中的需求，不扩展范围。
【自愈原则】
  - 编写代码后必须调用 Terminal Tool 运行 {testCommand}
  - 收到失败 stderr 时绝对不要提问，立即分析并修复
  - 内心维护重试计数器 <aegis-retry-count>，每次失败后递增
【熔断条件】<aegis-retry-count> 达到 {maxRetries} 时停止并报告根因
【结束条件】Exit Code 0 时：
  1. 单独输出一行 [AEGIS_SUCCESS]
  2. 调用 Bash Tool 执行：aegis _internal-teardown
  3. 停止所有输出
```

---

### `/aegis:clear`
**职责**：物理中断。

步骤：
1. 检查 .aegis/task.md 是否不为空
2. 若不为空，向用户确认是否强制中断
3. 确认后执行 Bash Tool：`aegis _internal-teardown --mode=interrupt`
4. 输出中断确认信息

---

### `/aegis:status`
**职责**：状态遥测。

执行 Bash Tool：`aegis _internal-status`
将命令输出原样打印至终端。
```

### 9.2 Codex CLI：`.codex/plugins/aegis/plugin.json`

```json
{
  "name": "aegis",
  "version": "1.0.0",
  "description": "AI workflow harness — spec-driven autonomous coding loop",
  "namespace": "aegis",
  "commands": [
    {
      "name": "spec",
      "trigger": "/aegis:spec",
      "description": "Generate or update anti-corruption layer specs in .aegis/specs/",
      "parameters": {
        "input": {
          "type": "string",
          "description": "Path to requirements document or inline requirement text",
          "required": true
        }
      },
      "systemPrompt": {
        "file": "prompts/spec.txt"
      },
      "allowedPaths": [".aegis/specs/**"],
      "deniedPaths": ["src/**", "lib/**", "app/**"]
    },
    {
      "name": "run",
      "trigger": "/aegis",
      "description": "Ignite autonomous coding loop for a single atomic task",
      "parameters": {
        "input": {
          "type": "string",
          "description": "Natural language task description",
          "required": true
        }
      },
      "systemPrompt": {
        "file": "prompts/exec.txt"
      },
      "hooks": {
        "onOutputMatch": {
          "pattern": "^\\[AEGIS_SUCCESS\\]$",
          "script": "hook.js"
        }
      },
      "autoApprove": false
    },
    {
      "name": "clear",
      "trigger": "/aegis:clear",
      "description": "Force-interrupt the active task loop and reset to idle",
      "parameters": {},
      "script": "scripts/clear.js"
    },
    {
      "name": "status",
      "trigger": "/aegis:status",
      "description": "Display system health snapshot",
      "parameters": {},
      "internalCommand": "aegis _internal-status",
      "script": "scripts/status.js"
    }
  ],
  "hooks": {
    "afterInit": "scripts/scaffold.js"
  }
}
```

---

## 10. CLI UX 规格

### 10.1 颜色编码规范（`chalk`）

| 场景 | 颜色 | `chalk` 方法 | 图标 |
|------|------|--------------|------|
| 成功信息 | 绿色 | `chalk.green` | `✔` |
| 警告信息 | 黄色 | `chalk.yellow` | `⚠` |
| 错误信息 | 红色 | `chalk.red` | `✖` |
| 信息提示 | 蓝色 | `chalk.blue` | `ℹ` |
| 加粗标题 | 白色加粗 | `chalk.bold` | — |
| 路径/代码 | 青色 | `chalk.cyan` | — |
| 二级信息 | 灰色 | `chalk.gray` | `·` |

### 10.2 Spinner 使用规范（`ora`）

| 触发场景 | Spinner 文案 | 结束文案 |
|----------|-------------|----------|
| 写入宿主配置文件 | `正在写入宿主配置文件...` | `宿主配置已写入 → <路径>` |
| 生成工作区目录 | `正在生成工作区目录...` | `工作区已就绪 → .aegis/` |
| 加载规范文件 | `正在加载规范约束...` | `已加载 N 个规范文件` |
| 闭环任务运行中 | 不使用 Spinner（透传宿主输出） | — |
| 触发归档写入 | `正在写入里程碑记录...` | `里程碑已归档` |

### 10.3 `/aegis:status` 输出格式

```
  ┌─────────────────────── Aegis Status ───────────────────────┐
  │  宿主引擎：  <host>                                          │
  │  系统状态：  🟢 Idle（无活跃任务）                            │
  │             或                                              │
  │             🔴 活跃中（任务运行中）                           │
  │                                                             │
  │  活跃任务（task.md）：                                       │
  │  ┌─────────────────────────────────────────────────────┐   │
  │  │ <task.md 内容，最多显示前 5 行>                       │   │
  │  └─────────────────────────────────────────────────────┘   │
  │  （任务为空时显示"暂无活跃任务"）                             │
  │                                                             │
  │  已挂载规范（specs/）：                                      │
  │  · architecture.md  ✔  (最后更新：<datetime>)               │
  │  · conventions.md   ✔  (最后更新：<datetime>)               │
  │  · gotchas.md       ✔  (最后更新：<datetime>)               │
  │  （specs/ 为空时显示对应警告）                               │
  │                                                             │
  │  里程碑累计（state.json）：<N> 条                            │
  │  最近一条：<timestamp> — "<event>"                          │
  └─────────────────────────────────────────────────────────────┘
```

### 10.4 完成报告格式

```
  ✅ 任务完成！
  ─────────────────────────────────────────
  里程碑已记录：
  "<event>"

  耗时迭代：<retries + 1> 次（重试 <retries> 次）
  归档时间：<timestamp>

  系统已归 Idle ✔
  ─────────────────────────────────────────
```

### 10.5 熔断报告格式

```
  ⚠ 已达到最大重试次数（<maxRetries>），任务未能完成。
  ─────────────────────────────────────────
  任务描述：
  "<task.md 内容>"

  最后一次错误（stderr）：
  ┌─────────────────────────────────────────
  │ <stderr 完整内容>
  └─────────────────────────────────────────

  宿主推测的根因：
  <宿主 LLM 输出的根因分析>

  需要人工介入的问题：
  <宿主 LLM 描述的具体阻塞点>

  任务已暂存至 stash_queue，可稍后重新执行：
  /aegis <原始需求>
  ─────────────────────────────────────────
```

---

## 11. 工程约束与防护机制

### 11.1 Skill/Plugin 原生生命周期融合

**挑战：** 如何在不侵入宿主 CLI 代码的前提下，优雅地捕获宿主输出的特定字符串（`[AEGIS_SUCCESS]`）并触发本地 Node.js 收尾脚本。

**Claude Code 方案（提示词约束）：**  
由于 Claude Code 的 Skill 机制本质是提示词注入，Aegis 在 SKILL.md 的结束条件中**明确约束**宿主必须主动调用 `aegis _internal-teardown`（通过 Claude 的 Bash Tool）。标识字符串 `[AEGIS_SUCCESS]` 作为人类可见的状态指示保留，但不作为唯一触发机制。

**Codex CLI 方案（插件钩子）：**  
Codex 的 `plugin.json` 支持 `hooks.onOutputMatch` 配置，允许通过正则匹配输出流中的特定行，并触发本地脚本（`hook.js`）。这是更可靠的机制，完全由 Codex 主进程保障调用。

**防御性设计：** 两种方案均要求 `aegis _internal-teardown` 为**幂等操作**——多次调用与单次调用效果相同，不会产生重复里程碑记录（通过检查 `task.md` 是否已为空来判断）。

### 11.2 无限循环与 Token 熔断防护

**风险：** 若宿主 LLM 陷入"盲目改代码 → 盲目跑测试"的无效循环，将消耗大量 Token 而无任何进展，最终因上下文窗口耗尽而崩溃。

**防护机制（分层设计）：**

**层 1：重试计数器（提示词层）**  
第 7.2 节的执行提示词明确要求宿主维护内部变量 `<aegis-retry-count>`，达到 `maxRetries` 后主动停止并汇报。这依赖宿主 LLM 的指令遵循能力。

**层 2：`maxRetries` 可配置（配置层）**  
通过 `aegis.config.json` 的 `maxRetries` 字段暴露给开发者，默认值 `5`，可按项目测试套件复杂度调整（快速单元测试可设为 3，复杂集成测试可设为 10）。

**层 3：`stash_queue` 降级处理（数据层）**  
达到熔断条件时，未完成任务写入 `stash_queue`，确保需求不丢失，支持人工审查后重新提交。

**层 4：`/aegis:clear` 人工逃生舱（操作层）**  
任何时刻用户均可执行物理中断，不依赖宿主 LLM 的配合。

### 11.3 防腐层违规检测

执行 `/aegis:spec` 时，`host-injector.ts` 在宿主运行完成后，对比 `git diff --name-only`（或文件系统快照差异），检查是否有非 `.aegis/specs/` 目录下的文件被修改。若检测到违规：

1. 执行 `git checkout -- <violated_files>` 回滚被修改的文件。
2. 清空 `task.md`（若有内容）。
3. 打印警告并提示用户重新执行 `/aegis:spec`。

此机制作为宿主提示词约束的降级保障，防止宿主 LLM 绕过角色限制直接生成业务代码。

### 11.4 `state.json` 并发写入保护

`state-writer.ts` 在写入 `state.json` 前，使用文件锁（基于 `fs.open` 的 `O_EXCL` 标志创建临时锁文件 `.aegis/state.lock`）保证同一时刻最多一个写入进程持有锁，防止并发追加导致 JSON 损坏。锁超时时间为 5 秒，超时后自动释放，并打印警告。

---

*文档结束*
