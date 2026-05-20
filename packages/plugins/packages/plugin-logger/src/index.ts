/**
 * @lytjs/plugin-logger
 *
 * LytJS official logger plugin with log levels, persistence, and performance tracing support.
 *
 * @packageDocumentation
 */

import { definePlugin } from '@lytjs/core';
import { signal } from '@lytjs/reactivity';
import type { LogLevel, LogEntry, LoggerOptions, PerformanceMetric, LoggerInstance } from './types';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

const defaultFormatter = (entry: LogEntry): string => {
  const timestamp = new Date(entry.timestamp).toISOString();
  const modulePart = entry.module ? ` [${entry.module}]` : '';
  return `[${timestamp}] ${entry.level.toUpperCase()}${modulePart}: ${entry.message}`;
};

function createLogger(options: LoggerOptions = {}): LoggerInstance {
  const {
    level = 'info',
    enablePersistence = false,
    storageKey = 'lyt-logs',
    maxLogs = 1000,
    enablePerformance = true,
    formatter = defaultFormatter,
  } = options;

  const levelSignal = signal<LogLevel>(level);
  const logsSignal = signal<LogEntry[]>([]);
  const performanceMetricsSignal = signal<PerformanceMetric[]>([]);
  const pendingMeasures = new Map<string, PerformanceMetric>();

  function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[levelSignal()];
  }

  function addLog(level: LogLevel, message: string, data?: unknown, module?: string) {
    if (!shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
      module,
    };

    const newLogs = [...logsSignal(), entry];
    if (newLogs.length > maxLogs) {
      newLogs.shift();
    }
    logsSignal.set(newLogs);

    if (enablePersistence) {
      saveLogs();
    }

    outputLog(entry);
  }

  function outputLog(entry: LogEntry) {
    const formattedMessage = formatter(entry);

    switch (entry.level) {
      case 'debug':
        console.debug(formattedMessage, entry.data || '');
        break;
      case 'info':
        console.info(formattedMessage, entry.data || '');
        break;
      case 'warn':
        console.warn(formattedMessage, entry.data || '');
        break;
      case 'error':
        console.error(formattedMessage, entry.data || '');
        break;
    }
  }

  function saveLogs() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(logsSignal()));
    } catch {
      /* empty */
    }
  }

  function loadLogs(): LogEntry[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      /* empty */
      return [];
    }
  }

  function debug(message: string, data?: unknown, module?: string) {
    addLog('debug', message, data, module);
  }

  function info(message: string, data?: unknown, module?: string) {
    addLog('info', message, data, module);
  }

  function warn(message: string, data?: unknown, module?: string) {
    addLog('warn', message, data, module);
  }

  function error(message: string, data?: unknown, module?: string) {
    addLog('error', message, data, module);
  }

  function setLevel(newLevel: LogLevel) {
    levelSignal.set(newLevel);
  }

  function startMeasure(name: string, data?: unknown) {
    if (!enablePerformance) return;

    const metric: PerformanceMetric = {
      name,
      startTime: Date.now(),
      data,
    };
    pendingMeasures.set(name, metric);
    debug(`Performance measure started: ${name}`, data, 'performance');
  }

  function endMeasure(name: string): PerformanceMetric | null {
    if (!enablePerformance) return null;

    const metric = pendingMeasures.get(name);
    if (!metric) {
      warn(`Performance measure "${name}" not found`, undefined, 'performance');
      return null;
    }

    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;

    pendingMeasures.delete(name);

    const newMetrics = [...performanceMetricsSignal(), metric];
    performanceMetricsSignal.set(newMetrics);

    info(`Performance measure "${name}": ${metric.duration}ms`, metric, 'performance');

    return metric;
  }

  function clear() {
    logsSignal.set([]);
    performanceMetricsSignal.set([]);
    pendingMeasures.clear();
    if (enablePersistence && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* empty */
      }
    }
  }

  function getMetrics(): PerformanceMetric[] {
    return performanceMetricsSignal();
  }

  function init() {
    if (enablePersistence) {
      const storedLogs = loadLogs();
      if (storedLogs.length > 0) {
        logsSignal.set(storedLogs);
      }
    }
  }

  init();

  return {
    get level() {
      return levelSignal();
    },
    get logs() {
      return logsSignal();
    },
    debug,
    info,
    warn,
    error,
    setLevel,
    startMeasure,
    endMeasure,
    clear,
    getMetrics,
  };
}

const pluginLogger = definePlugin({
  name: 'logger',
  version: '6.0.0',
  description:
    'LytJS official logger plugin with log levels, persistence, and performance tracing support',
  author: 'LytJS Team',
  keywords: ['lytjs', 'logger', 'logging', 'debug', 'performance'],
  schema: {
    type: 'object',
    object: {
      properties: {
        level: { type: 'string', default: 'info' },
        enablePersistence: { type: 'boolean', default: false },
        storageKey: { type: 'string', default: 'lyt-logs' },
        maxLogs: { type: 'number', default: 1000 },
        enablePerformance: { type: 'boolean', default: true },
      },
    },
  },
  install(app, options) {
    const logger = createLogger(options as LoggerOptions);

    app.config.globalProperties.$logger = logger;

    app.provide('lyt-logger', logger);
  },
});

export default pluginLogger;
export type { LogLevel, LogEntry, LoggerOptions, PerformanceMetric, LoggerInstance };
export { createLogger, LOG_LEVELS };
