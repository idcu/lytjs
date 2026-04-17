/**
 * Lyt.js Benchmark Runner — 性能基准测试运行器
 *
 * 纯原生零依赖实现，提供：
 * - BenchmarkSuite 类：addTest / run / getResults
 * - 自动计算平均执行时间、最小/最大值、标准差
 * - 格式化的结果表格输出
 * - before / after 前后置钩子
 *
 * 用法：
 *   const suite = new BenchmarkSuite('My Benchmark');
 *   suite.addTest('test name', () => { ... });
 *   suite.run(1000);
 *   suite.print();
 */

'use strict';

// ============================================================
// BenchmarkResult — 单个测试的结果
// ============================================================

class BenchmarkResult {
  constructor(name, iterations, totalMs, times) {
    this.name = name;
    this.iterations = iterations;
    this.totalMs = totalMs;
    this.times = times;
    this.avgMs = totalMs / iterations;
    this.minMs = Math.min(...times);
    this.maxMs = Math.max(...times);
    this.stdDev = this._standardDeviation(times);
  }

  _standardDeviation(times) {
    const n = times.length;
    if (n < 2) return 0;
    const mean = times.reduce((a, b) => a + b, 0) / n;
    const variance = times.reduce((sum, t) => sum + (t - mean) ** 2, 0) / (n - 1);
    return Math.sqrt(variance);
  }
}

// ============================================================
// BenchmarkSuite — 基准测试套件
// ============================================================

class BenchmarkSuite {
  /**
   * @param {string} name - 套件名称
   */
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.results = [];
    this._beforeEach = null;
    this._afterEach = null;
    this._beforeAll = null;
    this._afterAll = null;
  }

  /**
   * 添加测试用例
   * @param {string} name - 测试名称
   * @param {Function} fn - 测试函数
   * @returns {BenchmarkSuite} this（链式调用）
   */
  addTest(name, fn) {
    if (typeof fn !== 'function') {
      throw new TypeError(`[BenchmarkSuite] 测试 "${name}" 的 fn 必须是函数`);
    }
    this.tests.push({ name, fn });
    return this;
  }

  /**
   * 注册每个测试执行前的钩子
   * @param {Function} fn
   * @returns {BenchmarkSuite}
   */
  beforeEach(fn) {
    this._beforeEach = fn;
    return this;
  }

  /**
   * 注册每个测试执行后的钩子
   * @param {Function} fn
   * @returns {BenchmarkSuite}
   */
  afterEach(fn) {
    this._afterEach = fn;
    return this;
  }

  /**
   * 注册所有测试执行前的钩子
   * @param {Function} fn
   * @returns {BenchmarkSuite}
   */
  before(fn) {
    this._beforeAll = fn;
    return this;
  }

  /**
   * 注册所有测试执行后的钩子
   * @param {Function} fn
   * @returns {BenchmarkSuite}
   */
  after(fn) {
    this._afterAll = fn;
    return this;
  }

  /**
   * 运行所有测试
   * @param {number} [iterations=1000] - 每个测试的迭代次数
   * @returns {BenchmarkResult[]} 结果数组
   */
  run(iterations) {
    if (typeof iterations !== 'number' || iterations < 1) {
      iterations = 1000;
    }

    this.results = [];

    // 打印表头
    this._printHeader();

    // beforeAll 钩子
    if (this._beforeAll) {
      this._beforeAll();
    }

    for (const test of this.tests) {
      const result = this._runSingle(test.name, test.fn, iterations);
      this.results.push(result);
      this._printRow(result);
    }

    // afterAll 钩子
    if (this._afterAll) {
      this._afterAll();
    }

    // 打印分隔线
    console.log(this._separator());

    return this.results;
  }

  /**
   * 运行单个测试
   */
  _runSingle(name, fn, iterations) {
    // 预热：先跑几轮让 JIT 优化
    const warmup = Math.min(10, iterations);
    for (let i = 0; i < warmup; i++) {
      fn();
    }

    // beforeEach 钩子
    if (this._beforeEach) {
      this._beforeEach(name);
    }

    const times = [];
    const startTotal = performance.now();

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      fn();
      const end = performance.now();
      times.push(end - start);
    }

    const totalMs = performance.now() - startTotal;

    // afterEach 钩子
    if (this._afterEach) {
      this._afterEach(name);
    }

    return new BenchmarkResult(name, iterations, totalMs, times);
  }

  /**
   * 获取所有结果
   * @returns {BenchmarkResult[]}
   */
  getResults() {
    return this.results;
  }

  /**
   * 打印格式化的结果表格
   */
  print() {
    if (this.results.length === 0) {
      console.log('[BenchmarkSuite] 尚未运行任何测试。请先调用 run()。');
      return;
    }

    this._printHeader();
    for (const result of this.results) {
      this._printRow(result);
    }
    console.log(this._separator());
  }

  // ============================================================
  // 格式化输出
  // ============================================================

  _separator() {
    return '+-' + '-'.repeat(32) + '-+-' + '-'.repeat(10) + '-+-' + '-'.repeat(12) + '-+-' + '-'.repeat(12) + '-+-' + '-'.repeat(12) + '-+-' + '-'.repeat(12) + '+';
  }

  _printHeader() {
    console.log('');
    console.log(`  Benchmark: ${this.name}`);
    console.log(this._separator());
    console.log(
      '| ' + this._pad('Test Name', 32) +
      ' | ' + this._pad('Iters', 10) +
      ' | ' + this._pad('Total (ms)', 12) +
      ' | ' + this._pad('Avg (ms)', 12) +
      ' | ' + this._pad('Min (ms)', 12) +
      ' | ' + this._pad('StdDev', 12) + ' |'
    );
    console.log(this._separator());
  }

  _printRow(result) {
    console.log(
      '| ' + this._pad(result.name, 32) +
      ' | ' + this._pad(String(result.iterations), 10) +
      ' | ' + this._pad(result.totalMs.toFixed(2), 12) +
      ' | ' + this._pad(result.avgMs.toFixed(4), 12) +
      ' | ' + this._pad(result.minMs.toFixed(4), 12) +
      ' | ' + this._pad(result.stdDev.toFixed(4), 12) + ' |'
    );
  }

  _pad(str, width) {
    if (str.length > width) {
      return str.slice(0, width - 1) + '\u2026';
    }
    return str + ' '.repeat(width - str.length);
  }
}

// ============================================================
// 导出
// ============================================================

module.exports = { BenchmarkSuite, BenchmarkResult };
