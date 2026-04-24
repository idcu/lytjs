// Lyt.js 日志插件
//
// 用法：
//   import { createLogger } from '@lytjs/plugin-logger'
//   const logger = createLogger({
//     level: 'debug',
//     prefix: '[Lyt]',
//     persist: true,  // 持久化到 localStorage
//     maxLogs: 1000,
//   })
//   app.use(logger)
//   // 使用：logger.info('message')
//   //        logger.warn('message')
//   //        logger.error('message')
//   //        logger.debug('message')

// ======================== 类型定义 ========================

/** 日志级别 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

/** 日志插件配置选项 */
interface LoggerOptions {
  /** 日志级别，默认 'info' */
  level?: LogLevel
  /** 日志前缀 */
  prefix?: string
  /** 是否持久化到 localStorage，默认 false */
  persist?: boolean
  /** 最大日志条数，默认 1000 */
  maxLogs?: number
  /** 是否显示时间戳，默认 true */
  timestamp?: boolean
  /** 格式化模板，例如 '{timestamp} [{level}] {prefix} {message}' */
  format?: string
  /** 自定义日志传输（如发送到服务器） */
  transport?: (log: LogEntry) => void
}

/** 日志条目 */
interface LogEntry {
  /** 日志级别 */
  level: LogLevel
  /** 日志消息 */
  message: string
  /** 时间戳（毫秒） */
  timestamp: number
  /** 附加参数 */
  args: any[]
}

/** 日志插件实例 */
interface Logger {
  /** 安装到 Lyt 应用 */
  install: (app: any, options?: any) => void
  /** 调试日志 */
  debug(...args: any[]): void
  /** 信息日志 */
  info(...args: any[]): void
  /** 警告日志 */
  warn(...args: any[]): void
  /** 错误日志 */
  error(...args: any[]): void
  /** 设置日志级别 */
  setLevel(level: LogLevel): void
  /** 获取当前日志级别 */
  getLevel(): LogLevel
  /** 获取所有日志记录 */
  getLogs(): LogEntry[]
  /** 清除日志记录 */
  clearLogs(): void
  /** 销毁日志实例 */
  destroy(): void
}

// ======================== 常量与工具 ========================

/** 日志级别优先级映射（数值越大优先级越高） */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
}

/** ANSI 颜色码 */
const ANSI_COLORS: Record<string, string> = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',     // debug - 灰色
  blue: '\x1b[36m',     // info - 青蓝色
  yellow: '\x1b[33m',   // warn - 黄色
  red: '\x1b[31m',      // error - 红色
  bold: '\x1b[1m',
}

/** localStorage 中存储日志的 key */
const STORAGE_KEY = 'lyt_logger_logs'

/**
 * 格式化时间戳为 ISO 字符串
 */
function formatTimestamp(ts: number): string {
  return new Date(ts).toISOString()
}

/**
 * 将任意值序列化为可读字符串
 */
function serialize(args: any[]): string {
  return args.map((arg) => {
    if (arg === null) return 'null'
    if (arg === undefined) return 'undefined'
    if (typeof arg === 'string') return arg
    if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg)
    if (arg instanceof Error) return `${arg.message}\n${arg.stack || ''}`
    try {
      return JSON.stringify(arg, null, 2)
    } catch {
      return String(arg)
    }
  }).join(' ')
}

/**
 * 获取日志级别对应的 ANSI 颜色
 */
function getLevelColor(level: LogLevel): string {
  switch (level) {
    case 'debug': return ANSI_COLORS.gray
    case 'info': return ANSI_COLORS.blue
    case 'warn': return ANSI_COLORS.yellow
    case 'error': return ANSI_COLORS.red
    default: return ANSI_COLORS.reset
  }
}

/**
 * 获取日志级别对应的标签
 */
function getLevelLabel(level: LogLevel): string {
  return level.toUpperCase().padEnd(5)
}

// ======================== 核心实现 ========================

/**
 * 创建日志插件实例
 * @param options 日志配置
 * @returns Logger 插件实例
 */
function createLogger(options?: LoggerOptions): Logger {
  const {
    level: initialLevel = 'info',
    prefix = '',
    persist = false,
    maxLogs = 1000,
    timestamp = true,
    format,
    transport,
  } = options || {}

  // 当前日志级别
  let currentLevel: LogLevel = initialLevel

  // 内存中的日志记录
  let logEntries: LogEntry[] = []

  // 是否已销毁
  let destroyed = false

  // 从 localStorage 恢复日志（如果启用持久化）
  if (persist) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        logEntries = JSON.parse(stored) as LogEntry[]
      }
    } catch {
      // localStorage 不可用或数据损坏时静默忽略
      logEntries = []
    }
  }

  /**
   * 将日志持久化到 localStorage
   */
  function persistLogs(): void {
    if (!persist) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logEntries))
    } catch {
      // localStorage 不可用或空间不足时静默忽略
    }
  }

  /**
   * 格式化日志消息
   */
  function formatMessage(entry: LogEntry): string {
    // 如果提供了自定义格式模板，使用模板格式化
    if (format) {
      return format
        .replace('{timestamp}', timestamp ? formatTimestamp(entry.timestamp) : '')
        .replace('{level}', getLevelLabel(entry.level))
        .replace('{prefix}', prefix)
        .replace('{message}', entry.message)
    }

    // 默认格式：[时间] [前缀] 级别  消息
    const parts: string[] = []
    if (timestamp) {
      parts.push(formatTimestamp(entry.timestamp))
    }
    if (prefix) {
      parts.push(prefix)
    }
    parts.push(`${getLevelLabel(entry.level)}  ${entry.message}`)
    return parts.join(' ')
  }

  /**
   * 核心日志输出函数
   */
  function log(level: LogLevel, args: any[]): void {
    // 已销毁或级别不足时忽略
    if (destroyed) return
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[currentLevel]) return

    const entry: LogEntry = {
      level,
      message: serialize(args),
      timestamp: Date.now(),
      args: [...args],
    }

    // 添加到内存日志列表
    logEntries.push(entry)

    // 限制最大日志条数（FIFO）
    if (logEntries.length > maxLogs) {
      logEntries = logEntries.slice(logEntries.length - maxLogs)
    }

    // 持久化
    persistLogs()

    // 控制台彩色输出
    const color = getLevelColor(level)
    const formatted = formatMessage(entry)
    const coloredOutput = `${color}${formatted}${ANSI_COLORS.reset}`

    // 根据级别选择对应的 console 方法
    switch (level) {
      case 'debug':
        console.debug(coloredOutput, ...args)
        break
      case 'info':
        console.info(coloredOutput, ...args)
        break
      case 'warn':
        console.warn(coloredOutput, ...args)
        break
      case 'error':
        console.error(coloredOutput, ...args)
        break
    }

    // 自定义传输
    if (transport) {
      try {
        transport(entry)
      } catch {
        // 传输失败不影响日志记录
      }
    }
  }

  // 构造插件实例
  const logger: Logger = {
    /**
     * 安装插件到 Lyt 应用
     * 向 app 注入 $logger 对象
     */
    install(app: any, _options?: any): void {
      // 注入全局属性 $logger
      app.config = app.config || {}
      app.config.globalProperties = app.config.globalProperties || {}

      app.config.globalProperties.$logger = logger

      // 如果 app 提供 provide 方法，也通过 provide 注入
      if (typeof app.provide === 'function') {
        app.provide('logger', logger)
      }
    },

    /** 调试日志 */
    debug(...args: any[]): void {
      log('debug', args)
    },

    /** 信息日志 */
    info(...args: any[]): void {
      log('info', args)
    },

    /** 警告日志 */
    warn(...args: any[]): void {
      log('warn', args)
    },

    /** 错误日志 */
    error(...args: any[]): void {
      log('error', args)
    },

    /** 设置日志级别 */
    setLevel(level: LogLevel): void {
      currentLevel = level
    },

    /** 获取当前日志级别 */
    getLevel(): LogLevel {
      return currentLevel
    },

    /** 获取所有日志记录 */
    getLogs(): LogEntry[] {
      return [...logEntries]
    },

    /** 清除日志记录 */
    clearLogs(): void {
      logEntries = []
      if (persist) {
        try {
          localStorage.removeItem(STORAGE_KEY)
        } catch {
          // 静默忽略
        }
      }
    },

    /** 销毁日志实例，释放资源 */
    destroy(): void {
      destroyed = true
      logEntries = []
      if (persist) {
        try {
          localStorage.removeItem(STORAGE_KEY)
        } catch {
          // 静默忽略
        }
      }
    },
  }

  return logger
}

export { createLogger }
export type { Logger, LoggerOptions, LogLevel, LogEntry }
