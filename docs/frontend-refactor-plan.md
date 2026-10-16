# 前端重构方案

> 状态：已实施（2026-10-16）。与原稿的差别：测试继续用共享的 `fetch` mock（没有引入 MSW），且已全部迁移为 TypeScript；UI 原子组件只落地了 `ConfirmDialog`，其余样式以 Tailwind 工具类内联在页面/组件里；401 统一在数据层处理（`api/client.ts` 清凭据 + `queries/notify.ts` 抑制多余 Toast）；确认框在支持的浏览器里用原生 `dialog.showModal`。
> 范围：`frontend/` 全量重构；后端接口契约不变。

## 1. 背景

当前前端是 React 18 + Vite 4 + Tailwind 3 的纯 JS 项目，业务代码约 1300 行，47 个测试全部通过。主要问题：

- `App.jsx`（353 行、14 个 `useState`）同时承担认证、列表请求与防竞态、搜索防抖、表单、详情、置顶、导出，组件间通过大量 `setXxx` props 耦合。
- 视图由 `isCreating` / `editingEntryId` / `viewingEntry` 三个变量隐式组合得出；没有 URL，浏览器后退会离开应用，刷新丢失详情页，编辑取消不提示直接丢稿。
- 重复实现：`parseEntryDate` 与日期格式化（`EntryList` / `EntryDetail` 各一份）、日记操作按钮组与置顶徽标、约 10 处 `if (error.status === 401)`、置顶后前端再排一次序（与后端 `order_by` 规则重复，存在不一致风险）。
- 交互依赖 `window.alert` / `window.confirm`；已安装 `@tailwindcss/typography` 但正文仍是纯文本。
- 工具链落后多个大版本（Vite 4、Vitest 0.34、ESLint 8 已 EOL、lucide-react 0.263、date-fns 2）。

## 2. 目标

1. 交互体验：路由（后退 / 刷新 / 链接）、Toast 与确认对话框、未保存草稿保护、Markdown 编辑与预览。
2. 视觉重设计：纸质手账风格，跟随系统的暗色模式并可手动切换。
3. 技术栈升级：React 19、Tailwind 4、TypeScript（strict）、TanStack Query、最新 Vite / Vitest / ESLint。
4. 结构可维护：页面、数据、UI 原子组件分层；单文件远低于 ESLint `max-lines` 阈值。

**非目标**：后端 API 改动、列表分页、离线 / PWA、多用户。

## 3. 目标技术栈

| 类别     | 选型                                     | 说明                                         |
| -------- | ---------------------------------------- | -------------------------------------------- |
| 框架     | React 19                                 |                                              |
| 构建     | Vite（最新）+ `@vitejs/plugin-react`     |                                              |
| 语言     | TypeScript strict                        | `tsc -b --noEmit` 纳入 CI                    |
| 路由     | React Router v7（data router 模式）      | 需要 `useBlocker` 实现草稿保护               |
| 数据     | TanStack Query v5                        | 取代手写 `fetchSeq` 防竞态与手动 refetch     |
| 样式     | Tailwind 4 + `@tailwindcss/typography`   | 设计变量写在 CSS `@theme` 中                 |
| Markdown | `react-markdown` + `remark-gfm`          | 不启用 `rehype-raw`，默认不渲染 HTML，防 XSS |
| Toast    | `sonner`                                 | 体积小、无需 Provider 嵌套                   |
| 确认框   | 自研 `ConfirmDialog`（原生 `<dialog>`）  | 返回 Promise 的 `useConfirm()`               |
| 图标     | lucide-react（最新）                     |                                              |
| 日期     | date-fns v4                              |                                              |
| 测试     | Vitest + Testing Library + coverage-v8   | 沿用共享 `fetch` mock；测试用例全部为 TypeScript |
| 规范     | ESLint 9 flat config + typescript-eslint | 保留 `max-lines` 600 警告 / 800 报错         |

## 4. 目录结构

```
frontend/src/
├── main.tsx                 # 挂载 QueryClientProvider、RouterProvider、Toaster
├── App.tsx                  # 组合 QueryClient / Theme / Confirm Provider 与路由
├── router.tsx               # 路由表 + RequireAuth 守卫
├── vite-env.d.ts
├── api/
│   ├── client.ts            # request / ApiError / 401 清凭据 / 时区参数
│   ├── auth.ts              # token 存取与过期解析
│   ├── entries.ts           # 日记接口（纯函数）
│   ├── todos.ts             # 待办接口（纯函数）
│   ├── types.ts             # 与 backend/models.py 对齐的类型
│   └── index.ts             # 统一导出
├── queries/                 # TanStack Query 封装
│   ├── client.ts            # QueryClient 默认配置（retry / staleTime）
│   ├── keys.ts              # query key 工厂
│   ├── notify.ts            # mutation 失败统一提示（401 抑制 Toast）
│   ├── entries.ts           # useEntries / useEntry / useEntryDates / 增删改置顶 mutation
│   └── todos.ts             # 待办 query / mutation
├── features/
│   ├── auth/LoginPage.tsx   # RequireAuth 守卫在 router.tsx
│   ├── entries/             # EntryListPage、EntryList、EntryDetailPage、EntryEditorPage、MarkdownView
│   ├── calendar/CalendarPanel.tsx
│   ├── todos/TodoPanel.tsx  # 列表 / 输入 / 内联编辑都在单文件内
│   └── theme/ThemeProvider.tsx
├── components/ui/ConfirmDialog.tsx   # 目前唯一的 UI 原子组件（其余样式走 Tailwind 工具类）
├── layouts/AppLayout.tsx    # 页头、侧栏、主区、移动端 FAB
├── lib/
│   ├── dates.ts             # parseEntryDate、formatEntryDate、toYmd
│   ├── markdown.ts          # 摘要用的去 Markdown 纯文本
│   ├── draft.ts             # 新建页草稿的本地存取
│   └── download.ts          # JSON 导出下载
├── styles/index.css         # Tailwind 入口 + @theme 设计变量
└── test/                    # setup、renderWithProviders、api / routes / markdown 测试
```

## 5. 路由设计

| 路径              | 页面               | 说明                                            |
| ----------------- | ------------------ | ----------------------------------------------- |
| `/login`          | 登录               | 已登录访问时重定向到 `/`                        |
| `/`               | 列表 + 日历 + 待办 | 筛选条件放在查询串：`?q=关键词&date=2026-10-16` |
| `/new`            | 新建日记           |                                                 |
| `/diary/:id`      | 日记详情           | 直接访问时通过 `GET /entries/{id}` 加载         |
| `/diary/:id/edit` | 编辑日记           |                                                 |
| `*`               | 404                |                                                 |

**约束**：前端路径**不能**以 `entries`、`todos`、`auth`、`health`、`docs`、`redoc`、`openapi.json` 开头。生产环境里，后端 SPA 兜底路由会把这些前缀交给 API 处理（`backend/main.py` 的 `_API_PREFIXES`）；开发环境里，Vite 代理也会转发 `/entries`、`/todos`、`/auth`。若详情页用 `/entries/:id`，刷新时拿到的是接口 401 JSON。因此详情页采用 `/diary/:id`，并在路由测试中加一条用例，防止以后有人改回去。

后续可选：把后端 API 统一迁到 `/api/*`，即可删掉 `_API_PREFIXES` 白名单和前端的这条约束。这一项涉及接口契约，不在本次范围内。

筛选条件放进 URL 后，刷新和后退都能保留筛选状态；首页的搜索框与日历组件直接读写查询串（`?q=` / `?date=`）。

## 6. 数据层设计

**API 客户端**

- `client.ts` 统一处理：附带 Bearer token、解析错误体为 `ApiError`、收到 401 时清除本地凭据（`clearAuth()` → `RequireAuth` 感知后重定向 `/login`）。
- mutation 失败提示统一走 `queries/notify.ts` 的 `notifyMutationError`：401 交给上面的登出流程，其余错误才弹 Toast，避免每个 mutation 各写一遍 401 判断。
- `withTimeZone` 保留在客户端层，由 `entries.ts` 统一附加，调用方无感知。

**Query key**

```ts
entryKeys = {
  all: ['entries'],
  list: (f: { q?: string; date?: string }) => ['entries', 'list', f],
  detail: (id: number) => ['entries', 'detail', id],
  dates: () => ['entries', 'dates'],
};
todoKeys = { all: ['todos'] };
```

**行为约定**

- 搜索输入 250ms 防抖后写入 URL，`useEntries(filter)` 自动按 key 请求；过期请求的结果由 TanStack Query 丢弃，替代 `lastFetchSeq`。
- 新建、编辑、删除成功后，让 `entries` 下所有缓存失效（`invalidateQueries`），其中包括日历标记日期。
- 置顶、待办的勾选 / 改名 / 删除采用乐观更新：`onMutate` 写缓存，`onError` 回滚并弹出 Toast，`onSettled` 失效重拉。置顶后的最终顺序以服务端返回为准；前端只在乐观阶段临时按「置顶优先、时间倒序」排序（`queries/entries.ts` 的 `sortEntries`），`onSettled` 重拉后即回到服务端顺序。
- 详情页优先用列表缓存作为 `initialData`，从列表点进去时不闪加载态。
- "清除已完成待办"仍是逐条 `DELETE`，改用 `Promise.allSettled`，部分失败时提示数量并重拉。

## 7. 视觉设计：纸质手账风格

**设计变量**（`@theme`，亮色 / 暗色两套）

| 变量             | 亮色                     | 暗色           |
| ---------------- | ------------------------ | -------------- |
| `--color-paper`  | 暖米白 `#faf7f0`         | 深墨 `#1c1a17` |
| `--color-card`   | 纸白 `#fffdf8`           | `#25221e`      |
| `--color-ink`    | 墨黑 `#2b2622`           | 米白 `#ece6da` |
| `--color-muted`  | 灰褐 `#8a8178`           | `#9c9387`      |
| `--color-accent` | 赭红 `#b5523b`（印章感） | `#d9745c`      |
| `--color-pin`    | 琥珀 `#c98a1b`           | `#e0a63a`      |
| `--color-rule`   | 浅横线 `#e8e1d3`         | `#3a352f`      |

- **字体**：标题用衬线（`'Noto Serif SC', 'Songti SC', 'STSong', serif`），正文保持系统无衬线以保证可读性。只用系统字体，不下载中文 Web 字体（单个字重就有数 MB）。
- **质感**：卡片用细边框和极浅投影，取代大阴影；编辑器背景可选横线纸纹（CSS `repeating-linear-gradient`，不用图片）；日期以"10 月 16 日 · 周五"形式作为卡片眉题；置顶用琥珀色角标，取代整圈边框。
- **暗色模式**：用 Tailwind 4 的 `@custom-variant dark` 加 `<html class="dark">` 切换。偏好有三种（system / light / dark），存在 `localStorage`。`index.html` 里放一段几行的内联脚本，在页面首次绘制前设置 class，避免闪烁。
- **动效**：只做视图切换淡入、按钮反馈；尊重 `prefers-reduced-motion`。
- **可访问性**：亮暗两套配色的正文对比度都不低于 WCAG AA（4.5:1）；所有图标按钮有 `aria-label`；对话框有焦点陷阱，Esc 可关闭（原生 `<dialog>` 自带）。

正式实施前，我会先做一个只含设计变量和 3–4 个核心组件的样式预览页，截图给你确认，再铺开到所有页面。

## 8. 交互改进

- **Markdown**
  - 编辑器分"编辑 / 预览"两个标签页，用 textarea，不引入重型富文本编辑器。工具栏只放加粗、标题、列表、引用、链接，作用是在光标处插入语法。
  - 详情页用 `react-markdown` 加 `prose` 样式渲染。旧的纯文本日记里，单个换行在 Markdown 中会被吞掉，所以要启用 `remark-breaks`，保证旧内容排版不变。
  - 列表卡片摘要先去掉 Markdown 标记，只显示前两行纯文本。
  - Markdown 相关代码按路由懒加载，不增加首屏体积。
- **草稿保护**：编辑页内容有改动时，路由跳转用 `useBlocker` 弹出确认框，关闭或刷新标签页用 `beforeunload` 提示。新建页的草稿自动存到 `localStorage`（防抖），重新进入时询问是否恢复。
- **反馈**：所有 `alert` 改为 Toast，所有 `confirm` 改为 `useConfirm()`。删除日记后弹出"已删除"提示，不做撤销，因为后端没有软删除。
- **快捷键**：编辑页 `Ctrl/⌘ + Enter` 保存，`Esc` 返回。
- **移动端**：FAB 保留；详情页操作按钮在小屏下收进底部操作栏。

## 9. 实施步骤

每一步一个独立提交，提交前必须通过 `scripts/ci-local.sh frontend`（lint、format、test、build）。

| 步骤 | 内容                                                                                                                       | 验收标准                                                |
| ---- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1    | 升级工具链：Vite、Vitest、ESLint 9 flat config、Prettier、jsdom、Testing Library                                           | 现有 47 个测试原样通过，lint 通过                       |
| 2    | 升级 React 19、Tailwind 4（`@tailwindcss/vite`，删 `tailwind.config.js` / `postcss.config.js`）、lucide-react、date-fns v4 | 界面与升级前一致（人工对比截图），测试通过              |
| 3    | 接入 TypeScript：`tsconfig`、`api/` 与 `lib/` 改 TS、类型定义；组件暂时允许 `.jsx` 与 `.tsx` 并存                          | `tsc` 通过                                              |
| 4    | 测试基础设施：`renderWithProviders` 与共享 `fetch` mock；把 `App.test.jsx` 按功能拆分                                          | 用例数不减少，覆盖原有场景                              |
| 5    | TanStack Query：`queries/`、全局 401 处理；拆掉 `App.jsx` 的数据逻辑                                                       | 删除 `lastFetchSeq` 和手动 refetch；测试通过            |
| 6    | 路由：`router.tsx`、`AppLayout`、页面组件；筛选条件进 URL；全部组件改为 `.tsx`                                             | 后退、刷新、直达 `/diary/:id` 均正常；新增路由测试      |
| 7    | UI 原子组件 + 设计变量 + 暗色模式；先出样式预览给你确认                                                                    | 你确认视觉方向                                          |
| 8    | 视觉铺开到全部页面                                                                                                         | 亮暗两套配色截图验收                                    |
| 9    | 交互：Toast、ConfirmDialog、Markdown 编辑与预览、草稿保护、快捷键                                                          | 对应测试补齐；无 `window.alert` / `window.confirm` 残留 |
| 10   | 收尾：更新 README 项目结构与前端说明、`.prettierignore`、清理废弃依赖、检查打包体积                                        | 首屏 JS（gzip）增长不超过 30%，Markdown 代码单独分包    |

第 1–6 步不改视觉，便于逐步回归；第 7 步之后才动外观。

## 10. 测试策略

- **单元测试**：`lib/` 下的纯函数（日期、Markdown 摘要、token 解析）。
- **查询逻辑**：`queries/` 的乐观更新与回滚、401 抑制提示目前由页面测试间接覆盖，尚未单测 hook 本身。
- **组件 / 页面测试**：用共享的 `fetch` mock 模拟后端，覆盖登录、列表筛选、新建、编辑、删除、置顶、导出、待办增删改、草稿拦截、Markdown 渲染（包括 `<script>` 不被执行的 XSS 用例）。
- **路由测试**：直达 `/diary/:id`；未登录访问时跳转 `/login`；前端路径与 API 前缀不冲突。
- 本次不引入 Playwright。若之后需要端到端冒烟测试，可单独加一个 CI job。

## 11. 风险与对策

| 风险                                                                                                 | 对策                                                                                  |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Tailwind 4 依赖较新的 CSS 特性，要求 Safari 16.4+、Chrome 111+、Firefox 128+，更老的浏览器样式会错乱 | 自用的个人应用，可以接受；在 README 注明浏览器要求                                    |
| 大版本同时升级，排查困难                                                                             | 升级拆成第 1、2 两步，每步测试全绿再继续                                              |
| 旧日记含 `#`、`*` 等字符，开启 Markdown 后显示变化                                                   | 启用 `remark-breaks` 保留换行；上线前抽样检查现有数据；必要时可增加"按纯文本显示"开关 |
| 打包体积增加（Router、Query、Markdown）                                                              | Markdown 相关懒加载；第 10 步检查体积                                                 |
| 重构期间测试大面积改写，可能漏掉旧行为                                                               | 第 4 步先迁测试、再改实现，用例数只增不减                                             |

## 12. 需同步更新的文件

- `README.md`：项目结构、前端技术栈、浏览器要求。
- `scripts/ci-local.sh`：`build` 前增加类型检查（或把 `build` 脚本改为 `tsc -b && vite build`）。
- `frontend/vite.config.*`：改为 TS，加入 `@tailwindcss/vite`；代理配置不变。
- `Dockerfile`：构建命令不变，确认 Node 22 满足新版 Vite 要求。
- `.env.example`：本次不新增环境变量，无需改动。
