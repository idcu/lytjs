# @lytjs/plugin

> LytJS 独立通用插件系统核心，零框架依赖。提供 `PluginRegistry` / 依赖管理 / 生命周期事件 / 版本管理能力。

[![npm version](https://img.shields.io/npm/v/@lytjs/plugin.svg)](https://www.npmjs.com/package/@lytjs/plugin)
[![license](https://img.shields.io/npm/l/@lytjs/plugin.svg)](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 简介·独立声明

`@lytjs/plugin` 是从 `@lytjs/core` 中抽离出的独立通用插件系统，不依赖任何框架运行时，可在任意 JavaScript / TypeScript 项目中使用。它通过宿主上下文泛型化设计，既能在 LytJS 框架内绑定具体的 `App` 实例，也能作为独立插件注册表在任何宿主中使用。

> **框架无关性说明**：本插件为零框架依赖的独立通用插件系统核心（PluginRegistry / 依赖管理 / 生命周期事件 / 版本管理），仅依赖 `@lytjs/common-error` 与 `@lytjs/config`（均实际使用）。按 v7.0-alpha 路线图规划，插件系统将抽离为独立通用库。

### 核心特性

- **插件注册表**：`PluginRegistry` 提供注册、注销、查询与批量管理
- **依赖管理**：声明 `dependencies` / `optionalDependencies`，自动检测缺失与版本不匹配
- **拓扑排序**：根据依赖关系计算正确的安装顺序，并检测循环依赖
- **生命周期事件**：注册 / 安装 / 注销等全链路事件监听
- **插件验证器**：`PluginValidator` 对结构、名称、版本、依赖、冲突、钩子进行规范校验
- **零框架依赖**：仅依赖 `@lytjs/common-error` 与 `@lytjs/config` 工具包
- **完全类型安全**：宿主上下文和插件选项通过泛型完整推导

## 安装

```bash
npm install @lytjs/plugin
```

或使用 pnpm：

```bash
pnpm add @lytjs/plugin
```

## 依赖关系

`@lytjs/plugin` 依赖以下 LytJS 基础工具包：

- `@lytjs/common-error` - 统一错误处理
- `@lytjs/config` - 插件选项的 Schema 定义

## 快速开始

### 基础插件

任何拥有 `install` 函数的对象都是插件：

```typescript
import { PluginRegistry } from '@lytjs/plugin';

const registry = new PluginRegistry();

const myPlugin = {
  name: 'my-plugin',
  install: (app) => console.log('插件已安装', app),
};

registry.register(myPlugin);
console.log(registry.has('my-plugin')); // true

// ⚠️ `register()` **只登记**，不会执行 `install()`（`installed` 仍是 false）。
// 独立使用注册表时必须显式安装：
await registry.install('my-plugin', app);
console.log(registry.get('my-plugin')?.installed); // true
```

> 走 `@lytjs/core` 时不需要这一步 —— `app.use(plugin)` 会自己调用 `install()`。
> 两条路径的**行为是同一套**（依赖检查 → `beforeInstall` → `install` → `afterInstall`），
> 详见下面的「安装语义」。

### 增强插件与依赖管理

```typescript
import { PluginRegistry } from '@lytjs/plugin';

const registry = new PluginRegistry();

registry.register({
  name: 'dep-plugin',
  version: '1.0.0',
  install: () => {},
});

const mainPlugin = {
  name: 'main-plugin',
  install: () => {},
  dependencies: [{ name: 'dep-plugin', version: '^1.0.0' }],
  beforeInstall: () => true,
  cleanup: () => console.log('清理资源'),
};

const result = registry.checkDependencies(mainPlugin);
console.log(result.satisfied); // true

registry.register(mainPlugin);

// 按依赖拓扑排序得到安装顺序
const order = registry.resolveLoadOrder().map((p) => p.name);
// ['dep-plugin', 'main-plugin']
```

### 安装语义（2026-11-05 统一）

`register()` 只登记；真正生效要 `install()`。两条安装入口语义一致：

| 入口                                | 调用方        | 说明                                             |
| ----------------------------------- | ------------- | ------------------------------------------------ |
| `app.use(plugin, ...options)`       | `@lytjs/core` | 同步 API；遇到异步 `beforeInstall` 会抛错        |
| `await registry.install(name, ctx)` | 独立使用      | 可 `await` 异步 `beforeInstall` / `afterInstall` |

执行顺序：

```
检查依赖（必需依赖缺失或版本不符 ⇒ 拒绝，返回 false）
  → beforeInstall(ctx)     // 返回 false 取消安装（插件仍留在注册表，可稍后重试）
  → before:install 事件
  → install(ctx, options)
  → installed = true
  → after:install 事件
  → afterInstall(ctx)
```

失败处理：

- `install()` 抛错 ⇒ 先发一条 `error` 事件，再**原样抛给调用方**（不会被吞），`installed` 保持 `false`。
- `afterInstall()` 抛错 ⇒ 插件**已生效**（`installed` 保持 `true`），但同样发 `error` 事件留痕。

### 版本范围

依赖的 `version` 支持标准写法（此前只认三段式，`^1.0` 这类会被判成「不满足」并**导致安装被拒**）：

| 写法                 | 含义                                    |
| -------------------- | --------------------------------------- |
| `*` / `x` / 省略     | 任意版本                                |
| `1.2.3`              | 精确匹配                                |
| `1.2` / `1`          | `1.2.x` / `1.x`                         |
| `^1.2.3`             | `>=1.2.3 <2.0.0`                        |
| `^0.2.3`             | `>=0.2.3 <0.3.0`（0.x 按次版本收紧）    |
| `^0.0.3`             | 仅 `0.0.3`                              |
| `~1.2.3` / `~1.2`    | `>=1.2.3 <1.3.0`                        |
| `>=1.0.0 <2.0.0`     | 空格分隔 = **交集**（每个条件都要满足） |
| `^1.0.0 \|\| ^2.0.0` | `\|\|` 分隔 = **并集**                  |

### 生命周期事件

```typescript
import { PluginRegistry } from '@lytjs/plugin';

const registry = new PluginRegistry();

registry.on('after:register', (event, data) => {
  console.log(`插件 ${data.name} 已注册`);
});

registry.register({ name: 'test', install: () => {} });
```

### 插件验证

```typescript
import { PluginValidator } from '@lytjs/plugin';

const validator = new PluginValidator();

const report = validator.validate({
  name: 'my-plugin',
  version: '1.0.0',
  install: () => {},
});

console.log(report.valid); // true
console.log(report.warningCount); // 其他信息级提示
```

`PluginValidator` 还支持 `validateAll` 批量验证、`addRule` / `removeRule` 自定义验证规则，以及 `registerKnownPlugins` 注册已知插件名称。

> `registerKnownPlugins(names)` **会影响校验结果**：登记之后，插件声明了不在列表里的依赖会给一条
> `warning`（`Dependency "x" is not in the known plugin list`）。不登记时该检查不启用。
> （2026-11-05 之前这个方法**只写不读** —— 名字进了集合，但没有任何规则使用它。）

## 主要 API

### `PluginRegistry`

插件注册表，管理插件的注册、注销、查询和依赖关系。

```typescript
import { PluginRegistry } from '@lytjs/plugin';

const registry = new PluginRegistry();
const result = registry.register(plugin, options);
```

常用方法：`register(plugin, options)`、`install(name, context)`、`unregister(name)`、`get(name)`、`getPlugin(name)`、`has(name)`、`getNames()`、`getAll()`、`getInstalled()`、`markInstalled(name)`、`markUninstalled(name)`、`checkDependencies(plugin)`、`resolveLoadOrder()`、`clear()`、`on(event, handler)`、`off(event, handler)`。还提供只读属性 `size`。

> **`unregister(name)`**：卸载被其它插件**声明为必需依赖**的插件时会给一条告警（点名依赖方），
> 但不会自动级联卸载 —— 可能还有别的使用方。
>
> **`resolveLoadOrder()`**：返回拓扑序（依赖在前，可选依赖若已注册也参与排序）；
> 有**未注册的必需依赖**时会给告警（此前静默跳过，返回的顺序「看起来完全正常」）。

### `PluginValidator`

对插件进行结构和配置验证，确保插件符合规范。

```typescript
import { PluginValidator } from '@lytjs/plugin';

const validator = new PluginValidator();
const report = validator.validate(plugin);
```

方法：`validate(plugin)`、`validateAll(plugins)`、`registerKnownPlugins(names)`、`addRule(rule)`、`removeRule(rule)`。

## TypeScript 类型

`@lytjs/plugin` 导出的核心类型：

```typescript
// 基础插件（泛型化宿主上下文与选项）
type PluginInstallFunction<TContext = unknown, TOptions = unknown> = ...;
interface Plugin<TContext = unknown, TOptions = unknown> { install: ...; }

// 增强插件
interface EnhancedPlugin<TContext = unknown, TOptions = unknown> extends Plugin<TContext, TOptions> {
  name: string;
  version?: string;
  meta?: PluginMeta;
  dependencies?: PluginDependency[];
  optionalDependencies?: PluginDependency[];
  conflicts?: string[];
  peerRequirements?: { lytjs?: string; node?: string };
  configSchema?: ConfigSchema<TOptions>;
  beforeInstall?: ...;
  afterInstall?: ...;
  beforeMount?: ...;
  afterMount?: ...;
  cleanup?: ...;
}

// 注册信息 / 结果
interface RegisteredPlugin { plugin: EnhancedPlugin; options: unknown; installed: boolean; ... }
interface RegistrationResult { success: boolean; name: string; error?: string; }

// 依赖检查结果
interface DependencyResult {
  satisfied: boolean;
  missing: Array<{ name: string; version?: string }>;
  missingOptional: Array<{ name: string; version?: string }>;
  versionMismatch: Array<{ name: string; expected: string; actual?: string }>;
}

// 生命周期事件
type PluginLifecycleEvent =
  | 'before:register' | 'after:register'
  | 'before:install' | 'after:install'
  | 'before:unregister' | 'after:unregister' | 'error';

// 验证器类型
interface ValidationIssue { level: 'error' | 'warning' | 'info'; rule: string; message: string; }
interface ValidationReport { valid: boolean; pluginName: string; issues: ValidationIssue[]; ... }
```

## 浏览器兼容性

`@lytjs/plugin` 面向纯环境使用，兼容 Node.js 与现代浏览器。

## 相关包

- [@lytjs/config](../config/) - 插件选项 Schema 定义
- [@lytjs/core](../../../core/) - 集成该插件系统，通过适配层保持向后兼容

## 许可证

MIT License - [查看许可证](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 贡献指南

欢迎提交 Issue 和 Pull Request！

- [Gitee 仓库](https://gitee.com/lytjs/lytjs)
- [问题反馈](https://gitee.com/lytjs/lytjs/issues)
