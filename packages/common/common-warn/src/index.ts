/**
 * @lytjs/common-warn
 * 框架级警告系统
 *
 * 提供统一的日志/警告输出接口，支持级别控制、去重和自定义处理器。
 */

// ============================================================
// 类型定义
// ============================================================

/** 日志级别 */
export type LogLevel = 'debug' | 'warn' | 'error' | 'fatal';

/** 日志条目 */
export interface LogEntry {
  level: LogLevel;
  msg: string;
  source?: string;
  timestamp: number;
}

/** 自定义日志处理器 */
export type LogHandler = (entry: LogEntry) => void;

/** 警告选项 */
export interface WarnOptions {
  /** 日志级别，默认 'warn' */
  level?: LogLevel;
  /** 警告来源（如组件名） */
  source?: string;
  /** 只警告一次（基于 msg+source 去重） */
  once?: boolean;
}

// ============================================================
// 内部状态
// ============================================================

/** 级别优先级映射（数值越大优先级越高） */
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  warn: 1,
  error: 2,
  fatal: 3,
};

/** 当前最低输出级别 */
let currentLevel: LogLevel = 'warn';

/** 自定义处理器（null 表示使用默认处理器） */
let customHandler: LogHandler | null = null;

/** once 去重缓存 */
const onceCache = new Set<string>();

// ============================================================
// 默认处理器
// ============================================================

/**
 * 默认日志处理器
 * 格式: [Lyt.js warn] msg (at source)
 */
function defaultHandler(entry: LogEntry): void {
  const prefix = `[Lyt.js ${entry.level}]`;
  const suffix = entry.source ? ` (at ${entry.source})` : '';
  const message = `${prefix} ${entry.msg}${suffix}`;

  switch (entry.level) {
    case 'debug':
      console.debug(message);
      break;
    case 'warn':
      console.warn(message);
      break;
    case 'error':
    case 'fatal':
      console.error(message);
      break;
  }
}

// ============================================================
// 核心日志函数
// ============================================================

/**
 * 判断指定级别是否应该输出
 */
function shouldOutput(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel];
}

/**
 * 生成去重 key
 */
function getOnceKey(msg: string, source?: string): string {
  return source ? `${source}::${msg}` : msg;
}

/**
 * 内部日志处理
 */
function processLog(msg: string, level: LogLevel, options?: WarnOptions): void {
  // 级别检查
  if (!shouldOutput(level)) return;

  // once 去重
  if (options?.once) {
    const key = getOnceKey(msg, options.source);
    if (onceCache.has(key)) return;
    onceCache.add(key);
  }

  const entry: LogEntry = {
    level,
    msg,
    source: options?.source,
    timestamp: Date.now(),
  };

  // 使用自定义处理器或默认处理器
  if (customHandler) {
    customHandler(entry);
  } else {
    defaultHandler(entry);
  }

  // fatal 级别输出后终止进程
  if (level === 'fatal') {
    process.exit(1);
  }
}

// ============================================================
// 公共 API
// ============================================================

/**
 * 输出警告信息
 */
export function warn(msg: string, options?: WarnOptions): void {
  processLog(msg, options?.level ?? 'warn', options);
}

/**
 * 输出错误信息
 */
export function error(msg: string, options?: WarnOptions): void {
  processLog(msg, options?.level ?? 'error', options);
}

/**
 * 输出调试信息（仅在 setLevel('debug') 时输出）
 */
export function debug(msg: string, options?: WarnOptions): void {
  processLog(msg, options?.level ?? 'debug', options);
}

/**
 * 输出致命错误信息并终止进程
 */
export function fatal(msg: string, options?: WarnOptions): void {
  processLog(msg, options?.level ?? 'fatal', options);
}

/**
 * 设置最低输出级别
 * 低于该级别的日志将被忽略
 *
 * @param level - 最低输出级别
 * @example
 * ```ts
 * setLevel('debug');  // 输出所有级别
 * setLevel('warn');   // 只输出 warn/error/fatal（默认）
 * setLevel('error');  // 只输出 error/fatal
 * ```
 */
export function setLevel(level: LogLevel): void {
  currentLevel = level;
}

/**
 * 设置自定义日志处理器
 * 传入 null 恢复默认处理器
 *
 * @param handler - 自定义处理器，或 null 恢复默认
 * @example
 * ```ts
 * setHandler((entry) => {
 *   sendToMonitoringService(entry);
 * });
 * ```
 */
export function setHandler(handler: LogHandler | null): void {
  customHandler = handler;
}

/**
 * 清除 once 去重缓存
 * 主要用于测试场景
 */
export function resetWarned(): void {
  onceCache.clear();
}
