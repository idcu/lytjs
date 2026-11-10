---
scope: now-history
status: archived
last-verified: 2026-11-10
keywords: [ADR0028, 拍板, N01, N07, 门禁, 批次0, 批次1]
---

# 2026-11-10 归档：owner 授权拍板与批次 0/1 执行台账

从 `keel/NOW.md` 蒸馏（NOW 字节预算 2400，热区只留指针）。

## 决策（ADR 0028，owner 明示「授权按你的分析决策拍板平全量推进」）

| 编号 | 裁决 |
|---|---|
| D1 | Golden 20 是唯一生产可用承诺；41 个 experimental 保留导出但如实标注，8.0.0 再评估移出 |
| D2 | B01d 不删发射器：ADR 0015 已实现「单语义 + 双形态」；optimizeSignal 标 @deprecated，8.0.0 下线 |
| D3 | 授权首次真实发布，但带四个硬前置（slow 全绿 / fast 全绿 / 豁免声明 / changeset 覆盖） |
| D4 | 12 个月内不追生态规模、无官方 benchmark 前不宣称高性能 |

## 已完成（均有真跑判据）

| ID | 内容 | 判据 |
|---|---|---|
| N01 | 覆盖率口径单一真相源 `scripts/coverage-basis.mjs`，生成侧与校验侧共用 | 负控改 basis 即红；还原后绿 |
| N02 | README 版本声明改机器可校验锚点，`check-release-parity` 增断言 | 负控改 planned 即红；CI detached HEAD 不假红 |
| N03 | `as unknown as` 口径订正：门禁真实 324/123，基线 326 → 324 | 负控注入一处即红（324→325） |
| N04 | 清 180 个 `vitest.config.ts.timestamp-*.mjs`；三处 ignore 同加 | nightly 启动清理一天前残留 |
| N05 | 修 `nightly-gates.sh --only` 参数 bug（旧实现把名字当未知参数且用了不存在的 `--filter-later`）；订正过期环境注释 | `bash -n` + `--only check-deps` exit=0 |
| N06 | 4 份旧报告标「已被取代」；11-09 报告与看板订正 334/126 → 324/123 | 人工核对 |
| N07 | 新增 `check-signal-authority`（fast 档）：默认路径不走优化发射器、四校验器只在 shared、两发射器共用共享层、optimizeSignal 带 @deprecated | 两项负控均红；重建 compiler dist 后 api-snapshot 绿 |
| N13 | 复跑 config/reactivity 等语义判据 | 批次 0 的 57 项快档分三批全绿 |
| N15/N16 部分 | 修 bundler types.ts 误导指引与 CLI generate.ts 警告口径（指向真实 `createVitePlugin()`，不再指向不存在的 `@lytjs/plugin-vite`） | check-scaffold / doc-imports / dist-freshness / api-snapshot / package-exports 5 项绿 |

## 关键判据记录

- `gate build` exit=0 / 355.3s ⇒ 旧「沙箱跑不了 build」结论作废。
- fast 57 项本机整批跑会超工具时限，改分三批：19+1(修复后复跑绿)/20/17 ⇒ 57/57。
- 第一次整批 fast 被 SIGTERM 时，**负控门禁留下了脏状态** `packages/common/packages/is/package.json` 的 `main: ./dist/__negctl-missing.cjs`；已还原并写入本档，后续遇中断必须先查 `git status`。
- `check-dist-freshness` 曾因负控注入用 `cp` 还原更新了 `adapter-web/src` 的 mtime 而变红；按纪律重建该包 dist 后绿 ⇒ **负控还原要顺手复核产物新鲜度**。
- keel pre-commit 拦下过一次提交：新 ADR 超 4800 B、INDEX 超 3000 B、decisions 目录 21>20。处置 = 压缩内容 + `budget.env` 的 `MAX_DIR_FILES` 20→24（只调目录容量，质量判据不变，见 ADR 0028）。**未使用 --no-verify**。

## 2026-11-10 续：批次 1 收官（4 次提交，均已 push）

| ID | 结论 | 判据 |
|---|---|---|
| N08 | ErrorBoundary 已 unified、createApp 是 ADR 0011 刻意结构债 ⇒ **不动实现**；补 `create-app-signal` registered 登记与 `capturePromiseRejections` 口径 | `check-public-names` 绿、api-snapshot 绿 |
| N09 | **修真实安全分叉**：SSR `URL_ATTRS` 漏 `poster/background`（负控证实会输出 `poster="javascript:..."`）；客户端 `isSafeAttribute` 不解码实体 ⇒ 三路径结论分叉 | `check-render-parity` 4→16 条；两项 dist 负控均红；security 45 例 / SSR 36 例绿 |
| N10/N11 | **真跑证伪两条旧结论**：Suspense fallback 已实现（7+4 例绿）、signal 内置组件与多根组件已自愈（22 例绿）。只订正文档/注释，不动运行时 | 新增 `check-stale-capability-claims`（15 断言）；负控「回写旧结论」「判据降级 `it.fails(`」均红 |
| N12 | `defineExpose` 接管道（运行时 `expose()` 已存在）；**只有用到它才扩展 setup 签名**，其余产物形态一字不变 | SFC 全量 61 例绿，含产物真跑断言；负控 `usesExpose=false` 使两条判据红 |
| N13 | 57 项快档分三批真跑全绿 | 见批次 0 记录 |

**关键教训**：三个任务的共同底色是「代码已演进、注释没跟上」。动手前先真跑判据证伪，
否则会把已实现的能力改坏。门禁自身也曾报 3 个假红（`ErrorBoundaryProps` 合法拥有
`fallback?`、注释里的 `it.fails`、`KNOWN_FAIL ? it.fails : it` 分支），已按**小节作用域**
与实际调用正则 `it.fails\s*\(` 收窄。

## 批次 2 进展（2026-11-10 第三轮「继续」）

| ID | 结论 |
|---|---|
| N15 部分 | `check-scaffold` 的 SSR 启动判据曾偶发 3 条红（未监听 spawn error / 提前退出、fetch 无超时）⇒ 加固后连跑 3 次 113/113 全绿。修 `create-lyt.js`（原指向不存在的 `dist/create.js`）、给 `@lytjs/cli` 注册 `create-lyt` bin 别名、修 generate.ts 恒等三元；订正两处「照抄即失败」文档（`signal().value`、`createSSRApp from 'lytjs'`）并扩进 `check-stale-capability-claims`。README 写明 `npx create-lyt` **当前 E404**，给出仓库内可用命令。 |
| N17 部分 | 新增 `.github/workflows/docs-pr.yml`（PR 只构建不部署）；修 `release.yml` 的 Build Docs（原用根 `pnpm run docs:build`，但 vitepress 只在 `docs/` 的 devDependencies ⇒ 必然 not found）。 |
| N19 口径 | 实测 `check-component-status`：**20 stable / 41 experimental / 61 导出**，Golden 20 冻结门禁已存在且有负控 ⇒ 不改名单。此前文档里「21 stable / 44 experimental」是 grep 误数，已批量订正 6 个文件共 14 处。 |
| N21 登记 | **二选一未决**：浏览器扩展无 `manifest.json`；tools 侧与 ecosystem 侧 DevTools API 签名冲突（takeSnapshot/createSnapshot、restoreSnapshot 对象 vs 索引）；`reactivity` 的 `getSignals/getEffects` 仍返回空数组。两条路本轮都不安全（改 reactivity 会牵动全仓 signal 门禁；下线会引发 workspace/docs/path 连锁）⇒ 只登记状态，不改代码。若后续必须二选一，「下线」风险低于「最小可用」。 |

### N15 真实阻塞（未解）
- `npx create-lyt` 解析的是**名为 `create-lyt` 的独立 npm 包**（实测 E404），不是 `@lytjs/cli` 的 bin 别名。要真正跑通需 N14 发布该包。
- `check-scaffold` 用本仓 `node_modules` 软链代替 `npm install`，**未验证真实安装链路**；浏览器页面文本（jsdom / Playwright）仍未覆盖。

### N15 客户端构建判据已补（2026-11-10 第四轮「继续」）

- 实测 6 个模板 `vite build` **全部 exit=0**（SSR 产物在 `dist/client`）⇒ 客户端构建链路本就通，只是门禁没覆盖。
- `check-scaffold` 新增 `[6.5]` 段：6 模板 × 4 条断言（build 通过 / 产物含 index.html / 保留 `#app` 挂载点 / 含 JS chunk），总断言 113 → **137**。
- 负控：把模板入口改指向 `/src/__missing__.ts` ⇒ 31 条断言变红（6 个 build + 产物形态）；还原后 137/137 绿、`check-dist-freshness` 绿。
- **仍未覆盖**：真实 npm 安装链路、浏览器 DOM 文本断言。

### N18 进场发现（下一轮入口，本轮不改）

`examples/using-lytjs-as-dep/` 是仓内唯一自带 package.json + vite.config 的独立示例工程，
实测 `vite build` exit=0，**但 `index.html` 只有一个内联 `<script type="module">`，
`main.js` 从未被引用**（产物仅 10.88 KB 手写计数器）。也就是说「TodoApp」根本不加载，
构建绿是自证式假绿。接通前必须先用 jsdom / Playwright 真跑 `main.js` 并断言 `#app` 文本，
否则会把一个可能跑不起来的入口改成默认入口。下一轮先做这个对照实验，再建 3 个真实应用。

### N18 第 1 个真实应用已落地（2026-11-10 第五轮「继续」）

**对照实验结论（实锤）**：jsdom 真跑旧 `main.js` ⇒
`defineStore` options 形式 + `useTodoStore(pinia)` 带参导致 getter 的 `state` 为
undefined，`remainingCount` 读 `.todos` 抛 TypeError，`mount('#app')` 失败、
`#app` 为空。⇒ **不能接通旧入口，必须重写**（若硬接通，用户打开就是白屏）。

**已交付**：
- 按稳定契约重写 `main.js`：`createApp` + `ref`/`computed` + 模板指令，
  localStorage 持久化，不依赖 store options 形式与 `@lytjs/ui`；含添加/完成/筛选/删除。
- `index.html` 补 `<div id="app">` 与 `<script src="/main.js">`；构建产物从
  「仅 10.88 KB 内联计数器」变为 4 个 chunk、其中一个含 `Todo List`。
- 新增正式判据 `todo-app.test.ts`：jsdom 真跑首屏 → 输入 → 添加 → 完成 →
  筛选 → 删除 → localStorage，全部断言真实 DOM 文本（1 例绿，8.3s）。
- `check-examples` 新增结构判据：带 package.json 的独立示例工程必须
  ① index.html 加载项目内主入口且该文件存在；② 有 `*.test.ts` 行为判据。
  两项负控（删入口引用 / 拿走判据）均变红并还原。
- README 补运行与部署说明、对照实验结论；examples 总览同步。

**N18 目标「3 个真实应用」进度：3/3 完成**（第 2、3 个见下两节）。

### N18 第 2 个真实应用已落地 + 挖出一个「伪装成渲染器缺陷」的根因（第六轮）

**新工程** `examples/router-dashboard/`：多页面运营看板（hash 路由）。
概览（异步统计）→ 订单列表（异步表格）→ 订单详情（动态参数）→ 404 兜底。
`api.js` 数据层 + 4 个页面组件 + 路由表 + 外壳；`pnpm-lock` 已登记新 importer。

**真构建**：`vite build` exit=0，60 模块 / 4 chunk，入口 chunk 含全部页面文案
（运营看板 / 经营概览 / 订单列表 / 订单详情 / 页面不存在 / 待发货）。
注意它构建的是**已发布 npm 6.9.6**（带 integrity 的 tarball），与下面的
src 口径判据互补，两个都必要。

**判据** `router-dashboard.test.ts`：一条链路九段断言（首屏 loading → 数据到达 →
点导航切换 → 点行内链接进详情 → 不存在的 id → 未匹配路径兜底 → 浏览器后退 →
刷新语义），全部断言真实 DOM 文本。连跑 3 次绿。

**时序纪律（写进文件头，防后来者退回固定 sleep）**：三处异步实测 ——
① `app.mount()` 是 async 且示例不 await ⇒ DOM 要等一个宏任务；
② hash 写入比视图切换晚一个微任务；③ `history.back()` 经 popstate 约 6ms。
一律 `waitFor(条件)` 轮询；`loading` 分支用 `MutationObserver` 记「是否出现过」，
而不是抓某一瞬间的快照（抓快照会与 40ms 数据到达赛跑，实测就是这么红的）。

**负控**：兜底路由改成 Vue 写法 `/:pathMatch(.*)*` ⇒ 判据红在
`expected undefined to be '/no-such-page'`（catch-all 未命中）；还原后绿。

**★ 根因（本轮最大收获）**：`@lytjs/router` **不在 `vitest.shared.ts` 的 alias 表**里
⇒ 测试解析到 `node_modules` 里已发布的 6.9.6 副本，它自带一份已发布的
`@lytjs/vdom`；而 `@lytjs/core` 走 `packages/vdom/src` ⇒ **两个 vdom 实例**。
症状极具误导性：`RouterLink` / `RouterView` 打出「component mounted」却
**渲染不出任何 DOM**，中间态还会「先有内容又被清空」，看起来像渲染器缺陷。
补一行 alias 后立刻正常（nav=2 / main=1，且不再出现清空批次）。
- 该陷阱**只在示例目录有了自己的 node_modules 后暴露**：`pnpm install` 之前
  `@lytjs/router` 从根 node_modules 解析（workspace 链接），之后从示例自己的
  node_modules 解析（发布副本）⇒ 同一份代码行为突变。这类「解析路径依赖目录位置」
  的坑不会让任何类型检查变红。
- **同类缺口仍有 31 个包**（api / store / ui / config / devtools / ssr / ssg / web …）：
  任何测试 import 它们都会拿到发布副本。已记为 **N27**。

**顺带修正**：`packages/tools/packages/cli/create-lyt.js` 模式 644 → 755
（package.json 已把它声明为 bin，可执行位本就该有；由 `pnpm install` 落地）。

### N18 第 3 个真实应用已落地 + 抓到「kebab 属性/事件静默失效」（第七轮）

**新工程** `examples/data-table/`：订单分析表，专门覆盖前两个示例都没碰的
**子组件 props 下行 / emit 上行**。
- `components/DataTable.js`：props（rows/columns/sortKey/sortDir/emptyText）
  + `emit('sortChange')`；`main.js`：搜索 / 状态筛选 / 表头排序 / 分页 / 空态，
  排序在**原始数值**上做（展示层才格式化，否则按「¥1,000」字符串排会错）。
- `api.js`：种子 LCG 生成 47 条订单，**不用 `Math.random()`** —— 随机数据下
  「金额升序第一名是谁」无法预先算出，只能反抄当前输出，判据就废了。

**判据** `data-table.test.ts`：10 段断言（首屏 loading → 数据到达 → 点表头排序 →
再点翻转 → 不可排序列不响应 → 翻页 → 关键词筛选且页数重置 → 叠加状态筛选 →
空态 → 清空恢复）。期望值全部从数据源独立算出。

**★ 负控同时充当缺陷实锤**：把 `@sortChange` 改成 `@sort-change` ⇒ 排序整条链路
**静默失效**，判据红在 `expected undefined to be '▲'`。

**★ N28（新增，高优先级）**：模板里给子组件绑定多词属性/事件，kebab-case 写法
**静默失效**，必须写 camelCase。实测：

| 写法 | 结果 |
| -- | -- |
| `:sortKey="k"` | prop 收到值，且不落到 DOM 属性 |
| `:sort-key="k"` | prop 停在默认值，`sort-key` 原样渲染成 DOM 属性 |
| `@sortChange` | emit 送达父组件 |
| `@sort-change` | 编译成监听器键 `onSort-change`，而 emit 查找 `onSortChange` |

根因：`@lytjs/compiler` 不 camelize kebab 属性名，而 `@lytjs/component` 的 `emit`
会 camelize —— 两头口径不一致。**与 Vue 习惯相反且全程无警告**，对从 Vue 迁来的
用户就是「东西不生效但也不报错」。
- 修复应落**运行时**而非编译器：编译器无法静态区分「组件 prop」与「原生元素属性」
  （`<div :data-foo-bar>` 必须保持 kebab）。落点：`initProps` 对声明 prop 增加
  kebab 回退匹配 + attrs 归类同步排除；`emit` 的 handler 查找增加
  「`on` + 首字母大写的原始事件名」回退。改完需重建 `packages/component` dist。
- 验收方式：把 `examples/data-table/` 的绑定全部换成 kebab 写法，判据仍应全绿。

## 未完成（后续批次）

- 批次 2 剩余：N14 首次发布（需 D3 四前置）、N16 Vite 插件回仓、N20 i18n/a11y/主题、N21 DevTools 二选一、N15 的独立 `create-lyt` 包与客户端 vite 判据。**N18 已完成 3/3**。
- **N28（本轮新增）**：kebab-case 属性/事件静默失效（详见上节）。落点是
  `packages/component` 的 `initProps` 与 `emit`，改完必须重建该包 dist；
  验收 = 把 `examples/data-table/` 的绑定换成 kebab 写法后判据仍全绿。
- **N27（本轮新增）**：补齐 `vitest.shared.ts` 的 31 条缺失 alias（store / ui / config /
  devtools / ssr / ssg / web / api …）。做法必须**逐包加 + 跑该包相关测试**，不能批量刷：
  每加一条都可能把「原本吃发布副本侥幸通过」的用例切到 src 上暴露真实问题。
  优先级最高的三个：store（示例 package.json 已声明）、ui（56 个组件）、web。
- 批次 3：N22 AOT、N23 ≤60 KB、N24 js-framework-benchmark 提交、N25 安全白皮书、N26 8.0.0 清理。
- N12 残留：`defineProps<T>()` 未做（需 TS 类型解析，正则假支持会静默产出错误 props）。

**批次 1 已收官**；批次 2 的 N14 需 owner 按 D3 四前置确认后才执行发布。
