#!/usr/bin/env tsx

/**
 * LytJS 编译器性能监控工具
 * 
 * 使用方法：
 * tsx benchmarks/compiler-monitor.ts
 */

import { compile, getCacheStats, resetCacheStats, clearCompileCache } from '@lytjs/compiler';

// 测试用的模板
const testTemplates = [
  {
    name: 'Simple',
    template: '<div class="container"><span>Hello World</span></div>',
  },
  {
    name: 'Interpolation',
    template: '<div class="container"><span>{{ message }}</span><p>{{ count + 1 }}</p></div>',
  },
  {
    name: 'Directives',
    template: `
      <div v-if="show" class="app">
        <ul>
          <li v-for="item in items" :key="item.id" @click="select(item)">
            {{ item.name }}
          </li>
        </ul>
        <input v-model="text" />
        <div v-show="visible">Conditional content</div>
      </div>
    `,
  },
  {
    name: 'Complex',
    template: `
      <div class="app">
        <header>
          <h1>{{ title }}</h1>
          <nav>
            <a v-for="link in links" :href="link.url">{{ link.text }}</a>
          </nav>
        </header>
        <main>
          <section v-if="activeSection === 'home'">
            <h2>Welcome</h2>
            <div class="grid">
              <article v-for="post in posts" :key="post.id">
                <h3>{{ post.title }}</h3>
                <p>{{ post.excerpt }}</p>
                <button @click="readPost(post.id)">Read More</button>
              </article>
            </div>
          </section>
          <section v-else-if="activeSection === 'about'">
            <h2>About Us</h2>
            <p>{{ aboutText }}</p>
          </section>
          <section v-else>
            <h2>Contact</h2>
            <form @submit="submitContact">
              <input v-model="form.name" type="text" placeholder="Name" />
              <input v-model="form.email" type="email" placeholder="Email" />
              <textarea v-model="form.message" placeholder="Message"></textarea>
              <button type="submit">Send</button>
            </form>
          </section>
        </main>
        <footer>
          <p>{{ copyright }}</p>
        </footer>
      </div>
    `,
  },
];

interface CompilationResult {
  templateName: string;
  coldCacheTime: number;
  warmCacheTime: number;
  cacheHit: boolean;
  codeSize: number;
}

function measureCompilation(template: string, iterations: number = 100): {
  averageTime: number;
  codeSize: number;
} {
  let totalTime = 0;
  let codeSize = 0;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const result = compile(template);
    const end = performance.now();
    totalTime += (end - start);
    if (i === 0) {
      codeSize = result.code.length;
    }
  }

  return {
    averageTime: totalTime / iterations,
    codeSize,
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)} µs`;
  if (ms < 1000) return `${ms.toFixed(2)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function printHeader(title: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${title}`);
  console.log(`${'='.repeat(60)}`);
}

function printTable(data: CompilationResult[]) {
  const nameWidth = Math.max(...data.map(d => d.templateName.length), 12);
  const coldWidth = 18;
  const warmWidth = 18;
  const sizeWidth = 12;
  
  console.log(`${'Template'.padEnd(nameWidth)}  ${'Cold Cache'.padEnd(coldWidth)}  ${'Warm Cache'.padEnd(warmWidth)}  ${'Code Size'.padEnd(sizeWidth)}  Speedup`);
  console.log(`${'-'.repeat(nameWidth)}  ${'-'.repeat(coldWidth)}  ${'-'.repeat(warmWidth)}  ${'-'.repeat(sizeWidth)}  ${'-'.repeat(8)}`);
  
  for (const result of data) {
    const speedup = result.warmCacheTime > 0 ? (result.coldCacheTime / result.warmCacheTime).toFixed(1) : 'N/A';
    console.log(
      `${result.templateName.padEnd(nameWidth)}  ` +
      `${formatTime(result.coldCacheTime).padEnd(coldWidth)}  ` +
      `${formatTime(result.warmCacheTime).padEnd(warmWidth)}  ` +
      `${formatBytes(result.codeSize).padEnd(sizeWidth)}  ` +
      `${speedup}x`
    );
  }
}

function printCacheStats() {
  const stats = getCacheStats();
  const hitRate = stats.totalCompiles > 0 ? ((stats.hits / stats.totalCompiles) * 100).toFixed(1) : '0.0';
  
  console.log(`\n📊 缓存统计`);
  console.log(`   总编译次数: ${stats.totalCompiles}`);
  console.log(`   缓存命中: ${stats.hits} (${hitRate}%)`);
  console.log(`   缓存未命中: ${stats.misses}`);
  console.log(`   总耗时: ${formatTime(stats.totalTime)}`);
  if (stats.totalCompiles > 0) {
    console.log(`   平均每次: ${formatTime(stats.totalTime / stats.totalCompiles)}`);
  }
}

function main() {
  printHeader('🚀 LytJS 编译器性能监控');
  
  const results: CompilationResult[] = [];
  
  console.log('\n📝 开始测试...');
  
  // 测试冷缓存
  console.log('\n1️⃣  测试冷缓存性能...');
  for (const test of testTemplates) {
    clearCompileCache();
    resetCacheStats();
    const result = measureCompilation(test.template, 1);
    results.push({
      templateName: test.name,
      coldCacheTime: result.averageTime,
      warmCacheTime: 0,
      cacheHit: false,
      codeSize: result.codeSize,
    });
  }
  
  // 测试热缓存
  console.log('\n2️⃣  测试热缓存性能...');
  clearCompileCache();
  resetCacheStats();
  
  // 先预热缓存
  for (const test of testTemplates) {
    compile(test.template);
  }
  
  // 测量热缓存性能
  for (let i = 0; i < testTemplates.length; i++) {
    const test = testTemplates[i];
    const result = measureCompilation(test.template, 100);
    results[i].warmCacheTime = result.averageTime;
  }
  
  // 打印结果
  printHeader('📈 性能测试结果');
  printTable(results);
  printCacheStats();
  
  console.log('\n✅ 测试完成!');
}

main();