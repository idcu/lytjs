# @lytjs/plugin-logger

官方日志插件，支持日志分级

## 目录

- [createLogger](#createlogger)
- [LogLevel](#loglevel)
- [LogEntry](#logentry)
- [LoggerOptions](#loggeroptions)
- [PerformanceMetric](#performancemetric)
- [LoggerInstance](#loggerinstance)

## createLogger

**Function**

### 签名

```typescript
createLogger: LoggerInstance;
```

### 参数

| 参数    | 类型            | 描述 | 可选 | 默认值 |
| ------- | --------------- | ---- | ---- | ------ |
| options | `LoggerOptions` |      | 是   | `{}`   |

### 返回值

**类型:** `LoggerInstance`

## LogLevel

**Type**

### 签名

```typescript
LogLevel: 'debug' | 'info' | 'warn' | 'error' | 'silent';
```

## LogEntry

**Interface**

### 成员

| 名称      | 类型       | 描述     | 可选 |
| --------- | ---------- | -------- | ---- |
| timestamp | `number`   | 时间戳   | 否   |
| level     | `LogLevel` | 日志级别 | 否   |
| message   | `string`   | 日志消息 | 否   |
| data      | `unknown`  | 附加数据 | 是   |
| module    | `string`   | 模块名   | 是   |

## LoggerOptions

**Interface**

### 成员

| 名称              | 类型                          | 描述             | 可选 |
| ----------------- | ----------------------------- | ---------------- | ---- |
| level             | `LogLevel`                    | 日志级别         | 是   |
| enablePersistence | `boolean`                     | 是否启用持久化   | 是   |
| storageKey        | `string`                      | 本地存储 key     | 是   |
| maxLogs           | `number`                      | 最大日志条数     | 是   |
| enablePerformance | `boolean`                     | 是否启用性能追踪 | 是   |
| showTimestamp     | `boolean`                     | 是否显示时间戳   | 是   |
| formatter         | `(entry: LogEntry) => string` | 自定义格式化函数 | 是   |

## PerformanceMetric

**Interface**

### 成员

| 名称      | 类型      | 描述     | 可选 |
| --------- | --------- | -------- | ---- |
| name      | `string`  | 名称     | 否   |
| startTime | `number`  | 开始时间 | 否   |
| endTime   | `number`  | 结束时间 | 是   |
| duration  | `number`  | 持续时间 | 是   |
| data      | `unknown` | 附加数据 | 是   |

## LoggerInstance

**Interface**

### 成员

| 名称         | 类型                                                         | 描述         | 可选 |
| ------------ | ------------------------------------------------------------ | ------------ | ---- |
| level        | `LogLevel`                                                   | 当前日志级别 | 否   |
| logs         | `LogEntry[]`                                                 | 日志记录     | 否   |
| debug        | `(message: string, data?: unknown, module?: string) => void` | 调试日志     | 否   |
| info         | `(message: string, data?: unknown, module?: string) => void` | 信息日志     | 否   |
| warn         | `(message: string, data?: unknown, module?: string) => void` | 警告日志     | 否   |
| error        | `(message: string, data?: unknown, module?: string) => void` | 错误日志     | 否   |
| setLevel     | `(level: LogLevel) => void`                                  | 设置日志级别 | 否   |
| startMeasure | `(name: string, data?: unknown) => void`                     | 开始性能追踪 | 否   |
| endMeasure   | `(name: string) => PerformanceMetric \| null`                | 结束性能追踪 | 否   |
| clear        | `() => void`                                                 | 清空日志     | 否   |
| getMetrics   | `() => PerformanceMetric[]`                                  | 获取性能指标 | 否   |
