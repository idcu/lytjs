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

**N18 目标「3 个真实应用」进度：1/3**。剩余 2 个需后续批次（建议按
「路由看板」「数据表 + 异步数据」两种形态各建一个独立工程，各配行为判据）。

## 未完成（后续批次）

- 批次 2 剩余：N14 首次发布（需 D3 四前置）、N16 Vite 插件回仓、N18 三个真实应用、N20 i18n/a11y/主题、N21 DevTools 二选一、N15 的独立 `create-lyt` 包与客户端 vite 判据。
- 批次 3：N22 AOT、N23 ≤60 KB、N24 js-framework-benchmark 提交、N25 安全白皮书、N26 8.0.0 清理。
- N12 残留：`defineProps<T>()` 未做（需 TS 类型解析，正则假支持会静默产出错误 props）。

**批次 1 已收官**；批次 2 的 N14 需 owner 按 D3 四前置确认后才执行发布。
