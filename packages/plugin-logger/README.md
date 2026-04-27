# @lytjs/plugin-logger

> Lyt.js 日志插件 - 提供分级日志记录、日志过滤和持久化存储功能

**版本：** 4.2.0

## 安装

```bash
npm install @lytjs/plugin-logger
```

## 使用

### 注册插件

```typescript
import { createApp } from '@lytjs/core'
import { createLogger } from '@lytjs/plugin-logger'

const logger = createLogger({
  level: 'debug',
  prefix: '[Lyt]',
  persist: true,
  maxLogs: 1000,
})

const app = createApp({})
app.use(logger)
```

### 基本日志输出

```typescript
logger.debug('调试信息', { foo: 'bar' })
logger.info('普通信息')
logger.warn('警告信息')
logger.error('错误信息', new Error('出错了'))
```

### 动态调整日志级别

```typescript
// 开发环境使用 debug
logger.setLevel('debug')

// 生产环境使用 warn
logger.setLevel('warn')

// 关闭所有日志
logger.setLevel('silent')

// 获取当前级别
logger.getLevel() // 'warn'
```

### 自定义传输

```typescript
const logger = createLogger({
  level: 'info',
  transport: (log) => {
    // 发送日志到远程服务器
    fetch('/api/logs', {
      method: 'POST',
      body: JSON.stringify(log),
    })
  },
})
```

### 获取和清除日志

```typescript
// 获取所有日志记录
const logs = logger.getLogs()

// 清除日志记录
logger.clearLogs()

// 销毁日志实例，释放资源
logger.destroy()
```

## API

### Options

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `level` | `'debug' \| 'info' \| 'warn' \| 'error' \| 'silent'` | `'info'` | 日志级别 |
| `prefix` | `string` | `''` | 日志前缀 |
| `persist` | `boolean` | `false` | 是否持久化到 localStorage |
| `maxLogs` | `number` | `1000` | 最大日志条数（FIFO 策略） |
| `timestamp` | `boolean` | `true` | 是否显示时间戳 |
| `format` | `string` | - | 自定义格式化模板，例如 `'{timestamp} [{level}] {prefix} {message}'` |
| `transport` | `(log: LogEntry) => void` | - | 自定义日志传输（如发送到服务器） |

### 方法

| 方法 | 签名 | 描述 |
|------|------|------|
| `debug` | `(...args: any[]) => void` | 输出调试日志 |
| `info` | `(...args: any[]) => void` | 输出信息日志 |
| `warn` | `(...args: any[]) => void` | 输出警告日志 |
| `error` | `(...args: any[]) => void` | 输出错误日志 |
| `setLevel` | `(level: LogLevel) => void` | 设置日志级别 |
| `getLevel` | `() => LogLevel` | 获取当前日志级别 |
| `getLogs` | `() => LogEntry[]` | 获取所有日志记录 |
| `clearLogs` | `() => void` | 清除日志记录 |
| `destroy` | `() => void` | 销毁日志实例，释放资源 |

### 类型

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: number
  args: any[]
}
```

### 特性

- **彩色输出**：浏览器环境使用 CSS 样式，Node.js 环境使用 ANSI 颜色码
- **持久化**：支持将日志存储到 localStorage，页面刷新后可恢复
- **FIFO 策略**：超过 `maxLogs` 时自动丢弃最早的日志
- **自定义格式**：通过 `format` 选项自定义日志输出格式

## License

MIT
