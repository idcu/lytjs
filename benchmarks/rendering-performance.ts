// benchmarks/rendering-performance.ts
// 渲染性能基准测试 - v6.9.0
// 测试渲染性能和内存使用情况

import { performance } from 'node:perf_hooks';

/**
 * 渲染性能测试结果
 */
export interface RenderPerformanceResult {
  /** 测试名称 */
  testName: string;
  /** 渲染次数 */
  iterations: number;
  /** 总耗时 (ms) */
  totalTime: number;
  /** 平均每次渲染耗时 (ms) */
  averageTime: number;
  /** 中位数耗时 (ms) */
  medianTime: number;
  /** 最小耗时 (ms) */
  minTime: number;
  /** 最大耗时 (ms) */
  maxTime: number;
  /** 内存使用情况 (初始) */
  initialMemory: number;
  /** 内存使用情况 (峰值) */
  peakMemory: number;
  /** 内存使用情况 (结束) */
  finalMemory: number;
  /** 内存增长率 */
  memoryGrowth: number;
  /** 是否检测到内存泄漏 */
  potentialLeak: boolean;
}

/**
 * 性能比较结果
 */
export interface PerformanceComparison {
  /** 当前版本结果 */
  current: RenderPerformanceResult;
  /** 基线版本结果 */
  baseline?: RenderPerformanceResult;
  /** 性能差异 */
  diff: {
    averageTime: number;
    percentChange: number;
    memoryGrowth: number;
  };
  /** 是否存在性能回归 */
  hasRegression: boolean;
  /** 回归程度 */
  regressionSeverity?: 'minor' | 'moderate' | 'severe';
}

/**
 * 渲染性能基准测试
 */
export class RenderingPerformanceBenchmark {
  private results: RenderPerformanceResult[] = [];
  private baselines: Map<string, RenderPerformanceResult> = new Map();

  /**
   * 运行渲染性能测试
   */
  runRenderingTest(
    testName: string,
    renderFn: (iteration: number) => void,
    options: {
      iterations: number;
      warmupIterations?: number;
    } = { iterations: 100 },
  ): RenderPerformanceResult {
    const { iterations, warmupIterations = 10 } = options;

    // 预热阶段
    for (let i = 0; i < warmupIterations; i++) {
      renderFn(i);
    }

    // 强制垃圾回收（如果可用）
    if (global.gc) {
      global.gc();
    }

    // 记录初始内存
    const initialMemory = process.memoryUsage().heapUsed;
    let peakMemory = initialMemory;

    // 运行测试
    const times: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      renderFn(i);
      const end = performance.now();
      times.push(end - start);

      // 更新峰值内存
      const currentMemory = process.memoryUsage().heapUsed;
      if (currentMemory > peakMemory) {
        peakMemory = currentMemory;
      }
    }

    // 记录结束内存
    const finalMemory = process.memoryUsage().heapUsed;

    // 计算统计数据
    times.sort((a, b) => a - b);
    const totalTime = times.reduce((sum, t) => sum + t, 0);
    const averageTime = totalTime / iterations;
    const medianTime = times[Math.floor(times.length / 2)];
    const minTime = times[0];
    const maxTime = times[times.length - 1];
    const memoryGrowth = (finalMemory - initialMemory) / 1024 / 1024; // MB

    // 检测潜在的内存泄漏
    const potentialLeak = memoryGrowth > 1; // 增长超过 1MB 视为潜在泄漏

    const result: RenderPerformanceResult = {
      testName,
      iterations,
      totalTime,
      averageTime,
      medianTime,
      minTime,
      maxTime,
      initialMemory: initialMemory / 1024 / 1024,
      peakMemory: peakMemory / 1024 / 1024,
      finalMemory: finalMemory / 1024 / 1024,
      memoryGrowth,
      potentialLeak,
    };

    this.results.push(result);
    return result;
  }

  /**
   * 保存基线结果
   */
  saveBaseline(testName: string, result: RenderPerformanceResult): void {
    this.baselines.set(testName, result);
  }

  /**
   * 比较性能结果
   */
  comparePerformance(
    current: RenderPerformanceResult,
    baselineName?: string,
  ): PerformanceComparison {
    const baseline = baselineName ? this.baselines.get(baselineName) : undefined;

    let diff = {
      averageTime: 0,
      percentChange: 0,
      memoryGrowth: 0,
    };
    let hasRegression = false;
    let regressionSeverity: 'minor' | 'moderate' | 'severe' | undefined;

    if (baseline) {
      const timeDiff = current.averageTime - baseline.averageTime;
      const percentChange = (timeDiff / baseline.averageTime) * 100;
      const memoryDiff = current.memoryGrowth - baseline.memoryGrowth;

      diff = {
        averageTime: timeDiff,
        percentChange,
        memoryGrowth: memoryDiff,
      };

      // 检查性能回归
      if (percentChange > 5) { // 性能下降超过 5%
        hasRegression = true;
        if (percentChange > 50) {
          regressionSeverity = 'severe';
        } else if (percentChange > 20) {
          regressionSeverity = 'moderate';
        } else {
          regressionSeverity = 'minor';
        }
      }
    }

    return {
      current,
      baseline,
      diff,
      hasRegression,
      regressionSeverity,
    };
  }

  /**
   * 获取所有结果
   */
  getResults(): RenderPerformanceResult[] {
    return [...this.results];
  }

  /**
   * 格式化输出结果
   */
  formatResults(results: RenderPerformanceResult[]): string {
    let output = '\n📊 渲染性能基准测试结果\n';
    output += '='.repeat(80) + '\n\n';

    for (const result of results) {
      output += `\n🔍 测试: ${result.testName}\n`;
      output += '─'.repeat(60) + '\n';
      output += `  迭代次数: ${result.iterations}\n`;
      output += `  总耗时: ${result.totalTime.toFixed(2)}ms\n`;
      output += `  平均耗时: ${result.averageTime.toFixed(4)}ms\n`;
      output += `  中位数: ${result.medianTime.toFixed(4)}ms\n`;
      output += `  最小: ${result.minTime.toFixed(4)}ms\n`;
      output += `  最大: ${result.maxTime.toFixed(4)}ms\n\n`;
      output += `  内存使用:\n`;
      output += `    初始: ${result.initialMemory.toFixed(2)}MB\n`;
      output += `    峰值: ${result.peakMemory.toFixed(2)}MB\n`;
      output += `    结束: ${result.finalMemory.toFixed(2)}MB\n`;
      output += `    增长: ${result.memoryGrowth.toFixed(2)}MB\n`;

      if (result.potentialLeak) {
        output += `  ⚠️ 检测到潜在内存泄漏!\n`;
      }
      output += '\n';
    }

    return output;
  }

  /**
   * 格式化比较结果
   */
  formatComparison(comparison: PerformanceComparison): string {
    let output = '\n📈 性能比较报告\n';
    output += '='.repeat(80) + '\n\n';
    output += `  测试: ${comparison.current.testName}\n`;

    if (comparison.baseline) {
      const sign = comparison.diff.percentChange >= 0 ? '+' : '';
      output += `  平均耗时变化: ${sign}${comparison.diff.percentChange.toFixed(2)}%\n`;
      
      if (comparison.hasRegression) {
        const severityText = {
          minor: '轻微',
          moderate: '中等',
          severe: '严重',
        }[comparison.regressionSeverity!];
        output += `  ⚠️ 检测到性能回归: ${severityText}\n`;
      } else if (comparison.diff.percentChange < 0) {
        output += `  ✅ 性能提升: ${Math.abs(comparison.diff.percentChange).toFixed(2)}%\n`;
      }
    } else {
      output += `  无基线数据，无法比较\n`;
    }

    return output;
  }
}

/**
 * 快速性能测试套件
 */
export function runQuickPerformanceSuite(): RenderPerformanceResult[] {
  const benchmark = new RenderingPerformanceBenchmark();

  // 测试 1: 简单列表渲染
  benchmark.runRenderingTest(
    '简单列表渲染 (100 items)',
    () => {
      const items = Array.from({ length: 100 }, (_, i) => `Item ${i}`);
      items.map(item => `<div>${item}</div>`).join('');
    },
    { iterations: 1000 },
  );

  // 测试 2: 复杂模板渲染
  benchmark.runRenderingTest(
    '复杂模板渲染',
    () => {
      const data = {
        title: 'Test Title',
        items: Array.from({ length: 50 }, (_, i) => ({ id: i, text: `Item ${i}` })),
        visible: true,
      };
      void `<div class="container">
        <h1>${data.title}</h1>
        <ul>
          ${data.visible ? data.items.map(item => `<li>${item.text}</li>`).join('') : ''}
        </ul>
      </div>`;
    },
    { iterations: 500 },
  );

  // 测试 3: 深度嵌套渲染
  benchmark.runRenderingTest(
    '深度嵌套渲染',
    () => {
      let html = '';
      for (let i = 0; i < 50; i++) {
        html = `<div class="level-${i}">${html}</div>`;
      }
      return html;
    },
    { iterations: 300 },
  );

  return benchmark.getResults();
}

// 默认导出
export default RenderingPerformanceBenchmark;
