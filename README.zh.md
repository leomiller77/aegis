# Aegis

[English README](README.md)

**Claude Code 与 Codex CLI 的 AI 工作流脚手架**

Aegis 是一款轻量级 CLI 工具，能将 Claude Code 和 Codex CLI 转化为纪律严明、具有自愈能力的编码智能体。它直接向 AI 会话注入结构化约束，使 AI 编写代码、运行测试、自动修复失败，直到所有测试全绿才停止。

```
npm install -g aegis-cli
```

> 需要 Node.js ≥ 20.12.0

---

## 为什么选择 Aegis？

没有约束的 AI 编码助手往往会发散——在会话中途改变架构、无视编码规范，或陷入无限循环。Aegis 通过以下方式解决这一问题：

- **锚定每次会话**到持久化的规范层（`.aegis/specs/`），该规范层在对话之间保持不变。
- **驱动闭环**：编写代码 → 运行测试 → 自动修复，重试次数可配置。
- **从不直接调用 LLM API**——Aegis 是纯粹的编排脚手架，所有 AI 工作都委托给你现有的宿主 CLI 完成。

---

## 安装

```bash
npm install -g aegis-cli
```

验证安装：

```bash
aegis --version
# 1.0.0
```

---

## 快速上手（5 分钟）

### 第一步 — 在项目中初始化 Aegis

进入项目根目录并运行：

```bash
aegis init
```

系统会交互式询问：

1. **选择宿主引擎** — Claude Code 或 Codex CLI
2. **设置测试命令** — 默认为 `npm test`
3. **设置最大重试次数** — 默认为 `5`

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

  ✔ 宿主配置已写入 → .claude/skills/aegis/SKILL.md
  ✔ 工作区已就绪    → .aegis/
  ✔ aegis.config.json 已生成

  ┌─────────────────────────────────────────┐
  │  ✅ Aegis 初始化完成                     │
  │                                         │
  │  下一步：打开 Claude Code 并运行          │
  │  /aegis:spec <需求文档路径>              │
  └─────────────────────────────────────────┘
```

Aegis 会生成两样东西：

- **宿主配置** — 一个 SKILL.md（Claude Code）或 plugin.json（Codex CLI），用于在 AI 会话中注册 `/aegis` 指令命名空间。
- **工作区** — 一个 `.aegis/` 目录，用于存放规范文件、当前任务和里程碑历史。

### 第二步 — 定义架构规范

在 Claude Code 中运行：

```
/aegis:spec PRD.md
```

或直接粘贴需求描述：

```
/aegis:spec 构建一个使用 JWT 鉴权、PostgreSQL 和 Express 的 REST API
```

Aegis 在此阶段将 AI **限制为只能写入 `.aegis/specs/`**——不生成业务代码，杜绝意外改动。AI 作为纯粹的架构师角色输出：

```
.aegis/specs/
  architecture.md   ← 服务边界、API 路由、数据库 Schema
  conventions.md    ← 错误处理、日志、缓存规约
  gotchas.md        ← 已知陷阱与强制禁区
```

### 第三步 — 启动任务

在 Claude Code 中运行：

```
/aegis 实现 POST /auth/login 接口并完成 JWT Token 生成
```

Aegis 接管执行：

1. 将需求写入 `.aegis/task.md`
2. 加载所有规范文件，作为硬约束注入 AI 上下文
3. AI 进入闭环：编写代码 → 运行测试 → 修复失败 → 循环
4. 测试全绿后，AI 输出 `[AEGIS_SUCCESS]` 并停止
5. Aegis 将里程碑归档至 `state.json`，清空任务文件，打印报告：

```
  ✅ 任务完成！
  ─────────────────────────────────────────
  里程碑已记录：
  "完成 POST /auth/login 接口，含 JWT 生成，共 3 次迭代"
  系统已归 Idle ✔
  ─────────────────────────────────────────
```

---

## 全部四个指令

### `/aegis:spec <路径或需求描述>`

生成或更新防腐规范层。AI 被锁定为架构师角色，只能操作 `.aegis/specs/`。

```
/aegis:spec requirements/auth.md
/aegis:spec 用户需通过邮箱+密码登录，会话使用 JWT，不依赖第三方 Auth 服务
```

### `/aegis <任务描述>`

将任务点火并进入闭环。AI 编写代码、运行测试、自愈修复，仅在测试全绿时退出。

```
/aegis 使用 zod 为注册接口添加输入校验
/aegis 修复 auth.test.ts 中失败的测试——JWT 过期检查逻辑有误
```

同一时间只能运行一个任务。若已有活跃任务，Aegis 会拒绝新提交，直到你清除当前任务。

### `/aegis:clear`

中断并丢弃当前任务。提示确认后将系统重置为 Idle 空闲状态。

```
/aegis:clear
```

```
[?] 当前任务正在运行，确认强制中断？(y/N)：y

✔ 任务已中断，系统归于 Idle 状态。
  已清空 .aegis/task.md
  任务草稿已暂存至 state.json → stash_queue
```

被暂存的任务会保留在 `state.json` 中以供后续查看。

### `/aegis:status`

查看完整系统快照——活跃任务、已加载规范、里程碑数量及最近一条里程碑。

```
/aegis:status
```

```
  ┌─────────────────────── Aegis Status ────────────────────────┐
  │  宿主引擎：   Claude Code                                     │
  │  系统状态：   🔴 活跃中（1 个任务运行中）                       │
  │                                                              │
  │  活跃任务（task.md）：                                        │
  │  ┌──────────────────────────────────────────────────────┐    │
  │  │ 为注册接口添加输入校验                                 │    │
  │  └──────────────────────────────────────────────────────┘    │
  │                                                              │
  │  已挂载规范（specs/）：                                       │
  │  · architecture.md  ✔  (最后更新：2024-01-15 14:32)          │
  │  · conventions.md   ✔  (最后更新：2024-01-15 14:32)          │
  │  · gotchas.md       ✔  (最后更新：2024-01-14 09:01)          │
  │                                                              │
  │  里程碑累计（state.json）：12 条                              │
  │  最近一条：2024-01-15 13:45 — "完成 JWT 登录路由实现"         │
  └──────────────────────────────────────────────────────────────┘
```

---

## 完整端到端示例

以下是一个从零开始构建用户鉴权功能的完整会话。

**项目准备**

```bash
mkdir my-api && cd my-api
npm init -y
npm install express jsonwebtoken bcrypt zod
npm install -D jest ts-jest typescript @types/node
aegis init
# → 选择：Claude Code
# → 测试命令：npx jest
# → 最大重试次数：5
```

**在 Claude Code 中的会话**

```
# 1. 从需求文档定义规范
/aegis:spec docs/auth-requirements.md

# Aegis 将 Claude 限制为架构师模式。
# Claude 输出：
#   .aegis/specs/architecture.md  → 路由映射、JWT 配置、数据库 Schema
#   .aegis/specs/conventions.md   → 错误封装格式、日志规约
#   .aegis/specs/gotchas.md       → "禁止明文存储密码"

✔ 规范文件已更新：
  · .aegis/specs/architecture.md
  · .aegis/specs/conventions.md
  · .aegis/specs/gotchas.md

# 2. 执行第一个任务
/aegis 搭建 Express 应用骨架，包含健康检查路由和 Jest 测试套件

# Claude 编写代码，运行 `npx jest`，0 失败，输出 [AEGIS_SUCCESS]。
✅ 任务完成！里程碑已记录："Express 应用骨架搭建完成，含健康检查"

# 3. 逐任务构建鉴权路由
/aegis 实现 POST /auth/register — 使用 bcrypt 哈希密码，使用 zod Schema 校验

✅ 任务完成！里程碑已记录："完成 POST /auth/register，共 2 次迭代"

/aegis 实现 POST /auth/login — 验证密码，返回签名的 JWT

✅ 任务完成！里程碑已记录："完成 POST /auth/login，共 1 次迭代"

/aegis 实现 GET /auth/me — JWT 中间件鉴权，返回用户信息

✅ 任务完成！里程碑已记录："完成 GET /auth/me，含鉴权中间件"

# 4. 随时查看进度
/aegis:status
# 显示全部 4 条里程碑，3 个规范文件已加载，系统 Idle。
```

大约 20 分钟内，你就拥有了一个经过完整测试的鉴权模块——逐任务构建，每个任务都锁定在你的规范约束下，每个任务都在测试全绿后才推进。

---

## `aegis.config.json` 参数说明

由 `aegis init` 在项目根目录生成，可安全提交至版本控制。

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
|---|---|---|---|
| `host` | `"claude-code"` \| `"codex-cli"` | — | `aegis init` 时选择的宿主 AI 引擎，决定注入哪种配置文件。 |
| `maxRetries` | `number` | `5` | Aegis 强制挂起前的最大"编码-测试-修复"迭代次数。复杂集成测试可适当调大，快速单元测试可调小。 |
| `testCommand` | `string` | `"npm test"` | Aegis 指示 AI 在每次代码变更后运行的 Shell 命令。成功须以 Exit Code 0 退出，失败须以非 0 退出。 |
| `specsDir` | `string` | `".aegis/specs"` | 存放规范 Markdown 文件的目录。该目录下所有 `.md` 文件都会在每次任务运行时注入 AI 上下文。 |
| `taskFile` | `string` | `".aegis/task.md"` | 活跃任务文件路径。非空表示任务运行中，空文件表示 Idle 状态。 |
| `stateFile` | `string` | `".aegis/state.json"` | 仅追加的事件日志，存储已完成的里程碑和被暂存（中断）的任务。 |

---

## 工作区目录结构

执行 `aegis init` 后，项目会新增 `.aegis/` 目录：

```
.aegis/
├── task.md          ← 活跃任务（同一时间只有一个）。为空 = Idle。
├── state.json       ← 里程碑历史和暂存队列（仅追加）。
└── specs/
    ├── architecture.md   ← 服务边界、API 路由、数据库规约
    ├── conventions.md    ← 错误处理、日志、缓存规约
    └── gotchas.md        ← 历次踩坑的强制性禁区
```

规范文件可直接手动编辑。每次 `/aegis` 任务运行时都会重新加载，所做修改立即生效。

---

## 与 Claude Code 集成

Aegis 将 SKILL.md 写入 `.claude/skills/aegis/SKILL.md`。Claude Code 在项目目录启动时会自动发现并注册所有 `/aegis` 指令。

除 `aegis init` 外无需任何手动配置。

初始化完成后，`/aegis` 指令命名空间会直接出现在 Claude Code 会话中：

```
┌─────────────────────────────────────────────────────────────┐
│  Claude Code — my-api/                                       │
│                                                              │
│  > /aegis 实现 POST /auth/login，含 JWT 鉴权                 │
│                                                              │
│  [Aegis] 正在从 .aegis/specs/ 加载规范（3 个文件）...         │
│  [Aegis] 任务已写入 .aegis/task.md                           │
│  [Aegis] 进入闭环执行...                                     │
│                                                              │
│  ● 编写 auth/login 路由...                                   │
│  ● 运行：npx jest                                            │
│    ✔ 14 个测试通过（0 失败）                                  │
│  [AEGIS_SUCCESS]                                             │
│                                                              │
│  ✅ 任务完成！里程碑已记录。                                   │
└─────────────────────────────────────────────────────────────┘
```

`.claude/skills/aegis/SKILL.md` 文件在 Claude Code 启动时将所有 Aegis 约束和 `/aegis` 指令定义注入会话。你可以查阅此文件，了解 Claude 所运行的确切指令。

---

## 与 Codex CLI 集成

Aegis 将插件清单写入 `.codex/plugins/aegis/plugin.json`，并将钩子脚本写入 `.codex/plugins/aegis/hook.js`。Codex CLI 启动时会自动加载该插件。

钩子脚本使用 Codex 的 `onOutputMatch` 机制实时检测 `[AEGIS_SUCCESS]`，并在无需任何轮询的情况下触发归档收尾流程。

在 Codex CLI 中运行时，体验如下：

```
┌─────────────────────────────────────────────────────────────┐
│  Codex CLI — my-api/                                         │
│  已加载插件：aegis v1.0.0                                     │
│                                                              │
│  > /aegis 为 POST /auth/register 添加 zod 校验              │
│                                                              │
│  [Aegis] 规范已注入（architecture.md, conventions.md,        │
│           gotchas.md）                                       │
│  [Aegis] 任务活跃中——重试预算：5 次                           │
│                                                              │
│  第 1 次迭代 / 共 5 次                                        │
│  ● 更新 src/routes/auth.ts 中的 zod Schema...               │
│  ● 运行：npm test → Exit 1（1 个测试失败）                   │
│                                                              │
│  第 2 次迭代 / 共 5 次                                        │
│  ● 修复 `confirmPassword` 字段的 Schema 不匹配问题...         │
│  ● 运行：npm test → Exit 0                                   │
│  [AEGIS_SUCCESS]                                             │
│                                                              │
│  [hook.js] 收尾已触发                                         │
│  ✅ 任务完成！里程碑已记录。系统已归 Idle ✔                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 强制重新初始化

如果你切换了宿主引擎或需要重置注入的配置文件：

```bash
aegis init --force
```

此命令会覆盖宿主配置文件（SKILL.md 或 plugin.json），但保留 `.aegis/specs/` 和 `state.json` 不变。

---

## 许可证

MIT
