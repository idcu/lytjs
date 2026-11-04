# @lytjs/plugin

## [Unreleased]

### 🐞 修复（10 个「插件装上了但没生效」的语义缺陷）

**两条安装入口分叉**（`app.use()` 与 `registry.install()`）—— 同一插件走两条路行为不同：

- **独立 `install()` 不跑 `beforeInstall` / `afterInstall`**（P0）：两个生命周期钩子
  **只有 `app.use()` 会调**；独立使用时 `beforeInstall` 返回 `false` 也照样装上。
  现在 `install()` 执行完整管线：依赖检查 → `beforeInstall`（可取消）→ `install` →
  `afterInstall`（可 `await` 异步钩子，这一点比同步的 `app.use()` 更强）。
- **独立 `install()` 不检查依赖**（P0）：声明 `dependencies: [{name:'missing-dep'}]` 照样
  `installed: true`。现在必需依赖缺失 / 版本不符一律拒绝（返回 `false`），
  可选依赖版本不符**不**阻断（新增 `requiredVersionMismatch` 以区分两者）。
- **`install()` 失败不发 `error` 事件**（P1）：此前抛错前一条事件都没有，
  `before:install` 已发、`after:install` 永不到来 ⇒ 配对监听器（devtools / 日志）状态泄漏。
  现在先补 `error` 再把原异常抛给调用方（不吞异常）。

**依赖与冲突**

- **冲突检查只查一个方向**（P1）：`conflicts` 的生效取决于**注册顺序** ——
  先注册 `b(conflicts:['a'])` 再注册 `a` 会被放行。冲突是对称关系，现在双向检查。
- **`unregister()` 不检查依赖方**（P1）：卸掉被依赖的插件后，依赖它的插件仍在表里且标记为
  已安装，无任何提示。现在给告警并点名依赖方（不自动级联卸载）。
- **`resolveLoadOrder()` 静默跳过缺失依赖**（P1）：返回的顺序「看起来完全正常」。
  现在给告警；同时可选依赖（若已注册）也参与排序。

**版本范围**（这条最贵 —— `app.use()` 依赖不满足时**直接抛错拒绝安装**）

- **标准写法被判成「不满足」**（P0）：旧实现只认三段式，于是 `^1.0` / `~1.2` / `1.2` / `*`
  对 `1.2.3` 全部 `satisfied: false` ⇒ **插件装不上**，而错误信息看起来像「版本真的不兼容」。
- **反向漏判**（P0）：`parseVersion` 不锚定结尾，`>=1.0.0 <2.0.0` 对 **3.0.0** 判为满足。
  现在支持空格分隔的**交集**与 `||` 的**并集**。
- **`^0.x` 语义错**（P1）：`^0.2.3` 放行 `0.3.0`。现在按 semver 收紧
  （`^0.2.3` ⇒ `<0.3.0`，`^0.0.3` ⇒ 仅 `0.0.3`）。

**校验器**

- **`registerKnownPlugins()` 是空操作**（P1）：名字进了 `knownPlugins`，`validate()` 也把集合
  传进上下文，但**没有任何规则读过它**（README 却宣传了这个能力）。现在
  `validateDependencies` 会据此检查「依赖的插件是否在已知列表里」，未知依赖给 warning。

### 📝 文档

- `install()` 的 JSDoc 曾写着「由 `register()` 默认调用（可用 `{ autoInstall: false }` 关闭）」
  —— **两句都是假的**（`register()` 从不自动安装，`autoInstall` 选项根本不存在）。
  已按实际语义重写，并在 README 的快速开始里补上 `await registry.install(...)` 这一步。
- README 新增「安装语义」「版本范围」两节，方法列表补上 `install(name, context)`。

### 🔧 独立化核查

- 独立化核查：确认插件系统核心零框架依赖，仅使用 @lytjs/common-error（运行时）与 @lytjs/config（类型），无需清理；README 新增「简介·独立声明」，记录 v7.0-alpha 抽离独立通用库的规划。

## [6.9.6] - 2026-06-06

### 🚀 版本升级

- 版本升级至 v6.9.6
- 独立通用插件系统核心，从 `@lytjs/core` 抽离
- 提供 `PluginRegistry` / 依赖管理 / 生命周期事件 / 版本管理能力
- 保持完全向后兼容，core 通过适配层转出