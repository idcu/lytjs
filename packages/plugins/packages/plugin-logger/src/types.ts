/**
 * @lytjs/plugin-logger - 类型定义
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface LogEntry {
  /** 时间戳 */
  timestamp: number;
  /** 日志级别 */
  level: LogLevel;
  /** 日志消息 */
  message: string;
  /** 附加数据 */
  data?: unknown;
  /** 模块名 */
  module?: string;
}

export interface LoggerOptions {
  /** 日志级别 */
  level?: LogLevel;
  /** 是否启用持久化 */
  enablePersistence?: boolean;
  /** 本地存储 key */
  storageKey?: string;
  /** 最大日志条数 */
  maxLogs?: number;
  /** 是否启用性能追踪 */
  enablePerformance?: boolean;
  /** 是否显示时间戳 */
  showTimestamp?: boolean;
  /** 自定义格式化函数 */
  formatter?: (entry: LogEntry) => string;
}

export interface PerformanceMetric {
  /** 名称 */
  name: string;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime?: number;
  /** 持续时间 */
  duration?: number;
  /** 附加数据 */
  data?: unknown;
}

export interface LoggerInstance {
  /** 当前日志级别 */
  level: LogLevel;
  /** 日志记录 */
  logs: LogEntry[];
  /** 调试日志 */
  debug: (message: string, data?: unknown, module?: string) => void;
  /** 信息日志 */
  info: (message: string, data?: unknown, module?: string) => void;
  /** 警告日志 */
  warn: (message: string, data?: unknown, module?: string) => void;
  /** 错误日志 */
  error: (message: string, data?: unknown, module?: string) => void;
  /** 设置日志级别 */
  setLevel: (level: LogLevel) => void;
  /** 开始性能追踪 */
  startMeasure: (name: string, data?: unknown) => void;
  /** 结束性能追踪 */
  endMeasure: (name: string) => PerformanceMetric | null;
  /** 清空日志 */
  clear: () => void;
  /** 获取性能指标 */
  getMetrics: () => PerformanceMetric[];
}
