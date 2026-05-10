#!/usr/bin/env node
/**
 * 内存泄漏检测脚本
 * 
 * 运行内存密集型场景，检测内存是否持续增长
 * 
 * 使用方法:
 *   tsx scripts/memlab-check.ts
 *   # 或带 GC 标志以获得更准确的结果:
 *   node --expose-gc --loader tsx scripts/memlab-check.ts
 */

import { ref, computed, watch, effectScope, reactive } from '../packages/reactivity/src/index.js';
import v8 from 'node:v8';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface MemorySnapshot {
  used: number;
  total: number;
  external: number;
  arrayBuffers: number;
  timestamp: number;
}

interface LeakReport {
  timestamp: string;
  results: {
    testName: string;
    passed: boolean;
    initialMemory: string;
    finalMemory: string;
    growth: string;
    growthBytes: number;
    details: string[];
  }[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
  };
}

function getMemory(): MemorySnapshot {
  const usage = process.memoryUsage();
  return {
    used: usage.heapUsed,
    total: usage.heapTotal,
    external: usage.external,
    arrayBuffers: usage.arrayBuffers || 0,
    timestamp: Date.now(),
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function forceGC(): void {
  if (global.gc) {
    global.gc();
    // 多次 GC 以确保清理
    for (let i = 0; i < 3; i++) {
      global.gc();
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function analyzeTrend(measurements: number[]): { 
  growth: number; 
  trend: 'increasing' | 'stable' | 'decreasing';
  slope: number;
} {
  if (measurements.length < 2) {
    return { growth: 0, trend: 'stable', slope: 0 };
  }

  const first = measurements[0];
  const last = measurements[measurements.length - 1];
  const growth = last - first;

  // 简单线性回归计算斜率
  const n = measurements.length;
  const sumX = measurements.reduce((sum, _, i) => sum + i, 0);
  const sumY = measurements.reduce((sum, m) => sum + m, 0);
  const sumXY = measurements.reduce((sum, m, i) => sum + i * m, 0);
  const sumXX = measurements.reduce((sum, _, i) => sum + i * i, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

  // 判断趋势
  const threshold = 1024 * 1024; // 1MB 阈值
  let trend: 'increasing' | 'stable' | 'decreasing';
  if (growth > threshold) {
    trend = 'increasing';
  } else if (growth < -threshold) {
    trend = 'decreasing';
  } else {
    trend = 'stable';
  }

  return { growth, trend, slope };
}

// 场景1: 创建/销毁大量 refs
async function testRefLifecycle(): Promise<{ passed: boolean; details: string[]; growth: number }> {
  console.log('\n🧪 场景1: Ref 生命周期内存检测');
  
  const measurements: number[] = [];
  const details: string[] = [];
  
  for (let i = 0; i < 10; i++) {
    // 创建 10000 个 refs
    const refs: any[] = [];
    for (let j = 0; j < 10000; j++) {
      refs.push(ref(j));
    }
    
    // 清空引用
    refs.length = 0;
    
    forceGC();
    await sleep(100);
    
    const mem = getMemory();
    measurements.push(mem.used);
    details.push(`Iteration ${i + 1}: ${formatBytes(mem.used)}`);
  }
  
  const analysis = analyzeTrend(measurements);
  const threshold = 5 * 1024 * 1024; // 5MB 阈值
  const passed = analysis.growth < threshold;
  
  console.log(`  初始内存: ${formatBytes(measurements[0])}`);
  console.log(`  最终内存: ${formatBytes(measurements[measurements.length - 1])}`);
  console.log(`  增长: ${formatBytes(analysis.growth)}`);
  console.log(`  趋势: ${analysis.trend}`);
  console.log(passed ? '  ✅ 通过' : '  ❌ 检测到内存泄漏');
  
  return { passed, details, growth: analysis.growth };
}

// 场景2: 创建/销毁大量 reactive 对象
async function testReactiveLifecycle(): Promise<{ passed: boolean; details: string[]; growth: number }> {
  console.log('\n🧪 场景2: Reactive 对象生命周期内存检测');
  
  const measurements: number[] = [];
  const details: string[] = [];
  
  for (let i = 0; i < 10; i++) {
    const objects: any[] = [];
    for (let j = 0; j < 5000; j++) {
      objects.push(reactive({
        id: j,
        name: `Item ${j}`,
        value: j * 2,
        nested: { a: 1, b: 2 },
      }));
    }
    
    objects.length = 0;
    
    forceGC();
    await sleep(100);
    
    const mem = getMemory();
    measurements.push(mem.used);
    details.push(`Iteration ${i + 1}: ${formatBytes(mem.used)}`);
  }
  
  const analysis = analyzeTrend(measurements);
  const threshold = 5 * 1024 * 1024;
  const passed = analysis.growth < threshold;
  
  console.log(`  初始内存: ${formatBytes(measurements[0])}`);
  console.log(`  最终内存: ${formatBytes(measurements[measurements.length - 1])}`);
  console.log(`  增长: ${formatBytes(analysis.growth)}`);
  console.log(`  趋势: ${analysis.trend}`);
  console.log(passed ? '  ✅ 通过' : '  ❌ 检测到内存泄漏');
  
  return { passed, details, growth: analysis.growth };
}

// 场景3: 响应式订阅 (watchers)
async function testWatcherLifecycle(): Promise<{ passed: boolean; details: string[]; growth: number }> {
  console.log('\n🧪 场景3: Watcher 生命周期内存检测');
  
  const measurements: number[] = [];
  const details: string[] = [];
  
  for (let i = 0; i < 10; i++) {
    const refs: any[] = [];
    const stoppers: any[] = [];
    
    // 创建大量响应式数据和订阅
    for (let j = 0; j < 5000; j++) {
      const r = ref(j);
      refs.push(r);
      stoppers.push(watch(r, () => {}));
    }
    
    // 清理订阅
    stoppers.forEach(stop => stop());
    refs.length = 0;
    stoppers.length = 0;
    
    forceGC();
    await sleep(100);
    
    const mem = getMemory();
    measurements.push(mem.used);
    details.push(`Iteration ${i + 1}: ${formatBytes(mem.used)}`);
  }
  
  const analysis = analyzeTrend(measurements);
  const threshold = 5 * 1024 * 1024;
  const passed = analysis.growth < threshold;
  
  console.log(`  初始内存: ${formatBytes(measurements[0])}`);
  console.log(`  最终内存: ${formatBytes(measurements[measurements.length - 1])}`);
  console.log(`  增长: ${formatBytes(analysis.growth)}`);
  console.log(`  趋势: ${analysis.trend}`);
  console.log(passed ? '  ✅ 通过' : '  ❌ 检测到内存泄漏');
  
  return { passed, details, growth: analysis.growth };
}

// 场景4: Effect Scope 生命周期
async function testEffectScopeLifecycle(): Promise<{ passed: boolean; details: string[]; growth: number }> {
  console.log('\n🧪 场景4: Effect Scope 生命周期内存检测');
  
  const measurements: number[] = [];
  const details: string[] = [];
  
  for (let i = 0; i < 10; i++) {
    const scopes: any[] = [];
    
    for (let j = 0; j < 1000; j++) {
      const scope = effectScope();
      scope.run(() => {
        const r = ref(j);
        watch(r, () => {});
        computed(() => r.value * 2);
      });
      scopes.push(scope);
    }
    
    // 停止所有 scope
    scopes.forEach(scope => scope.stop());
    scopes.length = 0;
    
    forceGC();
    await sleep(100);
    
    const mem = getMemory();
    measurements.push(mem.used);
    details.push(`Iteration ${i + 1}: ${formatBytes(mem.used)}`);
  }
  
  const analysis = analyzeTrend(measurements);
  const threshold = 5 * 1024 * 1024;
  const passed = analysis.growth < threshold;
  
  console.log(`  初始内存: ${formatBytes(measurements[0])}`);
  console.log(`  最终内存: ${formatBytes(measurements[measurements.length - 1])}`);
  console.log(`  增长: ${formatBytes(analysis.growth)}`);
  console.log(`  趋势: ${analysis.trend}`);
  console.log(passed ? '  ✅ 通过' : '  ❌ 检测到内存泄漏');
  
  return { passed, details, growth: analysis.growth };
}

// 场景5: Computed 值生命周期
async function testComputedLifecycle(): Promise<{ passed: boolean; details: string[]; growth: number }> {
  console.log('\n🧪 场景5: Computed 生命周期内存检测');
  
  const measurements: number[] = [];
  const details: string[] = [];
  
  for (let i = 0; i < 10; i++) {
    const base = ref(0);
    const computeds: any[] = [];
    
    for (let j = 0; j < 5000; j++) {
      computeds.push(computed(() => base.value + j));
    }
    
    // 触发计算
    base.value = i;
    
    // 清理
    computeds.length = 0;
    
    forceGC();
    await sleep(100);
    
    const mem = getMemory();
    measurements.push(mem.used);
    details.push(`Iteration ${i + 1}: ${formatBytes(mem.used)}`);
  }
  
  const analysis = analyzeTrend(measurements);
  const threshold = 5 * 1024 * 1024;
  const passed = analysis.growth < threshold;
  
  console.log(`  初始内存: ${formatBytes(measurements[0])}`);
  console.log(`  最终内存: ${formatBytes(measurements[measurements.length - 1])}`);
  console.log(`  增长: ${formatBytes(analysis.growth)}`);
  console.log(`  趋势: ${analysis.trend}`);
  console.log(passed ? '  ✅ 通过' : '  ❌ 检测到内存泄漏');
  
  return { passed, details, growth: analysis.growth };
}

// 场景6: 大量响应式数组操作
async function testLargeArrayOperations(): Promise<{ passed: boolean; details: string[]; growth: number }> {
  console.log('\n🧪 场景6: 大型数组操作内存检测');
  
  const measurements: number[] = [];
  const details: string[] = [];
  
  for (let i = 0; i < 5; i++) {
    const arr = reactive<number[]>([]);
    
    // 添加大量数据
    for (let j = 0; j < 10000; j++) {
      arr.push(j);
    }
    
    // 清空数组
    arr.length = 0;
    
    forceGC();
    await sleep(100);
    
    const mem = getMemory();
    measurements.push(mem.used);
    details.push(`Iteration ${i + 1}: ${formatBytes(mem.used)}`);
  }
  
  const analysis = analyzeTrend(measurements);
  const threshold = 10 * 1024 * 1024;
  const passed = analysis.growth < threshold;
  
  console.log(`  初始内存: ${formatBytes(measurements[0])}`);
  console.log(`  最终内存: ${formatBytes(measurements[measurements.length - 1])}`);
  console.log(`  增长: ${formatBytes(analysis.growth)}`);
  console.log(`  趋势: ${analysis.trend}`);
  console.log(passed ? '  ✅ 通过' : '  ❌ 检测到内存泄漏');
  
  return { passed, details, growth: analysis.growth };
}

function generateReport(results: { name: string; passed: boolean; details: string[]; growth: number; initialMem: number; finalMem: number }[]): LeakReport {
  return {
    timestamp: new Date().toISOString(),
    results: results.map(r => ({
      testName: r.name,
      passed: r.passed,
      initialMemory: formatBytes(r.initialMem),
      finalMemory: formatBytes(r.finalMem),
      growth: formatBytes(r.growth),
      growthBytes: r.growth,
      details: r.details,
    })),
    summary: {
      totalTests: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
    },
  };
}

function saveReport(report: LeakReport): void {
  const reportPath = path.join(__dirname, '..', 'memlab-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 详细报告已保存: ${reportPath}`);
}

async function main(): Promise<void> {
  console.log('🔍 内存泄漏检测开始...');
  console.log('=' .repeat(60));
  
  if (!global.gc) {
    console.log('\n⚠️  警告: 未使用 --expose-gc 标志运行');
    console.log('   检测结果可能不够准确');
    console.log('   建议运行方式: node --expose-gc --loader tsx scripts/memlab-check.ts');
  }
  
  const results: { name: string; passed: boolean; details: string[]; growth: number; initialMem: number; finalMem: number }[] = [];
  
  // 运行所有测试
  const tests = [
    { name: 'Ref 生命周期', fn: testRefLifecycle },
    { name: 'Reactive 对象生命周期', fn: testReactiveLifecycle },
    { name: 'Watcher 生命周期', fn: testWatcherLifecycle },
    { name: 'Effect Scope 生命周期', fn: testEffectScopeLifecycle },
    { name: 'Computed 生命周期', fn: testComputedLifecycle },
    { name: '大型数组操作', fn: testLargeArrayOperations },
  ];
  
  for (const test of tests) {
    const result = await test.fn();
    results.push({
      name: test.name,
      passed: result.passed,
      details: result.details,
      growth: result.growth,
      initialMem: parseInt(result.details[0]?.split(': ')[1]?.replace(/[^0-9]/g, '') || '0'),
      finalMem: parseInt(result.details[result.details.length - 1]?.split(': ')[1]?.replace(/[^0-9]/g, '') || '0'),
    });
  }
  
  // 生成报告
  const report = generateReport(results);
  saveReport(report);
  
  // 输出摘要
  console.log('\n' + '='.repeat(60));
  console.log('📊 检测结果摘要');
  console.log('='.repeat(60));
  
  for (const r of results) {
    const status = r.passed ? '✅' : '❌';
    console.log(`${status} ${r.name}: ${formatBytes(r.growth)}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`总计: ${report.summary.totalTests} 个测试`);
  console.log(`通过: ${report.summary.passed} 个`);
  console.log(`失败: ${report.summary.failed} 个`);
  console.log('='.repeat(60));
  
  if (report.summary.failed > 0) {
    console.log('\n❌ 检测到内存泄漏！');
    process.exit(1);
  } else {
    console.log('\n✅ 所有内存泄漏检测通过！');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('❌ 检测过程中发生错误:', error);
  process.exit(1);
});
