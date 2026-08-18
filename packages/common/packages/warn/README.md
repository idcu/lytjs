# @lytjs/common-warn

LytJS 框架级警告系统。提供分级日志、一次性（once）抑制、自定义日志处理器与可隔离的警告上下文，用于控制框架的日志级别与输出。

## 安装

```bash
pnpm add @lytjs/common-warn
```

## 使用示例

```ts
import {
  warn,
  error,
  debug,
  fatal,
  setLevel,
  getLevel,
  setHandler,
  createWarnContext,
} from '@lytjs/common-warn';

warn('deprecated property'); // 仅 level >= warn 时输出
warn('same message', { once: true }); // 相同消息只输出一次
setLevel('error'); // 只输出 error / fatal
console.log(getLevel()); // 'error'
```

## API 说明

### 类型与选项

- `LogLevel`——日志级别：`'debug' | 'warn' | 'error' | 'fatal'`
- `WarnOptions`——`{ level?, source?, once? }`，其中 `once: true` 时相同消息只输出一次
- `LogEntry`——`{ level, msg, source?, timestamp }`
- `LogHandler`——自定义日志处理函数
- `WarnContext`——隔离日志上下文的接口（`warn` / `error` / `debug` / `fatal` / `setLevel` / `getLevel` / `setHandler` / `resetWarned`）

### 日志与配置函数

- `warn(msg, options?)` / `error(msg, options?)` / `debug(msg, options?)` / `fatal(msg, options?)`——不同级别的日志输出；`fatal` 在 Node 环境会 `process.exit(1)`，浏览器环境抛出错误
- `setLevel(level)` / `getLevel()`——设置/获取当前日志级别（默认 `warn`），低于当前级别的日志会被过滤
- `setHandler(handler)`——设置自定义日志处理器；传入 `null` 恢复默认的 `console.warn` / `console.error` 输出
- `resetWarned()`——清空一次抑制集合

### 隔离上下文

- `createWarnContext(): WarnContext`——创建一个独立的警告上下文，拥有自己的日志级别、处理器与 once 抑制集合，适用于多实例或测试等需要隔离日志状态的场景；共享全局 API 为单例状态，此功能可避免相互污染

## 相关包

- [`@lytjs/common`](../common/README.md) — 聚合包，re-export 全部 `@lytjs/common-*` 子包

## 许可证

[MIT](../../../../LICENSE)
