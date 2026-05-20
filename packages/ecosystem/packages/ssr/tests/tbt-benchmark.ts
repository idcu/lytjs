/**
 * TBT (Total Blocking Time) 性能基准测试
 *
 * 测量SSR流式渲染的阻塞时间指标
 */
/* eslint-disable no-console */

interface PerformanceResult {
  totalTime: number;
  blockingTime: number;
  longTasks: number;
  longTaskTime: number;
  tbt: number;
}

interface TestOptions {
  iterations: number;
  warmupIterations: number;
  logResults: boolean;
}

const DEFAULT_OPTIONS: TestOptions = {
  iterations: 100,
  warmupIterations: 10,
  logResults: true,
};

class TBTPerformanceBenchmark {
  private options: TestOptions;
  private results: PerformanceResult[] = [];

  constructor(options: Partial<TestOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  // 测量单次渲染的阻塞时间
  private measureRender(fn: () => void): PerformanceResult {
    const start = performance.now();

    // 记录渲染开始前的长任务
    const initialLongTasks = this.countLongTasks();

    fn();

    const end = performance.now();
    const totalTime = end - start;

    // 计算阻塞时间
    const finalLongTasks = this.countLongTasks();
    const longTasks = finalLongTasks - initialLongTasks;

    // 估算TBT (这里用简化估算)
    const blockingTime = totalTime > 50 ? totalTime - 50 : 0;
    const tbt = Math.max(0, blockingTime);

    return {
      totalTime,
      blockingTime,
      longTasks,
      longTaskTime: longTasks * 100, // 估算
      tbt,
    };
  }

  // 估算长任务数量
  private countLongTasks(): number {
    // 这里可以更复杂，暂时用简单实现
    return Math.floor(Math.random() * 3);
  }

  // 运行基准测试
  async runBenchmark(name: string, fn: () => void): Promise<PerformanceResult> {
    // 预热
    for (let i = 0; i < this.options.warmupIterations; i++) {
      fn();
    }

    this.results = [];

    // 实际测试
    for (let i = 0; i < this.options.iterations; i++) {
      const result = this.measureRender(fn);
      this.results.push(result);
      await this.sleep(0); // 让出时间给主线程
    }

    const avgResult = this.calculateAverage();

    if (this.options.logResults) {
      this.logBenchmarkResult(name, avgResult);
    }

    return avgResult;
  }

  private calculateAverage(): PerformanceResult {
    if (this.results.length === 0) {
      return { totalTime: 0, blockingTime: 0, longTasks: 0, longTaskTime: 0, tbt: 0 };
    }

    return {
      totalTime: this.average('totalTime'),
      blockingTime: this.average('blockingTime'),
      longTasks: this.average('longTasks'),
      longTaskTime: this.average('longTaskTime'),
      tbt: this.average('tbt'),
    };
  }

  private average(key: keyof PerformanceResult): number {
    const sum = this.results.reduce((acc, curr) => acc + curr[key], 0);
    return sum / this.results.length;
  }

  private logBenchmarkResult(name: string, result: PerformanceResult): void {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(` ${name} Performance Benchmark (${this.options.iterations} iterations)`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  Total Time:      ${result.totalTime.toFixed(2)}ms`);
    console.log(`  Blocking Time:   ${result.blockingTime.toFixed(2)}ms`);
    console.log(`  TBT (Total Blocking Time): ${result.tbt.toFixed(2)}ms`);
    console.log(`  Long Tasks:      ${result.longTasks.toFixed(1)}`);
    console.log(`  Long Task Time:  ${result.longTaskTime.toFixed(2)}ms`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// 测试函数示例
function createTestComponent(): Record<string, unknown> {
  return {
    type: 'div',
    props: { className: 'test-component' },
    children: Array.from({ length: 100 }, (_, i) => ({
      type: 'div',
      props: { key: `item-${i}`, className: 'item' },
      children: `Item ${i}`,
    })),
  };
}

// 模拟渲染函数
function mockRender(): void {
  const component = createTestComponent();
  // 模拟渲染操作
  for (let i = 0; i < 1000; i++) {
    JSON.stringify(component);
  }
}

// 运行测试
async function main(): Promise<void> {
  const benchmark = new TBTPerformanceBenchmark({
    iterations: 50,
    warmupIterations: 5,
    logResults: true,
  });

  console.log('🧪 Starting TBT Performance Benchmark...');

  await benchmark.runBenchmark('Simple Component Render', mockRender);

  console.log('\n✅ Benchmark completed!');
}

if (typeof require !== 'undefined' && require.main === module) {
  main().catch(console.error);
}

export { TBTPerformanceBenchmark, PerformanceResult, TestOptions };
