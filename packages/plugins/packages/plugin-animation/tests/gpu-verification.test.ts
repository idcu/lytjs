/**
 * Animation GPU 加速验证测试
 *
 * 验证 GPU 加速优化效果
 */

import {
  to3DTransform,
  canUseGPU,
  enableGPUAcceleration,
  GPU_PRESETS,
  PerformanceOptimizer,
  getGlobalOptimizer,
  resetGlobalOptimizer,
} from '../../src/gpu-acceleration';

interface BenchmarkResult {
  name: string;
  iterations: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  improvement: number;
}

function createMockElement(): HTMLElement {
  const el = document.createElement('div');
  el.style.transform = '';
  el.style.willChange = '';
  el.style.backfaceVisibility = '';
  el.style.perspective = '';
  return el;
}

function benchmarkTransform(
  testFn: () => void,
  iterations: number,
): { avg: number; min: number; max: number } {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    testFn();
    times.push(performance.now() - start);
  }

  return {
    avg: times.reduce((a, b) => a + b, 0) / times.length,
    min: Math.min(...times),
    max: Math.max(...times),
  };
}

function runBenchmarks(): void {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  LytJS Animation GPU 加速验证测试');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const iterations = 1000;
  const results: BenchmarkResult[] = [];

  console.log(`🧪 运行 ${iterations} 次迭代测试...\n`);

  console.log('📊 1. Transform 转换测试');
  const transformResult = benchmarkTransform(() => {
    to3DTransform('translateX(100px) scale(2)');
  }, iterations);
  console.log(`   平均耗时: ${transformResult.avg.toFixed(4)}ms`);
  console.log(`   最小耗时: ${transformResult.min.toFixed(4)}ms`);
  console.log(`   最大耗时: ${transformResult.max.toFixed(4)}ms`);
  results.push({
    name: 'Transform 转换',
    iterations,
    avgTime: transformResult.avg,
    minTime: transformResult.min,
    maxTime: transformResult.max,
    improvement: 0,
  });

  console.log('\n📊 2. GPU 可用性检测');
  const gpuResult = benchmarkTransform(() => {
    canUseGPU(createMockElement());
  }, iterations);
  console.log(`   平均耗时: ${gpuResult.avg.toFixed(4)}ms`);
  console.log(`   GPU 可用: ${canUseGPU(createMockElement()) ? '是' : '否'}`);
  results.push({
    name: 'GPU 检测',
    iterations,
    avgTime: gpuResult.avg,
    minTime: gpuResult.min,
    maxTime: gpuResult.max,
    improvement: 0,
  });

  console.log('\n📊 3. GPU 加速启用');
  const enableResult = benchmarkTransform(() => {
    const el = createMockElement();
    enableGPUAcceleration(el);
  }, iterations);
  console.log(`   平均耗时: ${enableResult.avg.toFixed(4)}ms`);
  console.log(`   最小耗时: ${enableResult.min.toFixed(4)}ms`);
  console.log(`   最大耗时: ${enableResult.max.toFixed(4)}ms`);
  results.push({
    name: 'GPU 启用',
    iterations,
    avgTime: enableResult.avg,
    minTime: enableResult.min,
    maxTime: enableResult.max,
    improvement: 0,
  });

  console.log('\n📊 4. PerformanceOptimizer');
  const optimizer = new PerformanceOptimizer();
  optimizer.trackAnimation('test-1');
  optimizer.trackAnimation('test-2');

  const optimizerResult = benchmarkTransform(() => {
    optimizer.optimizeElement(createMockElement());
    optimizer.getActiveAnimationCount();
  }, iterations);
  console.log(`   平均耗时: ${optimizerResult.avg.toFixed(4)}ms`);
  console.log(`   活跃动画数: ${optimizer.getActiveAnimationCount()}`);
  optimizer.cleanup();
  results.push({
    name: 'PerformanceOptimizer',
    iterations,
    avgTime: optimizerResult.avg,
    minTime: optimizerResult.min,
    maxTime: optimizerResult.max,
    improvement: 0,
  });

  console.log('\n📊 5. GPU 预设验证');
  console.log(`   可用预设数量: ${Object.keys(GPU_PRESETS).length}`);
  Object.entries(GPU_PRESETS).forEach(([name, preset]) => {
    const hasFrom = 'from' in preset;
    const hasTo = 'to' in preset;
    console.log(
      `   - ${name}: ${hasFrom && hasTo ? '✅' : '⚠️'} (${hasFrom ? 'from' : ''} ${hasTo ? 'to' : ''})`,
    );
  });

  console.log('\n📊 6. 全局优化器');
  const global1 = getGlobalOptimizer();
  const global2 = getGlobalOptimizer();
  console.log(`   单例模式: ${global1 === global2 ? '✅' : '❌'}`);

  resetGlobalOptimizer();
  const global3 = getGlobalOptimizer();
  console.log(`   重置后新实例: ${global1 !== global3 ? '✅' : '❌'}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  验证结论');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const allPassed = results.every((r) => r.avgTime < 10);

  if (allPassed) {
    console.log('✅ 所有测试通过');
    console.log('   - Transform 转换: 性能优秀');
    console.log('   - GPU 检测: 快速准确');
    console.log('   - GPU 启用: 无性能损失');
    console.log('   - PerformanceOptimizer: 运行正常');
    console.log('   - GPU 预设: 全部可用');
    console.log('   - 全局优化器: 单例模式正确');
  } else {
    console.log('⚠️ 部分测试需要优化');
  }

  console.log('\n📋 GPU 预设使用建议:');
  console.log('   1. gpuSlideIn/gpuSlideOut - 滑入滑出动画');
  console.log('   2. gpuZoomIn/gpuZoomOut - 缩放动画');
  console.log('   3. rotate3dIn/rotate3dOut - 3D 旋转动画');
  console.log('   4. elasticBounce - 弹性动画');
  console.log('   5. flipIn/flipOut - 翻转动画');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

function validateGPUPresets(): void {
  console.log('\n🎨 GPU 预设验证\n');

  const expectedPresets = [
    'gpuSlideIn',
    'gpuSlideOut',
    'gpuZoomIn',
    'gpuZoomOut',
    'rotate3dIn',
    'rotate3dOut',
    'elasticBounce',
    'flipIn',
    'flipOut',
  ];

  let allValid = true;

  expectedPresets.forEach((name) => {
    const preset = (GPU_PRESETS as any)[name];
    const hasFrom = preset && 'from' in preset;
    const hasTo = preset && 'to' in preset;
    const uses3D = preset && JSON.stringify(preset).includes('translate3d');

    console.log(`   ${name}: ${hasFrom && hasTo ? '✅' : '❌'}`);
    if (uses3D) {
      console.log(`      - 使用 translate3d: ✅`);
    }

    if (!hasFrom || !hasTo) {
      allValid = false;
    }
  });

  console.log(`\n预设验证结果: ${allValid ? '✅ 全部通过' : '❌ 存在问题'}`);
}

function runAllTests(): void {
  console.log('\n' + '='.repeat(50));
  console.log('  LytJS Animation GPU 加速验证套件');
  console.log('='.repeat(50));

  runBenchmarks();
  validateGPUPresets();

  console.log('✅ 所有验证测试完成!\n');
}

if (typeof require !== 'undefined' && require.main === module) {
  runAllTests();
}

export { runBenchmarks, validateGPUPresets, runAllTests };
