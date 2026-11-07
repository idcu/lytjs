---
scope: architecture
status: active
resolution: deprecated-until-8.0.0
last-verified: 2026-11-07
keywords: [S19, 死包, deprecated, common, 8.0.0, check-dead-packages]
---

# 0023 · common 域 16 个死包：保留并标 deprecated（目标 8.0.0 删除）

## 决定

S19 逐包判定：**16/16 命中「已发布、有公开导出面」** ⇒ 保留并标 deprecated，
目标 **8.0.0** 删除。本轮不删包、不并包、不改依赖与代码；只做弃用标识 + 文档 + 棘轮理由。

共同事实（2026-11-07 实测）：目录 `packages/common/packages/<短名>/`；npm 均 `6.9.6`；
月下载 27–109（`api.npmjs.org/downloads/point/last-month`）；`exports` 均为 `.`；
均列于 `docs/guide/architecture.md` 与 `docs/packages/common/overview.md`。
下表文档列：A=前者，O=后者，API=`docs/api/common.md` 专节。

| 包（省 `@lytjs/`） | 月下载 | 文档 | 替代 / 说明 |
|---|---|---|---|
| `common` | 44 | A,O | 聚合 barrel；改用按需子包 |
| `common-async-scheduler` | 41 | A,O | 与 `common-scheduler` 功能重叠 |
| `common-dom-helpers` | 29 | A,O,API | adapter-web 自带 DOM 操作 |
| `common-event-normalizer` | 35 | A,O,API | 正主是 adapter-web `web-patch-events` |
| `common-keyboard` | 30 | A,O,API | 无内置替代 |
| `common-memory` | 53 | A,O | 对象池/泄漏检测，无消费者 |
| `common-node-cache` | 27 | A,O | 无内置替代 |
| `common-performance` | 27 | A,O,API | 无内置替代 |
| `common-raf` | 39 | A,O,API | 与 `common-timing` 重叠 |
| `common-render-queue` | 30 | A,O,API | 与 `common-scheduler` 重叠 |
| `common-storage` | 30 | A,O,API | 无内置替代 |
| `common-validate` | 27 | A,O,API | 无内置替代 |
| `common-warn` | 109 | A,O | 真相源已收敛到 `common-error` |
| `common-env` | 66 | A,O,API | 无内置替代 |
| `common-path` | 30 | A,O,API | 无内置替代 |
| `common-timing` | 29 | A,O,API | 仅测试引用；与 `common-raf` 重叠 |

## 删除条件（全部满足才进 8.0.0）

1. 7.x 全周期保持 deprecated，README 横幅与 npm `deprecated` 标记齐备；
2. 仓内仍零生产引用（`check-dead-packages` 清单不新增，`--verbose` 的 src 引用只来自死 barrel）；
3. 无外部 issue 要求保留；
4. `7.0.0` 发布满 6 个月。

删除时同步 6 处：`scripts/build-order.ts`、`check-deps.ts` 的 `LAYER_MAP`、
`vitest.config.ts`、`tsconfig*`、`PUBLISH-MANIFEST.md`、文档/README；并对 npm 执行
`npm deprecate "@lytjs/<pkg>@7.x" "<替代说明>"`（本轮未执行，需 npm 发布权限）。

## 被否掉的选项

| 选项 | 为什么没选 |
|---|---|
| 直接删除 | 16 个均已发布，删源码不删 npm 版本；且删除要同步 6 处构建链，属独立批次 |
| 并回父包 | 无父包可并（`common` barrel 自身也是死包），只会留下空壳 |
| 留在清单不动 | 死包会被当成「模块化规模证据」，且没有退役日期 |

## 后果

- 好处：给出明确退役路径，棘轮理由从「为什么存在」改为「何时删除」。
- 代价：`docs/packages/common/overview.md` 仍列全部包，需用「弃用」区隔；
  npm 侧 `deprecated` 标记要等有发布权限时执行才真正对外生效；7.x 期间这些包仍需过门禁。
