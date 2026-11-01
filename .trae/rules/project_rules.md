# Mirror Flow 工程规范（Agent 必须遵守）

本文件是本项目的唯一编码规范来源。生成或修改代码前先读这一份，冲突时以本文件为准。

## 0. 技术栈事实

- 前端 `web/`：React 19 + Vite + TypeScript + TailwindCSS v4 + Zustand。
- Tailwind 的接入点只有两处：`web/src/index.css` 的 `@import 'tailwindcss'`，以及 `web/vite.config.ts` 的 `@tailwindcss/vite` 插件。Tailwind 是 CSS 工具库，不自带 Button/Select 等组件。
- 项目未引入 shadcn/ui、Ant Design、Radix 等组件库。基础组件放在 `web/src/components/ui/`，由项目自己维护。
- 后端 `server/`：Go + Gin，分层见第 4 节。

## 1. 目录与依赖方向

```text
web/src/
├── api/          HTTP / SSE 封装，唯一允许 fetch 的地方
├── lib/          无状态工具（cn 等）
├── types/        与后端契约对齐的类型
├── stores/       Zustand 状态
├── hooks/        useXxx 组合逻辑
├── components/
│   ├── ui/       通用基础组件（Button / Icon / Select ...）
│   ├── canvas/   画布域组件
│   └── layout/   布局组件
└── pages/        页面组装
```

禁止：页面或业务组件直接 `fetch`；`components/ui` 反向 import 业务组件；跨域组件互相引用内部实现。

## 2. 文件与组件

- **单文件硬上限 300 行**（含 import 和注释），建议控制在 150 行左右；接近 300 行必须先拆分。
- 一个文件一个主导出组件；组件一律命名导出，不用 default。
- 同一段 JSX 或同一组样式出现 **3 次及以上**，必须抽到 `components/ui/` 或对应域的公共组件。
- 只被一处使用、且不足 20 行的内容不提前抽象，避免过度设计。
- Props 必须显式声明 `interface`，禁止 `any`、`@ts-ignore`、类型断言绕过错误。
- 组件只做展示与交互；数据请求、轮询、SSE 放 `hooks/`，全局状态放 `stores/`。
- 可交互元素必须有可访问名称（可见文本或 `aria-label`）和键盘焦点可见态。

## 3. 样式

- 只用 `src/index.css` 中 `@theme` 定义的颜色（`canvas` / `surface` / `line` / `ink` / `muted` / `accent` 等），禁止在组件里新写十六进制色值。
- 类名合并统一用 `lib/cn.ts`，不要手写字符串拼接或三元表达式堆叠。
- 按钮、图标按钮、标签等复用组件优先用 `components/ui/Button`，不要复制粘贴按钮样式。
- 动态尺寸、霓虹光晕等一次性效果才用 arbitrary 语法（如 `shadow-[0_0_18px_rgba(...)]`）。
- 中文 UI 文案；不用 emoji。

## 4. 后端分层

```text
handler → service → { store, task, adapter, sse, storage }
task.Manager → adapter / storage / store / sse
```

- `adapter` 不 import `store`、`service`、`handler`；`store` 不 import `adapter`。
- 跨层只传 `internal/model` 的 DTO，不把数据库实体直接漏给 handler。
- 所有状态写入使用单条条件 `UPDATE`，禁止「先查再改」。
- 厂商 URL 必须先转存到平台存储再落库，数据库不存厂商临时 URL 作为最终产物。
- 新接口必须带 `X-Request-ID` 与统一错误体 `{code, message, request_id}`。
- P0/P1 未实现的能力返回明确的 `CAPABILITY_UNSUPPORTED` 或 `NOT_IMPLEMENTED`，不伪造成功。

## 5. 状态与数据真实性

- 任务进度以服务端为准，厂商不给百分比就不编造 0–100；前端不使用假进度条。
- 占位功能统一通过 `useUiStore.showNotice()` 提示「P0 骨架：xxx 尚未接入」。
- 前端类型在 `src/types` 定义，字段名与后端 JSON 一致（snake_case）。

## 6. 命名与提交

- 组件文件 `PascalCase.tsx`；hook `useXxx.ts`；store `useXxxStore.ts`；工具 `camelCase.ts`。
- 布尔变量以 `is/has/can/should` 开头；事件处理 `handleXxx`，props 回调 `onXxx`。
- 提交信息用 Conventional Commits：`feat:` / `fix:` / `refactor:` / `chore:` / `docs:`。
- 不提交 `server/data/`、`bin/`、`node_modules/`、`.env` 和任何密钥。

## 7. 完成标准

每次改动结束前必须全部通过，CI 以此为准：

```bash
cd web && npm run lint && npm run build
cd server && go vet ./... && go test ./...
```

- 涉及页面的改动要用浏览器实际打开确认渲染与交互，不能只看编译通过。
- 不新增无关注释、不主动创建 README 或额外文档。
