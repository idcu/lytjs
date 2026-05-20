/**
 * @lytjs/devtools - 大规模性能压测基准测试
 *
 * 提供虚拟列表、组件渲染等大规模场景的性能基准测试
 */

/** 基准测试结果 */
export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  opsPerSecond: number;
  timestamp: number;
}

/** 基准测试配置 */
export interface BenchmarkConfig {
  /** 测试名称 */
  name: string;
  /** 迭代次数 */
  iterations: number;
  /** 预热次数 */
  warmup?: number;
  /** 异步测试回调 */
  fn: () => void | Promise<void>;
  /** 异步回调 */
  asyncFn?: () => Promise<void>;
}

/** 大规模场景配置 */
export interface LargeScaleScenario {
  name: string;
  nodeCount: number;
  description: string;
}

/** 预定义的大规模场景 */
export const LARGE_SCALE_SCENARIOS: LargeScaleScenario[] = [
  { name: '虚拟列表-1000节点', nodeCount: 1000, description: '1000 个虚拟列表节点渲染' },
  { name: '虚拟列表-5000节点', nodeCount: 5000, description: '5000 个虚拟列表节点渲染' },
  { name: '虚拟列表-10000节点', nodeCount: 10000, description: '10000 个虚拟列表节点渲染' },
  { name: '组件树-100组件', nodeCount: 100, description: '100 个组件同时渲染' },
  { name: '组件树-500组件', nodeCount: 500, description: '500 个组件同时渲染' },
  { name: '组件树-1000组件', nodeCount: 1000, description: '1000 个组件同时渲染' },
  { name: '信号追踪-500信号', nodeCount: 500, description: '500 个信号同时追踪' },
  { name: '信号追踪-1000信号', nodeCount: 1000, description: '1000 个信号同时追踪' },
];

// 基准测试结果存储
const benchmarkResults: Map<string, BenchmarkResult[]> = new Map();

/**
 * 运行同步基准测试
 */
export function runBenchmark(config: BenchmarkConfig): BenchmarkResult {
  const { name, iterations, warmup = 10, fn } = config;

  // 预热
  for (let i = 0; i < warmup; i++) {
    fn();
  }

  // 运行测试
  const durations: number[] = [];
  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    const iterStart = performance.now();
    fn();
    durations.push(performance.now() - iterStart);
  }

  const totalDuration = performance.now() - startTime;

  // 计算统计
  const result: BenchmarkResult = {
    name,
    iterations,
    totalDuration,
    averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
    minDuration: Math.min(...durations),
    maxDuration: Math.max(...durations),
    opsPerSecond: (iterations / totalDuration) * 1000,
    timestamp: Date.now(),
  };

  // 存储结果
  storeBenchmarkResult(name, result);

  return result;
}

/**
 * 运行异步基准测试
 */
export async function runAsyncBenchmark(config: BenchmarkConfig): Promise<BenchmarkResult> {
  const { name, iterations, warmup = 10, asyncFn } = config;

  if (!asyncFn) {
    throw new Error('asyncFn is required for async benchmark');
  }

  // 预热
  for (let i = 0; i < warmup; i++) {
    await asyncFn();
  }

  // 运行测试
  const durations: number[] = [];
  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    const iterStart = performance.now();
    await asyncFn();
    durations.push(performance.now() - iterStart);
  }

  const totalDuration = performance.now() - startTime;

  // 计算统计
  const result: BenchmarkResult = {
    name,
    iterations,
    totalDuration,
    averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
    minDuration: Math.min(...durations),
    maxDuration: Math.max(...durations),
    opsPerSecond: (iterations / totalDuration) * 1000,
    timestamp: Date.now(),
  };

  // 存储结果
  storeBenchmarkResult(name, result);

  return result;
}

/**
 * 存储基准测试结果
 */
function storeBenchmarkResult(name: string, result: BenchmarkResult): void {
  if (!benchmarkResults.has(name)) {
    benchmarkResults.set(name, []);
  }
  const results = benchmarkResults.get(name)!;
  results.push(result);

  // 限制存储数量
  if (results.length > 100) {
    results.shift();
  }
}

/**
 * 获取基准测试结果
 */
export function getBenchmarkResults(name?: string): BenchmarkResult[] {
  if (name) {
    return benchmarkResults.get(name) || [];
  }
  const allResults: BenchmarkResult[] = [];
  benchmarkResults.forEach((results) => {
    allResults.push(...results);
  });
  return allResults.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * 获取最新基准测试结果
 */
export function getLatestBenchmarkResult(name: string): BenchmarkResult | undefined {
  const results = benchmarkResults.get(name);
  if (!results || results.length === 0) return undefined;
  return results[results.length - 1];
}

/**
 * 清除基准测试结果
 */
export function clearBenchmarkResults(name?: string): void {
  if (name) {
    benchmarkResults.delete(name);
  } else {
    benchmarkResults.clear();
  }
}

/**
 * 序列化基准测试结果
 */
export function serializeBenchmarkResult(result: BenchmarkResult): string {
  return `
📊 ${result.name}
   迭代次数: ${result.iterations}
   总耗时: ${result.totalDuration.toFixed(2)}ms
   平均耗时: ${result.averageDuration.toFixed(4)}ms
   最小耗时: ${result.minDuration.toFixed(4)}ms
   最大耗时: ${result.maxDuration.toFixed(4)}ms
   OPS: ${result.opsPerSecond.toFixed(2)} ops/s
   时间: ${new Date(result.timestamp).toLocaleString()}
`.trim();
}

/**
 * 序列化所有基准测试结果
 */
export function serializeAllBenchmarkResults(): string {
  const allResults = getBenchmarkResults();
  if (allResults.length === 0) {
    return '暂无基准测试结果';
  }

  let result = `📈 基准测试报告 (${allResults.length} 条记录)\n\n`;

  // 按名称分组
  const grouped = new Map<string, BenchmarkResult[]>();
  allResults.forEach((r) => {
    if (!grouped.has(r.name)) {
      grouped.set(r.name, []);
    }
    grouped.get(r.name)!.push(r);
  });

  grouped.forEach((results, name) => {
    const latest = results[results.length - 1];
    if (latest) {
      result += `🔹 ${name}\n`;
      result += `   最新: ${latest.averageDuration.toFixed(4)}ms (${latest.opsPerSecond.toFixed(2)} ops/s)\n`;
      result += `   历史: ${results.length} 次测试\n`;
      result += '\n';
    }
  });

  return result;
}

/**
 * 比较两次基准测试
 */
export function compareBenchmarkResults(
  oldResult: BenchmarkResult,
  newResult: BenchmarkResult,
): {
  durationDiff: number;
  durationDiffPercent: number;
  opsDiff: number;
  opsDiffPercent: number;
  improved: boolean;
} {
  const durationDiff = oldResult.averageDuration - newResult.averageDuration;
  const durationDiffPercent = (durationDiff / oldResult.averageDuration) * 100;
  const opsDiff = newResult.opsPerSecond - oldResult.opsPerSecond;
  const opsDiffPercent = (opsDiff / oldResult.opsPerSecond) * 100;

  return {
    durationDiff,
    durationDiffPercent,
    opsDiff,
    opsDiffPercent,
    improved: durationDiff > 0,
  };
}

/**
 * 生成大规模测试场景的基准测试
 */
export function createLargeScaleBenchmark(
  scenario: LargeScaleScenario,
  testFn: (nodeCount: number) => void | Promise<void>,
): BenchmarkConfig {
  return {
    name: `大规模测试-${scenario.name}`,
    iterations: 100,
    warmup: 10,
    fn: () => testFn(scenario.nodeCount),
  };
}

/**
 * 内存使用情况
 */
export interface MemoryUsage {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

/**
 * 获取当前内存使用情况
 */
export function getMemoryUsage(): MemoryUsage | null {
  if (typeof performance === 'undefined') return null;

  const memory = (
    performance as {
      memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
    }
  ).memory;
  if (!memory) return null;

  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
  };
}

/**
 * 序列化内存使用情况
 */
export function serializeMemoryUsage(usage: MemoryUsage): string {
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return `
💾 内存使用
   已使用堆: ${formatBytes(usage.usedJSHeapSize)}
   总堆大小: ${formatBytes(usage.totalJSHeapSize)}
   堆大小限制: ${formatBytes(usage.jsHeapSizeLimit)}
   使用率: ${((usage.usedJSHeapSize / usage.totalJSHeapSize) * 100).toFixed(2)}%
`.trim();
}

/**
 * 创建性能回归检测
 */
export function createRegressionDetector(threshold: number = 0.1) {
  const history: Map<string, BenchmarkResult[]> = new Map();

  return {
    addResult(result: BenchmarkResult): boolean {
      if (!history.has(result.name)) {
        history.set(result.name, []);
      }
      const results = history.get(result.name)!;
      results.push(result);

      if (results.length < 2) return false;

      const previous = results[results.length - 2];
      if (!previous) return false;

      const regression =
        previous.averageDuration < result.averageDuration &&
        (result.averageDuration - previous.averageDuration) / previous.averageDuration > threshold;

      return regression;
    },

    getHistory(name: string): BenchmarkResult[] {
      return history.get(name) || [];
    },

    clear(): void {
      history.clear();
    },
  };
}
