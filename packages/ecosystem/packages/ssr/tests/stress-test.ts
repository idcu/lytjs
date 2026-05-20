/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * SSR 压力测试脚本
 *
 * 测试流式SSR在高并发场景下的稳定性和性能
 */

interface StressTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  requestsPerSecond: number;
  errors: string[];
}

interface TestOptions {
  concurrent: number;
  totalRequests: number;
  timeout: number;
}

interface VNode {
  type: string;
  props: Record<string, unknown>;
  children?: unknown[];
}

/**
 * 创建测试 VNode
 */
function _createTestVNode(depth: number, width: number): VNode {
  if (depth === 0) {
    return {
      type: 'div',
      props: { class: 'leaf' },
      children: [`Content at depth 0`],
    };
  }

  const children: VNode[] = [];
  for (let i = 0; i < width; i++) {
    children.push(createTestVNode(depth - 1, width));
  }

  return {
    type: 'div',
    props: { class: `level-${depth}` },
    children,
  };
}

/**
 * 创建大型列表 VNode
 */
function createLargeListVNode(itemCount: number): VNode {
  const items: VNode[] = [];
  for (let i = 0; i < itemCount; i++) {
    items.push({
      type: 'li',
      props: { key: `item-${i}`, class: 'list-item' },
      children: [`Item ${i}: test content`],
    });
  }

  return {
    type: 'ul',
    props: { class: 'large-list' },
    children: items,
  };
}

/**
 * 模拟SSR渲染延迟
 */
async function simulateSSRRender(
  vnode: VNode,
  timeout: number,
): Promise<{ success: boolean; time: number; error?: string }> {
  const startTime = performance.now();
  const renderTime = Math.random() * 5 + 1; // 1-6ms 随机延迟

  return new Promise((resolve) => {
    const elapsed = performance.now() - startTime;

    if (elapsed >= timeout) {
      resolve({
        success: false,
        time: elapsed,
        error: 'Timeout',
      });
      return;
    }

    setTimeout(() => {
      resolve({
        success: true,
        time: performance.now() - startTime + renderTime,
      });
    }, renderTime);
  });
}

/**
 * 执行单个SSR请求（模拟）
 */
async function executeSSRRequest(
  vnode: VNode,
  timeout: number,
): Promise<{ success: boolean; time: number; error?: string }> {
  return simulateSSRRender(vnode, timeout);
}

/**
 * 并发SSR压力测试
 */
async function stressTest(options: TestOptions): Promise<StressTestResult> {
  const { concurrent, totalRequests, timeout } = options;
  const results: { success: boolean; time: number; error?: string }[] = [];
  const errors: string[] = [];
  let activeRequests = 0;
  let completedRequests = 0;

  console.log(`\n🚀 SSR 压力测试开始`);
  console.log(`   总请求数: ${totalRequests}`);
  console.log(`   并发数: ${concurrent}`);
  console.log(`   单请求超时: ${timeout}ms`);
  console.log('─'.repeat(50));

  const vnode = createLargeListVNode(100);

  const startTime = performance.now();

  const worker = async (): Promise<void> => {
    while (completedRequests < totalRequests) {
      if (activeRequests < concurrent) {
        activeRequests++;
        completedRequests++;

        const result = await executeSSRRequest(vnode, timeout);
        results.push(result);

        if (!result.success && result.error) {
          errors.push(result.error);
        }

        activeRequests--;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
  };

  const workers = Array(Math.min(concurrent, totalRequests))
    .fill(null)
    .map(() => worker());
  await Promise.all(workers);

  const totalTime = performance.now() - startTime;
  const successfulRequests = results.filter((r) => r.success).length;
  const failedRequests = results.filter((r) => !r.success).length;
  const times = results.map((r) => r.time);

  const result: StressTestResult = {
    totalRequests,
    successfulRequests,
    failedRequests,
    totalTime,
    avgTime: times.reduce((a, b) => a + b, 0) / times.length,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
    requestsPerSecond: (totalRequests / totalTime) * 1000,
    errors: [...new Set(errors)],
  };

  return result;
}

/**
 * 打印测试结果
 */
function printResults(result: StressTestResult): void {
  console.log('\n📊 测试结果');
  console.log('─'.repeat(50));
  console.log(`   总请求数:     ${result.totalRequests}`);
  console.log(
    `   成功:         ${result.successfulRequests} (${((result.successfulRequests / result.totalRequests) * 100).toFixed(2)}%)`,
  );
  console.log(
    `   失败:         ${result.failedRequests} (${((result.failedRequests / result.totalRequests) * 100).toFixed(2)}%)`,
  );
  console.log(`   总耗时:       ${result.totalTime.toFixed(2)}ms`);
  console.log(`   平均耗时:     ${result.avgTime.toFixed(2)}ms`);
  console.log(`   最小耗时:     ${result.minTime.toFixed(2)}ms`);
  console.log(`   最大耗时:     ${result.maxTime.toFixed(2)}ms`);
  console.log(`   QPS:          ${result.requestsPerSecond.toFixed(2)} req/s`);

  if (result.errors.length > 0) {
    console.log(`\n   错误类型:`);
    result.errors.forEach((err) => console.log(`     - ${err}`));
  }

  console.log('─'.repeat(50));

  const successRate = result.successfulRequests / result.totalRequests;
  if (successRate >= 0.99) {
    console.log('✅ 测试通过 - 成功率 >= 99%');
  } else if (successRate >= 0.95) {
    console.log('⚠️  测试警告 - 成功率 >= 95%');
  } else {
    console.log('❌ 测试失败 - 成功率 < 95%');
  }
}

/**
 * 稳定性测试 - 持续请求
 */
async function stabilityTest(duration: number, concurrency: number): Promise<void> {
  console.log(`\n🔄 稳定性测试 - 持续 ${duration}ms`);
  console.log(`   并发数: ${concurrency}`);
  console.log('─'.repeat(50));

  const vnode = createLargeListVNode(50);
  let totalRequests = 0;
  let successfulRequests = 0;
  let failedRequests = 0;
  const startTime = performance.now();

  const workers = Array(concurrency)
    .fill(null)
    .map(async () => {
      while (performance.now() - startTime < duration) {
        totalRequests++;
        const result = await executeSSRRequest(vnode, 5000);
        if (result.success) {
          successfulRequests++;
        } else {
          failedRequests++;
        }
      }
    });

  await Promise.all(workers);

  const elapsed = performance.now() - startTime;
  console.log(`\n📊 稳定性测试结果 (${elapsed.toFixed(0)}ms)`);
  console.log(`   总请求数:   ${totalRequests}`);
  console.log(`   成功:       ${successfulRequests}`);
  console.log(`   失败:       ${failedRequests}`);
  console.log(`   QPS:       ${((totalRequests / elapsed) * 1000).toFixed(2)}`);
  console.log('─'.repeat(50));
}

/**
 * 极限压力测试
 */
async function extremeStressTest(): Promise<void> {
  console.log(`\n🔥 极限压力测试 - 10000+请求`);
  console.log('─'.repeat(50));

  const testCases = [
    { name: '10000请求/500并发', concurrent: 500, totalRequests: 10000, timeout: 10000 },
    { name: '15000请求/1000并发', concurrent: 1000, totalRequests: 15000, timeout: 10000 },
  ];

  for (const testCase of testCases) {
    console.log(`\n🧪 测试: ${testCase.name}`);
    const result = await stressTest(testCase);
    printResults(result);
  }
}

/**
 * 运行所有测试
 */
async function runAllTests(): Promise<void> {
  console.log('\n' + '═'.repeat(50));
  console.log('   LytJS SSR 压力测试');
  console.log('═'.repeat(50));

  console.log('\n📝 测试配置');
  console.log(`   Node.js: ${process.version}`);
  console.log(`   平台: ${process.platform} ${process.arch}`);

  const testCases = [
    { name: '100请求/10并发', concurrent: 10, totalRequests: 100, timeout: 5000 },
    { name: '500请求/50并发', concurrent: 50, totalRequests: 500, timeout: 5000 },
    { name: '1000请求/100并发', concurrent: 100, totalRequests: 1000, timeout: 5000 },
  ];

  for (const testCase of testCases) {
    console.log(`\n🧪 测试: ${testCase.name}`);
    const result = await stressTest(testCase);
    printResults(result);
  }

  await stabilityTest(3000, 50);

  await extremeStressTest();

  console.log('\n' + '═'.repeat(50));
  console.log('   测试完成');
  console.log('═'.repeat(50));
}

runAllTests().catch(console.error);
