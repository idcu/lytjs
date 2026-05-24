// scripts/project-optimizer.ts
// 项目优化检查工具 - v6.9.0
// 分析代码重复、公共类型提取等

import fs from 'fs';
import path from 'path';

/**
 * 重复代码分析结果
 */
export interface DuplicateCodeResult {
  filePath: string;
  lineStart: number;
  lineEnd: number;
  code: string;
  similarity: number;
  occurrences: number;
}

/**
 * 公共类型/函数分析结果
 */
export interface CommonCodeResult {
  name: string;
  type: 'type' | 'interface' | 'function' | 'class' | 'constant';
  occurrences: Array<{
    filePath: string;
    line: number;
  }>;
  code: string;
}

/**
 * 依赖关系分析结果
 */
export interface DependencyResult {
  filePath: string;
  dependencies: string[];
  dependents: string[];
}

/**
 * 构建产物分析结果
 */
export interface BundleAnalysisResult {
  filePath: string;
  size: number;
  gzipSize?: number;
  largeFiles: Array<{
    filePath: string;
    size: number;
    percentage: number;
  }>;
}

/**
 * 优化建议
 */
export interface OptimizationSuggestion {
  type: 'duplicate-code' | 'common-code' | 'circular-dependency' | 'large-file';
  severity: 'low' | 'medium' | 'high';
  message: string;
  files?: string[];
}

/**
 * 项目优化检查器类
 */
export class ProjectOptimizer {
  private rootDir: string;
  private excludePatterns: RegExp[];

  constructor(rootDir: string, options: { exclude?: string[] } = {}) {
    this.rootDir = rootDir;
    this.excludePatterns = (options.exclude || []).map(
      (pattern) => new RegExp(pattern.replace(/\*/g, '.*'))
    );
  }

  /**
   * 查找重复代码
   */
  findDuplicateCode(
    minLength: number = 5,
    _minSimilarity: number = 0.8
  ): DuplicateCodeResult[] {
    const results: DuplicateCodeResult[] = [];
    const fileCodes: Array<{
      path: string;
      _lines: string[];
    }> = [];

    // 收集所有 TypeScript 文件
    this.walkDir(this.rootDir, (filePath) => {
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        fileCodes.push({
          path: filePath,
          _lines: content.split('\n'),
        });
      }
    });

    // 简单的重复检测（基于相似度）
    // 实际项目中可以使用更复杂的算法
    const seenSnippets = new Map<string, Array<{ filePath: string; line: number }>>();

    for (const file of fileCodes) {
      for (let i = 0; i < file.lines.length - minLength + 1; i++) {
        const snippet = file.lines.slice(i, i + minLength).join('\n');
        const normalized = this.normalizeCode(snippet);
        
        if (seenSnippets.has(normalized)) {
          const existing = seenSnippets.get(normalized)!;
          results.push({
            filePath: file.path,
            lineStart: i + 1,
            lineEnd: i + minLength,
            code: snippet,
            similarity: 1,
            occurrences: existing.length + 1,
          });
        } else {
          seenSnippets.set(normalized, [{ filePath: file.path, line: i + 1 }]);
        }
      }
    }

    return results;
  }

  /**
   * 查找公共类型和函数
   */
  findCommonCode(): CommonCodeResult[] {
    const results: Map<string, CommonCodeResult> = new Map();
    const pattern = /(?:export\s+)?(type|interface|function|class|const)\s+(\w+)/g;

    this.walkDir(this.rootDir, (filePath) => {
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        let match;
        while ((match = pattern.exec(content)) !== null) {
          const type = match[1] as 'type' | 'interface' | 'function' | 'class' | 'constant';
          const name = match[2];
          const key = `${type}:${name}`;

          if (!results.has(key)) {
            results.set(key, {
              name,
              type,
              occurrences: [],
              code: '',
            });
          }

          const result = results.get(key)!;
          const lineNumber = content.slice(0, match.index).split('\n').length;
          result.occurrences.push({
            filePath,
            line: lineNumber,
          });
        }
      }
    });

    return Array.from(results.values())
      .filter((result) => result.occurrences.length > 1)
      .sort((a, b) => b.occurrences.length - a.occurrences.length);
  }

  /**
   * 分析依赖关系
   */
  analyzeDependencies(): DependencyResult[] {
    const results: Map<string, DependencyResult> = new Map();

    this.walkDir(this.rootDir, (filePath) => {
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const importPattern = /from\s+['"]([@\w./-]+)['"]/g;
        
        const dependencies: string[] = [];
        let match;
        while ((match = importPattern.exec(content)) !== null) {
          dependencies.push(match[1]);
        }

        results.set(filePath, {
          filePath,
          dependencies,
          dependents: [],
        });
      }
    });

    // 构建反向依赖
    for (const [filePath, data] of results) {
      for (const dep of data.dependencies) {
        for (const [otherPath, _otherData] of results) {
          if (otherPath !== filePath && otherPath.includes(dep)) {
            if (!data.dependents.includes(otherPath)) {
              data.dependents.push(otherPath);
            }
          }
        }
      }
    }

    return Array.from(results.values());
  }

  /**
   * 分析构建产物
   */
  analyzeBundle(dirPath: string, threshold: number = 100 * 1024): BundleAnalysisResult {
    const largeFiles: Array<{ filePath: string; size: number; percentage: number }> = [];
    let totalSize = 0;

    const traverse = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isFile()) {
          const size = fs.statSync(fullPath).size;
          totalSize += size;
          
          if (size > threshold) {
            largeFiles.push({
              filePath: fullPath,
              size,
              percentage: 0,
            });
          }
        } else if (entry.isDirectory()) {
          traverse(fullPath);
        }
      }
    };

    traverse(dirPath);

    // 计算百分比
    for (const file of largeFiles) {
      file.percentage = totalSize > 0 ? (file.size / totalSize) * 100 : 0;
    }

    largeFiles.sort((a, b) => b.size - a.size);

    return {
      filePath: dirPath,
      size: totalSize,
      largeFiles: largeFiles.slice(0, 10), // 最大的 10 个文件
    };
  }

  /**
   * 生成优化建议
   */
  generateSuggestions(
    duplicates: DuplicateCodeResult[],
    commonCode: CommonCodeResult[],
    dependencies: DependencyResult[],
    bundle: BundleAnalysisResult
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // 重复代码建议
    if (duplicates.length > 0) {
      suggestions.push({
        type: 'duplicate-code',
        severity: duplicates.length > 10 ? 'high' : duplicates.length > 5 ? 'medium' : 'low',
        message: `发现 ${duplicates.length} 处重复代码，建议提取为公共函数或组件`,
        files: Array.from(new Set(duplicates.map((d) => d.filePath))).slice(0, 5),
      });
    }

    // 公共代码建议
    const highFreqCode = commonCode.filter((c) => c.occurrences.length > 3);
    if (highFreqCode.length > 0) {
      suggestions.push({
        type: 'common-code',
        severity: 'medium',
        message: `发现 ${highFreqCode.length} 个高频使用的类型/函数，建议统一管理`,
        files: Array.from(new Set(highFreqCode.flatMap((c) => c.occurrences.map((o) => o.filePath)))).slice(0, 5),
      });
    }

    // 大文件建议
    if (bundle.largeFiles.length > 0) {
      suggestions.push({
        type: 'large-file',
        severity: bundle.largeFiles[0]?.percentage > 20 ? 'high' : 'medium',
        message: `发现 ${bundle.largeFiles.length} 个较大的文件，建议拆分`,
        files: bundle.largeFiles.map((f) => f.filePath),
      });
    }

    return suggestions;
  }

  /**
   * 格式化输出报告
   */
  formatReport(
    duplicates: DuplicateCodeResult[],
    commonCode: CommonCodeResult[],
    dependencies: DependencyResult[],
    bundle: BundleAnalysisResult,
    suggestions: OptimizationSuggestion[]
  ): string {
    let report = '\n📊 项目优化检查报告\n';
    report += '='.repeat(80) + '\n';

    // 优化建议
    if (suggestions.length > 0) {
      report += '\n💡 优化建议\n';
      report += '-'.repeat(60) + '\n';
      for (const suggestion of suggestions) {
        const severityIcon = {
          low: '🟢',
          medium: '🟡',
          high: '🔴',
        }[suggestion.severity];
        report += `${severityIcon} [${suggestion.type}] ${suggestion.message}\n`;
        if (suggestion.files) {
          for (const file of suggestion.files) {
            report += `   - ${file}\n`;
          }
        }
        report += '\n';
      }
    }

    // 重复代码
    report += `\n📝 重复代码检查\n`;
    report += `-'.repeat(60) + '\n`;
    report += `  发现: ${duplicates.length} 处重复代码\n`;
    for (const dup of duplicates.slice(0, 5)) {
      report += `  - ${dup.filePath}:${dup.lineStart}-${dup.lineEnd} (${dup.occurrences} 次)\n`;
    }
    if (duplicates.length > 5) {
      report += `  ... 还有 ${duplicates.length - 5} 处\n`;
    }

    // 公共代码
    report += `\n🔧 公共代码分析\n`;
    report += '-'.repeat(60) + '\n';
    for (const code of commonCode.slice(0, 10)) {
      report += `  ${code.type} ${code.name}: ${code.occurrences.length} 次使用\n`;
    }
    if (commonCode.length > 10) {
      report += `  ... 还有 ${commonCode.length - 10} 个\n`;
    }

    // 构建产物
    report += `\n📦 构建产物分析\n`;
    report += '-'.repeat(60) + '\n';
    report += `  总大小: ${this.formatBytes(bundle.size)}\n`;
    for (const file of bundle.largeFiles) {
      report += `  - ${file.filePath}: ${this.formatBytes(file.size)} (${file.percentage.toFixed(1)}%)\n`;
    }

    return report;
  }

  // ============ 私有方法 ============

  private walkDir(dir: string, callback: (filePath: string) => void): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (this.excludePatterns.some((p) => p.test(fullPath))) {
        continue;
      }

      if (entry.isFile()) {
        callback(fullPath);
      } else if (entry.isDirectory()) {
        this.walkDir(fullPath, callback);
      }
    }
  }

  private normalizeCode(code: string): string {
    return code
      .replace(/\s+/g, ' ')
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim();
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  }
}

/**
 * 快速运行优化检查
 */
export function runQuickOptimizationCheck(rootDir: string = process.cwd()): void {
  console.log('🔍 开始项目优化检查...\n');

  const optimizer = new ProjectOptimizer(rootDir, {
    exclude: ['node_modules', 'dist', '.git', 'playground', 'examples'],
  });

  // 运行检查
  const duplicates = optimizer.findDuplicateCode(5, 0.8);
  const commonCode = optimizer.findCommonCode();
  const dependencies = optimizer.analyzeDependencies();
  
  // 构建产物分析（如果有 dist 目录）
  let bundle: BundleAnalysisResult = {
    filePath: '',
    size: 0,
    largeFiles: [],
  };
  const distPath = path.join(rootDir, 'dist');
  if (fs.existsSync(distPath)) {
    bundle = optimizer.analyzeBundle(distPath);
  }

  // 生成建议
  const suggestions = optimizer.generateSuggestions(
    duplicates,
    commonCode,
    dependencies,
    bundle
  );

  // 输出报告
  console.log(optimizer.formatReport(
    duplicates,
    commonCode,
    dependencies,
    bundle,
    suggestions
  ));
}

export default ProjectOptimizer;
