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
    process.exit(1);
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
