# @lytjs/plugin-logger

LytJS 官方日志插件，提供分级日志记录、持久化存储与性能追踪能力。

## 安装

```bash
pnpm add @lytjs/plugin-logger
```

## 使用示例

### 作为插件使用

插件按 LytJS 惯例在应用实例中注册。注册后可通过 `app.config.globalProperties.$logger` 或依赖注入 `lyt-logger` 访问日志实例。

```typescript
import { createApp } from '@lytjs/core';
import pluginLogger from '@lytjs/plugin-logger';

const app = createApp();

app.use(pluginLogger, {
  level: 'info',
  enablePersistence: true,
  storageKey: 'lyt-logs',
  maxLogs: 1000,
  enablePerformance: true,
});
```

### 独立使用

```typescript
import { createLogger } from '@lytjs/plugin-logger';

const logger = createLogger({ level: 'debug' });

logger.debug('进入流程', { step: 1 });
logger.info('用户登录成功', { userId: '123' });
logger.warn('磁盘空间不足');
logger.error('请求失败', new Error('network error'));

// 设置日志级别
logger.setLevel('warn');

// 性能追踪
logger.startMeasure('render');
// ... 业务逻辑
const metric = logger.endMeasure('render');
console.log(metric?.duration); // 耗时毫秒数

// 获取全部性能指标
const metrics = logger.getMetrics();
```

## API 说明

### 导出

- 默认导出：`pluginLogger`（插件，通过 `app.use` 注册）
- `createLogger(options?: LoggerOptions): LoggerInstance` 独立创建日志实例
- `LOG_LEVELS: Record<LogLevel, number>` 日志级别到数值的映射（debug=0 至 silent=4）

### LoggerOptions

| 选项                | 类型                | 默认值       | 说明                        |
| ------------------- | ------------------- | ------------ | --------------------------- |
| `level`             | `LogLevel`          | `'info'`     | 日志级别                    |
| `enablePersistence` | `boolean`           | `false`      | 是否持久化到 `localStorage` |
| `storageKey`        | `string`            | `'lyt-logs'` | 持久化存储 key              |
| `maxLogs`           | `number`            | `1000`       | 内存中最多保留的日志条数    |
| `enablePerformance` | `boolean`           | `true`       | 是否启用性能追踪            |
| `formatter`         | `(entry) => string` | -            | 自定义日志格式化函数        |

`LogLevel` = `'debug' | 'info' | 'warn' | 'error' | 'silent'`。

### LoggerInstance

| 成员           | 签名                                          | 说明               |
| -------------- | --------------------------------------------- | ------------------ |
| `level`        | `LogLevel`（只读）                            | 当前日志级别       |
| `logs`         | `LogEntry[]`（只读）                          | 日志记录           |
| `debug`        | `(message, data?, module?) => void`           | 调试日志           |
| `info`         | `(message, data?, module?) => void`           | 信息日志           |
| `warn`         | `(message, data?, module?) => void`           | 警告日志           |
| `error`        | `(message, data?, module?) => void`           | 错误日志           |
| `setLevel`     | `(level: LogLevel) => void`                   | 设置日志级别       |
| `startMeasure` | `(name: string, data?: unknown) => void`      | 开始性能追踪       |
| `endMeasure`   | `(name: string) => PerformanceMetric \| null` | 结束并返回性能指标 |
| `clear`        | `() => void`                                  | 清空日志与指标     |
| `getMetrics`   | `() => PerformanceMetric[]`                   | 获取全部性能指标   |

## 相关包

- [@lytjs/core](../../../core) 插件定义与运行时核心
- [@lytjs/reactivity](../../../reactivity) 响应式状态（signal）支持

## 许可证

[MIT](../../../../LICENSE)
