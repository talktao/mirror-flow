# 多模态 AI 创作平台 · 从 0 到 1 技术方案

> 对标 TapNow 的网页版多模态 AI 创作平台  
> 技术栈：React 19 + Vite + TailwindCSS + Zustand / Go + Gin / SQLite → MySQL / SSE / Docker + Nginx  
> 文档版本：v1.0 · 2026-11-01  
> 适用范围：阶段 0（基建）、阶段 1（MVP 单链路）、阶段 2（异步任务 + 多模型），并对阶段 3~6 做前瞻设计

---

## 0. 文档说明

### 0.1 已确认的前提

| 项 | 决策 | 说明 |
|---|---|---|
| 首批模型供应商 | 智谱 BigModel（GLM-Image / CogVideoX-3） | 图像同步生成，视频异步提交 + 轮询，正好覆盖两种适配形态 |
| 对象存储 | 先本地落盘，接口按 OSS 预留 | 本地 `backend/data/assets`，生产替换为 OSS/COS/R2 |
| 用户体系 | 阶段 1~2 匿名 `client_id` | 前端生成 UUID，后端 Cookie 透传；阶段 3 换 `user_id` |
| 实时推送 | SSE 优先，WebSocket 后置 | 单任务事件流 + 前端轮询兜底 |
| 部署形态 | 单机 Docker Compose + Nginx + HTTPS | 后端单实例，多实例演进点已预留 |

### 0.2 尚未确认、但方案已给出默认值的事项

- 智谱账号实际可用的模型 ID、并发配额与计费口径。
- 图生图、视频生视频是否由智谱承担（当前方案按"智谱暂不支持"处理，先用 Mock 占位）。
- OSS 具体厂商（阿里云 OSS / 腾讯云 COS / Cloudflare R2）。
- 部署地域与是否需要 ICP 备案。
- 视频时长与分辨率上限（方案默认 10 秒、1080P、30 天超时）。

### 0.3 阅读建议

- 想快速了解全貌：读第 1、3、17 章。
- 想知道坑在哪：读第 5 章。
- 准备动手写代码：读第 6~11 章 + 第 17 章的任务清单。
- 准备上线：读第 12~16 章。

---

## 1. 项目定位与目标

### 1.1 产品定位

一个"输入素材 → 选择能力与模型 → 异步生成 → 实时看进度 → 拿到成品 → 继续加工"的创作工作台。核心不是"调用一次模型 API"，而是：

1. **统一入口**：五种生成能力用同一套任务模型。
2. **可插拔模型**：同一能力可以切换不同厂商，业务代码不变。
3. **过程可见**：长任务有进度、有阶段、可取消、可重试。
4. **可继续加工**：成品是平台资产，能作为下一步输入，最终被 Agent 串联。

### 1.2 五种生成能力

| 能力 | 标识 | 输入 | 输出 | 关键参数 | 典型耗时 |
|---|---|---|---|---|---|
| 文生图 | `text_to_image` | 提示词、负向词 | 1~4 张图 | 尺寸、张数、随机种子 | 10~60s |
| 图生图 | `image_to_image` | 提示词 + 参考图 | 图片 | 参考图权重、尺寸 | 20~90s |
| 文生视频 | `text_to_video` | 提示词 | 视频 | 时长、分辨率、帧率、音频 | 1~8min |
| 图生视频 | `image_to_video` | 提示词 + 首帧/尾帧 | 视频 | 上述 + 运镜提示 | 2~10min |
| 视频生视频 | `video_to_video` | 提示词 + 参考视频 | 视频 | 风格强度、时长 | 3~15min |

### 1.3 本次交付范围（阶段 1 + 阶段 2）

**必须做到：**

- 网页能完成"输入提示词 → 出第一张图"的完整闭环。
- 任务创建后立即返回任务 ID，执行在后台完成。
- 固定数量 worker 消费任务，状态与结果持久化。
- 至少两条真实模型链路（智谱图像 + 智谱视频）可用。
- SSE 实时推送进度，断线可恢复，前端有轮询兜底。
- 任务列表、取消、重试可用。
- 本地一条命令启动，生产能 Docker 部署。

**明确不做（避免范围蔓延）：**

- 用户注册登录、支付、套餐（阶段 3）。
- Agent 编排（阶段 4，仅做接口预留）。
- WebSocket 聊天/多人协作。
- 多实例部署与 Redis/asynq（阶段 5，但接口已抽象）。
- 视频转码、复杂剪辑、素材库管理。

### 1.4 成功标准（一句话）

> 一个没有技术背景的用户，在浏览器里输入一句话，30 秒内看到一张图，刷新页面后图片还在，失败时知道为什么失败并且能一键重试。

---

## 2. 关键设计原则

这六条原则是整个方案的"宪法"，后续所有取舍都以它们为准。

### 2.1 数据库是唯一事实源

队列里的消息只是"该干活了"的提示。消息丢失、重复、乱序都不能影响最终一致性。所有状态以 `tasks` 表为准，任何时刻都可以从 DB 重建队列。

### 2.2 队列只是触发器

本地用内存队列，生产换 Redis/asynq，业务代码不改。因此队列接口只暴露 `Enqueue` / `EnqueueAfter` / `Start`，不暴露"读取消息体"这类实现细节。

### 2.3 SSE 是加速器，轮询是兜底

前端永远保留 `GET /tasks/:id` 这条路径。SSE 挂了、代理缓冲了、公司网络拦截了，页面仍然能工作，只是体验降级。

### 2.4 厂商差异在适配层收敛

业务层只认识 `Capability / Model / Task`，不认识 `cogview`、`kling`、`runway`。任何"某家 provider 特殊"的逻辑都必须留在 `internal/adapter`。

### 2.5 先单后多，先同步后异步

Agent 先做单 Agent 提示词优化，再做编排器-工作者。任务系统先做"能跑"，再做并发、恢复、重试。不要在第一天就设计分布式。

### 2.6 每个替换点都有接口

`Queue`、`Storage`、`EventBus`、`Adapter` 四个接口是未来演进（asynq / OSS / Redis PubSub / 新厂商）的接缝。接口设计一次到位，实现可以逐步替换。

---

## 3. 总体架构

### 3.1 架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│ 浏览器 SPA（React 19 + Vite + Tailwind + Zustand）                   │
│  Studio 工作台 / 历史列表 / 任务详情                                  │
└───────────────┬───────────────────────────────────┬─────────────────┘
                │ REST JSON                          │ SSE (text/event-stream)
                ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Nginx：TLS 终止、静态资源、/api 反代、SSE 关闭缓冲、超时放长           │
└───────────────┬─────────────────────────────────────────────────────┘
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Gin 接入层                                                           │
│ middleware: request_id / recovery / cors / rate_limit / client_id    │
│                                                                     │
│ handler ── service ── store（SQLite → MySQL）                        │
│                │                                                    │
│                ├── task.Queue（memory → asynq）                      │
│                ├── adapter.Registry（mock / zhipu / ...）             │
│                ├── storage（local → OSS）                            │
│                └── sse.Hub（memory → redis pubsub）                   │
└───────────────┬─────────────────────────────────────────────────────┘
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ task.Manager（后台常驻）                                             │
│  submit 消费者池 / poll 消费者池 / sync 消费者池 / 对账恢复 / 超时清理  │
└───────────────┬─────────────────────────────────────────────────────┘
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 智谱 BigModel（GLM-Image 同步、CogVideoX-3 异步） / Mock Provider      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 一次文生图的完整时序（12 步）

```
用户                前端                API                 Manager              Provider/Storage
 |  输入提示词        |                  |                     |                       |
 |------------------->| POST /tasks      |                     |                       |
 |                    |----------------->| 校验+落库(queued)     |                       |
 |                    |<--202 task_id----| 入队 submit           |                       |
 |                    |                  |-------------------->| claim(原子)            |
 |                    |                  |                     | 调 provider------------>|
 |                    |                  |                     |<-------图片URL---------|
 |                    |                  |                     | 下载并落本地/OSS        |
 |                    |                  |                     | 写 assets + 终态        |
 |                    |  SSE 收到 done    |<---事件落库+发布-----|                       |
 |                    |<-----------------|                     |                       |
 |<--展示图片---------|                  |                     |                       |
```

### 3.3 模块职责

| 模块 | 职责 | 不该做的事 |
|---|---|---|
| `handler` | HTTP 解析、鉴权、DTO、SSE 连接管理 | 不写业务规则、不碰 provider |
| `service` | 校验、参数归一、任务编排、归属校验 | 不直接执行生成、不写 SQL |
| `store` | 持久化、原子状态迁移、事件追加 | 不判断业务状态是否合理 |
| `adapter` | 参数映射、调用 provider、进度、错误映射 | 不写 DB、不写 OSS、不感知任务状态机 |
| `task` | 队列、worker、claim、重试、恢复 | 不解析 HTTP、不拼 SQL 方言 |
| `storage` | 文件保存、URL、下载回流 | 不关心业务权限 |
| `sse` | 订阅、广播、心跳、慢客户端处理 | 不负责历史事件补发（由 handler 查库） |

### 3.4 monorepo 目录结构

```
/
├── backend/
│   ├── cmd/server/main.go
│   ├── internal/
│   │   ├── config/          # 环境变量加载与校验
│   │   ├── model/           # Task/Asset/TaskEvent/能力与状态常量
│   │   ├── store/           # Store 接口 + sqlite 实现 + migrations
│   │   ├── adapter/         # 契约、registry、mock、zhipu
│   │   ├── task/            # Queue 接口、memqueue、manager
│   │   ├── service/         # 生成服务、上传服务
│   │   ├── handler/         # gin 路由、DTO、中间件
│   │   ├── sse/             # Hub、事件编解码
│   │   ├── storage/         # local / oss 实现、下载器
│   │   └── pkg/             # id、apierr、logx
│   ├── configs/models.yaml  # 模型目录（能力/参数/成本）
│   ├── migrations/          # 或内嵌在 store 包
│   ├── data/                # 本地 SQLite 与资产（.gitignore）
│   └── go.mod
├── frontend/
│   ├── src/
│   │   ├── api/             # fetch 封装
│   │   ├── components/      # 通用组件
│   │   ├── features/        # generate / history
│   │   ├── hooks/           # useTaskStreams
│   │   ├── stores/          # Zustand
│   │   ├── pages/           # Studio / History
│   │   ├── types/           # 与后端 DTO 对齐
│   │   └── main.tsx
│   ├── vite.config.ts       # /api 与 /files 代理
│   └── package.json
├── deploy/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── nginx.conf
│   └── docker-compose.yml
├── Makefile
└── .env.example
```

### 3.5 依赖方向（防止循环依赖）

```
handler → service → store
                ↘ task.Manager → adapter / storage / sse / store
service → task.Enqueuer（接口）
```

硬规则：

- `adapter` 不能 import `store`、`service`、`handler`。
- `store` 不能 import `adapter`。
- `sse` 不能 import `task`。
- `service` 只依赖 `task.Enqueuer` 接口，不依赖 `task.Manager` 具体类型。

---

## 4. 技术选型

| 领域 | 选型 | 备选 | 选择理由 | 风险与对策 |
|---|---|---|---|---|
| 前端框架 | React 19 + Vite | Next.js | SPA 无 SSR 需求，Vite 启动快，部署简单 | 无 |
| 样式 | TailwindCSS 4 | CSS Modules | 迭代快、组件风格统一 | 类名膨胀，抽公共组件 |
| 状态 | Zustand | Redux / Jotai | 轻量、SSE 事件直接 `set` 即可 | 跨切片依赖需约束 |
| 后端 | Go + Gin | Node/Java | 单二进制部署、并发模型适合 IO 等待 | 无 |
| 数据库 | SQLite（`modernc.org/sqlite`） | MySQL 本地 | 纯 Go 驱动，`CGO_ENABLED=0` 可静态编译 | 并发写有限，WAL + busy_timeout |
| 生产数据库 | MySQL 8 | PostgreSQL | 团队通用、运维成熟 | 方言差异，见 6.7 |
| 队列 | 内存队列 → Redis/asynq | RabbitMQ | 阶段 1 零依赖；asynq 原生支持延迟任务 | 内存队列不跨进程，见 8.2 |
| 实时推送 | SSE | WebSocket | 单向推送够用、实现简单、过代理友好 | 需要关缓冲、心跳、补发 |
| 存储 | 本地磁盘 → OSS | 直接 OSS | 本地零成本；接口预留 | 本地无 CDN，生产替换 |
| 日志 | `log/slog` | zap | 标准库、结构化、无额外依赖 | 字段规范需统一 |
| 迁移 | 内嵌 SQL + 自研 runner | golang-migrate | 少依赖、启动即迁移 | 多实例需加锁，见 16.6 |
| 部署 | Docker Compose + Nginx | K8s | 单机足够，成本低 | 扩容到多实例时改 Compose |

### 4.1 为什么是 SSE 而不是 WebSocket

- 本阶段只有"服务端 → 前端"的单向事件，SSE 天然匹配。
- SSE 走普通 HTTP，Nginx/网关/公司网络兼容性更好。
- 断线重连、`Last-Event-ID` 补发是协议内置能力。
- WebSocket 会在阶段 3 的"协作/聊天"场景再引入，二者可以共存。

代价：SSE 每个任务一条连接，浏览器同域并发连接数有限（HTTP/1.1 约 6 条）。对策：

- 只对"当前活跃任务"建立 SSE，完成即断开。
- 历史任务用普通查询。
- 生产启用 HTTP/2 后限制基本消失。

---

## 5. 痛点与难点

### 5.1 总览

| # | 痛点 | 根因 | 影响 | 对策 | 验证方式 |
|---|---|---|---|---|---|
| 1 | 长任务占满 worker | 视频生成 1~10 分钟，worker 阻塞等待 | 图片任务排不上队 | 拆 submit / poll / sync 三类池，poll 是短请求 | 视频跑的同时提交图片，图片仍能完成 |
| 2 | Provider 结果 URL 过期 | 厂商临时签名，1~24 小时失效 | 历史记录裂图 | 结果立刻下载回流到自己的存储 | 手动让源 URL 失效后历史仍可访问 |
| 3 | 至少一次投递重复执行 | 队列重投、崩溃重试 | 重复扣费、重复出图 | 原子 claim + 终态条件更新 | 20 并发抢同一任务仅 1 个成功 |
| 4 | 崩溃后任务卡死 | 内存队列随进程消失 | 永远 running | 启动对账 + `next_run_at` 续跑 | `kill -9` 重启后状态可解释 |
| 5 | 取消语义不统一 | 部分 provider 不支持取消 | 用户以为已停 | `cancel_requested` + 尽力取消 + 明确文案 | 取消后前端状态与 DB 一致 |
| 6 | SSE 被代理缓冲 | Nginx 默认开启 `proxy_buffering` | 进度"攒一波"才到 | `proxy_buffering off` + `X-Accel-Buffering: no` | `curl -N` 逐条到达 |
| 7 | 断线丢事件 | 无补发机制 | 重连后状态错乱 | 事件落库 + `Last-Event-ID` 补发 + 轮询兜底 | 断网 10 秒重连后不丢终态 |
| 8 | 多实例广播失效 | Hub 是进程内内存 | 其他实例收不到 | `EventBus` 接口 + Redis Pub/Sub | 双实例压测（阶段 5） |
| 9 | 进度信息缺失 | 厂商只返回 processing | 前端干等 | 阶段式估算进度 + `est_progress` 标记 | UI 显示"预计"而非假精确 |
| 10 | 参数/能力差异 | 每家参数不同 | 前端硬编码 | 模型目录 + 参数 Schema + 归一化 | 新增模型不改前端代码 |
| 11 | 输入素材给不到 provider | 私有桶/大文件 | i2v 无法使用 | 预签名 URL / base64 / provider 上传接口 | i2v 链路成功 |
| 12 | SQLite → MySQL 差异 | SQL 方言、锁、时间精度 | 上线后行为不一致 | 只用条件 UPDATE；时间存整数 | 两套库跑同一集成测试 |
| 13 | 前后端契约漂移 | 手写 DTO | 字段不一致 | OpenAPI 或共享类型 + 契约测试 | CI 校验 |
| 14 | 成本失控 | 视频按秒计费、可被刷 | 账单爆炸 | 配额、限流、成本记账、告警 | 单用户并发/日限额生效 |
| 15 | 内容合规 | 平台审核不通过 | 用户无感知失败 | 统一 `CONTENT_BLOCKED` + 提示改写 | 命中审核时文案清晰 |
| 16 | 异步链路难排障 | 跨进程、跨厂商 | 只能靠猜 | `request_id` 贯穿 + 任务事件时间线 | 一个 ID 查到全链路 |

### 5.2 难点一：长任务与 worker 饥饿

**问题**：如果所有 provider 都在 worker 内同步等待，视频任务会占住 worker 数分钟。固定 4 个 worker 时，4 个视频任务就把平台堵死。

**设计**：

- 异步 provider：`submit`（毫秒级）+ `poll`（单次 HTTP，几百毫秒）。worker 只在"提交"和"查询"的瞬间被占用，等待期不占用。
- 同步 provider：单独 `sync` 池（并发 2~4），并且给池设置超时与排队上限。
- 每类池独立配置：`WORKER_SUBMIT_CONCURRENCY`、`WORKER_POLL_CONCURRENCY`、`WORKER_SYNC_CONCURRENCY`。

**取舍**：同步图像 provider 在 `sync` 池里阻塞 30~60 秒是不可避免的。解决办法不是"无限加 worker"，而是"限制单 provider 并发 + 前端明确排队位置"。智谱图像本身支持同步，先用小并发跑通，后续再考虑把图像也做成异步。

### 5.3 难点二：Provider 结果 URL 过期

**问题**：智谱视频结果返回的是临时 URL，且可能带有效期。如果把 URL 直接存进数据库当产物，第二天用户打开历史就是裂图。

**设计**：

```
Poll 返回 SUCCESS
  → 校验 URL（https、域名白名单、非内网）
  → 流式下载（超时、大小上限）
  → 计算 sha256（同任务去重）
  → 写入 tasks/{task_id}/{index}.{ext}
  → 生成缩略图（图片直接生成，视频截首帧后续做）
  → assets 表落库
  → 发 asset 事件
```

**关键约束**：`result_json` 只存平台自己的 URL，绝不存厂商 URL。厂商 URL 只允许出现在日志的 debug 级别。

### 5.4 难点三：至少一次投递导致重复执行

**问题**：内存队列重启、asynq 重投、对账重复入队，都会让同一个任务被执行两次。

**设计**：所有"开始执行"的入口都必须先原子认领：

```sql
UPDATE tasks
SET status = 'running',
    phase = 'submit',
    worker_id = ?,
    started_at = COALESCE(started_at, ?),
    updated_at = ?
WHERE id = ? AND status = 'queued';
```

影响行数为 0 就说明别人已认领，直接返回。所有终态写入同理：

```sql
UPDATE tasks
SET status = ?, progress = 100, result_json = ?, finished_at = ?, updated_at = ?
WHERE id = ? AND status = 'running';
```

**必须接受的残余风险**：submit 调用了厂商、但进程在写回 `provider_job_id` 之前崩溃，会留下"已扣费但无 job id"的任务。对账时标记为 `failed(ORPHANED)` 并提示用户重试。这是分布式系统的固有代价，不要试图用"猜"来修复。

### 5.5 难点四：崩溃恢复

启动时执行 `Recover`：

| 检测条件 | 处理 |
|---|---|
| `status=queued` 且 `next_run_at <= now` | 重新入 submit 队列 |
| `status=running` 且 `phase=poll` 且 `provider_job_id<>''` | 重新入 poll 队列 |
| `status=running` 且 `phase=submit/execute` 且 `started_at` 超过 60s | 标记 `failed(ORPHANED)` |
| `status=running` 且 `next_run_at` 超过最大时长 | 标记 `failed(TIMEOUT)` |

运行期每 5 秒做一次轻量对账，把"已到期但没在队列里"的任务重新入队。因为 claim 是原子的，重复入队是安全的。

### 5.6 难点五：SSE 断线与代理缓冲

三层保障：

1. **协议层**：`Last-Event-ID` + 事件落库补发。
2. **传输层**：15 秒心跳注释帧；Nginx 关闭缓冲；`proxy_read_timeout` 放到 1 小时。
3. **应用层**：前端连续 3 次连接失败后，降级为 2 秒轮询；页面重新可见时强制重连。

### 5.7 难点六：SQLite → MySQL

| 差异点 | SQLite | MySQL | 统一策略 |
|---|---|---|---|
| 自增主键 | `INTEGER PRIMARY KEY AUTOINCREMENT` | `BIGINT AUTO_INCREMENT` | 迁移脚本分方言维护 |
| 时间类型 | `DATETIME` 行为随意 | `DATETIME(3)` | 统一存 `BIGINT` 毫秒 |
| JSON | TEXT | JSON | 应用层用 JSON 字符串 |
| 并发写 | 单写者 | 行锁 | 只用条件 UPDATE，不依赖 `FOR UPDATE` |
| 大小写/排序 | 不敏感 | 依赖 collation | 统一小写表名/字段名 |
| 事务 | 默认串行 | 默认 REPEATABLE READ | 不依赖隔离级别，靠条件更新 |
| UPSERT | `ON CONFLICT` | `ON DUPLICATE KEY` | 幂等场景用唯一索引 + 捕获冲突后查询 |

**原则：业务代码不写方言 SQL，方言只出现在 store 实现的少量语句里。**

---

## 6. 数据模型

### 6.1 ER 关系

```
tasks 1 ──── n assets            （任务产物与输入素材）
tasks 1 ──── n task_events       （SSE 事件日志）
clients 1 ── n tasks             （阶段 3 换成 users）
tasks 1 ──── n agent_steps       （阶段 4）
agent_runs 1 ── n agent_steps
```

### 6.2 核心表 DDL（SQLite 版）

```sql
CREATE TABLE tasks (
  id                TEXT PRIMARY KEY,
  client_id         TEXT NOT NULL,
  capability        TEXT NOT NULL,
  model_id          TEXT NOT NULL,
  provider          TEXT NOT NULL,
  status            TEXT NOT NULL,
  phase             TEXT NOT NULL,
  progress          INTEGER NOT NULL DEFAULT 0,
  est_progress      INTEGER NOT NULL DEFAULT 1,
  prompt            TEXT NOT NULL,
  negative_prompt   TEXT NOT NULL DEFAULT '',
  params_json       TEXT NOT NULL DEFAULT '{}',
  input_asset_ids   TEXT NOT NULL DEFAULT '[]',
  idempotency_key   TEXT NOT NULL DEFAULT '',
  provider_job_id   TEXT NOT NULL DEFAULT '',
  result_json       TEXT,
  error_code        TEXT NOT NULL DEFAULT '',
  error_msg         TEXT NOT NULL DEFAULT '',
  cost_micros       INTEGER NOT NULL DEFAULT 0,
  retry_count       INTEGER NOT NULL DEFAULT 0,
  cancel_requested  INTEGER NOT NULL DEFAULT 0,
  worker_id         TEXT NOT NULL DEFAULT '',
  next_run_at       INTEGER NOT NULL DEFAULT 0,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,
  started_at        INTEGER NOT NULL DEFAULT 0,
  finished_at       INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX ux_tasks_idem ON tasks(client_id, idempotency_key)
  WHERE idempotency_key <> '';
CREATE INDEX ix_tasks_ready  ON tasks(status, next_run_at);
CREATE INDEX ix_tasks_client ON tasks(client_id, created_at DESC);
CREATE INDEX ix_tasks_model  ON tasks(model_id, created_at DESC);

CREATE TABLE assets (
  id           TEXT PRIMARY KEY,
  task_id      TEXT NOT NULL DEFAULT '',
  client_id    TEXT NOT NULL,
  role         TEXT NOT NULL,
  kind         TEXT NOT NULL,
  storage_key  TEXT NOT NULL,
  url          TEXT NOT NULL,
  thumb_url    TEXT NOT NULL DEFAULT '',
  mime_type    TEXT NOT NULL,
  size_bytes   INTEGER NOT NULL DEFAULT 0,
  width        INTEGER NOT NULL DEFAULT 0,
  height       INTEGER NOT NULL DEFAULT 0,
  duration_ms  INTEGER NOT NULL DEFAULT 0,
  sha256       TEXT NOT NULL DEFAULT '',
  created_at   INTEGER NOT NULL
);
CREATE INDEX ix_assets_task   ON assets(task_id);
CREATE INDEX ix_assets_client ON assets(client_id, created_at DESC);

CREATE TABLE task_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id     TEXT NOT NULL,
  type        TEXT NOT NULL,
  data        TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX ix_events_task ON task_events(task_id, id);
```

### 6.3 字段设计说明

| 字段 | 为什么需要 |
|---|---|
| `status` + `phase` | 状态是业务语义，phase 是执行阶段；拆开才能区分"running 但还没提交"与"running 正在轮询" |
| `next_run_at` | 统一驱动延迟队列与对账，避免内存定时器丢失 |
| `provider_job_id` | 崩溃后恢复轮询的唯一线索 |
| `input_asset_ids` | 重试时复用输入，不必再关联查询 |
| `idempotency_key` | 防用户连点；唯一索引兜底 |
| `cancel_requested` | 用户意图与厂商能力分离 |
| `retry_count` | 防止无限重试烧钱 |
| `cost_micros` | 成本可观测，单位百万分之一元 |
| `est_progress` | 区分"真实进度"与"估算进度" |
| `result_json` | 终态快照，列表页无需 join 即可展示 |
| `client_id` 而非 `user_id` | 阶段 1~2 匿名；阶段 3 迁移只需加列 + 回填 |

### 6.4 索引与分页

- 列表：`WHERE client_id = ? AND created_at < ? ORDER BY created_at DESC LIMIT ?`，游标为上一页最后一条的 `(created_at, id)`，避免 offset 越翻越慢。
- 队列扫描：`ix_tasks_ready(status, next_run_at)`。
- 事件补发：`ix_events_task(task_id, id)`。

### 6.5 状态机

```
                    claim
queued ─────────────────────────▶ running ──成功──▶ succeeded
  │                                  │
  │ cancel                           ├──永久错误──▶ failed
  ▼                                  ├──可重试──▶ queued (retry_count+1, next_run_at=now+backoff)
canceled ◀──── cancel_requested ─────┤
                                     └──取消生效──▶ canceled

running + 超过最大时长 ──▶ failed(TIMEOUT)
running + 无 job id 且超时 ──▶ failed(ORPHANED)
```

**迁移规则**：

- `succeeded / failed / canceled` 是终态，不可再变。
- `queued → running` 只能通过原子 claim。
- `running → queued` 只允许在"可重试错误"或"取消未生效"时发生。
- 任何终态写入都必须带 `WHERE status='running'`。

### 6.6 并发控制示例

| 场景 | SQL | 判定 |
|---|---|---|
| 认领 | `UPDATE ... WHERE id=? AND status='queued'` | 影响行数 1 = 成功 |
| 写回 job id | `WHERE id=? AND status='running' AND provider_job_id=''` | 防止覆盖 |
| 终结 | `WHERE id=? AND status='running'` | 防止重复终结 |
| 重试入队 | `WHERE id=? AND status='running'` | 防止终态复活 |
| 取消排队任务 | `WHERE id=? AND status='queued'` | 失败则说明已开始，改置标记 |

### 6.7 迁移策略

- 本地 SQLite：启动时自动执行内嵌 SQL。
- 生产 MySQL：同一份 DDL 的 MySQL 方言版本，用独立迁移命令执行，不随应用启动（避免多实例竞争）。
- 双写期：不搞双写。上线切换采用"停机迁移 + 数据导出脚本"，或者用兼容两套的 `Store` 实现做一次性搬迁。
- 时间统一用 `BIGINT` 毫秒，避免时区问题；展示时前端本地化。

---

## 7. 统一模型适配层

### 7.1 设计目标

1. 业务层不知道厂商存在。
2. 新增厂商 = 新增一个文件 + 一条模型目录，不改 handler/service/task。
3. 厂商的"怪癖"（参数名、状态值、错误码、轮询语义）全部收敛在 adapter 内。
4. 没有 API key 也能跑通全链路（Mock）。

### 7.2 能力矩阵（以智谱为准）

| 能力 | 智谱 GLM-Image / CogView | 智谱 CogVideoX-3 | 方案 |
|---|---|---|---|
| 文生图 | 支持（同步） | - | 真实链路 |
| 图生图 | 以官方能力为准，暂按不支持处理 | - | 先用 Mock 占位，后续补厂商 |
| 文生视频 | - | 支持（异步） | 真实链路 |
| 图生视频 | - | 支持（`image_url`，含首尾帧） | 真实链路 |
| 视频生视频 | - | 暂不支持 | Mock 占位 + 预留接口 |

> 模型 ID、参数枚举、计费口径以智谱控制台与官方文档为准，全部放入 `models.yaml`，不写死在代码里。文档中的 `glm-image`、`cogvideox-3` 是当前默认值。

### 7.3 适配层契约

```go
package adapter

type Capability string

type Request struct {
	TaskID     string
	Capability Capability
	ModelID    string
	Prompt     string
	Negative   string
	Inputs     []InputRef
	Params     map[string]any
}

type InputRef struct {
	AssetID string
	URL     string
	Role    string
}

type Output struct {
	Kind       string
	SourceURL  string
	Data       []byte
	MimeType   string
	Width      int
	Height     int
	DurationMS int
}

type Result struct {
	Outputs []Output
	Usage   Usage
	Raw     []byte
}

type Progress struct {
	Percent   int
	Stage     string
	Estimated bool
}

type ProviderError struct {
	Code       string
	Message    string
	Retryable  bool
	HTTPStatus int
	Provider   string
}

type Provider interface {
	Name() string
	Supports(Capability) bool
}

type Synchronous interface {
	Provider
	Generate(ctx context.Context, req *Request, onProgress func(Progress)) (*Result, error)
}

type PollResult struct {
	State    string
	Progress Progress
	Result   *Result
	Err      *ProviderError
}

type Asynchronous interface {
	Provider
	Submit(ctx context.Context, req *Request) (jobRef string, err error)
	Poll(ctx context.Context, req *Request, jobRef string) (*PollResult, error)
	Cancel(ctx context.Context, jobRef string) error
}
```

**为什么区分两种接口而不是强行统一**：

- 图片厂商基本是"一次 HTTP 拿到结果"，硬套 submit/poll 会引入无意义的中间状态和额外的 result 存储。
- 视频厂商基本是"提交 + 轮询"，同步调用会占死 worker 且无法恢复。
- Manager 里做一次分支即可：

```go
if async, ok := provider.(adapter.Asynchronous); ok {
    // submit → 记录 job id → 定时 poll
} else {
    // 进入 sync 池执行 Generate
}
```

### 7.4 适配层流水线（6 个职责）

| 步骤 | 做什么 | 失败后果 |
|---|---|---|
| 1. 参数归一化 | 校验 Schema、就近取值、补充默认、合并负向词 | 厂商 400，浪费一次调用 |
| 2. 输入解析 | asset → 预签名 URL / base64；首尾帧角色映射 | 厂商拉不到图，任务失败 |
| 3. 调用 | 鉴权、超时、重试分类 | 任务失败或重复扣费 |
| 4. 进度换算 | 厂商阶段 → 统一百分比与 stage | 前端体验差 |
| 5. 结果回流 | 下载/解码 → 存储 → 资产元数据 | 历史裂图 |
| 6. 记账与错误映射 | usage、成本、统一错误码 | 无法定位与核算 |

**边界**：adapter 只负责"把厂商结果变成统一 Result"，不负责保存数据库。保存由 Manager 调用 storage 与 store 完成。

### 7.5 模型目录

`backend/configs/models.yaml`：

```yaml
models:
  - id: mock-image
    provider: mock-image
    display_name: 演示图片
    capabilities: [text_to_image, image_to_image]
    params:
      size:
        type: enum
        values: ["1024x1024", "1280x1280"]
        default: "1024x1024"
        label: 尺寸
      seed:
        type: int
        min: 0
        max: 4294967295
        default: 0
        label: 随机种子

  - id: mock-video
    provider: mock-video
    display_name: 演示视频
    capabilities: [text_to_video, image_to_video, video_to_video]
    params:
      duration:
        type: enum
        values: [3, 5]
        default: 3
        label: 时长（秒）
      mock_delay_ms:
        type: int
        min: 500
        max: 30000
        default: 3000
        label: 模拟耗时

  - id: glm-image
    provider: zhipu-image
    display_name: GLM-Image
    capabilities: [text_to_image]
    params:
      size:
        type: enum
        values: ["1280x1280", "1568x1056", "1056x1568"]
        default: "1280x1280"
        label: 尺寸
    cost:
      type: per_image
      unit_micros: 60000

  - id: cogvideox-3
    provider: zhipu-video
    display_name: CogVideoX-3
    capabilities: [text_to_video, image_to_video]
    params:
      size:
        type: enum
        values: ["1280x720", "1920x1080", "1080x1920", "3840x2160"]
        default: "1920x1080"
        label: 分辨率
      fps:
        type: enum
        values: [30, 60]
        default: 30
        label: 帧率
      quality:
        type: enum
        values: ["quality", "speed"]
        default: "quality"
        label: 质量模式
      with_audio:
        type: bool
        default: false
        label: 生成音频
    cost:
      type: per_second
      unit_micros: 200000
```

前端通过 `GET /api/v1/models?capability=text_to_image` 获取目录，用 `params` 动态渲染表单。新增模型只改 YAML。

### 7.6 参数归一化规则

| 场景 | 规则 |
|---|---|
| 不支持的尺寸 | 按面积最接近的枚举值替换，并在 `usage.warnings` 返回 |
| `n` 超上限 | 截断到上限 |
| 负向词不支持 | 合并为"避免出现：..."追加到正向词 |
| 时长不支持 | 就近取可选值（如 7s → 5s 或 10s） |
| 未知参数 | 丢弃并记录 warning，不报错 |
| 类型错误 | 返回 `INVALID_PARAM`，不猜测 |
| 输入数量不符 | i2v 必须恰好 1 张首帧（可选 1 张尾帧）；v2v 必须 1 段视频 |

### 7.7 输入资产处理

| provider 要求 | 方案 |
|---|---|
| 公网 URL | 生成 30 分钟有效的预签名 URL |
| base64 | 读取本地文件后编码；限制 10MB，超出改用 URL |
| provider 专用上传 | 适配层实现 `UploadInput`，缓存上传结果 |
| 首帧/尾帧 | `InputRef.Role` 用 `first_frame` / `last_frame`，适配层映射到厂商字段 |

**安全**：只允许把平台内 asset 转成 URL，不接受前端传任意 URL，防 SSRF。

### 7.8 输出回流

见 5.3 与第 12 章。适配层返回 `Output`（URL 或字节），Manager 负责下载、去重、落库。

### 7.9 统一错误码

| 统一码 | 含义 | 可重试 | 前端文案 |
|---|---|---|---|
| `INVALID_PARAM` | 参数非法 | 否 | 参数不合法，请调整 |
| `CONTENT_BLOCKED` | 内容审核拒绝 | 否 | 提示词未通过审核，请修改 |
| `PROVIDER_RATE_LIMITED` | 厂商限流 | 是 | 当前排队较多，稍后自动重试 |
| `PROVIDER_UNAVAILABLE` | 厂商 5xx/宕机 | 是 | 模型服务暂时不可用 |
| `PROVIDER_TIMEOUT` | 超时 | 是（有限次） | 生成超时，请重试 |
| `PROVIDER_AUTH` | key 无效/余额不足 | 否（告警） | 平台模型配置异常，请联系管理员 |
| `INPUT_INVALID` | 输入素材不可用 | 否 | 参考素材无效 |
| `TASK_TIMEOUT` | 平台侧超时 | 否 | 生成时间过长，已终止 |
| `ORPHANED` | 崩溃遗留 | 否 | 任务中断，请重试 |
| `INTERNAL` | 未分类 | 否 | 系统异常 |

### 7.10 限流、熔断、重试

- **限流**：每个 provider 一个令牌桶（如智谱 5 QPS，按账号配额配置）。超出时任务回到 queued 并延迟，不直接失败。
- **熔断**：连续 5 次 5xx/超时 → 打开 60 秒，期间新任务直接 `PROVIDER_UNAVAILABLE` 或转其他模型（默认不自动转，避免成本不可控）。
- **重试**：只重试 `Retryable` 且 `retry_count < MAX_RETRIES`；退避 5s、15s、45s。
- **禁止**：对 `CONTENT_BLOCKED`、`INVALID_PARAM`、`PROVIDER_AUTH` 重试。

### 7.11 Mock Adapter

必须具备三种能力：

1. **同步图片**：生成一张程序化 PNG（渐变 + 色块），支持 `mock_delay_ms`。
2. **异步视频**：`Submit` 返回带时间戳的 ref，`Poll` 按耗时推进进度，完成时返回图片作为占位。
3. **故障注入**：`params.mock_fail` 取 `timeout` / `rate_limited` / `content_blocked` / `provider_error`，用于验证重试与 UI。

价值：没有 key、CI、前端开发、压测、故障演练全部可用，且零成本。

### 7.12 智谱接入设计

**通用**

- Base URL：`https://open.bigmodel.cn/api/paas/v4`
- 鉴权：`Authorization: Bearer ${ZHIPU_API_KEY}`
- 所有请求带 `request_id`（平台任务 ID），便于厂商侧对账。
- HTTP 超时：提交 30s，轮询 15s，下载 90s。

**GLM-Image（文生图，同步）**

```
POST /images/generations
{
  "model": "glm-image",
  "prompt": "...",
  "size": "1280x1280"
}
```

响应解析：

- `data[0].url` 或 `data[0].b64_json`。
- 兼容 `error` 结构，映射 `1301`（内容审核）→ `CONTENT_BLOCKED`，`1302/429` → `PROVIDER_RATE_LIMITED`，`5xx` → `PROVIDER_UNAVAILABLE`。

适配层动作：

1. 归一化 `size` 到模型枚举。
2. 调用（同步）。
3. 进度伪造：10 → 60 → 90（估算）。
4. 返回 `Output{Kind:"image", SourceURL: url}`。
5. 记录 `usage`：张数、尺寸。

**CogVideoX-3（文生视频/图生视频，异步）**

```
POST /videos/generations
{
  "model": "cogvideox-3",
  "prompt": "...",
  "image_url": ["https://..."]      // i2v 时传首帧，可含尾帧
  "size": "1920x1080",
  "fps": 30,
  "quality": "quality",
  "with_audio": false
}
```

响应：`{ "id": "...", "request_id": "...", "task_status": "PROCESSING" }`

轮询：

```
GET /async-result/{id}
```

响应字段：`task_status`（`PROCESSING` / `SUCCESS` / `FAIL`）、`video_result`（含 `url`、`cover_image_url`）。

适配层动作：

1. `Submit` 返回 `id` 作为 `jobRef`。
2. `Poll` 解析状态，映射为 `processing / succeeded / failed`。
3. 进度：无真实百分比时按阶段估算（排队 10、生成 30→85、下载 90）。
4. 成功后返回 `Output{Kind:"video", SourceURL, MimeType:"video/mp4"}`，封面作为另一条 `Output`（role=thumbnail）。
5. `Cancel`：智谱是否支持取消以文档为准；不支持时返回"已请求"的语义，由平台标记取消。

**注意点**

- `image_url` 支持 URL 或 Base64；优先预签名 URL，避免大 body。
- 视频结果 URL 有效期短，必须立即回流。
- 4K 视频耗时与费用显著上升，默认限制 1080P，4K 只在白名单账号开放。
- 模型 ID 可能随账号权限变化，启动时用 `/models` 或配置校验，失败不影响服务启动，但会在 UI 隐藏不可用模型。

### 7.13 新增 provider 的 Checklist

1. 新建 `internal/adapter/<name>.go`，实现 `Synchronous` 或 `Asynchronous`。
2. 复用 `httpclient`（超时、重试、脱敏日志、request_id）。
3. 实现参数映射表，补充到归一化层。
4. 错误码映射到统一码。
5. 在 `models.yaml` 增加模型与参数 Schema。
6. 在 `registry` 注册 provider（取配置中的 key）。
7. 写 golden file 测试（录制一次真实响应）。
8. 用 Mock 注入失败，验证 retry 与 UI。
9. 更新能力矩阵与文档。

---

## 8. 异步任务系统

### 8.1 队列抽象

```go
type Job struct {
	TaskID string
	Phase  string // submit | poll | sync
}

type WorkerConfig struct {
	Submit int
	Poll   int
	Sync   int
}

type Queue interface {
	Enqueue(ctx context.Context, job Job) error
	EnqueueAfter(ctx context.Context, job Job, delay time.Duration) error
	Start(ctx context.Context, cfg WorkerConfig, handler func(context.Context, Job) error) error
	Shutdown(ctx context.Context) error
}
```

- `memqueue`：三个带缓冲 channel，`EnqueueAfter` 用 `time.AfterFunc`。
- `asynqqueue`：`Enqueue` / `EnqueueIn`，`Server.Concurrency` 映射为 `WorkerConfig` 总量；按 `task type` 区分 submit/poll/sync。

### 8.2 内存队列实现要点

| 要点 | 说明 |
|---|---|
| 不丢任务 | 入队只负责唤醒；DB 是事实源，对账会补投 |
| 缓冲满 | 不阻塞 HTTP 请求，转异步投递；仍失败则靠对账 |
| 关闭 | 不 close channel（防 panic），用 `ctx.Done()` 退出 |
| 延迟 | `EnqueueAfter` 基于 `time.AfterFunc`；进程退出会丢，由 `next_run_at` 对账恢复 |
| 幂等 | 允许重复投递，由 claim 拦截 |

### 8.3 三类 worker

| 池 | 处理 | 并发默认 | 超时 | 说明 |
|---|---|---|---|---|
| submit | 认领 → 异步提交 → 写 job id | 4 | 45s | 快请求 |
| poll | 查询状态 → 进度/终态 | 8 | 30s | 快请求，频率随耗时衰减 |
| sync | 同步 provider 生成 | 2 | 5~30min | 长阻塞，独立池 |

### 8.4 执行时序（异步 provider）

```
t0  POST /tasks                  → 202, status=queued, next_run_at=now
t0  queue.Enqueue(submit)
t1  worker: claim                 → running, phase=submit
t2  adapter.Submit                → provider_job_id
t3  MarkSubmitted                 → phase=poll, progress=10, next_run_at=t3+1s
t4  queue.EnqueueAfter(poll, 1s)
t5  poll: adapter.Poll            → processing 45%, next_run_at=t5+3s
t6  poll: adapter.Poll            → SUCCESS
t7  下载 2 个产物 → assets 落库
t8  FinishTask(succeeded) + 事件落库 + SSE 广播
```

### 8.5 幂等（三层）

1. **请求层**：`idempotency_key` 唯一索引；重复 POST 返回已有任务。
2. **执行层**：claim 条件更新；重复投递只有一个 worker 成功。
3. **终态层**：所有终态写入带 `status='running'` 条件；重复写只有一次生效。

### 8.6 重试策略

| 错误类型 | 策略 | 退避 |
|---|---|---|
| 网络超时 / 429 / 5xx | 重试，最多 `MAX_RETRIES` 次 | 5s / 15s / 45s |
| 参数错误 / 审核拒绝 / 鉴权 | 不重试 | - |
| 平台超时 | 不重试 | - |
| 用户取消 | 不重试 | - |

重试实现：`RequeueTask` 把状态改回 `queued`，`retry_count+1`，`next_run_at=now+backoff`，再入 submit 队列。**重试是重新提交厂商任务，可能产生二次费用**，前端文案需明确。

### 8.7 超时

- 任务最大时长按能力区分：图片 5 分钟、视频 30 分钟。
- poll 时检查 `now - started_at > timeout` → `failed(TASK_TIMEOUT)`。
- 单次 HTTP 超时独立设置，避免把厂商慢响应误判为任务超时。

### 8.8 取消

```
POST /tasks/:id/cancel
  → status=queued? 直接 canceled，发 done
  → status=running?
      ├─ 有 job id 且 provider 支持取消 → Cancel → canceled
      ├─ 有 job id 但不支持 → 标记 cancel_requested，下一次 poll 时终结
      └─ 无 job id（sync 执行中） → 标记 canceled，结果到达后被终态条件拦掉
```

语义：用户看到"已取消"；厂商侧可能仍在跑并计费。前端文案必须写清楚，避免客诉。

### 8.9 恢复与对账

```
启动 Recover()
  1. 扫描 queued 且 next_run_at <= now → enqueue submit
  2. 扫描 running + phase=poll + job id → enqueue poll
  3. 扫描 running + phase=submit/execute + started_at < now-60s → failed(ORPHANED)
  4. 扫描 running 超过最大时长 → failed(TASK_TIMEOUT)

运行期 Reconcile（每 5s）
  1. ListReadySubmit → enqueue
  2. ListReadyPoll → enqueue
  3. 不处理终态
```

去重不靠内存，靠 claim。这保证了对账逻辑可以随意重复执行。

### 8.10 优雅退出

```
收到 SIGTERM
  1. /readyz 返回 503（Nginx 停止转发）
  2. http.Server.Shutdown（10s）
  3. queue.Shutdown（等待在途任务，最长 30s）
  4. 未完成任务保留 DB 状态，下次启动对账恢复
  5. 关闭 DB
```

不强制把 running 改回 queued，因为可能已调用厂商。交给 `ORPHANED` 规则处理。

### 8.11 迁移到 asynq 的映射

| 当前 | asynq |
|---|---|
| `memqueue.Enqueue(submit)` | `client.Enqueue(asynq.NewTask("task:submit", payload))` |
| `EnqueueAfter(poll, d)` | `client.EnqueueIn(d, ...)` |
| 三个 channel 池 | `Server` + `Use` 中间件 + `Concurrency` |
| `Reconcile` 补投 | 保留（作为兜底） |
| 失败重试 | asynq `MaxRetry` + `RetryDelayFunc` |

业务层只替换 `Queue` 实现与 `main` 装配，Manager 不改。

---

## 9. 实时推送（SSE）

### 9.1 事件协议

```
id: 12
event: progress
data: {"percent":45,"stage":"generating","estimated":true}

id: 13
event: asset
data: {"asset_id":"ast_...","kind":"image","url":"/files/..."}

id: 14
event: done
data: {"task_id":"tsk_...","status":"succeeded","result":{...}}
```

### 9.2 事件类型

| event | 时机 | 是否持久化 | 说明 |
|---|---|---|---|
| `snapshot` | 连接建立 | 否 | 当前任务 + 资产快照，`id=0` |
| `status` | 状态迁移 | 是 | queued/running/succeeded/failed/canceled |
| `progress` | 进度变化 | 是（节流） | 2 秒或 10% 才写一条 |
| `asset` | 单个产物落库 | 是 | 前端可立即渲染 |
| `error` | 失败 | 是 | 含 code/message/request_id |
| `done` | 终态 | 是 | 发完关闭连接 |
| `heartbeat` | 每 15s | 否 | 注释帧 `: ping` |

### 9.3 Hub 设计

```go
type Event struct {
	ID   int64
	Type string
	Data json.RawMessage
}

type Hub struct {
	mu   sync.RWMutex
	subs map[string]map[chan Event]struct{}
}
```

- 订阅：`Subscribe(taskID)` 返回 channel + cancel。
- 发布：非阻塞发送；缓冲满时丢弃 `progress`，保留 `status/done/error`。
- 终态塞不进：关闭该连接，让客户端重连并靠补发拿到终态。
- 订阅数指标：`sse_clients`。

### 9.4 补发

Handler 流程（顺序不能错）：

1. 解析 `Last-Event-ID`。
2. 查 `task_events WHERE task_id=? AND id > ?`。
3. 先写 snapshot（如果客户端没有历史）。
4. 再写补发事件。
5. 最后订阅实时事件（订阅前先记录当前最大事件 ID，避免窗口期丢失；或用"先订阅、再补发、按 ID 去重"）。

推荐实现：**先订阅，再补发，前端按事件 ID 去重**。这样不会丢窗口期事件，重复由前端幂等处理。

### 9.5 Handler 关键点

- Header：`Content-Type: text/event-stream`、`Cache-Control: no-cache`、`X-Accel-Buffering: no`。
- 每条事件 `c.Writer.Flush()`。
- 心跳用注释帧，不占事件 ID。
- 收到终态事件后主动关闭，避免连接泄漏。
- 客户端断开时取消订阅，防止 Hub 泄漏。

### 9.6 Nginx

```nginx
location /api/ {
    proxy_pass http://backend:8080;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 3600s;
    chunked_transfer_encoding on;
}
```

### 9.7 前端连接与降级

- 用 `fetch` + `ReadableStream` 解析，不用 `EventSource`（无法带自定义头/统一错误处理）。
- 连续 3 次连接失败 → 轮询 `GET /tasks/:id`，间隔 2 秒。
- `visibilitychange` 时重连。
- 终态到达后 abort 连接。
- 事件按 `id` 去重（补发与实时可能重叠）。

### 9.8 多实例演进

- Hub 保持在进程内。
- 新增 `EventBus` 接口：`Publish / Subscribe`。
- 阶段 5 实现 `RedisBus`：Manager 发布到 Redis 频道，各实例 Hub 订阅后本地广播。
- 事件仍以 DB 为事实源，Redis 只是加速。

---

## 10. API 契约

### 10.1 约定

| 项 | 约定 |
|---|---|
| 前缀 | `/api/v1` |
| 内容类型 | `application/json`；SSE 为 `text/event-stream` |
| 鉴权 | 阶段 1~2：Cookie `cid`（匿名）；阶段 3：`Authorization: Bearer` |
| 幂等 | 创建接口接受 `idempotency_key`，24 小时内有效 |
| 请求追踪 | 响应头 `X-Request-ID`，错误体也带 |
| 时间 | ISO 8601（UTC），前端本地化 |
| 分页 | 游标 `cursor`，不提供 offset |
| 错误 | HTTP 状态 + 统一错误体 |

错误体：

```json
{
  "error": {
    "code": "CONTENT_BLOCKED",
    "message": "提示词未通过内容审核",
    "request_id": "req_01H..."
  }
}
```

### 10.2 端点总表

| Method | Path | 说明 |
|---|---|---|
| GET | `/api/v1/models` | 模型目录（可按能力过滤） |
| POST | `/api/v1/tasks` | 创建任务，202 |
| GET | `/api/v1/tasks` | 列表（游标分页） |
| GET | `/api/v1/tasks/:id` | 详情（含资产） |
| GET | `/api/v1/tasks/:id/events` | SSE |
| POST | `/api/v1/tasks/:id/cancel` | 取消 |
| POST | `/api/v1/tasks/:id/retry` | 以原参数新建任务 |
| POST | `/api/v1/uploads` | 上传素材 |
| GET | `/healthz` | 进程存活 |
| GET | `/readyz` | 依赖就绪 |
| GET | `/metrics` | Prometheus（阶段 2 末） |

### 10.3 创建任务

请求：

```json
{
  "capability": "text_to_image",
  "model": "glm-image",
  "prompt": "一只穿宇航服的柴犬，赛博朋克街区，霓虹灯，电影感",
  "negative_prompt": "低质量，多余肢体",
  "inputs": [],
  "params": { "size": "1280x1280" },
  "idempotency_key": "01H..."
}
```

响应 `202`：

```json
{
  "task": {
    "id": "tsk_01H...",
    "status": "queued",
    "capability": "text_to_image",
    "model_id": "glm-image",
    "progress": 0,
    "created_at": "2026-11-01T00:00:00Z"
  },
  "events_url": "/api/v1/tasks/tsk_01H.../events"
}
```

### 10.4 查询与列表

`GET /tasks/:id` 返回 `{task, assets}`。

`GET /tasks?limit=20&cursor=<created_at>_<id>` 返回：

```json
{
  "items": [ { "id": "...", "status": "succeeded", "thumb": "..." } ],
  "next_cursor": "..."
}
```

### 10.5 SSE

`GET /api/v1/tasks/:id/events`，支持 `Last-Event-ID`。

### 10.6 模型目录

```json
{
  "models": [
    {
      "id": "cogvideox-3",
      "provider": "zhipu-video",
      "display_name": "CogVideoX-3",
      "capabilities": ["text_to_video", "image_to_video"],
      "available": true,
      "params": {
        "size": {
          "type": "enum",
          "values": ["1280x720", "1920x1080"],
          "default": "1920x1080",
          "label": "分辨率"
        }
      },
      "cost": { "type": "per_second", "unit_micros": 200000 }
    }
  ]
}
```

### 10.7 上传

`POST /api/v1/uploads`（multipart）：

- 字段 `file`，可选 `kind`（image/video）。
- 校验：magic bytes、大小、扩展名白名单。
- 返回 `{asset_id, url, width, height, mime_type}`。

生产环境改为预签名直传：`POST /uploads/presign` 返回 `upload_url` + `asset_id`，前端 PUT 后回调绑定。

### 10.8 取消与重试

- 取消：`204`；任务不存在 `404`；已终态 `409`。
- 重试：复制原参数创建新任务（新 `idempotency_key`），返回 `202`。

### 10.9 错误码表

| HTTP | code | 场景 |
|---|---|---|
| 400 | `INVALID_PARAM` | 参数/能力不匹配 |
| 401 | `UNAUTHORIZED` | 阶段 3 |
| 404 | `TASK_NOT_FOUND` | 任务不存在或不属于当前 client |
| 409 | `TASK_ALREADY_TERMINAL` | 取消已结束任务 |
| 413 | `FILE_TOO_LARGE` | 上传超限 |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | 文件类型不允许 |
| 429 | `RATE_LIMITED` | 平台限流 |
| 500 | `INTERNAL` | 未分类异常 |
| 502 | `PROVIDER_ERROR` | 厂商错误且不可重试 |

### 10.10 版本策略

- URL 带 `/v1`，破坏性变更升 `v2`。
- 响应只增字段、不删字段。
- 可选字段用 `omitempty`。
- 前端类型通过 `types.ts` 手动同步；阶段 2 引入 OpenAPI 生成。

---

## 11. 前端方案

### 11.1 页面与信息架构

界面借鉴 [DisyLab Canvas](https://github.com/TyaAsh/DisyLab-Canvas) 的无限画布，不复制它的源码。该仓库是专有软件。它把 API Key 放在 `sessionStorage`、用 Pages Functions 转发厂商请求；这两处不借鉴。密钥留在 Go 服务，节点生成只调用本方案的任务 API。

```
/            一张画布（@xyflow/react）
             ├─ 文本节点：提示词、模型、参数 schema
             ├─ 图片 / 视频节点：任务状态与结果
             ├─ 连线：上游 assetId 作为下一步输入
             └─ 侧栏：选中节点的参数与错误
/history     服务端任务列表（缩略图、状态、耗时、重试）
```

阶段 1 的画布只有文本节点和图片结果节点。IndexedDB 存布局和 `taskId`；刷新后任务状态从 `GET /tasks/:id` 恢复。阶段 2 再加 `/history` 和视频节点。

### 11.2 目录结构

```
src/
├── api/client.ts        # fetch 封装、错误归一
├── api/tasks.ts         # 任务相关接口
├── components/
│   ├── Button.tsx
│   ├── ProgressBar.tsx
│   ├── Select.tsx
│   └── EmptyState.tsx
├── features/generate/
│   ├── CapabilityTabs.tsx
│   ├── ModelPicker.tsx
│   ├── PromptEditor.tsx
│   ├── ParamPanel.tsx
│   ├── UploadDropzone.tsx
│   ├── TaskCard.tsx
│   └── ResultViewer.tsx
├── hooks/useTaskStreams.ts
├── stores/appStore.ts
├── pages/Studio.tsx
├── types/index.ts
└── main.tsx
```

### 11.3 Zustand 切片

```ts
type AppState = {
  models: ModelSpec[];
  tasks: Record<string, Task>;
  order: string[];
  studio: {
    capability: Capability;
    modelId: string;
    prompt: string;
    negative: string;
    params: Record<string, unknown>;
    inputAssets: Asset[];
  };
  submit: () => Promise<void>;
  upsertTask: (t: Task) => void;
  applyEvent: (taskId: string, e: StreamEvent) => void;
  cancel: (id: string) => Promise<void>;
  retry: (id: string) => Promise<void>;
};
```

规则：

- Zustand 只放任务和模型目录。节点坐标、连线由 React Flow 管，并写入 IndexedDB。
- `applyEvent` 按事件 ID 去重，再按 `taskId` 更新对应节点。
- 任务列表按 `created_at` 倒序，进行中置顶。
- 厂商密钥不进 `sessionStorage` 或 IndexedDB。

### 11.4 SSE Hook

```ts
export function useTaskStreams() {
  const tasks = useAppStore((s) => s.tasks);
  const applyEvent = useAppStore((s) => s.applyEvent);
  const connections = useRef(new Map<string, AbortController>());

  useEffect(() => {
    for (const task of Object.values(tasks)) {
      if (isTerminal(task.status) || connections.current.has(task.id)) continue;
      const ctrl = new AbortController();
      connections.current.set(task.id, ctrl);
      runTaskStream(task.id, ctrl.signal, applyEvent).finally(() => {
        connections.current.delete(task.id);
      });
    }
  }, [tasks, applyEvent]);
}
```

`runTaskStream` 内部：重连 3 次 → 降级轮询 → 终态退出。

### 11.5 组件职责

| 组件 | 职责 | 注意 |
|---|---|---|
| `CapabilityTabs` | 能力切换 | 切换时重置模型与参数，保留提示词 |
| `ModelPicker` | 模型卡片 | 显示"演示/真实"、"成本/张或/秒" |
| `PromptEditor` | 提示词 + 负向词 | 字数统计、示例模板、Ctrl+Enter 提交 |
| `ParamPanel` | Schema 渲染 | enum → Select；int → Slider；bool → Switch |
| `UploadDropzone` | 素材上传 | 拖拽、预览、类型与大小校验 |
| `TaskCard` | 状态卡 | 进度、阶段、取消、重试、错误码 |
| `ResultViewer` | 结果展示 | 图片灯箱；视频懒加载 + poster |

### 11.6 UI 状态机

```
idle → submitting → queued → running → succeeded
                        │         │
                        │         ├→ failed（可重试）
                        │         └→ canceled
                        └→ error（提交失败，展示 request_id）
```

- 提交即插入 `pending` 卡片（乐观 UI）。
- `queued` 超过 10 秒显示"排队中，前面还有 N 个"（阶段 2 可加队列位置接口）。
- `running` 显示阶段文案：提交中 / 生成中 / 下载中。
- `failed` 显示统一文案 + 展开详情（error_code、request_id）。

### 11.7 参数动态表单

根据 `ParamSpec.type` 渲染：

| type | 控件 | 校验 |
|---|---|---|
| `enum` | Select / Segmented | 必须在 values 内 |
| `int` / `float` | Slider + InputNumber | min/max |
| `bool` | Switch | - |
| `string` | Input | 长度 |

新增模型无需改前端。

### 11.8 上传与预览

- 本地预览用 `URL.createObjectURL`，提交后释放。
- 上传中显示进度与"取消"。
- 失败保留文件，允许重试。
- 视频素材显示首帧缩略图（浏览器生成或后端返回）。

### 11.9 视频播放

- 列表页只显示 poster，不自动加载视频。
- 点击后 `<video controls preload="metadata">`。
- 存储必须支持 Range 请求（本地静态服务与 OSS 均支持）。
- 视频封面缺失时用渐变占位。

### 11.10 错误与空状态

- 网络错误：Toast + 重试按钮。
- 审核拒绝：高亮提示词输入框，给改写建议。
- 空状态：展示 3 个可点击示例提示词，降低上手门槛。

### 11.11 性能与可访问性

- 图片列表用 `loading="lazy"`。
- 任务列表虚拟化（超过 50 条再考虑）。
- 所有交互有键盘可达性；进度条有 `aria-valuenow`。
- 深色主题 + 足够对比度。

---

## 12. 存储与资产

### 12.1 上传

**本地阶段**：

```
POST /api/v1/uploads (multipart)
  → 校验 magic bytes（image/jpeg、image/png、image/webp、video/mp4）
  → 大小限制：图片 20MB，视频 200MB
  → 生成随机 key：uploads/{client_id}/{yyyy}/{uuid}.{ext}
  → 写本地磁盘
  → assets 表落库（role=input）
```

**生产阶段**：

```
POST /uploads/presign → 返回 OSS 预签名 PUT + asset_id
前端直传 → 完成后回调 /uploads/:asset_id/complete
```

优点：不占后端带宽；缺点：多一步完成确认。

### 12.2 结果回流

```
Download(URL)
  → 校验 scheme=https、域名白名单、非内网
  → 流式写入临时文件
  → 校验大小上限（视频 2GB）
  → sha256
  → 移动到正式 key
  → 生成缩略图
  → assets 落库
```

失败处理：下载失败重试 2 次（指数退避）；仍失败则任务 `failed(ASSET_DOWNLOAD_FAILED)`，但保留 `provider_job_id` 以便人工补捞。

### 12.3 目录规范

```
data/assets/
├── uploads/{client_id}/{yyyy}/{uuid}.{ext}
└── tasks/{task_id}/{index}.{ext}
```

规则：

- key 不含用户输入的文件名，防路径穿越。
- 生产 OSS 前缀与本地一致，方便迁移。
- 资产 URL 由 `storage.Service` 生成，不硬编码域名。

### 12.4 签名与 CDN

- 桶保持私有。
- 前端展示用后端签名 URL（TTL 1 小时），或 CDN 回源 + 鉴权。
- 签名 URL 不写入 DB，运行时生成。
- 缩略图与视频封面单独 key，避免拉原图。

### 12.5 缩略图与转码

- 图片：生成 480px 宽缩略图。
- 视频：先用厂商返回的封面；无封面则后续上 `ffmpeg` worker 截帧。
- 转码不在阶段 1~2 范围；OSS 的视频处理或 CDN 转码可后置。

### 12.6 生命周期

- 匿名用户资产默认保留 30 天（可配）。
- 每日凌晨清理：无任务引用、超过保留期、软删除标记。
- 删除任务时先删资产再删记录，失败进入重试队列。

### 12.7 本地 → OSS 切换

`storage.Service` 接口：

```go
type Service interface {
	Save(ctx context.Context, key string, r io.Reader, contentType string) (*Object, error)
	Delete(ctx context.Context, key string) error
	URL(key string) string
}
```

- 本地实现写磁盘，`URL = baseURL + "/files/" + key`。
- OSS 实现写对象存储，`URL` 返回签名 URL 或 CDN 地址。
- 切换只改 `main` 装配。

---

## 13. 配置、安全与成本

### 13.1 配置项

```
APP_ENV=dev
HTTP_ADDR=:8080
DB_DRIVER=sqlite
DB_DSN=./data/app.db
QUEUE_DRIVER=memory
STORAGE_DRIVER=local
STORAGE_LOCAL_DIR=./data/assets
PUBLIC_BASE_URL=http://localhost:8080
MODELS_PATH=configs/models.yaml

WORKER_SUBMIT_CONCURRENCY=4
WORKER_POLL_CONCURRENCY=8
WORKER_SYNC_CONCURRENCY=2
MAX_RETRIES=2
IMAGE_TIMEOUT=5m
VIDEO_TIMEOUT=30m
DOWNLOAD_TIMEOUT=90s

PROVIDER_MOCK=true
ZHIPU_API_KEY=
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4
ALLOW_ORIGINS=http://localhost:5173
```

启动校验：

- 生产环境缺 `ZHIPU_API_KEY` 且 Mock 关闭 → 启动失败。
- worker 数必须 > 0。
- 存储目录必须可写。

### 13.2 密钥管理

- 只存环境变量 / 密钥管理服务，不入库、不入前端。
- 日志脱敏：`Authorization`、签名 URL 的 query、用户提示词按需截断。
- 密钥轮换：配置支持多 key（按 provider 数组），后续实现。

### 13.3 上传安全

- magic bytes 校验，不信任 `Content-Type`。
- 扩展名白名单，文件名不参与路径。
- 单文件大小与总配额限制。
- 图片解码校验（防伪造图片炸弹），设置最大像素。
- 视频只允许 mp4/webm（阶段 1）。

### 13.4 SSRF

- 输入素材只接受平台 asset，不接受任意 URL。
- 下载 provider 结果：只允许 https，拒绝 localhost、127.0.0.1、私有网段、非标准端口。
- 可配置域名白名单（智谱结果域名）。

### 13.5 限流与配额

| 层级 | 规则（默认） |
|---|---|
| IP | 60 请求/分钟 |
| client | 创建任务 5 次/分钟，并发 3 个 |
| client 日配额 | 图片 100 张、视频 20 条（阶段 2 可配置） |
| provider | 令牌桶，按账号 QPS |

超限返回 `429 RATE_LIMITED`，带 `Retry-After`。

### 13.6 内容合规

三层：

1. **前置**：提示词长度、敏感词/正则拦截（快速失败，不消耗额度）。
2. **厂商**：审核拒绝映射 `CONTENT_BLOCKED`。
3. **后置**：产物抽检（阶段 3+），违规标记与下架。

注意：国内上线涉及生成式 AI 相关合规要求，需评估备案与内容安全方案；本文档不构成法律意见。

### 13.7 成本

- 模型目录声明计价方式：`per_image` / `per_second` / `per_token`。
- 任务完成写入 `cost_micros`。
- 每日汇总：`sum(cost_micros) by model`，看板展示。
- 告警：日成本超过阈值、单任务成本异常（如 4K 视频）。
- 防刷：配额 + 限流 + 登录后才有高配额。

---

## 14. 可观测性

### 14.1 日志

统一字段：

```
time, level, service, request_id, client_id, task_id, provider, model, event, duration_ms, err
```

关键日志点：

- 任务创建、认领、提交成功、轮询状态、终结、失败分类。
- SSE 连接建立/断开、慢客户端丢弃。
- provider 请求耗时与状态码（脱敏）。

### 14.2 指标

| 指标 | 类型 | 标签 | 用途 |
|---|---|---|---|
| `task_total` | counter | capability, model, status | 成功率 |
| `task_duration_seconds` | histogram | capability, model | P50/P95 |
| `task_queue_depth` | gauge | phase | 积压 |
| `provider_requests_total` | counter | provider, code | 厂商健康 |
| `provider_latency_seconds` | histogram | provider, op | 厂商性能 |
| `asset_download_failures_total` | counter | provider | 回流健康 |
| `sse_clients` | gauge | - | 连接数 |
| `sse_dropped_total` | counter | reason | 慢客户端 |
| `cost_micros_total` | counter | model | 成本 |

### 14.3 追踪

- `request_id` 从 HTTP 入口贯穿到日志与错误体。
- 任务 ID 作为厂商请求的 `request_id`（若支持），便于跨系统对账。
- 阶段 5 可接 OpenTelemetry。

### 14.4 告警

| 条件 | 级别 | 动作 |
|---|---|---|
| 5 分钟内任务失败率 > 20% | P1 | 通知 |
| provider 连续 5 次 5xx | P1 | 熔断 + 通知 |
| 队列积压 > 100 且持续 2 分钟 | P2 | 通知 |
| SSE 连接数异常暴涨 | P2 | 排查 |
| 日成本超阈值 | P1 | 通知 + 限流 |

---

## 15. 测试与联调

### 15.1 测试金字塔

| 层 | 覆盖 | 工具 |
|---|---|---|
| 单元 | 参数归一化、错误映射、状态迁移 | `go test` |
| Store | 并发 claim、幂等、事件补发 | 临时 SQLite |
| Adapter | 请求构造、响应解析 | golden file / mock server |
| 集成 | HTTP + 队列 + SSE 全链路 | `httptest` + Mock provider |
| 前端 | SSE 降级、重试、表单 | Vitest + MSW（阶段 2） |
| E2E | 出图闭环 | Playwright（阶段 2 末） |

### 15.2 关键用例

1. **并发 claim**：20 goroutine 抢同一任务，仅 1 个返回成功。
2. **幂等创建**：同一 `idempotency_key` 并发 10 次，只产生 1 条任务。
3. **重复终结**：两次 `FinishTask`，第二次影响行数 0。
4. **恢复**：模拟 running+poll+job id，重启后继续轮询。
5. **孤儿**：running 无 job id 超 60s，标记 `ORPHANED`。
6. **SSE 补发**：断开后带 `Last-Event-ID` 重连，事件不重不漏。
7. **慢客户端**：进度事件丢弃，终态仍送达。
8. **厂商失败**：429 重试两次后成功；400 直接失败。
9. **审核拒绝**：`CONTENT_BLOCKED` 不重试。
10. **超时**：视频超过 30 分钟，`TASK_TIMEOUT`。

### 15.3 Mock 与录制回放

- 无 key 时全链路用 Mock。
- 真实响应脱敏后存 `testdata/*.json`，CI 用回放，避免联网与费用。
- Mock 支持故障注入参数。

### 15.4 故障注入

| 注入 | 预期 |
|---|---|
| 厂商 429 | 退避重试，前端显示"排队较多" |
| 厂商 5xx ×5 | 熔断，后续任务快速失败 |
| 下载 403 | 任务失败 `ASSET_DOWNLOAD_FAILED`，日志含 URL host |
| 队列不投递 | 对账在 5 秒内补投 |
| 进程 kill -9 | 重启后任务恢复或明确失败 |
| SSE 断网 10s | 重连补发，不丢终态 |

### 15.5 联调 Checklist

1. `make dev` 一条命令启动前后端。
2. 无 key 用 Mock 出图，3 秒内完成。
3. 配置智谱 key，`glm-image` 出真实图。
4. `cogvideox-3` 文生视频成功（≥5 秒）。
5. i2v 使用上传的首帧成功。
6. `curl -N /tasks/:id/events` 逐条收到事件。
7. 关浏览器再开，历史与图片仍在。
8. 同一 idempotency key 连点两次，只产生一条任务。
9. 取消排队任务立即生效；取消运行中任务状态一致。
10. 杀后端重启，running 任务恢复或明确失败。

### 15.6 压测

- 目标：单实例、4 submit + 8 poll 下，图片任务 P95 < 60 秒（不含厂商耗时）。
- 关注：队列积压、worker 利用率、DB 写放大、SSE 连接数。
- 视频并发限制：按 provider 配额设上限，超出排队。

---

## 16. 部署

### 16.1 拓扑

```
Internet
  │ HTTPS
  ▼
Nginx（TLS、静态资源、/api 反代、SSE 关闭缓冲）
  ├── /            → frontend/dist
  ├── /api/        → backend:8080
  └── /files/      → backend（本地阶段）或 OSS/CDN（生产）
  ▼
backend（单实例，Docker）
  ├── SQLite 或 MySQL
  ├── 内存队列 或 Redis/asynq
  └── 本地磁盘 或 OSS
```

### 16.2 Dockerfile（后端）

```dockerfile
FROM golang:1.24-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -o /out/server ./cmd/server

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
ENV TZ=Asia/Shanghai
COPY /out/server /server
COPY configs /configs
COPY migrations /migrations
EXPOSE 8080
ENTRYPOINT ["/server"]
```

注意：`modernc.org/sqlite` 是纯 Go 驱动，才能 `CGO_ENABLED=0`。

### 16.3 compose 要点

```yaml
services:
  backend:
    build: { context: ./backend, dockerfile: ../deploy/Dockerfile.backend }
    env_file: .env
    volumes: ["./data:/data"]
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8080/healthz"]
  nginx:
    image: nginx:1.27-alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./deploy/nginx.conf:/etc/nginx/conf.d/default.conf
      - ./frontend/dist:/usr/share/nginx/html
```

生产加 MySQL 与 Redis 服务；本地开发不需要。

### 16.4 Nginx 关键配置

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    location / {
        root /usr/share/nginx/html;
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8080;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_read_timeout 3600s;
    }

    location /files/ {
        proxy_pass http://backend:8080;
        proxy_set_header Range $http_range;
    }
}
```

### 16.5 HTTPS

- 证书：Let's Encrypt + certbot，或云厂商证书。
- 强制 HTTP → HTTPS。
- HSTS 视域名与备案情况开启。
- SSE 必须走 HTTPS 的同一域名，避免混合内容。

### 16.6 迁移与发布

- 本地：启动自动迁移。
- 生产：发布流程中执行迁移（独立命令），失败则中止发布。
- 多实例：迁移加 advisory lock，或只允许一个迁移 Job。
- 兼容策略：先加列/加表，再改代码，最后清理旧字段。

### 16.7 回滚

- 镜像保留最近 3 个版本。
- 数据库迁移只做向前兼容（新增不删改），回滚代码不回滚数据。
- 特性开关控制新 provider / 新能力。

### 16.8 备份

- SQLite：每日复制 `app.db`（WAL checkpoint 后）。
- MySQL：每日全量 + binlog。
- 资产：OSS 生命周期与跨区域备份（按预算）。
- 恢复演练：每季度一次。

---

## 17. 从 0 到 1 的落地路线

> 不给时间估算，只给顺序、产出与验收标准。每一步都可独立验证，避免"最后一起联调"。

### 阶段 0：基建

| # | 动作 | 产出 | 验收 |
|---|---|---|---|
| 0.1 | 建 monorepo、`go mod`、Vite 脚手架、Tailwind、Makefile | 能启动的空壳 | `make dev` 前后端都起来 |
| 0.2 | `pkg/logx`、`apierr`、中间件（request_id/recovery/cors） | 统一日志与错误体 | 任意 404 返回统一 JSON |
| 0.3 | 迁移目录 + 初始 4 张表 + 启动迁移 | 数据库文件生成 | 表结构与索引齐全 |
| 0.4 | `.env.example` + 配置强校验 + Mock 开关 | 配置可复现 | 缺 key 时明确报错/降级 |

### 阶段 1：MVP 单链路（出第一张图）

| # | 动作 | 产出 | 验收 |
|---|---|---|---|
| 1.1 | `model` 完成能力/状态/任务结构 | 领域模型 | 编译通过，常量完整 |
| 1.2 | `adapter` 契约 + Mock（同步图片） | 可注入延迟/失败 | 单测：Mock 返回 PNG 字节 |
| 1.3 | `storage` 本地实现 | 文件落盘 + URL | 上传/读取闭环 |
| 1.4 | `task` 内存队列 + 1 个 worker | 能消费一个任务 | 手动入队可执行 |
| 1.5 | `service.Create` 校验 + 落库 + 入队 | 创建任务 | 非法参数被拒 |
| 1.6 | `handler`：POST/GET 任务 + 统一错误 | REST 可用 | `curl` 创建并轮询到 succeeded |
| 1.7 | 前端画布：文本节点提交、轮询、结果写回图片节点 | 网页出图 | 无 key 也能看到 Mock 图；刷新后节点还在 |
| 1.8 | 接入真实 GLM-Image | 真实出图 | 配置 key 后出图，成本记录正确 |

**DoD**：刷新页面任务还在；错误可读；日志能按 request_id 串起来。

### 阶段 2：异步任务系统 + 多模型

| # | 动作 | 产出 | 验收 |
|---|---|---|---|
| 2.1 | 状态机硬化：claim/终态/取消/超时 | 原子迁移 | 20 并发 claim 仅 1 成功 |
| 2.2 | `Queue` 抽象 + 内存实现（延迟投递） | submit/poll/sync 三类池 | 延迟任务按时触发 |
| 2.3 | Manager 两阶段（submit → poll） | 异步链路 | Mock 视频走完两阶段 |
| 2.4 | 恢复与对账 | 启动恢复 | `kill -9` 后状态可解释 |
| 2.5 | Registry + models.yaml + `/models` | 目录驱动 | 前端不改代码切换模型 |
| 2.6 | 智谱视频适配（CogVideoX-3） | 真实视频链路 | t2v / i2v 成功 |
| 2.7 | 资产回流流水线 | 下载、去重、落库、封面 | 源 URL 失效后仍可访问 |
| 2.8 | 五种能力打通（i2i/v2v 先 Mock） | 能力矩阵 | 每种能力至少 1 条成功记录 |
| 2.9 | SSE：事件落库 + Hub + 补发 + 心跳 | 实时进度 | `curl -N` 完整事件序列 |
| 2.10 | 前端二期：模型选择、参数 Schema、上传、历史、取消/重试 | 完整体验 | SSE 降级轮询可用 |
| 2.11 | 指标 + 故障演练 | 可观测 | 注入 429/超时/审核拒绝均有预期表现 |
| 2.12 | Docker Compose 端到端 | 可部署 | `docker compose up` 本地全链路可用 |

**DoD**：

- 视频生成时图片任务不被阻塞。
- 同一 idempotency key 只产生一条任务。
- SSE 断线 10 秒重连不丢终态。
- 每个任务都有成本记录。
- 重启后无永久卡死任务。

### 阶段 3：用户与配额（概览）

- 匿名 `client_id` → 邮箱/OAuth 登录 + JWT + 刷新。
- 任务归属改为 `user_id`，数据迁移脚本。
- 配额、用量页、基础计费记录。
- SSE 改为按用户订阅（可选）。

### 阶段 4：Agent（概览）

- 单 Agent：提示词优化、参数建议、结构化输出。
- 工作流：编排器 + 工具（生成/放大/裁剪/拼接）。
- 数据表：`agent_runs`、`agent_steps`。
- 护栏：最大步数、预算、人工确认。

### 阶段 5：生产化（概览）

- MySQL + Redis/asynq + OSS。
- 多实例 + Redis Pub/Sub + 迁移锁。
- 监控告警、日志采集、成本看板。

### 阶段 6：上线（概览）

- 域名、HTTPS、备案（如需）。
- 压测、灰度、回滚预案。
- 内容安全与运营后台。

### 关键路径

```
阶段0 ──▶ 阶段1（Mock 出图）──▶ 阶段1（真实图）
                                   │
                                   ▼
                          阶段2（异步 + 视频 + SSE）
                                   │
                                   ▼
                          阶段3/4/5（用户/Agent/生产）
```

---

## 18. Agent 工作流设计（前瞻）

### 18.1 先单 Agent

`POST /agent/optimize`：

- 输入：原始提示词、能力、模型。
- 输出：`{prompt, negative_prompt, params, reasoning}`。
- 用 LLM 结构化输出（JSON Schema 校验）。
- 用户确认后创建任务；不直接扣费。
- 护栏：长度上限、敏感词、超时。

### 18.2 编排器-工作者

```
Orchestrator（规划）
  ├─ Step 1: 生成首图          → 创建一个任务
  ├─ Step 2: 放大              → 创建任务
  ├─ Step 3: 图生视频          → 创建任务（依赖 Step 1 产物）
  └─ Step 4: 拼接/配乐         → 后处理任务
```

- 每一步是一个子任务，复用现有任务系统。
- 编排器等待子任务终态（订阅事件或轮询）。
- 失败策略：重试、跳过、回滚到上一步。
- 预算：最大步数、最大成本、最大时长。

### 18.3 数据模型

```sql
CREATE TABLE agent_runs (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  goal TEXT NOT NULL,
  status TEXT NOT NULL,
  plan_json TEXT NOT NULL,
  budget_micros INTEGER NOT NULL,
  cost_micros INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  finished_at INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE agent_steps (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  kind TEXT NOT NULL,
  task_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  input_json TEXT NOT NULL,
  output_json TEXT,
  created_at INTEGER NOT NULL
);
```

### 18.4 与现有系统的关系

- Agent 只通过 `service.CreateTask` 与 `store` 交互，不绕过任务系统。
- 子任务事件通过 SSE 汇总为 `agent_step` 事件。
- 后处理工具（裁剪、拼接、配音）也建模为任务，类型为 `postprocess`。

### 18.5 护栏

- 最大步数（默认 6）、最大成本、最大时长。
- 高风险动作（发布、删除）需人工确认。
- 全链路可回放：每步输入输出落库。

---

## 19. 风险登记册

| 风险 | 概率 | 影响 | 缓解 | 触发信号 |
|---|---|---|---|---|
| 智谱模型不可用/限流 | 中 | 高 | 熔断 + 队列 + 文案 | provider 5xx 激增 |
| 视频结果 URL 过期 | 高 | 中 | 立即回流 | 历史裂图 |
| 长任务拖垮 worker | 中 | 高 | 三类池 + 超时 | 队列积压 |
| SSE 被代理缓冲 | 高 | 中 | Nginx 关缓冲 + 心跳 | 进度不实时 |
| SQLite 并发写瓶颈 | 中 | 中 | WAL + 短事务 + 小并发 | `database is locked` |
| 成本失控 | 中 | 高 | 配额 + 告警 | 日账单异常 |
| 审核拒绝率高 | 中 | 中 | 前置提示 + 改写引导 | `CONTENT_BLOCKED` 比例 |
| 崩溃导致重复扣费 | 低 | 中 | 幂等 + 孤儿标记 | 同参数重复任务 |
| 前端 SSE 连接耗尽 | 低 | 中 | 只连活跃任务 | 连接数异常 |
| 匿名数据被滥用 | 中 | 中 | 限流 + 配额 + 后续登录 | 单 IP 高频 |

---

## 20. 需要你拍板的事项

1. **智谱可用模型与配额**：账号下 `glm-image`、`cogvideox-3` 是否已开通？QPS 与并发上限是多少？
2. **图生图 / 视频生视频**：智谱若不支持，是否接第二家（可灵/通义万相/Replicate），还是先长期用 Mock？
3. **OSS 选型**：阿里云 OSS、腾讯云 COS、Cloudflare R2，哪个？
4. **部署与备案**：云服务器地域？是否需要国内备案？是否只用境外节点？
5. **视频规格上限**：默认 10 秒 / 1080P 是否够用？4K 是否开放？
6. **匿名数据保留期**：30 天是否合适？
7. **Agent 优先级**：阶段 4 是否要提前到阶段 3 之后立即做？

---

## 附录 A：环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `APP_ENV` | `dev` | dev / prod |
| `HTTP_ADDR` | `:8080` | 监听地址 |
| `DB_DRIVER` | `sqlite` | sqlite / mysql |
| `DB_DSN` | `./data/app.db` | 连接串 |
| `QUEUE_DRIVER` | `memory` | memory / asynq |
| `STORAGE_DRIVER` | `local` | local / oss |
| `STORAGE_LOCAL_DIR` | `./data/assets` | 本地资产目录 |
| `PUBLIC_BASE_URL` | `http://localhost:8080` | 资产 URL 前缀 |
| `MODELS_PATH` | `configs/models.yaml` | 模型目录 |
| `WORKER_SUBMIT_CONCURRENCY` | `4` | 提交并发 |
| `WORKER_POLL_CONCURRENCY` | `8` | 轮询并发 |
| `WORKER_SYNC_CONCURRENCY` | `2` | 同步生成并发 |
| `MAX_RETRIES` | `2` | 最大重试 |
| `IMAGE_TIMEOUT` | `5m` | 图片任务超时 |
| `VIDEO_TIMEOUT` | `30m` | 视频任务超时 |
| `DOWNLOAD_TIMEOUT` | `90s` | 结果下载超时 |
| `PROVIDER_MOCK` | `true` | 是否暴露 Mock 模型 |
| `ZHIPU_API_KEY` | 空 | 智谱密钥 |
| `ZHIPU_BASE_URL` | `https://open.bigmodel.cn/api/paas/v4` | 智谱 API |
| `ALLOW_ORIGINS` | `http://localhost:5173` | 开发跨域白名单 |

## 附录 B：错误码

| code | 含义 | HTTP | 可重试 |
|---|---|---|---|
| `INVALID_PARAM` | 参数非法 | 400 | 否 |
| `MODEL_NOT_FOUND` | 模型不存在/不可用 | 400 | 否 |
| `CAPABILITY_UNSUPPORTED` | 模型不支持该能力 | 400 | 否 |
| `INPUT_INVALID` | 输入素材无效 | 400 | 否 |
| `FILE_TOO_LARGE` | 文件超限 | 413 | 否 |
| `UNSUPPORTED_MEDIA_TYPE` | 文件类型不允许 | 415 | 否 |
| `RATE_LIMITED` | 平台限流 | 429 | 是（延迟） |
| `CONTENT_BLOCKED` | 审核拒绝 | 400 | 否 |
| `TASK_NOT_FOUND` | 任务不存在 | 404 | 否 |
| `TASK_ALREADY_TERMINAL` | 任务已结束 | 409 | 否 |
| `PROVIDER_RATE_LIMITED` | 厂商限流 | 502 | 是 |
| `PROVIDER_UNAVAILABLE` | 厂商不可用 | 502 | 是 |
| `PROVIDER_TIMEOUT` | 厂商超时 | 504 | 是 |
| `PROVIDER_AUTH` | 鉴权/余额问题 | 502 | 否 |
| `ASSET_DOWNLOAD_FAILED` | 产物下载失败 | 502 | 是（有限） |
| `TASK_TIMEOUT` | 平台超时 | 504 | 否 |
| `ORPHANED` | 崩溃遗留 | 500 | 否 |
| `INTERNAL` | 未分类 | 500 | 否 |

## 附录 C：术语

| 术语 | 含义 |
|---|---|
| Capability | 生成能力，五种之一 |
| Provider | 模型厂商的适配实现 |
| Model | 模型目录中的一条可选项 |
| Task | 一次生成请求的完整生命周期 |
| Phase | 任务执行阶段：submit / poll / sync |
| Claim | 原子认领，防止重复执行 |
| Reconcile | 对账，把到期未执行的任务重新入队 |
| Snapshot | SSE 连接建立时的当前状态 |
| Backfill | 断线后按事件 ID 补发 |
| est_progress | 估算进度标记 |

## 附录 D：参考资料

- 智谱开放平台文档：<https://docs.bigmodel.cn/>
- 图像生成 API：<https://docs.bigmodel.cn/api-reference/模型-api/图像生成>
- 视频生成（异步）API：<https://docs.bigmodel.cn/api-reference/模型-api/视频生成异步>
- 查询异步结果：<https://docs.bigmodel.cn/api-reference/模型-api/查询异步结果>
- CogVideoX-3 指南：<https://docs.bigmodel.cn/cn/guide/models/video-generation/cogvideox-3>
- GLM-Image 指南：<https://docs.bigmodel.cn/cn/guide/models/image-generation/glm-image>
