// benchmarks/build-performance.ts
// 构建性能对比工具 - v6.9.0
// 监控和对比构建速度变化

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * 构建性能测试结果
 */
export interface BuildPerformanceResult {
  /** 测试名称 */
  testName: string;
  /** 构建次数 */
  iterations: number;
  /** 总耗时（ms） */
  totalTime: number;
  /** 平均每次耗时（ms） */
  averageTime: number;
  /** 中位数耗时（ms） */
  medianTime: number;
  /** 最小耗时（ms） */
  minTime: number;
  /** 最大耗时（ms） */
  maxTime: number;
  /** 构建输出大小（bytes） */
  outputSize: number;
  /** 构建输出文件数 */
  outputFiles: number;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 构建性能比较结果
 */
export interface BuildPerformanceComparison {
  /** 当前版本结果 */
  current: BuildPerformanceResult;
  /** 基线版本结果 */
  baseline?: BuildPerformanceResult;
  /** 耗时差异 */
  timeDiff: {
    absolute: number;
    percentage: number;
  };
  /** 输出大小差异 */
  sizeDiff: {
    absolute: number;
    percentage: number;
  };
  /** 是否有性能回归 */
  hasRegression: boolean;
  /** 回归程度 */
  regressionSeverity?: 'minor' | 'moderate' | 'severe';
}

/**
 * 构建性能基准测试类
 */
export class BuildPerformanceBenchmark {
  private results: BuildPerformanceResult[] = [];
  private baselines: Map<string, BuildPerformanceResult> = new Map();
  private readonly baselineFile = path.join(__dirname, '.build-baseline.json');

  constructor() {
    this.loadBaselines();
  }

  /**
   * 运行构建性能测试
   */
  runBuildTest(
    testName: string,
    buildCommand: string,
    outputDir: string,
    options: {
      iterations: number;
      warmup?: boolean;
    } = { iterations: 3, warmup: true }
  ): BuildPerformanceResult {
    const { iterations, warmup } = options;
    const times: number[] = [];

    console.log(`\n🧪 开始构建性能测试: ${testName}`);
    console.log(`   迭代次数: ${iterations}`);

    if (warmup) {
      console.log('   预热构建...');
      this.runBuild(buildCommand);
    }

    for (let i = 0; i < iterations; i++) {
      console.log(`   执行构建 ${i + 1}/${iterations}...`);
      const startTime = performance.now();
      this.runBuild(buildCommand);
      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    // 计算统计数据
    times.sort((a, b) => a - b);
    const totalTime = times.reduce((sum, t) => sum + t, 0);
    const averageTime = totalTime / iterations;
    const medianTime = times[Math.floor(times.length / 2)];
    const minTime = times[0];
    const maxTime = times[times.length - 1];

    // 检查输出
    const outputStats = this.measureOutput(outputDir);

    const result: BuildPerformanceResult = {
      testName,
      iterations,
      totalTime,
      averageTime,
      medianTime,
      minTime,
      maxTime,
      outputSize: outputStats.size,
      outputFiles: outputStats.files,
      timestamp: Date.now(),
    };

    this.results.push(result);
    return result;
  }

  /**
   * 保存基线版本
   */
  saveBaseline(testName: string, result: BuildPerformanceResult): void {
    this.baselines.set(testName, result);
    this.saveBaselines();
    console.log(`💾 保存基线版本: ${testName}`);
  }

  /**
   * 比较构建性能
   */
  comparePerformance(
    current: BuildPerformanceResult,
    baselineName?: string
  ): BuildPerformanceComparison {
    const baseline = baselineName ? this.baselines.get(baselineName) : undefined;

    if (!baseline) {
      return {
        current,
        baseline: undefined,
        timeDiff: { absolute: 0, percentage: 0 },
        sizeDiff: { absolute: 0, percentage: 0 },
        hasRegression: false,
      };
    }

    // 计算耗时差异
    const timeAbsolute = current.averageTime - baseline.averageTime;
    const timePercentage = (timeAbsolute / baseline.averageTime) * 100;

    // 计算大小差异
    const sizeAbsolute = current.outputSize - baseline.outputSize;
    const sizePercentage = baseline.outputSize > 0 
      ? (sizeAbsolute / baseline.outputSize) * 100 
      : 0;

    // 判断是否有性能回归
    let hasRegression = false;
    let regressionSeverity: 'minor' | 'moderate' | 'severe' | undefined;

    if (timePercentage > 10) {
      hasRegression = true;
      regressionSeverity = 'severe';
    } else if (timePercentage > 5) {
      hasRegression = true;
      regressionSeverity = 'moderate';
    } else if (timePercentage > 2) {
      hasRegression = true;
      regressionSeverity = 'minor';
    }

    return {
      current,
      baseline,
      timeDiff: { absolute: timeAbsolute, percentage: timePercentage },
      sizeDiff: { absolute: sizeAbsolute, percentage: sizePercentage },
      hasRegression,
      regressionSeverity,
    };
  }

  /**
   * 格式化输出结果
   */
  formatResults(results: BuildPerformanceResult[]): string {
    let output = '\n📊 构建性能基准测试结果\n';
    output += '='.repeat(80) + '\n';

    for (const result of results) {
      output += `\n🔍 测试: ${result.testName}\n`;
      output += '─'.repeat(60) + '\n';
      output += `   迭代次数: ${result.iterations}\n`;
      output += `   总耗时: ${this.formatTime(result.totalTime)}\n`;
      output += `   平均: ${this.formatTime(result.averageTime)}\n`;
      output += `   中位数: ${this.formatTime(result.medianTime)}\n`;
      output += `   最小: ${this.formatTime(result.minTime)}\n`;
      output += `   最大: ${this.formatTime(result.maxTime)}\n`;
      output += `   输出大小: ${this.formatBytes(result.outputSize)}\n`;
      output += `   输出文件: ${result.outputFiles}\n`;
    }

    return output;
  }

  /**
   * 格式化比较结果
   */
  formatComparison(comparison: BuildPerformanceComparison): string {
    let output = '\n📈 构建性能对比结果\n';
    output += '='.repeat(80) + '\n';
    output += `   测试: ${comparison.current.testName}\n`;

    if (!comparison.baseline) {
      output += '   ⚠️ 无基线版本数据\n';
      return output;
    }

    const timeSign = comparison.timeDiff.percentage >= 0 ? '+' : '';
    const sizeSign = comparison.sizeDiff.percentage >= 0 ? '+' : '';

    output += `\n   ⏱️  耗时变化:\n`;
    output += `      基线: ${this.formatTime(comparison.baseline.averageTime)}\n`;
    output += `      当前: ${this.formatTime(comparison.current.averageTime)}\n`;
    output += `      差异: ${timeSign}${this.formatTime(comparison.timeDiff.absolute)} `;
    output += `(${timeSign}${comparison.timeDiff.percentage.toFixed(2)}%)\n`;

    output += `\n   📦 输出大小变化:\n`;
    output += `      基线: ${this.formatBytes(comparison.baseline.outputSize)}\n`;
    output += `      当前: ${this.formatBytes(comparison.current.outputSize)}\n`;
    output += `      差异: ${sizeSign}${this.formatBytes(comparison.sizeDiff.absolute)} `;
    output += `(${sizeSign}${comparison.sizeDiff.percentage.toFixed(2)}%)\n`;

    if (comparison.hasRegression) {
      const severityText = {
        minor: '轻微',
        moderate: '中等',
        severe: '严重',
      }[comparison.regressionSeverity!];
      output += `\n   ⚠️  检测到性能回归: ${severityText}\n`;
    } else if (comparison.timeDiff.percentage < 0) {
      output += `\n   ✅ 性能提升: ${Math.abs(comparison.timeDiff.percentage).toFixed(2)}%\n`;
    } else {
      output += `\n   ✅ 性能保持稳定\n`;
    }

    return output;
  }

  /**
   * 获取所有结果
   */
  getResults(): BuildPerformanceResult[] {
    return [...this.results];
  }

  // ============ 私有方法 ============

  /**
   * 执行构建命令
   */
  private runBuild(command: string): void {
    const [cmd, ...args] = command.split(' ');
    execFileSync(cmd, args, {
      cwd: process.cwd(),
      stdio: 'ignore',
    });
  }

  /**
   * 测量输出目录
   */
  private measureOutput(dir: string): { size: number; files: number } {
    if (!fs.existsSync(dir)) {
      return { size: 0, files: 0 };
    }

    let totalSize = 0;
    let totalFiles = 0;

    const traverse = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isFile()) {
          totalFiles++;
          totalSize += fs.statSync(fullPath).size;
        } else if (entry.isDirectory()) {
          traverse(fullPath);
        }
      }
    };

    traverse(dir);
    return { size: totalSize, files: totalFiles };
  }

  /**
   * 加载基线数据
   */
  private loadBaselines(): void {
    if (fs.existsSync(this.baselineFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.baselineFile, 'utf-8'));
        for (const [name, result] of Object.entries(data)) {
          this.baselines.set(name, result as BuildPerformanceResult);
        }
      } catch (e) {
        console.warn('⚠️ 加载基线数据失败', e);
      }
    }
  }

  /**
   * 保存基线数据
   */
  private saveBaselines(): void {
    const data: Record<string, BuildPerformanceResult> = {};
    for (const [name, result] of this.baselines) {
      data[name] = result;
    }
    fs.writeFileSync(this.baselineFile, JSON.stringify(data, null, 2));
  }

  /**
   * 格式化时间
   */
  private formatTime(ms: number): string {
    if (ms < 1000) {
      return `${ms.toFixed(2)}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  }

  /**
   * 格式化字节
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  }
}

/**
 * 快速构建性能测试套件
 */
export function runQuickBuildSuite(): BuildPerformanceResult[] {
  const _benchmark = new BuildPerformanceBenchmark();

  // 示例测试（实际项目中应该配置真实的构建命令）
  console.log('📦 运行快速构建性能测试...');
  console.log('   (注意: 这只是一个示例，请根据实际项目配置构建命令)');

  // 这里只是演示，实际使用时应该配置真实的构建测试
  const result: BuildPerformanceResult = {
    testName: '示例构建测试',
    iterations: 3,
    totalTime: 5000,
    averageTime: 1666.67,
    medianTime: 1600,
    minTime: 1500,
    maxTime: 1900,
    outputSize: 1024 * 1024, // 1MB
    outputFiles: 50,
    timestamp: Date.now(),
  };

  return [result];
}

export default BuildPerformanceBenchmark;
