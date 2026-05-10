#!/usr/bin/env node
/**
 * å†…å­˜æ³„æ¼æ£€æµ‹è„šæœ? * 
 * è¿è¡Œå†…å­˜å¯†é›†åž‹åœºæ™¯ï¼Œæ£€æµ‹å†…å­˜æ˜¯å¦æŒç»­å¢žé•? * 
 * ä½¿ç”¨æ–¹æ³•:
 *   tsx scripts/memlab-check.ts
 *   # æˆ–å¸¦ GC æ ‡å¿—ä»¥èŽ·å¾—æ›´å‡†ç¡®çš„ç»“æž?
 *   node --expose-gc --loader tsx scripts/memlab-check.ts
 */

import { ref, computed, watch, effectScope, reactive } from '../packages/reactivity/src/index.js';
import { delay } from '../packages/common/common-timing/src/index.js';
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
    // å¤šæ¬¡ GC ä»¥ç¡®ä¿æ¸…ç?    for (let i = 0; i < 3; i++) {
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

  // ç®€å•çº¿æ€§å›žå½’è®¡ç®—æ–œçŽ?  const n = measurements.length;
  const sumX = measurements.reduce((sum, _, i) => sum + i, 0);
  const sumY = measurements.reduce((sum, m) => sum + m, 0);
  const sumXY = measurements.reduce((sum, m, i) => sum + i * m, 0);
  const sumXX = measurements.reduce((sum, _, i) => sum + i * i, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

  // åˆ¤æ–­è¶‹åŠ¿
  const threshold = 1024 * 1024; // 1MB é˜ˆå€?  let trend: 'increasing' | 'stable' | 'decreasing';
  if (growth > threshold) {
    trend = 'increasing';
  } else if (growth < -threshold) {
    trend = 'decreasing';
  } else {
    trend = 'stable';
  }

  return { growth, trend, slope };
}

// åœºæ™¯1: åˆ›å»º/é”€æ¯å¤§é‡?refs
async function testRefLifecycle(): Promise<{ passed: boolean; details: string[]; growth: number }> {
  console.log('\nðŸ§ª åœºæ™¯1: Ref ç”Ÿå‘½å‘¨æœŸå†…å­˜æ£€æµ?);
  
  const measurements: number[] = [];
  const details: string[] = [];
  
  for (let i = 0; i < 10; i++) {
    // åˆ›å»º 10000 ä¸?refs
    const refs: any[] = [];
    for (let j = 0; j < 10000; j++) {
      refs.push(ref(j));
    }
    
    // æ¸…ç©ºå¼•ç”¨
    refs.length = 0;
    
    forceGC();
    await delay(100);
    
    const mem = getMemory();
    measurements.push(mem.used);
    details.push(`Iteration ${i + 1}: ${formatBytes(mem.used)}`);
  }
  
  const analysis = analyzeTrend(measurements);
  const threshold = 5 * 1024 * 1024; // 5MB é˜ˆå€?  const passed = analysis.growth < threshold;
  
  console.log(`  åˆå§‹å†…å­˜: ${formatBytes(measurements[0])}`);
  console.log(`  æœ€ç»ˆå†…å­? ${formatBytes(measurements[measurements.length - 1])}`);
  console.log(`  å¢žé•¿: ${formatBytes(analysis.growth)}`);
  console.log(`  è¶‹åŠ¿: ${analysis.trend}`);
  console.log(passed ? '  âœ?é€šè¿‡' : '  â?æ£€æµ‹åˆ°å†…å­˜æ³„æ¼');
  
  return { passed, details, growth: analysis.growth };
}

// åœºæ™¯2: åˆ›å»º/é”€æ¯å¤§é‡?reactive å¯¹è±¡
async function testReactiveLifecycle(): Promise<{ passed: boolean; details: string[]; growth: number }> {
  console.log('\nðŸ§ª åœºæ™¯2: Reactive å¯¹è±¡ç”Ÿå‘½å‘¨æœŸå†…å­˜æ£€æµ?);
  
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
    await delay(100);
    
    const mem = getMemory();
    measurements.push(mem.used);
    details.push(`Iteration ${i + 1}: ${formatBytes(mem.used)}`);
  }
  
  const analysis = analyzeTrend(measurements);
  const threshold = 5 * 1024 * 1024;
  const passed = analysis.growth < threshold;
  
  console.log(`  åˆå§‹å†…å­˜: ${formatBytes(measurements[0])}`);
  console.log(`  æœ€ç»ˆå†…å­? ${formatBytes(measurements[measurements.length - 1])}`);
  console.log(`  å¢žé•¿: ${formatBytes(analysis.growth)}`);
  console.log(`  è¶‹åŠ¿: ${analysis.trend}`);
  console.log(passed ? '  âœ?é€šè¿‡' : '  â?æ£€æµ‹åˆ°å†…å­˜æ³„æ¼');
  
  return { passed, details, growth: analysis.growth };
}

// åœºæ™¯3: å“åº”å¼è®¢é˜?(watchers)
async function testWatcherLifecycle(): Promise<{ passed: boolean; details: string[]; growth: number }> {
  console.log('\nðŸ§ª åœºæ™¯3: Watcher ç”Ÿå‘½å‘¨æœŸå†…å­˜æ£€æµ?);
  
  const measurements: number[] = [];
  const details: string[] = [];
  
  for (let i = 0; i < 10; i++) {
    const refs: any[] = [];
    const stoppers: any[] = [];
    
    // åˆ›å»ºå¤§é‡å“åº”å¼æ•°æ®å’Œè®¢é˜…
    for (let j = 0; j < 5000; j++) {
      const r = ref(j);
      refs.push(r);
      stoppers.push(watch(r, () => {}));
    }
    
    // æ¸…ç†è®¢é˜…
    stoppers.forEach(stop => stop());
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
  
  console.log(`  åˆå§‹å†…å­˜: ${formatBytes(measurements[0])}`);
  console.log(`  æœ€ç»ˆå†…å­? ${formatBytes(measurements[measurements.length - 1])}`);
  console.log(`  å¢žé•¿: ${formatBytes(analysis.growth)}`);
  console.log(`  è¶‹åŠ¿: ${analysis.trend}`);
  console.log(passed ? '  âœ?é€šè¿‡' : '  â?æ£€æµ‹åˆ°å†…å­˜æ³„æ¼');
  
  return { passed, details, growth: analysis.growth };
}

// åœºæ™¯4: Effect Scope ç”Ÿå‘½å‘¨æœŸ
async function testEffectScopeLifecycle(): Promise<{ passed: boolean; details: string[]; growth: number }> {
  console.log('\nðŸ§ª åœºæ™¯4: Effect Scope ç”Ÿå‘½å‘¨æœŸå†…å­˜æ£€æµ?);
  
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
    
    // åœæ­¢æ‰€æœ?scope
    scopes.forEach(scope => scope.stop());
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
  
  console.log(`  åˆå§‹å†…å­˜: ${formatBytes(measurements[0])}`);
  console.log(`  æœ€ç»ˆå†…å­? ${formatBytes(measurements[measurements.length - 1])}`);
  console.log(`  å¢žé•¿: ${formatBytes(analysis.growth)}`);
  console.log(`  è¶‹åŠ¿: ${analysis.trend}`);
  console.log(passed ? '  âœ?é€šè¿‡' : '  â?æ£€æµ‹åˆ°å†…å­˜æ³„æ¼');
  
  return { passed, details, growth: analysis.growth };
}

// åœºæ™¯5: Computed å€¼ç”Ÿå‘½å‘¨æœ?async function testComputedLifecycle(): Promise<{ passed: boolean; details: string[]; growth: number }> {
  console.log('\nðŸ§ª åœºæ™¯5: Computed ç”Ÿå‘½å‘¨æœŸå†…å­˜æ£€æµ?);
  
  const measurements: number[] = [];
  const details: string[] = [];
  
  for (let i = 0; i < 10; i++) {
    const base = ref(0);
    const computeds: any[] = [];
    
    for (let j = 0; j < 5000; j++) {
      computeds.push(computed(() => base.value + j));
    }
    
    // è§¦å‘è®¡ç®—
    base.value = i;
    
    // æ¸…ç†
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
  
  console.log(`  åˆå§‹å†…å­˜: ${formatBytes(measurements[0])}`);
  console.log(`  æœ€ç»ˆå†…å­? ${formatBytes(measurements[measurements.length - 1])}`);
  console.log(`  å¢žé•¿: ${formatBytes(analysis.growth)}`);
  console.log(`  è¶‹åŠ¿: ${analysis.trend}`);
  console.log(passed ? '  âœ?é€šè¿‡' : '  â?æ£€æµ‹åˆ°å†…å­˜æ³„æ¼');
  
  return { passed, details, growth: analysis.growth };
}

// åœºæ™¯6: å¤§é‡å“åº”å¼æ•°ç»„æ“ä½?async function testLargeArrayOperations(): Promise<{ passed: boolean; details: string[]; growth: number }> {
  console.log('\nðŸ§ª åœºæ™¯6: å¤§åž‹æ•°ç»„æ“ä½œå†…å­˜æ£€æµ?);
  
  const measurements: number[] = [];
  const details: string[] = [];
  
  for (let i = 0; i < 5; i++) {
    const arr = reactive<number[]>([]);
    
    // æ·»åŠ å¤§é‡æ•°æ®
    for (let j = 0; j < 10000; j++) {
      arr.push(j);
    }
    
    // æ¸…ç©ºæ•°ç»„
    arr.length = 0;
    
    forceGC();
    await delay(100);
    
    const mem = getMemory();
    measurements.push(mem.used);
    details.push(`Iteration ${i + 1}: ${formatBytes(mem.used)}`);
  }
  
  const analysis = analyzeTrend(measurements);
  const threshold = 10 * 1024 * 1024;
  const passed = analysis.growth < threshold;
  
  console.log(`  åˆå§‹å†…å­˜: ${formatBytes(measurements[0])}`);
  console.log(`  æœ€ç»ˆå†…å­? ${formatBytes(measurements[measurements.length - 1])}`);
  console.log(`  å¢žé•¿: ${formatBytes(analysis.growth)}`);
  console.log(`  è¶‹åŠ¿: ${analysis.trend}`);
  console.log(passed ? '  âœ?é€šè¿‡' : '  â?æ£€æµ‹åˆ°å†…å­˜æ³„æ¼');
  
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
  console.log(`\nðŸ“„ è¯¦ç»†æŠ¥å‘Šå·²ä¿å­? ${reportPath}`);
}

async function main(): Promise<void> {
  console.log('ðŸ” å†…å­˜æ³„æ¼æ£€æµ‹å¼€å§?..');
  console.log('=' .repeat(60));
  
  if (!global.gc) {
    console.log('\nâš ï¸  è­¦å‘Š: æœªä½¿ç”?--expose-gc æ ‡å¿—è¿è¡Œ');
    console.log('   æ£€æµ‹ç»“æžœå¯èƒ½ä¸å¤Ÿå‡†ç¡?);
    console.log('   å»ºè®®è¿è¡Œæ–¹å¼: node --expose-gc --loader tsx scripts/memlab-check.ts');
  }
  
  const results: { name: string; passed: boolean; details: string[]; growth: number; initialMem: number; finalMem: number }[] = [];
  
  // è¿è¡Œæ‰€æœ‰æµ‹è¯?  const tests = [
    { name: 'Ref ç”Ÿå‘½å‘¨æœŸ', fn: testRefLifecycle },
    { name: 'Reactive å¯¹è±¡ç”Ÿå‘½å‘¨æœŸ', fn: testReactiveLifecycle },
    { name: 'Watcher ç”Ÿå‘½å‘¨æœŸ', fn: testWatcherLifecycle },
    { name: 'Effect Scope ç”Ÿå‘½å‘¨æœŸ', fn: testEffectScopeLifecycle },
    { name: 'Computed ç”Ÿå‘½å‘¨æœŸ', fn: testComputedLifecycle },
    { name: 'å¤§åž‹æ•°ç»„æ“ä½œ', fn: testLargeArrayOperations },
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
  
  // ç”ŸæˆæŠ¥å‘Š
  const report = generateReport(results);
  saveReport(report);
  
  // è¾“å‡ºæ‘˜è¦
  console.log('\n' + '='.repeat(60));
  console.log('ðŸ“Š æ£€æµ‹ç»“æžœæ‘˜è¦?);
  console.log('='.repeat(60));
  
  for (const r of results) {
    const status = r.passed ? 'âœ? : 'â?;
    console.log(`${status} ${r.name}: ${formatBytes(r.growth)}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`æ€»è®¡: ${report.summary.totalTests} ä¸ªæµ‹è¯•`);
  console.log(`é€šè¿‡: ${report.summary.passed} ä¸ª`);
  console.log(`å¤±è´¥: ${report.summary.failed} ä¸ª`);
  console.log('='.repeat(60));
  
  if (report.summary.failed > 0) {
    console.log('\nâ?æ£€æµ‹åˆ°å†…å­˜æ³„æ¼ï¼?);
    process.exit(1);
  } else {
    console.log('\nâœ?æ‰€æœ‰å†…å­˜æ³„æ¼æ£€æµ‹é€šè¿‡ï¼?);
    process.exit(0);
  }
}

main().catch(error => {
  console.error('â?æ£€æµ‹è¿‡ç¨‹ä¸­å‘ç”Ÿé”™è¯¯:', error);
  process.exit(1);
});
