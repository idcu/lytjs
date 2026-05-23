/**
 * @lytjs/devtools - v6.8.0 Debug Enhancer
 * Better debugging experience and dev tools enhancements
 */

// Simple event emitter implementation
class SimpleEventEmitter<Events extends Record<string, unknown[]>> {
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private onceListeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  on<E extends keyof Events>(event: E, handler: (...args: Events[E]) => void): void {
    if (!this.listeners.has(event as string)) {
      this.listeners.set(event as string, new Set());
    }
    this.listeners.get(event as string)!.add(handler as (...args: unknown[]) => void);
  }

  off<E extends keyof Events>(event: E, handler: (...args: Events[E]) => void): void {
    this.listeners.get(event as string)?.delete(handler as (...args: unknown[]) => void);
    this.onceListeners.get(event as string)?.delete(handler as (...args: unknown[]) => void);
  }

  emit<E extends keyof Events>(event: E, ...args: Events[E]): void {
    this.listeners.get(event as string)?.forEach((handler) => handler(...args));
    const onceHandlers = this.onceListeners.get(event as string);
    if (onceHandlers) {
      onceHandlers.forEach((handler) => handler(...args));
      this.onceListeners.delete(event as string);
    }
  }

  once<E extends keyof Events>(event: E, handler: (...args: Events[E]) => void): void {
    if (!this.onceListeners.has(event as string)) {
      this.onceListeners.set(event as string, new Set());
    }
    this.onceListeners.get(event as string)!.add(handler as (...args: unknown[]) => void);
  }

  removeAllListeners<E extends keyof Events>(event?: E): void {
    if (event) {
      this.listeners.delete(event as string);
      this.onceListeners.delete(event as string);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
    }
  }
}

function createEventEmitter<Events extends Record<string, unknown[]>>() {
  return new SimpleEventEmitter<Events>();
}

// ===== Debug Log System =====

/** Log levels */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'trace';

/** Log entry */
export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  metadata?: Record<string, unknown>;
  stack?: string;
}

/** Debug options */
export interface DebugOptions {
  /** Enabled log levels */
  enabledLevels?: LogLevel[];
  /** Maximum log records */
  maxLogs?: number;
  /** Whether to output to console */
  consoleOutput?: boolean;
  /** Whether to capture stack traces */
  captureStackTraces?: boolean;
}

const DEFAULT_DEBUG_OPTIONS: Required<DebugOptions> = {
  enabledLevels: ['debug', 'info', 'warn', 'error', 'trace'],
  maxLogs: 1000,
  consoleOutput: true,
  captureStackTraces: false,
};

// Log storage
const logs: LogEntry[] = [];

// Configuration
let debugOptions: Required<DebugOptions> = { ...DEFAULT_DEBUG_OPTIONS };

// Event emitter
type DebugEvents = {
  log: [entry: LogEntry];
  clear: [];
};

const debugEmitter = createEventEmitter<DebugEvents>();

/**
 * Initialize debug system
 */
export function initDebugEnhancer(options?: DebugOptions): void {
  debugOptions = { ...DEFAULT_DEBUG_OPTIONS, ...options };
}

/**
 * Log a debug message
 */
export function log(
  level: LogLevel,
  category: string,
  message: string,
  metadata?: Record<string, unknown>,
): LogEntry {
  const entry: LogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    level,
    category,
    message,
    metadata,
    stack: debugOptions.captureStackTraces ? new Error().stack : undefined,
  };

  // Add to logs
  if (debugOptions.enabledLevels.includes(level)) {
    logs.push(entry);

    // Limit log count
    if (logs.length > debugOptions.maxLogs) {
      logs.shift();
    }

    // Output to console
    if (debugOptions.consoleOutput) {
      outputToConsole(entry);
    }

    // Emit event
    debugEmitter.emit('log', entry);
  }

  return entry;
}

/**
 * Convenience log methods
 */
export const debug = (category: string, message: string, metadata?: Record<string, unknown>) =>
  log('debug', category, message, metadata);

export const info = (category: string, message: string, metadata?: Record<string, unknown>) =>
  log('info', category, message, metadata);

export const warn = (category: string, message: string, metadata?: Record<string, unknown>) =>
  log('warn', category, message, metadata);

export const error = (category: string, message: string, metadata?: Record<string, unknown>) =>
  log('error', category, message, metadata);

export const trace = (category: string, message: string, metadata?: Record<string, unknown>) =>
  log('trace', category, message, metadata);

/**
 * Output to console
 */
function outputToConsole(entry: LogEntry): void {
  const levelStyles: Record<LogLevel, string> = {
    debug: 'color: #888;',
    info: 'color: #1890ff;',
    warn: 'color: #faad14;',
    error: 'color: #ff4d4f;',
    trace: 'color: #722ed1;',
  };

  const prefix = `%c[LytJS] [${entry.category}]`;

  switch (entry.level) {
    case 'error':
      console.error(prefix, levelStyles[entry.level], entry.message, entry.metadata || '');
      break;
    case 'warn':
      console.warn(prefix, levelStyles[entry.level], entry.message, entry.metadata || '');
      break;
    default:
      // eslint-disable-next-line no-console
      console.log(prefix, levelStyles[entry.level], entry.message, entry.metadata || '');
  }
}

/**
 * Get logs
 */
export function getLogs(options?: {
  level?: LogLevel;
  category?: string;
  limit?: number;
}): LogEntry[] {
  let result = [...logs];

  if (options?.level) {
    result = result.filter((l) => l.level === options.level);
  }

  if (options?.category) {
    result = result.filter((l) => l.category === options.category);
  }

  if (options?.limit) {
    result = result.slice(-options.limit);
  }

  return result;
}

/**
 * Clear logs
 */
export function clearLogs(): void {
  logs.length = 0;
  debugEmitter.emit('clear');
}

/**
 * Subscribe to log events
 */
export function onLog(callback: (entry: LogEntry) => void): () => void {
  debugEmitter.on('log', callback);
  return () => debugEmitter.off('log', callback);
}

/**
 * Subscribe to clear events
 */
export function onClear(callback: () => void): () => void {
  debugEmitter.on('clear', callback);
  return () => debugEmitter.off('clear', callback);
}

// ===== Breakpoint and Debug Tools =====

/**
 * Create a debug breakpoint
 */
export function createDebugger(category: string, condition?: () => boolean): () => void {
  return (metadata?: Record<string, unknown>) => {
    if (condition && !condition()) return;

    debug(category, 'Debugger triggered', metadata);

    // eslint-disable-next-line no-debugger
    debugger;
  };
}

/**
 * Performance measurement decorator
 */
export function measurePerformance(
  name: string,
  category: string = 'performance',
): <T extends (...args: unknown[]) => unknown>(fn: T) => T {
  return <T extends (...args: unknown[]) => unknown>(fn: T): T => {
    const wrapped = (...args: unknown[]) => {
      const start = performance.now();
      try {
        const result = fn(...args);
        const duration = performance.now() - start;
        debug(category, `${name} executed`, { duration, args });
        return result;
      } catch (err) {
        const duration = performance.now() - start;
        const errorObj = err instanceof Error ? err : new Error(String(err));
        error(category, `${name} failed`, { duration, error: errorObj, args });
        throw err;
      }
    };
    return wrapped as T;
  };
}

/**
 * Async performance measurement
 */
export async function measureAsyncPerformance<T>(
  name: string,
  fn: () => Promise<T>,
  category: string = 'performance',
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    debug(category, `${name} async executed`, { duration });
    return result;
  } catch (err) {
    const duration = performance.now() - start;
    const errorObj = err instanceof Error ? err : new Error(String(err));
    error(category, `${name} async failed`, { duration, error: errorObj });
    throw err;
  }
}

// ===== State Checkpoints =====

interface Checkpoint {
  id: string;
  name: string;
  timestamp: number;
  state: Record<string, unknown>;
}

const checkpoints: Checkpoint[] = [];

/**
 * Create a checkpoint
 */
export function createCheckpoint(name: string, state: Record<string, unknown>): string {
  const checkpoint: Checkpoint = {
    id: `checkpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    timestamp: Date.now(),
    state: JSON.parse(JSON.stringify(state)),
  };

  checkpoints.push(checkpoint);

  debug('checkpoint', `Checkpoint created: ${name}`, { id: checkpoint.id });

  return checkpoint.id;
}

/**
 * Get checkpoints
 */
export function getCheckpoints(): Checkpoint[] {
  return [...checkpoints];
}

/**
 * Compare checkpoints
 */
export function compareCheckpoints(
  id1: string,
  id2: string,
): {
  added: string[];
  removed: string[];
  changed: string[];
} {
  const cp1 = checkpoints.find((c) => c.id === id1);
  const cp2 = checkpoints.find((c) => c.id === id2);

  if (!cp1 || !cp2) {
    return { added: [], removed: [], changed: [] };
  }

  const keys1 = Object.keys(cp1.state);
  const keys2 = Object.keys(cp2.state);
  const allKeys = new Set([...keys1, ...keys2]);

  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  allKeys.forEach((key) => {
    const in1 = keys1.includes(key);
    const in2 = keys2.includes(key);

    if (in1 && !in2) {
      removed.push(key);
    } else if (!in1 && in2) {
      added.push(key);
    } else if (in1 && in2) {
      if (JSON.stringify(cp1.state[key]) !== JSON.stringify(cp2.state[key])) {
        changed.push(key);
      }
    }
  });

  return { added, removed, changed };
}

/**
 * Clear checkpoints
 */
export function clearCheckpoints(): void {
  checkpoints.length = 0;
}

// ===== Global Debug Tools =====

/**
 * Install to global object (browser environment)
 */
export function installGlobalDebugTools(): void {
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__lytjsDebug = {
      log,
      debug,
      info,
      warn,
      error,
      trace,
      getLogs,
      clearLogs,
      createDebugger,
      measurePerformance,
      measureAsyncPerformance,
      createCheckpoint,
      getCheckpoints,
      compareCheckpoints,
      clearCheckpoints,
      initDebugEnhancer,
    };

    info('debug', 'LytJS Debug Tools installed globally. Use __lytjsDebug to access');
  }
}

/**
 * Serialize debug info
 */
export function serializeDebugInfo(): string {
  let result = '[Debug] Debug Info\n\n';

  result += `[Log] Log records (${logs.length} entries)\n`;
  const recentLogs = logs.slice(-10);
  recentLogs.forEach((entry) => {
    result += `  [${entry.level}] ${entry.category}: ${entry.message}\n`;
  });

  if (checkpoints.length > 0) {
    result += `\n[Checkpoint] Checkpoints (${checkpoints.length} entries)\n`;
    checkpoints.forEach((cp) => {
      result += `  ${cp.name} (${new Date(cp.timestamp).toLocaleTimeString()})\n`;
    });
  }

  return result;
}
