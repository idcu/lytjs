# @lytjs/bundler 更新日志

## [Unreleased]

### 🐛 修复 P1-8：transform 从「骨架」改为真实实现（2026-10-10）

> 注：以下条目**不改写**上方「独立化核查」的历史记录 —— 那条在写下时是成立的，
> 只是本包当时确实还没有真实转换能力。

- **`transform()` 由「恒返回 `null`」改为真实 SFC 编译**：新增 `transformSFC(code, id, options)`，
  委托 `@lytjs/compiler` 的 `parseSFC` + `compileSFC`；`createVitePlugin()` 的
  `transform` 钩子真的转换 `.lyt` / `.vue`。
- **删除假的 Webpack 通路**：`createWebpackPlugin()` 此前只在 `beforeCompile` 里打印一次
  「尚未实现」告警、完全不做转换。已删除该函数与 `LytPluginConfig` / `BundlerPreset.webpack`
  字段（「声明了能力却没有实现」）。需要 Webpack 的用户请用导出的 `transformSFC()` 自写 loader。
- **新增依赖 `@lytjs/compiler`（构建期）**：本包不再是「零 `@lytjs/*` 引用」——
  一个框架的构建插件必须知道如何编译该框架的 SFC。
- **`createViteConfig()` 不再丢弃调用方选项**：此前返回的是预设内部用空 options 构造的插件，
  `rendererMode` / `scoped` / `injectCss` 等被静默丢弃。
- **删除无实现的选项**：`ssgPages`（从未被读取）、`ssg`（移出 `LytPluginOptions`，
  仅在 `LytConfigOptions` 中作预设选择用）。
- 新增 `LytTransformResult` 类型；`isLytModule()` / `LYT_EXTENSIONS` 导出。
- 测试从 8 个「只断言对象存在」的弱用例重写为 20 个**行为级**用例
  （断言真实产物含 `function render`、`.ts` 透传、`ssr` 两态产物不同、scope id 稳定、
  CSS 注入幂等 id、预设选项真流入编译器）。
- 连带修复上游 `@lytjs/compiler` 的 `compileSFC()` 两个静默失效
  （见该包 CHANGELOG：`<style scoped>` 默认路径产出 `data-v-undefined`、`ssr` 死开关）。

### 🔧 独立化核查

- 独立化核查：确认 bundler 为纯构建工具集成（`createVitePlugin` / `createWebpackPlugin` / `getPreset` / `createViteConfig`），零运行时依赖、零 `@lytjs/*` 引用，已完全独立
- README 新增「简介·独立声明」「依赖关系」「相关包」章节，记录 v6.12 迁出至独立仓库 `lytjs-bundler` 的规划

## [6.9.6] - 2026-06-06

### 🚀 版本升级

- 版本升级至 v6.9.6
- 保持完全向后兼容
- 所有依赖包已更新至 6.9.6



## [6.6.0] - 2026-05-21

### 🚀 版本升级

- 版本升级至 v6.6.0
- 保持完全向后兼容
- 所有依赖包已更新至 6.6.0

## [6.5.0] - 2026-05-19

### 🚀 版本升级

- 版本升级至 v6.5.0
- 保持完全向后兼容

## [6.4.0] - 2026-05-18

### 🚀 Monorepo 包发布

本版本为 LytJS 6.4.0 Monorepo 统一发布的一部分。
