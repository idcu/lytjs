---
scope: meta
status: active
last-verified: 2026-10-05
keywords: [宪法, 红线, 人审, 状态机, 验证纪律, 构建顺序]
---

# CONSTITUTION

> 这里不是"建议"，是**违反就打回**。
> 只放硬约束与人审关卡；其余规则一律在 INDEX.md 及其路由内。

## 身份

本项目是 **LytJS**——零外部依赖的现代 JavaScript 响应式框架（开发线 `v7.0.0-dev`，npm 线上 6.9.6）。
核心五件套 reactivity / vdom / compiler / renderer / component，加 UI（56 组件）与 ecosystem，共 76 包。

- 代码唯一真源：本仓根（分支 `v7.0.0-dev`）
- 上下文唯一真源：`keel/`（本目录）；`.workbuddy/` 为冻结存档、只读
- owner：huyu
- 品牌：LytJS

<!-- 这是全库唯一允许"写愿望"的地方；其余文档只写现状。 -->

## 硬约束（违反即打回）

1. **构建顺序唯一真源 = `scripts/build-order.ts`**：新增包 / 调整依赖必须过
   `pnpm check-build-order`；`common-vnode → vdom` 重建顺序不可倒置。
2. **全绿 ≠ 可用**：判"能跑"必须「compile → `new Function` → jsdom mount →
   断言真实 DOM 文本」；改门禁脚本必须注入缺陷验证它会红。
3. **dist/src 通道**：根 vitest 只把 `@lytjs/common-error` 指 src，其余读 dist；
   改 renderer / vdom / adapter-web / compiler 的 src 后必须重建对应包
   （`cd packages/<pkg> && ../../node_modules/.bin/tsup`）。
4. **文档 import 门禁是红的**：README / guide / examples 里 `from '@lytjs/*'`
   的具名导入必须在实际导出面存在（`scripts/check-doc-imports.ts`）；
   欠账走棘轮白名单且登记原因，不得随手加白名单逃避。
5. **单写回**：上下文写回只进 `keel/NOW.md`；`.workbuddy/` 冻结只读
   （迁移期例外见 NOW 的阻塞表）。
6. **不动上游判据**：`keel/checks/*` 与 keel 上游保持逐字一致；本地临时补丁
   必须登记在 NOW 例外表，上游修复发版后同步移除。
7. **跨层转发必须沿整条链核实**：新增回调 / 字段要从入口改到最底层
   （`core → adapter-web → vdom` 的 extraOptions 链），禁止只改一端；
   同族副本按**被调用点**搜，不按函数名搜（坑 `forwarding-chain-drops-options`）。
8. **核实必须打到被验证对象**：判 API 本体用**运行时导出面探针**（`await import(dist)` +
   `Object.keys()`），核实依赖用**精确匹配**（`from 'X'` / `import('X')`），
   验证器必须**真跑一次命令**——grep 命中、`--dry`、`--list` 都只是线索，不是结论。

<!-- 每条都得是"能被判死"的：写不出检查方式的，不是硬约束，是愿望。 -->

## 人审关卡（AI 不得自行决定）

| 改动类型 | 审批 | 留痕 | 时限 |
|---|---|---|---|
| 改本文件硬约束 / 状态机 | owner | decisions/ | 24h |
| 放宽或删除任一门禁（`gate.mjs` 中 fail 级） | owner | decisions/ + NOW | 24h |
| 新增生成物（`.gitignore` / `.prettierignore` / eslint `ignores` 三处同加） | owner | decisions/ | 24h |
| 发布 / tag / 版本号变更 | owner | CHANGELOG + 显式授权 | 24h |

> 审计轨迹 = git 历史 + `keel/decisions/`；不另建审计系统。

## 项目状态机

exploring → architecture-locked → building → frozen

- **当前状态的唯一存储位置 = `keel/INDEX.md` frontmatter 的 `project-state`**；
  本节只定义状态与规则，不存状态。
- 当前为 `building`：审计清剿与能力补齐并行（P1 清单 + 门禁加固）。
- frozen 期契约冻结，只允许最小修复。