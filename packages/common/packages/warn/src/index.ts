export type LogLevel = 'debug' | 'warn' | 'error' | 'fatal';

export interface WarnOptions {
  level?: LogLevel;
  source?: string;
  once?: boolean;
}

export interface LogEntry {
  level: LogLevel;
  msg: string;
  source?: string;
  timestamp: number;
}

export type LogHandler = (entry: LogEntry) => void;

export interface WarnContext {
  warn: (msg: string, options?: WarnOptions) => void;
  error: (msg: string, options?: WarnOptions) => void;
  debug: (msg: string, options?: WarnOptions) => void;
  fatal: (msg: string, options?: WarnOptions) => void;
  setLevel: (level: LogLevel) => void;
  getLevel: () => LogLevel;
  setHandler: (handler: LogHandler | null) => void;
  resetWarned: () => void;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  warn: 1,
  error: 2,
  fatal: 3,
};

let currentLevel: LogLevel = 'warn';
let customHandler: LogHandler | null = null;
const warnedSet = new Set<string>();

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel];
}

function formatMessage(entry: LogEntry): string {
  const source = entry.source ? ` (at ${entry.source})` : '';
  return `[Lyt.js ${entry.level}] ${entry.msg}${source}`;
}

function log(level: LogLevel, msg: string, options?: WarnOptions): void {
  if (!shouldLog(level)) return;

  if (options?.once) {
    const key = `${msg}:${options.source || ''}`;
    if (warnedSet.has(key)) return;
    warnedSet.add(key);
  }

  const entry: LogEntry = {
    level,
    msg,
    source: options?.source,
    timestamp: Date.now(),
  };

  if (customHandler) {
    customHandler(entry);
  } else {
    const formatted = formatMessage(entry);
    if (level === 'error' || level === 'fatal') {
      console.error(formatted);
    } else {
      console.warn(formatted);
    }
  }

  if (level === 'fatal') {
    // 浏览器环境检测：避免在非 Node.js 环境调用 process.exit
    if (typeof process !== 'undefined' && process.exit) {
      process.exit(1);
    } else {
      throw new Error(`[Lyt.js fatal] ${msg}`);
    }
  }
}

export function warn(msg: string, options?: WarnOptions): void {
  log('warn', msg, options);
}

export function error(msg: string, options?: WarnOptions): void {
  log('error', msg, options);
}

export function debug(msg: string, options?: WarnOptions): void {
  log('debug', msg, options);
}

export function fatal(msg: string, options?: WarnOptions): void {
  log('fatal', msg, options);
}

export function setLevel(level: LogLevel): void {
  currentLevel = level;
}

export function setHandler(handler: LogHandler | null): void {
  customHandler = handler;
}

export function resetWarned(): void {
  warnedSet.clear();
}

export function getLevel(): LogLevel {
  return currentLevel;
}

/**
 * 创建一个独立的警告上下文
 * 用于需要隔离日志状态的场景（如多实例、测试环境等）
 * @returns 独立的 WarnContext 对象
 */
export function createWarnContext(): WarnContext {
  let localLevel: LogLevel = 'warn';
  let localHandler: LogHandler | null = null;
  const localWarnedSet = new Set<string>();

  function localLog(level: LogLevel, msg: string, options?: WarnOptions): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[localLevel]) return;

    if (options?.once) {
      const key = `${msg}:${options.source || ''}`;
      if (localWarnedSet.has(key)) return;
      localWarnedSet.add(key);
    }

    const entry: LogEntry = {
      level,
      msg,
      source: options?.source,
      timestamp: Date.now(),
    };

    if (localHandler) {
      localHandler(entry);
    } else {
      const formatted = formatMessage(entry);
      if (level === 'error' || level === 'fatal') {
        console.error(formatted);
      } else {
        console.warn(formatted);
      }
    }

    if (level === 'fatal') {
      if (typeof process !== 'undefined' && process.exit) {
        process.exit(1);
      } else {
        throw new Error(`[Lyt.js fatal] ${msg}`);
      }
    }
  }

  return {
    warn: (msg: string, options?: WarnOptions) => localLog('warn', msg, options),
    error: (msg: string, options?: WarnOptions) => localLog('error', msg, options),
    debug: (msg: string, options?: WarnOptions) => localLog('debug', msg, options),
    fatal: (msg: string, options?: WarnOptions) => localLog('fatal', msg, options),
    setLevel: (level: LogLevel) => {
      localLevel = level;
    },
    getLevel: () => localLevel,
    setHandler: (handler: LogHandler | null) => {
      localHandler = handler;
    },
    resetWarned: () => {
      localWarnedSet.clear();
    },
  };
}
