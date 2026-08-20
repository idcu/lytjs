# @lytjs/plugin

## [Unreleased]

### 🔧 独立化核查

- 独立化核查：确认插件系统核心零框架依赖，仅使用 @lytjs/common-error（运行时）与 @lytjs/config（类型），无需清理；README 新增「简介·独立声明」，记录 v7.0-alpha 抽离独立通用库的规划。

## [6.9.6] - 2026-06-06

### 🚀 版本升级

- 版本升级至 v6.9.6
- 独立通用插件系统核心，从 `@lytjs/core` 抽离
- 提供 `PluginRegistry` / 依赖管理 / 生命周期事件 / 版本管理能力
- 保持完全向后兼容，core 通过适配层转出