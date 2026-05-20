/**
 * LytJS 性能监控集成
 *
 * 功能：
 * - Core Web Vitals 监控
 * - 自定义性能指标
 * - 错误追踪
 * - 性能报告
 */

interface PerformanceMetrics {
  fcp: number | null;
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  ttfb: number | null;
  fmp: number | null;
}

interface PerformanceReport {
  metrics: PerformanceMetrics;
  customMetrics: Map<string, number>;
  errors: Error[];
  timestamp: number;
  url: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    fmp: null,
  };

  private customMetrics: Map<string, number> = new Map();
  private errors: Error[] = [];
  private marks: Map<string, number> = new Map();
  private measures: Map<string, number> = new Map();
  private observers: any[] = [];
  private reportCallback: ((report: PerformanceReport) => void) | null = null;

  constructor() {
    this.initWebVitals();
  }

  // 初始化 Web Vitals 监控
  private initWebVitals() {
    if (typeof window === 'undefined') return;

    // TTFB 监控
    this.measureTTFB();

    // FCP 监控
    this.observeFCP();

    // LCP 监控
    this.observeLCP();

    // CLS 监控
    this.observeCLS();

    // FID 监控
    this.observeFID();
  }

  private measureTTFB() {
    if (typeof performance !== 'undefined') {
      const navigation = performance.getEntriesByType('navigation')[0] as any;
      if (navigation) {
        this.metrics.ttfb = navigation.responseStart;
        this.reportMetric('ttfb', navigation.responseStart);
      }
    }
  }

  private observeFCP() {
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (entry.name === 'first-contentful-paint') {
              this.metrics.fcp = entry.startTime;
              this.reportMetric('fcp', entry.startTime);
            }
          });
        });
        observer.observe({ entryTypes: ['paint'] });
        this.observers.push(observer);
      } catch (e) {
        // 降级方案
        setTimeout(() => {
          if (!this.metrics.fcp) {
            this.metrics.fcp = performance.now();
          }
        }, 5000);
      }
    }
  }

  private observeLCP() {
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          this.metrics.lcp = lastEntry.startTime;
          this.reportMetric('lcp', lastEntry.startTime);
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(observer);
      } catch (e) {
        // 降级方案
      }
    }
  }

  private observeCLS() {
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          let clsValue = 0;
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          if (clsValue > (this.metrics.cls || 0)) {
            this.metrics.cls = clsValue;
            this.reportMetric('cls', clsValue);
          }
        });
        observer.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(observer);
      } catch (e) {
        // 降级方案
      }
    }
  }

  private observeFID() {
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            const fid = entry.processingStart - entry.startTime;
            if (!this.metrics.fid || fid < this.metrics.fid) {
              this.metrics.fid = fid;
              this.reportMetric('fid', fid);
            }
          });
        });
        observer.observe({ entryTypes: ['first-input'] });
        this.observers.push(observer);
      } catch (e) {
        // 降级方案
      }
    }
  }

  // 自定义性能标记
  mark(name: string) {
    if (typeof performance !== 'undefined') {
      performance.mark(name);
    }
    this.marks.set(name, Date.now());
  }

  // 测量两个标记之间的时间
  measure(name: string, startMark: string, endMark: string) {
    let duration = 0;

    if (typeof performance !== 'undefined') {
      try {
        performance.measure(name, startMark, endMark);
        const entries = performance.getEntriesByName(name, 'measure');
        if (entries.length > 0) {
          duration = entries[0].duration;
        }
      } catch (e) {
        // 降级计算
        const start = this.marks.get(startMark);
        const end = this.marks.get(endMark);
        if (start && end) {
          duration = end - start;
        }
      }
    }

    this.measures.set(name, duration);
    this.customMetrics.set(name, duration);
    return duration;
  }

  // 记录自定义指标
  recordMetric(name: string, value: number) {
    this.customMetrics.set(name, value);
    this.reportMetric(name, value);
  }

  // 记录错误
  trackError(error: Error) {
    this.errors.push(error);
    console.error('[LytJS Performance Monitor] Error tracked:', error);
  }

  // 设置报告回调
  onReport(callback: (report: PerformanceReport) => void) {
    this.reportCallback = callback;
  }

  // 生成报告
  generateReport(): PerformanceReport {
    return {
      metrics: { ...this.metrics },
      customMetrics: new Map(this.customMetrics),
      errors: [...this.errors],
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    };
  }

  // 发送报告
  sendReport(url: string) {
    const report = this.generateReport();

    if (this.reportCallback) {
      this.reportCallback(report);
    }

    if (typeof fetch !== 'undefined') {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      }).catch((err) => {
        console.error('Failed to send performance report:', err);
      });
    }

    return report;
  }

  // 打印性能报告
  printReport() {
    const report = this.generateReport();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('           LytJS Performance Report');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  URL:            ${report.url}`);
    console.log(`  Time:           ${new Date(report.timestamp).toLocaleString()}`);
    console.log('');
    console.log('  Core Web Vitals:');
    console.log(
      `    FCP (First Contentful Paint):  ${report.metrics.fcp ? report.metrics.fcp.toFixed(2) + 'ms' : 'N/A'}`,
    );
    console.log(
      `    LCP (Largest Contentful Paint): ${report.metrics.lcp ? report.metrics.lcp.toFixed(2) + 'ms' : 'N/A'}`,
    );
    console.log(
      `    FID (First Input Delay):        ${report.metrics.fid ? report.metrics.fid.toFixed(2) + 'ms' : 'N/A'}`,
    );
    console.log(
      `    CLS (Cumulative Layout Shift):  ${report.metrics.cls ? report.metrics.cls.toFixed(4) : 'N/A'}`,
    );
    console.log(
      `    TTFB (Time to First Byte):      ${report.metrics.ttfb ? report.metrics.ttfb.toFixed(2) + 'ms' : 'N/A'}`,
    );

    if (report.customMetrics.size > 0) {
      console.log('\n  Custom Metrics:');
      report.customMetrics.forEach((value, name) => {
        console.log(`    ${name}: ${value.toFixed(2)}ms`);
      });
    }

    if (report.errors.length > 0) {
      console.log(`\n  Errors (${report.errors.length}):`);
      report.errors.forEach((err, idx) => {
        console.log(`    ${idx + 1}. ${err.message}`);
      });
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return report;
  }

  // 清理
  cleanup() {
    this.observers.forEach((observer) => {
      try {
        observer.disconnect();
      } catch (e) {
        // 忽略断开错误
      }
    });
    this.observers = [];
  }
}

// 创建全局监控实例
let globalMonitor: PerformanceMonitor | null = null;

function getPerformanceMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor();
  }
  return globalMonitor;
}

function resetPerformanceMonitor() {
  if (globalMonitor) {
    globalMonitor.cleanup();
  }
  globalMonitor = new PerformanceMonitor();
  return globalMonitor;
}

export {
  PerformanceMonitor,
  PerformanceMetrics,
  PerformanceReport,
  getPerformanceMonitor,
  resetPerformanceMonitor,
};

if (typeof require !== 'undefined' && require.main === module) {
  console.log('🧪 LytJS 性能监控模块');
  console.log('📊 功能特性:');
  console.log('   - Core Web Vitals 监控');
  console.log('   - 自定义性能指标');
  console.log('   - 错误追踪');
  console.log('   - 性能报告生成');

  // 测试示例
  const monitor = new PerformanceMonitor();
  monitor.mark('app-start');

  setTimeout(() => {
    monitor.mark('app-ready');
    monitor.measure('app-startup', 'app-start', 'app-ready');
    monitor.printReport();
  }, 1000);
}
