# 生态迁出与融合规范

> 规范 LytJS 生态包的独立仓库迁出、版本契约、依赖对接与回流融合机制，确保"迁出后仍能与核心仓库无缝协作"。

---

## 目录

- [核心原则](#核心原则)
- [已迁出生态现状](#已迁出生态现状)
- [融合机制](#融合机制)
- [迁出候选评估](#迁出候选评估)
- [对接规范](#对接规范)
- [迁出优先级建议](#迁出优先级建议)
- [核心仓库保留清单](#核心仓库保留清单)

---

## 核心原则

- **依赖倒置**：生态包只依赖 npm 发布的 `@lytjs/*` 版本（range），不再使用 `workspace:*` 内部引用。
- **核心零依赖**：核心仓库（尤其 L0 common-\*、L1-L3 全链）保持零第三方依赖约束，任何迁出回流不得破坏该约束。
- **兼容性保障**：独立仓库与 monorepo 源码一致；生态包版本与 `@lytjs/core` 的 MAJOR.MINOR 对齐（semver 同步）。

---

## 已迁出生态现状

| 项            | 内容                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------ |
| 独立仓库      | `lytjs-plugins`（Gitee `gitee.com/lytjs/plugins.git`，`main` 分支已 push）                 |
| 已迁出        | 13 个 `@lytjs/plugin-*` 插件                                                               |
| monorepo 副本 | 保留同版本（向后兼容）                                                                     |
| 独立依赖      | 均以 npm `@lytjs/core ^6.9.6` 引入；`plugin-vite` 无 core 依赖（vite 采用 peerDependency） |
| 验证          | build / type-check / lint / test 全绿，13 包累计 203 测试                                  |

> ⚠️ 注意：`@lytjs/plugin`（插件体系核心）**未迁出**，仍保留在 monorepo 的 ecosystem 下。

---

## 融合机制

"迁出后仍融入 lytjs"的运行基础在于**依赖版本链**：

1. 生态包声明对核心包的 npm range 依赖（如 `"@lytjs/core": "^6.9.6"`）。
2. 用户安装插件时，npm 自动解析到与本地 core 兼容的版本。
3. 核心升级后，生态包仅需将 range 抬升到新 MAJOR.MINOR，即可重新对齐。
4. 通过 **semver 同步**（生态与 core 对齐发布版本）保证任意「插件包组合 + core 版本」互相可用。

> 推荐对 `@lytjs/core` / `@lytjs/reactivity` 等核心使用 `peerDependencies` + `peerDependenciesMeta.optional`，由宿主提供版本，避免多实例冲突（`plugin-vite` 对 vite 已采用此模式）。

---

## 迁出候选评估

基于实盘 `dependencies` 数据评估：

| 候选包                  | 当前依赖                           | 耦合度           | 可行性                                   |
| ----------------------- | ---------------------------------- | ---------------- | ---------------------------------------- |
| `@lytjs/config`         | common-is, common-object           | 低（无框架依赖） | ✅ 最易迁出，纯通用配置库                |
| `@lytjs/di`             | common-is                          | 极低             | ✅ 通用 DI 容器，独立价值高              |
| `@lytjs/store`          | common-is/object, reactivity, core | 中               | ✅ 有独立价值，规划中                    |
| `@lytjs/router`         | web-framework 族                   | 中-高            | ⚠️ 依赖较深，建议随 web-framework 成组迁 |
| `@lytjs/ui`             | reactivity, component, vdom, core  | 高               | ⚠️ 深度依赖核心渲染，建议保留            |
| `@lytjs/plugin`（核心） | common-error, config               | 高               | ❌ 应保留在 monorepo，是插件体系根       |

---

## 对接规范

统一对接标准（适用所有迁出包）：

1. **版本契约**：与核心仓库语义化版本对齐（当前 `^6.9.6`）。核心发 MINOR，生态包跟进同 MINOR 小版本。
2. **依赖声明**：一律使用 npm range（如 `^6.9.6`），锁定语义化但不锁死补丁，允许核心补丁自动兼容。
3. **peerDependencies 兜底**：对核心依赖用 `peerDependencies` + `peerDependenciesMeta.optional`，宿主提供版本，避免多实例。
4. **回流（融合）路径**：核心仓库若需生态能力，以可选 npm 依赖方式引入，而非反向依赖生态源码——保证核心零第三方依赖硬约束不被触碰。
5. **保留向后兼容副本**：迁出后 monorepo 内保留同版本副本，直至生态包在 npm 上稳定独立对外。

---

## 迁出优先级建议

```
第一批（最易、纯通用）: config, di           → 合并为 lytjs-core-utils 或各自独立
第二批（有独立价值）  : store, devtools, bundler, compat
第三批（成组迁出）    : web-framework → lytjs-web
                       (router / router-fs / api / http-server / metadata / middleware 及子包)
保留核心              : plugin(核心), ui, common-* ×33, shared-types, host-contract,
                        reactivity / vdom / compiler / core 全链
```

---

## 核心仓库保留清单

以下包**应保留**在核心 monorepo，不迁出：

- `@lytjs/plugin`（插件体系核心）
- `@lytjs/ui`（深度依赖核心渲染）
- `@lytjs/common-*` ×33（零第依赖、被广泛使用）
- `@lytjs/common`（聚合包）、`@lytjs/shared-types`、`@lytjs/host-contract`
- `@lytjs/reactivity` / `@lytjs/vdom` / `@lytjs/compiler` / `@lytjs/core` 全链核心
