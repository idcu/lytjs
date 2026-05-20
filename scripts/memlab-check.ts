#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
import { ref, computed, watch, reactive } from '../packages/reactivity/dist/index.mjs';
import { effectScope } from '../packages/reactivity/dist/scope.mjs';
import { delay } from '../packages/common/packages/timing/dist/index.mjs';
import { formatBytes } from '../packages/common/packages/string/dist/index.mjs';
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

function forceGC(): void {
  if (global.gc) {
    global.gc();
    for (let i = 0; i < 3; i++) {
      global.gc();
    }
  }
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

  const n = measurements.length;
  const sumX = measurements.reduce((sum, _, i) => sum + i, 0);
  const sumY = measurements.reduce((sum, m) => sum + m, 0);
  const sumXY = measurements.reduce((sum, m, i) => sum + i * m, 0);
  const sumXX = measurements.reduce((sum, _, i) => sum + i * i, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

  const threshold = 1024 * 1024;
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

async function testRefLifecycle(): Promise<{
  passed: boolean;
  details: string[];
  growth: number;
  initialMem: number;
  finalMem: number;
}> {
  console.log('\nTest 1: Ref Lifecycle');

  const measurements: number[] = [];
  const details: string[] = [];

  for (let i = 0; i < 10; i++) {
    const refs: unknown[] = [];
    for (let j = 0; j < 10000; j++) {
      refs.push(ref(j));
    }

    refs.length = 0;

    forceGC();
    await delay(100);

    const mem = getMemory();
    measurements.push(mem.used);
    details.push(`Iteration ${i + 1}: ${formatBytes(mem.used)}`);
  }

  const analysis = analyzeTrend(measurements);
  const threshold = 5 * 1024 * 1024;
  const passed = analysis.growth < threshold;

  console.log(`  Initial: ${formatBytes(measurements[0])}`);
  console.log(`  Final: ${formatBytes(measurements[measurements.length - 1])}`);
  console.log(`  Growth: ${formatBytes(analysis.growth)}`);
  console.log(`  Trend: ${analysis.trend}`);
  console.log(passed ? '  ✅ Pass' : '  ❌ Fail');

  return {
    passed,
    details,
    growth: analysis.growth,
    initialMem: measurements[0],
    finalMem: measurements[measurements.length - 1],
  };
}

async function testReactiveLifecycle(): Promise<{
  passed: boolean;
  details: string[];
  growth: number;
  initialMem: number;
  finalMem: number;
}> {
  console.log('\nTest 2: Reactive Object Lifecycle');

  const measurements: number[] = [];
  const details: string[] = [];

  for (let i = 0; i < 10; i++) {
    const objects: unknown[] = [];
    for (let j = 0; j < 5000; j++) {
      objects.push(
        reactive({
          id: j,
          name: `Item ${j}`,
          value: j * 2,
          nested: { a: 1, b: 2 },
        }),
      );
    }

    objects.length = 0;

    forceGC();
    await delay(100);

    const mem = getMemory();
    measurements.push(mem.used);
    details.push(`Iteration ${i + 1}: ${formatBytes(mem.used)}`);
  }

  const analysis = analyzeTrend(measurements);
  const threshold = 5 * 1024 * 1024;
  const passed = analysis.growth < threshold;

  console.log(`  Initial: ${formatBytes(measurements[0])}`);
  console.log(`  Final: ${formatBytes(measurements[measurements.length - 1])}`);
  console.log(`  Growth: ${formatBytes(analysis.growth)}`);
  console.log(`  Trend: ${analysis.trend}`);
  console.log(passed ? '  ✅ Pass' : '  ❌ Fail');

  return {
    passed,
    details,
    growth: analysis.growth,
    initialMem: measurements[0],
    finalMem: measurements[measurements.length - 1],
  };
}

async function testWatcherLifecycle(): Promise<{
  passed: boolean;
  details: string[];
  growth: number;
  initialMem: number;
  finalMem: number;
}> {
  console.log('\nTest 3: Watcher Lifecycle');

  const measurements: number[] = [];
  const details: string[] = [];

  for (let i = 0; i < 10; i++) {
    const refs: unknown[] = [];
    const stoppers: (() => void)[] = [];

    for (let j = 0; j < 5000; j++) {
      const r = ref(j);
      refs.push(r);
      stoppers.push(watch(r, () => {}));
    }

    stoppers.forEach((stop) => stop());
    refs.length = 0;
    stoppers.length = 0;

    forceGC();
    await delay(100);

    const mem = getMemory();
    measurements.push(mem.used);
    details.push(`Iteration ${i + 1}: ${formatBytes(mem.used)}`);
  }

  const analysis = analyzeTrend(measurements);
  const threshold = 5 * 1024 * 1024;
  const passed = analysis.growth < threshold;

  console.log(`  Initial: ${formatBytes(measurements[0])}`);
  console.log(`  Final: ${formatBytes(measurements[measurements.length - 1])}`);
  console.log(`  Growth: ${formatBytes(analysis.growth)}`);
  console.log(`  Trend: ${analysis.trend}`);
  console.log(passed ? '  ✅ Pass' : '  ❌ Fail');

  return {
    passed,
    details,
    growth: analysis.growth,
    initialMem: measurements[0],
    finalMem: measurements[measurements.length - 1],
  };
}

async function testEffectScopeLifecycle(): Promise<{
  passed: boolean;
  details: string[];
  growth: number;
  initialMem: number;
  finalMem: number;
}> {
  console.log('\nTest 4: Effect Scope Lifecycle');

  const measurements: number[] = [];
  const details: string[] = [];

  for (let i = 0; i < 10; i++) {
    const scopes: { stop: () => void }[] = [];

    for (let j = 0; j < 1000; j++) {
      const scope = effectScope();
      scope.run(() => {
        const r = ref(j);
        watch(r, () => {});
        computed(() => r.value * 2);
      });
      scopes.push(scope);
    }

    scopes.forEach((scope) => scope.stop());
    scopes.length = 0;

    forceGC();
    await delay(100);

    const mem = getMemory();
    measurements.push(mem.used);
    details.push(`Iteration ${i + 1}: ${formatBytes(mem.used)}`);
  }

  const analysis = analyzeTrend(measurements);
  const threshold = 5 * 1024 * 1024;
  const passed = analysis.growth < threshold;

  console.log(`  Initial: ${formatBytes(measurements[0])}`);
  console.log(`  Final: ${formatBytes(measurements[measurements.length - 1])}`);
  console.log(`  Growth: ${formatBytes(analysis.growth)}`);
  console.log(`  Trend: ${analysis.trend}`);
  console.log(passed ? '  ✅ Pass' : '  ❌ Fail');

  return {
    passed,
    details,
    growth: analysis.growth,
    initialMem: measurements[0],
    finalMem: measurements[measurements.length - 1],
  };
}

async function testComputedLifecycle(): Promise<{
  passed: boolean;
  details: string[];
  growth: number;
  initialMem: number;
  finalMem: number;
}> {
  console.log('\nTest 5: Computed Lifecycle');

  const measurements: number[] = [];
  const details: string[] = [];

  for (let i = 0; i < 10; i++) {
    const base = ref(0);
    const computeds: unknown[] = [];

    for (let j = 0; j < 5000; j++) {
      computeds.push(computed(() => base.value + j));
    }

    base.value = i;

    computeds.length = 0;

    forceGC();
    await delay(100);

    const mem = getMemory();
    measurements.push(mem.used);
    details.push(`Iteration ${i + 1}: ${formatBytes(mem.used)}`);
  }

  const analysis = analyzeTrend(measurements);
  const threshold = 5 * 1024 * 1024;
  const passed = analysis.growth < threshold;

  console.log(`  Initial: ${formatBytes(measurements[0])}`);
  console.log(`  Final: ${formatBytes(measurements[measurements.length - 1])}`);
  console.log(`  Growth: ${formatBytes(analysis.growth)}`);
  console.log(`  Trend: ${analysis.trend}`);
  console.log(passed ? '  ✅ Pass' : '  ❌ Fail');

  return {
    passed,
    details,
    growth: analysis.growth,
    initialMem: measurements[0],
    finalMem: measurements[measurements.length - 1],
  };
}

function generateReport(
  results: {
    name: string;
    passed: boolean;
    details: string[];
    growth: number;
    initialMem: number;
    finalMem: number;
  }[],
): LeakReport {
  return {
    timestamp: new Date().toISOString(),
    results: results.map((r) => ({
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
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
    },
  };
}

function saveReport(report: LeakReport): void {
  const reportPath = path.join(__dirname, '..', 'memlab-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport saved to: ${reportPath}`);
}

async function main(): Promise<void> {
  console.log('Memory Leak Detection');
  console.log('========================');

  if (!global.gc) {
    console.log('\n⚠️ Note: GC not exposed. Run with --expose-gc for more accurate results.');
    console.log('Example: node --expose-gc --loader tsx scripts/memlab-check.ts');
  }

  const results: {
    name: string;
    passed: boolean;
    details: string[];
    growth: number;
    initialMem: number;
    finalMem: number;
  }[] = [];

  const tests = [
    { name: 'Ref Lifecycle', fn: testRefLifecycle },
    { name: 'Reactive Object Lifecycle', fn: testReactiveLifecycle },
    { name: 'Watcher Lifecycle', fn: testWatcherLifecycle },
    { name: 'Effect Scope Lifecycle', fn: testEffectScopeLifecycle },
    { name: 'Computed Lifecycle', fn: testComputedLifecycle },
  ];

  for (const test of tests) {
    const result = await test.fn();
    results.push({
      name: test.name,
      passed: result.passed,
      details: result.details,
      growth: result.growth,
      initialMem: result.initialMem,
      finalMem: result.finalMem,
    });
  }

  const report = generateReport(results);
  saveReport(report);

  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));

  for (const r of results) {
    const status = r.passed ? '✅' : '❌';
    console.log(`${status} ${r.name}: ${formatBytes(r.growth)}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${report.summary.totalTests} tests`);
  console.log(`Pass: ${report.summary.passed}`);
  console.log(`Fail: ${report.summary.failed}`);
  console.log('='.repeat(60));

  if (report.summary.failed > 0) {
    console.log('\n❌ Memory leaks detected!');
    process.exit(1);
  } else {
    console.log('\n✅ No memory leaks detected!');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
