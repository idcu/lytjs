---
scope: architecture
status: active
resolution: decided
last-verified: 2026-11-09
keywords: [C3, ui, 依赖方向, ARCHITECTURE, check-deps, 已裁, 实测订正]
---

# 0021 · C3：`@lytjs/ui` 实际依赖与 ARCHITECTURE:26 冲突（已裁 → 0026）

> 本条保留原始事实与判断；**架构方向已由 ADR 0026 裁定**（`resolution: decided`）。
> 原文数字不改写，实测差异逐条列在 §6「原文 → 实测」。

## 1. 文档原文

`keel/ARCHITECTURE.md:26`：

> 上层（ui / ecosystem）只依赖 core 与 component；

同文件前提：`:10`「只画现状，不写愿望」；`:27` 只允许 `import type` 与
`await import()` 反向引用。

## 2. 实际依赖

`packages/ecosystem/packages/ui/package.json` 的 `dependencies`（均 `workspace:*`）：
`common-is`、`common-a11y`、`common-string`、`reactivity`、`component`、`vdom`、`core`。

超出「core + component」的 5 个：

| 包 | import 行数 | 文件数 | 符号（去重） |
|---|---:|---:|---|
| `@lytjs/vdom` | 57（2 条 type-only） | 57 | `Component`、`createTextVNode`、`createVNode`、`VNode` |
| `@lytjs/common-a11y` | 40 | 40 | `focusTrap`、`getButtonA11yProps`、`getComboboxA11yProps`、`getDialogA11yProps`、`getFormControlA11yProps`、`getGroupA11yProps`、`getInputControlA11yProps`、`getSliderA11yProps`、`getSpinbuttonA11yProps`、`getSwitchA11yProps`、`mergeA11yProps` |
| `@lytjs/reactivity` | 38 | 38 | `computed`、`effect`、`reactive`、`signal`、`watch` |
| `@lytjs/common-is` | 31 | 31 | `isArray`、`isObject`、`isString` |
| `@lytjs/common-string` | 1 | 1 | `escapeHTML` |
| **合计** | **167** | **61（并集）** | **24** |

（另：`core` 1 处、`component` 56 处，在文档允许范围内。）

## 3. 门禁现状

`scripts/check-deps.ts:369-379` 已把 UI 登记为 L6 并允许上述 5 个依赖；
注释原文承认冲突：「与 `keel/ARCHITECTURE.md:26` 冲突（C3）……此处只登记现状
并留痕，不在 S02 内改架构文档」。故 `check-deps` 绿只代表 allowlist 放行。

## 4. 收敛规模评估

- 需改 **61 / 63** 个 `src/**/*.ts`、**167** 处 import。
- 24 个符号中 **23** 个未由 `core` / `component` 导出（仅 `signal` 在
  `component/src/index.ts` 导出面内）。
- 可选路径：① 由 `core` / `component` 增补 re-export 面（公开 API 扩大）；
  ② UI 不再直接用这些包（a11y 11 函数、vdom 4 符号、reactivity 5 原语需
  自实现或经 component 抽象），等于重做 UI 基础层。二者都要同步改
  `package.json`、allowlist 与文档，非单点修复。

## 5. 待裁项（已裁 → 0026）

> 裁决（2026-11-09）：C1/C2 已收敛 `vdom` / `reactivity`；C3 由 ADR 0026
> 分两类登记 L0 例外，`check-deps` allowlist 同步收紧。

- [x] 采信现状，修订 `ARCHITECTURE.md:26`（写明 UI 可直接依赖的 5 个包及理由）。
- [x] 或收窄 UI 依赖面（路径 ① / ②），给出迁移批次。
- [x] 裁定前保持 allowlist 现状，不为了绿而改文档。

## 6. 实测订正（原文 → 实测）

| 项 | 原文 | 实测 |
|---|---|---|
| 去重符号合计 | 24 | **27** |
| `core` / `component` 覆盖 | 1（仅 `signal`） | **8**（`core/runtime`：vdom 3 + reactivity 5） |
| 未覆盖 | 23 | **19** |
| `common-a11y` 符号 | 11 | **14**（补 `getTablistA11yProps` / `getTabA11yProps` / `getTabpanelA11yProps`） |
| 非 L0 的 `Component` | 计入待裁 | UI 内仅 import+re-export、从未使用，C1 已删除 |
| 溢出依赖包 | 5 个 | C1/C2 后剩 3 个 L0 包（`common-a11y` / `common-is` / `common-string`） |

> 因此实际待裁为 **18 个 L0 符号**（14 a11y + 3 `common-is` + 1 `common-string`）。
