/**
 * @lytjs/performance — 上报器
 *
 * 提供多种上报方式：
 * - ConsoleReporter: 开发环境，输出到控制台
 * - FetchReporter: 生产环境，通过 fetch API 上报到自定义端点
 * - 支持自定义上报器接口
 * - 支持批量上报
 *
 * 零运行时依赖。
 */

import type {
  Reporter,
  ReporterConfig,
  ReportData,
} from './types';

// ============================================================
// ConsoleReporter — 控制台上报器
// ============================================================

/**
 * 控制台上报器
 *
 * 将性能数据输出到浏览器控制台，适用于开发环境。
 */
export class ConsoleReporter implements Reporter {
  private debug: boolean;
  private prefix: string;

  constructor(debug?: boolean) {
    this.debug = debug ?? false;
    this.prefix = '[lyt:performance]';
  }

  report(data: ReportData): void {
    const style = 'color: #6366f1; font-weight: bold;';
    const typeStyle = 'color: #a78bfa;';

    switch (data.type) {
      case 'vitals':
        console.group(`%c${this.prefix} Web Vitals`, style);
        console.log('%cType:', typeStyle, data.type);
        console.log('%cData:', typeStyle, data.data);
        console.log('%cTime:', typeStyle, new Date(data.timestamp).toISOString());
        console.groupEnd();
        break;

      case 'component':
        console.group(`%c${this.prefix} Component Render`, style);
        console.log('%cType:', typeStyle, data.type);
        console.log('%cData:', typeStyle, data.data);
        console.groupEnd();
        break;

      case 'memory':
        console.group(`%c${this.prefix} Memory`, style);
        console.log('%cType:', typeStyle, data.type);
        console.log('%cData:', typeStyle, data.data);
        console.groupEnd();
        break;

      default:
        if (this.debug) {
          console.log(`${this.prefix}`, data);
        }
        break;
    }
  }

  destroy(): void {
    // 无需清理
  }
}

// ============================================================
// FetchReporter — Fetch 上报器
// ============================================================

/**
 * Fetch 上报器
 *
 * 通过 fetch API 将性能数据上报到自定义端点。
 * 支持：
 * - 批量上报（减少请求次数）
 * - 采样率控制
 * - sendBeacon 降级（页面卸载时）
 */
export class FetchReporter implements Reporter {
  private endpoint: string;
  private sampleRate: number;
  private batchEnabled: boolean;
  private batchMaxSize: number;
  private batchInterval: number;
  private batchQueue: ReportData[];
  private batchTimer: ReturnType<typeof setInterval> | null;
  private debug: boolean;

  constructor(endpoint: string, options?: {
    sampleRate?: number;
    batch?: { enabled: boolean; maxSize: number; interval: number };
    debug?: boolean;
  }) {
    this.endpoint = endpoint;
    this.sampleRate = options?.sampleRate ?? 1.0;
    this.batchEnabled = options?.batch?.enabled ?? false;
    this.batchMaxSize = options?.batch?.maxSize ?? 10;
    this.batchInterval = options?.batch?.interval ?? 5000;
    this.batchQueue = [];
    this.batchTimer = null;
    this.debug = options?.debug ?? false;

    if (this.batchEnabled) {
      this.startBatchTimer();
    }
  }

  report(data: ReportData): void {
    // 采样率控制
    if (this.sampleRate < 1.0 && Math.random() > this.sampleRate) {
      return;
    }

    if (this.batchEnabled) {
      this.batchQueue.push(data);
      if (this.batchQueue.length >= this.batchMaxSize) {
        this.flush();
      }
    } else {
      this.send(data);
    }
  }

  private send(data: ReportData): void {
    try {
      // 优先使用 sendBeacon（页面卸载时更可靠）
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(data)], {
          type: 'application/json',
        });
        const sent = navigator.sendBeacon(this.endpoint, blob);
        if (!sent && this.debug) {
          // sendBeacon 失败时降级到 fetch
          this.fetchSend(data);
        }
      } else if (typeof fetch !== 'undefined') {
        this.fetchSend(data);
      }
    } catch {
      // 静默失败
      if (this.debug) {
        console.warn('[lyt:performance] Report failed');
      }
    }
  }

  private fetchSend(data: ReportData): void {
    fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      keepalive: true,
    }).catch(() => {
      // 静默失败
    });
  }

  private startBatchTimer(): void {
    if (typeof setInterval === 'undefined') return;
    this.batchTimer = setInterval(() => {
      this.flush();
    }, this.batchInterval);
  }

  private flush(): void {
    if (this.batchQueue.length === 0) return;

    const batch = this.batchQueue.splice(0, this.batchMaxSize);
    const data: ReportData = {
      type: 'custom',
      data: { __batch: true, items: batch },
      timestamp: Date.now(),
      url: typeof location !== 'undefined' ? location.href : '',
    };

    this.send(data);
  }

  destroy(): void {
    if (this.batchTimer !== null) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    // 发送剩余的批量数据
    this.flush();
  }
}

// ============================================================
// 工厂函数
// ============================================================

/**
 * 创建上报器
 *
 * 根据配置创建对应类型的上报器实例。
 *
 * @param reporterConfig - 上报器配置
 * @returns Reporter 实例
 *
 * @example
 * ```ts
 * // 开发环境：控制台上报
 * const reporter = createReporter({ type: 'console' });
 *
 * // 生产环境：Fetch 上报
 * const reporter = createReporter({
 *   type: 'fetch',
 *   endpoint: 'https://example.com/api/performance',
 *   sampleRate: 0.5,
 *   batch: { enabled: true, maxSize: 10, interval: 5000 },
 * });
 *
 * // 自定义上报器
 * const reporter = createReporter({
 *   type: 'custom',
 *   reporter: { report(data) { ... } },
 * });
 * ```
 */
export function createReporter(reporterConfig?: ReporterConfig): Reporter {
  if (!reporterConfig || reporterConfig.type === 'console') {
    return new ConsoleReporter(reporterConfig?.debug);
  }

  if (reporterConfig.type === 'fetch') {
    if (!reporterConfig.endpoint) {
      console.warn('[lyt:performance] FetchReporter requires an endpoint, falling back to ConsoleReporter');
      return new ConsoleReporter(reporterConfig.debug);
    }
    return new FetchReporter(reporterConfig.endpoint, {
      sampleRate: reporterConfig.sampleRate,
      batch: reporterConfig.batch,
      debug: reporterConfig.debug,
    });
  }

  if (reporterConfig.type === 'custom' && reporterConfig.reporter) {
    return reporterConfig.reporter;
  }

  // 默认回退到 ConsoleReporter
  return new ConsoleReporter(reporterConfig.debug);
}
