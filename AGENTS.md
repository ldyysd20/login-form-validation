# AGENTS.md — 老年综合评估预问诊系统

本文件是 AI 编码助手（Claude Code、Codex 等）在此仓库工作时必须遵守的约束条款集合。与 `项目构想总需求.md` 配套，后者回答"为什么做、做什么"，本文件回答"编码时必须遵守什么、禁止什么"。

所有条款均为**可执行硬约束**，不是风格建议。违反即视为编码错误。

---

## 0. 项目定位与快速索引

本项目依据 **WS/T 826—2026《医疗机构老年综合评估技术操作标准》**，建设覆盖 21 张评估量表（附录 B.1～B.21）和基本情况信息表（附录 A）的电子化预问诊系统，实现"筛查 → 评估 → 自动计分 → 报告生成"全流程。

参考模板仓库：`medical-evaluate-main/`（入院量表评估 AI 对话服务，FastAPI + Next.js + LangGraph）。

| 章节 | 内容 |
|---|---|
| 1 | **开发前必做**（禁止跳过的前置步骤） |
| 2 | **架构分层与依赖方向**（harness/app 拆分、Agent 边界） |
| 3 | **技术栈锁定**（后端/前端/基础设施版本硬约束） |
| 4 | **数据库设计事实来源**（唯一事实源 + 禁止废弃模型） |
| 5 | **21 张量表硬约束**（标准一致性、参数化、筛查路径） |
| 6 | **API 契约**（响应格式、DTO、事件标识、禁止事项） |
| 7 | **患者端适老化硬约束**（字号、操作、防误触、语音） |
| 8 | **安全与隐私硬约束**（加密、脱敏、Cookie、禁止事项） |
| 9 | **生产部署约定**（宝塔 Nginx、同源路径、禁止事项） |
| 10 | **Git 规范**（分支、提交信息、推送硬约束） |
| 11 | **测试要求**（三层测试覆盖、禁止跳过） |
| 12 | **代码注释与文档规范**（中文、硬注释、同步更新） |

---

## 1. 开发前必做（禁止跳过）

1. **禁止直接写代码**。新需求到达时，必须先阅读相关代码（API 路由、Schema、ORM Model、前端组件），思考可行性，与人类充分讨论确认方案，**再写开发计划文档**（放在 `docs/plan/`，格式见第 12 节），确认后才能开工。
2. **禁止绕过标准**。任何量表题目、选项、分值、判定规则、筛查路径的修改，都必须先核对 WS/T 826 原文，与人类确认后再改。
3. **禁止在旧功能上堆兼容层**。代码大幅重构时，旧类名、旧函数、旧配置字段、旧导入路径**直接删除**，不保留兼容层。
4. **任务结束前必须检查是否停止了后端/前端进程**，避免后台残留占用端口。

---

## 2. 架构分层与依赖方向

参考模板项目的 **harness/app split**，项目严格分为两层：

- **Agent SDK**（`backend/packages/medagent/`，import 前缀 `medagent.*`）：可发布的智能体框架包，包含 Dialog/Extraction/Schedule 三个 Service Agent、中间件链、LLM Provider 抽象、Tool Registry。
- **App**（`backend/app/`，import 前缀 `app.*`）：未发布的应用代码，包含 FastAPI 路由、业务编排 Service、Celery Worker、ORM、Pydantic Schema。

### 强约束：

```python
# ✅ 允许：App → Agent
from medagent.agents.factory import create_dialog_agent
from medagent.configs.agent_config import get_agent_model_config

# ❌ 禁止：Agent → App（会导致 CI 失败）
# from app.configs.app_config import get_app_config
# from app.models.base import init_db
```

- **Agent 层只能依赖 `medagent.*` 协议与类型**，不得导入 `app.*`。对话引擎、中间件、Tool Registry 全部位于 Agent 层。
- **App 层负责依赖组装**：Worker 的 `ensure_worker_runtime()` 读取 PostgreSQL/Redis，注入 Agent 运行时依赖（`history_store` / `state_store` / `tool_executor` / `constraint_source`）。
- **前端 Repository 模式**：页面不得直接调用后端 HTTP API，必须通过 `frontend/src/lib/repositories/` 接口；Mock/API 两种模式共用同一接口定义。

---

## 3. 技术栈锁定

### 后端（`backend/pyproject.toml` 事实来源）

| 包 | 版本要求 | 说明 |
|---|---|---|
| Python | ≥3.11, <3.12 | **锁定**，禁止升级到 3.12 |
| FastAPI | ≥0.115.0 | 路由 + lifespan + CORS |
| SQLAlchemy | ≥2.0.35 | sync + async 双引擎 |
| Alembic | ≥1.13.3 | 数据库迁移 |
| asyncpg / psycopg2-binary | — | PostgreSQL 双驱动 |
| Redis | ≥5.2.0 | sync + async，缓存库封装 |
| Celery | ≥5.4.0 | Worker 分离 |
| LangChain | ≥1.3.0 | Agent 框架基础 |
| LangGraph | ≥1.2.0 | Agent 编排 |
| uvicorn | ≥0.32.0 | ASGI 服务器 |

### 前端（`frontend/package.json` 事实来源）

| 包 | 版本 | 说明 |
|---|---|---|
| Next.js | 16.x（锁定） | App Router；**禁止降到 15.x 或升到 17.x** |
| React | 19.x | Next 16 配套 |
| TailwindCSS | 4.x | 禁止用 3.x |
| Zustand | ≥5.0.15 | 状态管理；使用 `sessionStorage` persist 允许医护/患者双角色并行 |
| Framer Motion | ≥13.1.0 | 动画 |
| Vitest | ≥4.1.10 | 单元测试 |

### 基础设施（`docker-compose.yml` / `deploy/` 事实来源）

| 组件 | 要求 |
|---|---|
| PostgreSQL | — |
| Redis | — |
| 宝塔 Nginx | 终止 HTTPS，反向代理 |

**禁止事项**：
- 禁止引入未经审核的新依赖；新增依赖必须在 pyproject.toml / package.json 中登记。
- 禁止同时存在两个数据库引擎版本（如 asyncpg + pg）。
- 禁止在前端直接引入 LangChain 或后端 Node 包。

---

## 4. 数据库设计事实来源（强制遵守）

**数据库/ORM/迁移的唯一事实来源是以下文档，任何表结构、字段命名、关系设计都必须以它们为准：**

| 文档 | 状态 | 交付阶段 |
|---|---|---|
| `docs/sql/数据库表业务设计.md` | **待创建** | M0（需求冻结） |
| `docs/sql/量表配置模型.md`（新增） | **待创建** | M1（后端骨架） |
| `docs/sql/筛查-评估映射模型.md`（新增） | **待创建** | M1（后端骨架） |

> 在上述文档创建之前，**所有涉及数据库的代码必须先与人类确认表结构**，禁止自行设计。模板项目的 ORM 模型（`assessment_template.py`、`assessment_execution.py`、`interaction.py` 等）作为参考，但本项目需按 21 张量表需求做裁剪与扩展，**不得直接复制**。

核心主链路（参考模板项目）：

```
patient → patient_encounter → care_task
    → assessment_instance (per scale per task)
        → assessment_submission (AI / 护士 / 患者自评 / 最终确认)
            → assessment_answer (唯一约束 (submission_id, question_id))
```

### 禁止事项：

- **禁止引用已废弃的旧模型**：不得创建 `assessment_tasks`、`dialog_sessions`、`dialog_messages` 等模板项目已废弃的单提交表模型。
- **禁止在 Agent SDK 中定义 ORM Model**：ORM 全部在 `backend/app/models/` 下。
- **禁止绕过 Alembic 直接改表结构**：所有结构变更必须写 Alembic 迁移文件。
- **智能体运行态存 Redis（TTL）**，**禁止**映射为独立 `agent_states` 表。

---

## 5. 21 张量表硬约束

### 5.1 标准一致性

- 21 张量表的题目顺序、选项文本、分值、判定阈值**必须与 WS/T 826—2026 附录 B 原文一致**，一字不差。禁止为"产品优化"擅自改编题干、增删选项、修改分值。
- 基本情况信息表（附录 A）的必填项（带 `*`）必须在前端强制校验；非必填项允许跳过。
- 量表版本通过 `assessment_template.version` + `assessment_instance.template_version_snapshot` 双版本号管理，导入变更前的历史提交使用冻结快照，禁止直接复用当前版本。

### 5.2 参数化加载

- 21 张量表通过结构化 JSON 参数化导入，**源文件目录 `docs/structured/assessment-scales/`（待创建，M1 交付）**，由 `app/managers/assessment_catalog_importer.py` 幂等执行。
- JSON 结构每量表一个文件，至少包含：量表编号、名称、维度、题目列表（题干、题型、选项、分值、判定规则）、版本号。模板项目已有量表 JSON 样例可参考，但本项目 21 张量表需按 WS/T 826 附录 B 重新构建，**不得直接复用模板项目的入院评估量表**。
- **禁止硬编码量表题目到 Python/TypeScript 代码里**；所有题目文本必须在配置文件中可查可改。
- 量表加载器 `app/managers/assessment_loader.py` 只加载"当前生效且已发布"的版本，草稿态量表禁止进入评估流程。

### 5.3 筛查—评估两级路径

- 筛查路径由**后端路径引擎**统一管理，前端**禁止**自行判断筛查阳性/阴性：后端根据筛查结果自动决定进入或跳过对应详细评估量表。
- 标准 7.5 章 12 类老年综合征的筛查 → 详评映射必须在后端硬编码：**跌倒风险筛查阳性 → B.3 SPPB / Morse Fall Scale 详评**，以此类推。新增映射必须同步更新本文件第 5.3 节映射表。
- **禁止**在前端用 JavaScript 实现筛查逻辑：筛查结果必须从后端 API 返回，前端只做路由跳转。

### 5.4 自动计分判定

- 各量表的计分逻辑（如 Barthel 0~100 分、FRAIL 5 条目、NRS 2002 初筛 + 终筛、CAM 四条目判定）**必须**后端实现，**禁止**前端做最终计分判定。
- 前端可以展示中间分数（答题后实时显示"已得 X 分"），但最终评判结果（正常/轻/中/重度依赖等）以**后端返回为准**。
- B.17 洼田饮水试验分级、B.7 耳语试验阳性判定这类需要医护操作的，前端提供数据录入界面，判定由后端按标准规则输出。

---

## 6. API 契约

### 6.1 响应格式

所有业务 API 统一返回：

```json
{
  "code": 0,       // 0 = 成功, 非 0 = 业务错误
  "message": "...",
  "data": {...}
}
```

- 失败时 `code` 非零；HTTP status code 只用于网络错误，业务层不使用 HTTP status 表达业务失败。
- 后端数字 ID（PostgreSQL bigint）在 DTO 映射边界**必须**转为字符串返回，防止前端 JavaScript 精度丢失。

### 6.2 核心端点（区分"模板既有"与"本项目新增"）

以下是**模板项目 medical-evaluate-main 已注册的路由前缀**：`/api/auth`、`/api/consent-forms`、`/api/dialog`、`/api/extraction`、`/api/patients`、`/api/scales`、`/api/sse`、`/api/system-config`、`/api/tasks`、`/api/voice-dialog`、`/api/quality`。

| 端点 | 用途 | 来源 |
|---|---|---|
| `POST /api/auth/staff/login` | 医护登录（返回 HttpOnly Cookie） | ✅ 模板既有 |
| `POST /api/patients/me/login` | 患者身份证 + 手机号登录 | ✅ 模板既有 |
| `POST /api/tasks` | 创建评估任务（含附录 A + 21 张量表绑定） | ✅ 模板既有（需扩展量表绑定逻辑） |
| `POST /api/tasks/{taskRef}/questionnaire/draft` | 保存问卷草稿 | ✅ 模板既有 |
| `POST /api/tasks/{taskRef}/questionnaire/submit` | 正式提交问卷 | ✅ 模板既有 |
| `GET /api/scales` / `GET /api/scales/{templateId}` | 获取量表模板配置 | ✅ 模板既有 |
| `GET /api/scales/{templateId}/result` | 获取已计分结果（后端判定） | 🔶 本项目新增（模板只有量表模板接口） |
| `GET /api/scales/{templateId}/screener` | 获取筛查结果（后端判定） | 🔶 本项目新增 |
| `POST /api/patients/{id}/assessments/{templateId}/submit` | 医护端录入单张量表（如体测数据） | 🔶 本项目新增 |
| `POST /api/reports/generate` | 触发综合评估报告生成 | 🔶 本项目新增 |
| `GET /api/reports/{taskRef}` | 获取已生成的报告（支持 Word / PDF 下载） | 🔶 本项目新增 |
| `GET /api/patients/me/assessments` | 患者端查看历次评估档案 | 🔶 本项目新增 |
| `/api/sse/*` | SSE 流式事件（对话、筛查进度、报告生成进度） | ✅ 模板既有（需扩展报告进度事件类型） |

> 标记 ✅ 的端点可直接复用模板实现或做薄扩展；标记 🔶 的是本项目必须**从零新建**的端点。

### 6.3 事件标识

- SSE 信封必须**同时携带**领域 `event_id`（PostgreSQL 持久化领域事件编号，业务关联用）和传输 `stream_id`（Redis Stream 游标，断线续读用），二者不得混用。
- 患者端与医护端刷新恢复呼叫记录、宣教卡片、工具结果的**唯一事实来源是会话事件快照接口**，不能只依赖当次 SSE 流。

### 6.4 禁止事项：

- **禁止前端把内部选项编码（option_1 / option_3）直接展示给用户**；必须展示量表真实标签快照（`display_value` / `selected_option_labels`）。
- **禁止前端用 mock 数据补齐后端未返回的字段**；后端接口必须返回完整的患者摘要（住院号、性别、年龄、入院时间、在院状态）。
- **禁止在响应中返回身份证号或手机号明文**；身份证号以加密形式存储，响应返回脱敏值。

---

## 7. 患者端适老化硬约束

患者端 UI 验收基准：**390px 移动视口居中画布**（由 `src/components/layout/PatientLayout.tsx` 提供），设计令牌统一放在 `src/app/globals.css` 的 `.patient-app` 作用域。

### 必须遵守：

1. **等效视觉字号 ≥ 18px**；老年人常阅文本（量表题目、选项、按钮）等效视觉字号 ≥ **20px**。
2. **一题一屏**：量表答题界面每次只展示一个问题 + 选项，禁止一屏多题。
3. **语音播报**：患者端答题页必须提供"题目朗读"按钮，点击后语音播报当前题干与选项。
4. **语音输入**：支持语音回答（识别 → 转录确认），转录结果允许老人修改再提交。
5. **关键按钮尺寸 ≥ 80×80 CSS 像素**；答题"下一题"按钮始终位于拇指热区。
6. **防误触**：答题选项点击后有 **300ms 防抖** + 二次确认弹窗；草稿自动保存触发频率不低于 10 秒一次。
7. **暂停恢复**：支持老人中途暂停后继续；暂停期间后端自动保存 `in_progress` 草稿。
8. **暂停、继续、提交按钮不得关闭答题会话**；暂停只是 UI 隐藏答题控件。

### 禁止事项：

- 禁止在患者端页面加载医护端设计令牌或组件。
- 禁止使用 `<input type="number">` 外的其他类型收集数值答案（必须启用移动端数字键盘）。
- 禁止患者端调用医护专用 API（`/api/tasks` 医护列表、`/api/patients/{id}/edit` 等）。

---

## 8. 安全与隐私硬约束

### 加密与存储：

- 身份证号、手机号**入库前加密**（`Fernet` + 密钥由环境变量提供），API 不返回密文；响应仅返回脱敏值（如 `4401********1234`）。
- 数据库连接使用 Postgres SSL 模式；Redis 密码认证。
- 签名图片、音频、报告 PDF 等二进制文件**禁止**以 data URL 直接写入 PostgreSQL；必须保存到 `backend/storage/` 持久化卷，通过已认证 API 路径返回。

### Cookie 与会话：

- 医护会话使用独立 HttpOnly Cookie `medical_staff_session`；患者会话使用独立 HttpOnly Cookie。**禁止**医护 Cookie 替代患者会话，反之亦然。
- Cookie 设置 `SameSite=Strict` + `Secure` + `HttpOnly`。

### 禁止事项：

- **禁止**敏感文件（签名、音频、报告 PDF）挂载为公开静态目录。
- **禁止**把用户数据提交到 Git 仓库；`backend/storage/` 和 `frontend/.env` 必须在 `.gitignore` 中。
- **禁止**在生产环境执行 `seed_demo` 或使用演示账号密码；正式初始化使用 `bootstrap_production` 命令并显式提供首个医护账号。
- **禁止**在代码或配置中写死生产密钥、数据库密码、API Key；全部通过环境变量提供。
- Redis 运行态（登录会话、SSE 游标、Agent 临时状态、Celery 队列）**不随演示数据迁移**，生产服务器必须使用新 Redis 数据卷。

---

## 9. 生产部署约定

### 架构：

- 公网正式环境使用**宝塔宿主机 Nginx** 终止 HTTPS 和反向代理；Docker Compose **不启动第二个 Nginx**。
- 前端通过当前域名访问同源路径 `/api`、`/api/sse/*`、`/api/ws/*`；**禁止**页面、仓储、传输层或生产配置写死 `localhost:8000`、宿主机后端端口或容器服务名。
- FastAPI 只监听容器内部 `0.0.0.0:8000`，宿主机仅通过回环端口供宝塔转发。

### Nginx 代理规则（事实来源：`deploy/baota-reverse-proxy.conf`）：

- SSE 必须保留 `proxy_buffering off`。
- WebSocket 必须保留 `Upgrade` / `Connection` 转发头。
- 修改前端传输路径时必须同步检查并更新 `deploy/baota-reverse-proxy.conf`。

### Docker：

- 前端使用 Next.js `output: 'standalone'`，禁止改回默认模式；修改时必须同步更新 `deploy/frontend.Dockerfile`。
- 后端与前端镜像在本地或 CI 构建后**上传服务器运行**；服务器只执行 `docker load` 和 Compose `--no-build`，**禁止**依赖服务器源码或重新安装 Python/Node 依赖。
- Compose 首次启动前，`medical_evaluate_app_storage` 卷必须通过 `storage-init` 完成目录初始化，API/Worker/Beat 必须等待该服务成功后再启动。

### 演示数据恢复：

- 真实演示数据由后端 PostgreSQL + `backend/storage` 恢复，**禁止**前端保留患者资料、对话、签名或音频副本。
- 恢复命令：`DEMO_RESTORE_CONFIRM=YES ./deploy.sh demo-restore`；**禁止**省略 `DEMO_RESTORE_CONFIRM=YES` 环境变量（恢复会清理目标数据库对象）。

---

## 10. Git 规范

### 分支：

- `dev` 是开发分支，新功能/改 BUG **必须**从 `dev` 新建分支。
- `main` 是稳定主分支，只有人工确认版本稳定后才合并 `dev`。
- 功能分支命名：`feat/xxx`、`fix/xxx`、`docs/xxx`、`refactor/xxx`、`test/xxx`、`chore/xxx`。
- **禁止**使用 `codex/xx`、`claude/xxx` 等 AI 前缀创建分支。
- **禁止**多分支长期并存；功能分支开发测试完成后必须及时合并回 `dev` 并删除。

### 提交信息：

**格式**：`type(scope): 中文开发摘要`

| type | 说明 |
|---|---|
| feat | 新功能 |
| fix | 修复 |
| docs | 文档 |
| refactor | 重构 |
| test | 测试 |
| chore | 构建/依赖/杂项 |
| build | 构建系统变更 |
| ci | CI 变更 |

scope 三大类：`backend-xxx`、`agent-xxx`、`frontend-xxx`。

示例：
```
feat(backend-api): 新增筛查-评估两级路径引擎，支持 12 类老年综合征自动流转
fix(frontend-patient): 修复答题防抖 300ms 缺失导致误触提交的问题
refactor(agent-dialog): Dialog Engine 从 LangGraph create_agent 迁移到自定义引擎
```

**禁止**用英文提交信息。提交信息必须**同时写出修改位置（括号内）和开发摘要**，方便后续查阅。

### 推送硬约束：

- 远程 `dev` 推送必须在本地功能分支**完整合并到 `dev`、测试通过、工作区干净**后才能执行。
- **禁止**工作区不干净、存在冲突、状态不确定时私自推送远程 `dev`；需要远程同步时**只推当前功能分支**。

---

## 11. 测试要求

### 后端（`backend/tests/`，pytest）：

**TDD 强制**：功能和 bug 修复必须携带测试。三层结构：

| 层级 | 目录 | 覆盖内容 |
|---|---|---|
| unit-test | `backend/tests/unit-test/` | Agent 工厂、Tool Schema、引擎装配、中间件、领域模型、Agent Runtime |
| integ-test | `backend/tests/integ-test/` | Alembic 迁移、患者管理、登录鉴权、PostgreSQL/Redis 持久性 |
| e2e-test | `backend/tests/e2e-test/` | 需要真实 LLM 密钥的端到端测试（标记 `@pytest.mark.real_llm`） |

**禁止**跳过测试就合并。`pytest` 必须全部通过才能推送。

### 前端（`frontend/tests/`，Vitest）：

涉及适配器变更时至少覆盖：
- DTO 映射（`mappers.ts`）
- 事件解析（`applyRealtimeEvent.ts`）
- 传输边界（`sseClient.ts`、`voiceSocket.ts`）

### 检查命令：

```powershell
# 前端
cd frontend; pnpm lint; pnpm typecheck; pnpm test; pnpm build

# 后端
cd backend; pytest
```

---

## 12. 代码注释与文档规范

### 代码注释（**中文**，强制）

```python
def func_name(x: int, y: int) -> int:
    """函数标题
    作用：描述函数的作用;
    Args:
        - x: ...
        - y: ...
    Return:
        - 返回值说明
    """
```

- 抽象基类：必须标明类作用。
- 实现类：必须写明具体实现、类参数、类方法作用。
- 关键步骤代码：行内必须写清注释。
- **禁止**英文注释、禁止空 Docstring。

### 前端注释（TypeScript）

```typescript
/**
 * 组件作用说明
 * @param props 参数说明
 * @returns 返回值说明
 */
export function QuestionCard(props: Props) { ... }
```

### 文档编写

- 所有文档使用**简体中文**。
- 开发计划文档必须放在 `docs/plan/`，格式：大步骤（1、2、3...）→ 子步骤（1.1、1.2...）→ `- [ ]` 待办标记；每完成一步改为 `- [X]`。
- **文档与代码同步更新**：涉及开发/架构变更时，必须在**同一提交**中同步更新相关的 `AGENTS.md` / `README.md` / 计划文档，禁止留下文档滞后。
- 文档引用路径使用**仓库相对路径**，**禁止**使用机器相关的绝对路径（如 `file:///C:/Users/...`）。

---

## 13. 附录：快速 checklist

| 编码活动 | 必须检查 |
|---|---|
| 新增/修改量表题目 | ✅ 核对 WS/T 826 原文一字不差 |
| 新增/修改筛查路径 | ✅ 在后端路径引擎实现，前端不判断 |
| 新增 API 端点 | ✅ 响应格式 `{code,message,data}` ✅ 数字 ID 转字符串 |
| 新增数据库表 | ✅ 先写 Alembic 迁移 ✅ 不创建废弃风格单表 |
| 新增/修改部署 | ✅ 同步检查 Nginx 代理规则 ✅ 不写死 localhost:8000 |
| 提交 Git | ✅ 类型前缀 ✅ scope 分类 ✅ 中文摘要 |
| 推送远程 | ✅ 功能分支已合并 dev ✅ 工作区干净 ✅ 测试通过 |
| 涉及敏感数据 | ✅ 加密入库 ✅ 响应脱敏 ✅ 不提交 Git |
| 改前端传输层 | ✅ 医护端+患者端 Cookie ✅ SSE 断线续读 ✅ WebSocket |

---

## Where to Go Next

- 业务蓝图 → [`项目构想总需求.md`](项目构想总需求.md)
- 后端深度（参考模板） → `medical-evaluate-main/backend/AGENTS.md`
- 前端深度（参考模板） → `medical-evaluate-main/frontend/AGENTS.md`
- API 设计 → `docs/API.md`
- 数据库设计 → `docs/sql/`
- 开发计划 → `docs/plan/`

---

## 附录 A：与模板项目的关系

### A.1 关系定性

本项目**不是 fork 模板项目 medical-evaluate-main，而是新建项目参考其技术架构、分层设计、Agent SDK、前端 Repository 模式与生产部署方式**。

具体来说：

| 参考维度 | 模板项目实际情况 | 本项目处理方式 |
|---|---|---|
| 技术栈（FastAPI / Next.js / LangGraph / PostgreSQL / Redis / Celery / 宝塔 Nginx） | 全部已落地、版本锁定 | **直接采用**，不另选型 |
| harness/app 分层 + Agent/App 依赖方向 | 已落地，有 Agent SDK (`packages/medagent`) | **直接采用** |
| 前端 Repository 模式（Mock/API 双实现） | 已落地 | **直接采用** |
| DTO 映射边界（后端数字 ID → 前端字符串） | 已落地 | **直接采用** |
| 事件标识双轨制（event_id / stream_id） | 已落地 | **直接采用** |
| 生产部署架构（宝塔 Nginx 终止 HTTPS + Compose 内部服务） | 已落地 | **直接采用** |
| 数据库核心主链路（patient → encounter → task → instance → submission → answer） | 已落地 | **参考但需按 21 张量表扩展**，不得直接复制 |
| 量表题库 + 导入管道 | 模板用"入院评估量表" | **必须重新构建** WS/T 826 21 张量表的 JSON，不得复用模板量表 |
| API 路由前缀 `/api/auth`、`/api/tasks`、`/api/scales`、`/api/patients`、`/api/sse` | 已注册 | **复用**，但需扩展端点（见第 6.2 节） |
| `consent-forms`、`quality`、`voice-dialog` 路由 | 已注册 | **可删除或保留占位**（本项目不做入院知情同意与护士 AI 质评） |
| Agent（Dialog/Extraction/Schedule） | 已落地，模板场景是入院评估 AI 对话 | **参考引擎架构与 Provider 抽象，但 Agent Prompt 与 Tool 需按老年预问诊重新构建** |
| Agent 中间件链（event_publish / keyword_intercept / timeout / schedule_constraint） | 已落地 | **参考但需按老年预问诊场景裁剪** |
| `backend/storage/consent-signatures` | 模板用于知情同意签名 | **本项目不做知情同意，需清理**；报告 PDF 存档目录单独规划 |

### A.2 裁剪与新增清单

| 类别 | 模板项目 | 本项目处理 | 原因 |
|---|---|---|---|
| **量表** | 入院评估量表 | 替换为 WS/T 826 21 张量表（B.1～B.21） | 本项目业务核心 |
| **筛查逻辑** | 模板无独立筛查路径 | **新增** 12 类老年综合征筛查 → 详评两级路径引擎 | WS/T 826 第 7 章强制要求 |
| **报告生成** | 模板无综合评估报告 | **新增** 报告生成中心（自动汇总 + Word/PDF 导出 + 回写 HIS） | 标准第 9.2、10.3 条要求 |
| **知情同意** | 模板有 `/api/consent-forms` | 可删除或保留占位 | 本项目不包含入院知情同意场景 |
| **护士 AI 质评** | 模板有 `/api/quality` | 可删除或保留占位 | 本项目首期不做 AI 质量评价 |
| **语音对话（豆包 Realtime）** | 模板有完整 Voice Gateway | **参考架构但按老年场景裁剪**（预问诊语音播报 + 语音输入） | 本项目需要语音适老化，不做模板那样的全双工 AI 对话 |
| **Schedule Agent** | 模板有独立 Worker + Redis 约束 | **参考但裁剪**：本项目 Schedule Agent 只管量表任务分解与筛查路径，不做模板那样的入院评估对话约束 | 业务场景不同 |
| **患者适老化** | 模板患者端是成人 390px 布局 | **必须改造为老年端适老化**（字号 ≥ 20px、一题一屏、语音播报/输入、防误触） | 本项目目标用户是 ≥60 岁老年人 |
| **前端路由** | `src/app/patient/*` + `src/app/nurse/*` | 保留双角色，但患者端页面组件需重写 | 老年端适老化 |
| **数据库模型** | 模板 33 张表 | 参考但需裁剪 consent/quality 域，新增量表配置与筛查路径域 | 按 21 张量表重新建模 |

### A.3 禁止事项

- **禁止**直接复制模板项目的入院评估量表 JSON、Dialog Agent Prompt、Schedule Agent Prompt；必须按 WS/T 826 原文重新构建。
- **禁止**模板项目中"模板既有"与"本项目新增"的端点在未标注的情况下混淆；调用任何端点前先查第 6.2 节确认来源。
- **禁止**把模板项目的 AI 对话能力描述为"老年预问诊核心能力"；M1～M3 阶段先完成传统问卷 + 筛查路径 + 自动计分 + 报告生成，M4 再加入 Dialog Agent。

---

> 本文件是**可执行规范**。如果在执行中遇到任何与之冲突的情况（例如历史代码不一致），**禁止默默遵循历史代码**；必须停下来与人类确认后再决定如何处理。
