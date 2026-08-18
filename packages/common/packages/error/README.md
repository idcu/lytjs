# @lytjs/common-error

LytJS 错误处理工具。提供错误码枚举与分类、框架错误类、统一错误格式化、开发模式下的警告输出，以及带恢复机制的安全执行工具。

## 安装

```bash
pnpm add @lytjs/common-error
```

## 使用示例

```ts
import {
  LytError,
  LytErrorCodes,
  createCompilerError,
  formatError,
  safeExec,
  safeJsonParse,
  safeExecWithRecovery,
  warn,
  warnOnce,
} from '@lytjs/common-error';

const err = new LytError(LytErrorCodes.INVALID_VNODE_TYPE);
err.code; // 3001
err.message; // '无效的虚拟节点类型。'

const compilerErr = createCompilerError(LytErrorCodes.X_KEY_EXPECTED, {
  start: { line: 1, column: 2, offset: 2 },
  end: { line: 1, column: 5, offset: 5 },
  source: 'x',
});

const obj = safeJsonParse('{"a":1}', {}); // { a: 1 }
const fallback = safeExec(() => JSON.parse('invalid'), null); // null

warnOnce('deprecated API'); // 相同消息只输出一次
```

## API 说明

### 错误码与分类

- `LytErrorCodes` 枚举按分区定义：
  - **编译器错误（1001-1042）**：表达式、令牌、v-if/v-for/v-model/v-slot 等编译期错误
  - **运行时错误（2001-2013）**：setup / render / watch / 生命周期 / provide-inject 等运行时错误
  - **渲染器错误（3001-3017）**：无效 VNode 类型、DOM 节点、patch flag 等
  - **组件错误（4001-4012）**：无效组件、prop 类型、循环引用等
- `ErrorCategory` / `ErrorCategoryType`——错误分类（`compiler` / `runtime` / `renderer` / `component`）
- `getErrorMessage(code)`——获取错误码对应的错误消息
- `getCategory(code)`——获取错误码对应的分类（注意 `RENDER_ERROR` 会特判归入 `RENDERER`）
- `getErrorSuggestion(code)`——获取错误修复建议

### 错误对象与格式化

- `SourceLocation`——源码位置接口（含 start/end 行列偏移与 source）
- `LytError extends Error`——框架错误类，含 `code` 与可选的 `loc` 字段
- `formatError(error)`——将错误格式化为 `FormattedError`（标题、消息、建议、分类、代码、位置、堆栈）
- `printFormattedError(error)`——将格式化错误打印到控制台（带颜色与 💡 提示）
- `createCompilerError(code, loc?, additionalMessage?)` / `createRendererError(...)` / `createComponentError(...)`——按分类创建带名称的 `LytError`

### 开发模式与警告

- `setDevMode(enabled)` / `getDevMode()`——设置/获取开发模式（内部读写全局 `__DEV__`）
- `warn(message)`——仅在开发模式下输出警告
- `warnOnce(message)`——输出一次性警告，相同消息只输出一次，采用 FIFO 策略避免内存无限增长
- `error(message)`——输出错误信息，生产环境仍会输出
- `resetWarnedMessages()`——重置已提醒消息集合（用于测试）

### 安全执行与错误恢复

- `safeExec(fn, defaultValue, context?)`——安全执行函数，出错时返回默认值
- `safeJsonParse(str, defaultValue, context?)`——安全解析 JSON
- `EnhancedError` / `createEnhancedError(message, options?)`——带上下文信息与恢复建议的增强错误对象
- `safeExecWithRecovery(fn, options)`——带恢复机制的安全执行：支持 `defaultValue` / `context` / `onError` / `onRecover` / `maxRetries` / `retryDelay`
- `safeExecWithRecoveryAsync(fn, options)`——异步版本的带恢复机制安全执行

## 相关包

- [`@lytjs/common`](../common/README.md) — 聚合包，re-export 全部 `@lytjs/common-*` 子包

## 许可证

[MIT](../../../../LICENSE)
