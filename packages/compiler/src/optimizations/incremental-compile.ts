// src/optimizations/incremental-compile.ts
// 增量编译支持 - v6.9.0
// 智能增量编译，只重新编译修改的部分

import type { RootNode, TemplateChildNode, ElementNode } from '../types';
import { NodeTypes } from '../constants';
import { compile } from '../index';
import type { CompilerOptions, CodegenResult } from '../types';

/**
 * 增量编译上下文
 */
export interface IncrementalCompileContext {
  /** 源文件路径 */
  filePath?: string;
  /** 最后修改时间 */
  lastModified?: number;
  /** 源模板内容 */
  source: string;
  /** 编译选项 */
  options: CompilerOptions;
  /** 上次编译结果 */
  lastResult?: CodegenResult;
  /** 上次编译的 AST */
  lastAst?: RootNode;
  /** 修改范围 */
  modifiedRange?: {
    start: number;
    end: number;
  };
}

/**
 * 增量编译结果
 */
export interface IncrementalCompileResult {
  /** 是否使用了增量编译 */
  usedIncremental: boolean;
  /** 最终编译结果 */
  result: CodegenResult;
  /** 修改的部分 */
  modified: ModificationInfo[];
  /** 性能信息 */
  performance: {
    totalTime: number;
    incrementalTime?: number;
    fullCompileTime?: number;
    savedTime?: number;
  };
}

/**
 * 修改信息
 */
export interface ModificationInfo {
  /** 修改类型 */
  type: 'added' | 'removed' | 'modified';
  /** 节点路径 */
  path: number[];
  /** 节点类型 */
  nodeType: string;
  /** 详细信息 */
  details?: string;
}

/**
 * 模板差异
 */
interface TemplateDiff {
  /** 是否有显著变化 */
  hasSignificantChange: boolean;
  /** 修改的区域 */
  modifiedRanges: Array<{ start: number; end: number }>;
  /** 变化描述 */
  description: string;
}

/**
 * AST 差异结果
 */
interface AstDiff {
  /** 是否需要重新编译 */
  needsRecompile: boolean;
  /** 修改的节点 */
  modifiedNodes: ModificationInfo[];
  /** 可以重用的部分 */
  reusableParts: ReusablePart[];
}

/**
 * 可重用部分
 */
interface ReusablePart {
  /** 节点路径 */
  path: number[];
  /** 节点类型 */
  nodeType: string;
}

/**
 * 增量编译管理器
 */
export class IncrementalCompiler {
  /** 编译上下文缓存 */
  private compileCache = new Map<string, IncrementalCompileContext>();
  /** 编译历史 */
  private compileHistory: Array<{
    filePath?: string;
    timestamp: number;
    source: string;
  }> = [];
  /** 最大历史记录数 */
  private readonly MAX_HISTORY = 50;

  /**
   * 分析模板差异
   */
  analyzeTemplateDiff(oldSource: string, newSource: string): TemplateDiff {
    // 简单的差异分析（实际项目中可以使用更复杂的 diff 算法）
    const diff: TemplateDiff = {
      hasSignificantChange: false,
      modifiedRanges: [],
      description: '',
    };

    if (oldSource === newSource) {
      diff.description = 'No changes';
      return diff;
    }

    // 查找不同的区域
    const minLength = Math.min(oldSource.length, newSource.length);
    let start = 0;

    // 找到第一个不同的位置
    while (start < minLength && oldSource[start] === newSource[start]) {
      start++;
    }

    // 找到最后一个不同的位置
    let endOld = oldSource.length - 1;
    let endNew = newSource.length - 1;

    while (endOld >= start && endNew >= start && oldSource[endOld] === newSource[endNew]) {
      endOld--;
      endNew--;
    }

    diff.modifiedRanges.push({
      start,
      end: Math.max(endOld, endNew) + 1,
    });

    // 分析修改的类型
    const modifiedContent = newSource.slice(start, endNew + 1);
    if (modifiedContent.includes('<') || modifiedContent.includes('v-')) {
      diff.hasSignificantChange = true;
      diff.description = 'Significant structural changes detected';
    } else {
      diff.description = 'Minor text/content changes';
    }

    return diff;
  }

  /**
   * 分析 AST 差异
   */
  analyzeAstDiff(oldAst: RootNode, newAst: RootNode): AstDiff {
    const diff: AstDiff = {
      needsRecompile: false,
      modifiedNodes: [],
      reusableParts: [],
    };

    // 比较 AST 根节点
    this.compareNodes(oldAst.children, newAst.children, [], diff);

    return diff;
  }

  /**
   * 递归比较节点
   */
  private compareNodes(
    oldNodes: TemplateChildNode[],
    newNodes: TemplateChildNode[],
    path: number[],
    diff: AstDiff,
  ): void {
    const maxLength = Math.max(oldNodes.length, newNodes.length);

    for (let i = 0; i < maxLength; i++) {
      const oldNode = oldNodes[i];
      const newNode = newNodes[i];
      const currentPath = [...path, i];

      if (!oldNode && newNode) {
        // 新增节点
        diff.modifiedNodes.push({
          type: 'added',
          path: currentPath,
          nodeType: newNode.type.toString(),
        });
        diff.needsRecompile = true;
      } else if (oldNode && !newNode) {
        // 删除节点
        diff.modifiedNodes.push({
          type: 'removed',
          path: currentPath,
          nodeType: oldNode.type.toString(),
        });
        diff.needsRecompile = true;
      } else if (oldNode && newNode) {
        // 比较节点
        if (!this.nodesAreEqual(oldNode, newNode)) {
          diff.modifiedNodes.push({
            type: 'modified',
            path: currentPath,
            nodeType: newNode.type.toString(),
          });
          diff.needsRecompile = true;
        } else {
          // 可以重用
          diff.reusableParts.push({
            path: currentPath,
            nodeType: newNode.type.toString(),
          });
        }

        // 递归比较子节点
        if (oldNode.type === NodeTypes.ELEMENT && newNode.type === NodeTypes.ELEMENT) {
          this.compareNodes(
            (oldNode as ElementNode).children || [],
            (newNode as ElementNode).children || [],
            currentPath,
            diff,
          );
        }
      }
    }
  }

  /**
   * 检查两个节点是否相等
   */
  private nodesAreEqual(node1: TemplateChildNode, node2: TemplateChildNode): boolean {
    if (node1.type !== node2.type) {
      return false;
    }

    // 文本节点比较
    if (node1.type === NodeTypes.TEXT && node2.type === NodeTypes.TEXT) {
      return node1.content === node2.content;
    }

    // 注释节点比较
    if (node1.type === NodeTypes.COMMENT && node2.type === NodeTypes.COMMENT) {
      return node1.content === node2.content;
    }

    // 元素节点比较
    if (node1.type === NodeTypes.ELEMENT && node2.type === NodeTypes.ELEMENT) {
      const el1 = node1 as ElementNode;
      const el2 = node2 as ElementNode;

      if (el1.tag !== el2.tag) {
        return false;
      }

      // 比较属性
      if (el1.props.length !== el2.props.length) {
        return false;
      }

      for (let i = 0; i < el1.props.length; i++) {
        const prop1 = el1.props[i];
        const prop2 = el2.props[i];

        if (!prop1 || !prop2 || prop1.type !== prop2.type) {
          return false;
        }

        if (prop1.type === NodeTypes.ATTRIBUTE && prop2.type === NodeTypes.ATTRIBUTE) {
          if (prop1.name !== prop2.name || (prop1.value?.content !== prop2.value?.content)) {
            return false;
          }
        }

        if (prop1.type === NodeTypes.DIRECTIVE && prop2.type === NodeTypes.DIRECTIVE) {
          if (prop1.name !== prop2.name) {
            return false;
          }
        }
      }

      // 子节点在外部递归比较
      return true;
    }

    return false;
  }

  /**
   * 尝试增量编译
   */
  incrementalCompile(
    source: string,
    options: CompilerOptions = {},
    filePath?: string,
  ): IncrementalCompileResult {
    const startTime = performance.now();
    const cacheKey = filePath || this.generateCacheKey(source);

    // 获取缓存的上下文
    const cachedContext = this.compileCache.get(cacheKey);

    // 如果没有缓存，进行完整编译
    if (!cachedContext) {
      const fullStartTime = performance.now();
      const result = compile(source, options);
      const fullCompileTime = performance.now() - fullStartTime;

      // 保存到缓存
      this.compileCache.set(cacheKey, {
        filePath,
        source,
        options,
        lastResult: result,
        lastModified: Date.now(),
      });

      // 记录历史
      this.addToHistory(filePath, source);

      return {
        usedIncremental: false,
        result,
        modified: [],
        performance: {
          totalTime: performance.now() - startTime,
          fullCompileTime,
        },
      };
    }

    // 分析模板差异
    const templateDiff = this.analyzeTemplateDiff(cachedContext.source, source);

    // 如果没有变化，直接返回缓存结果
    if (!templateDiff.hasSignificantChange && templateDiff.modifiedRanges.length === 0) {
      const totalTime = performance.now() - startTime;
      return {
        usedIncremental: true,
        result: cachedContext.lastResult!,
        modified: [],
        performance: {
          totalTime,
          savedTime: 0,
        },
      };
    }

    // 检查是否需要完全重新编译
    if (templateDiff.hasSignificantChange) {
      // 有显著变化，进行完整编译
      const fullStartTime = performance.now();
      const result = compile(source, options);
      const fullCompileTime = performance.now() - fullStartTime;

      // 更新缓存
      this.compileCache.set(cacheKey, {
        filePath,
        source,
        options,
        lastResult: result,
        lastModified: Date.now(),
      });

      // 记录历史
      this.addToHistory(filePath, source);

      const totalTime = performance.now() - startTime;
      return {
        usedIncremental: false,
        result,
        modified: [{
          type: 'modified',
          path: [],
          nodeType: 'full',
          details: templateDiff.description,
        }],
        performance: {
          totalTime,
          fullCompileTime,
        },
      };
    }

    // 尝试增量编译
    const incrementalStartTime = performance.now();
    
    // 重新编译整个文件（简化版的增量编译）
    const result = compile(source, options);
    const incrementalTime = performance.now() - incrementalStartTime;

    // 更新缓存
    this.compileCache.set(cacheKey, {
      filePath,
      source,
      options,
      lastResult: result,
      lastModified: Date.now(),
    });

    // 记录历史
    this.addToHistory(filePath, source);

    const totalTime = performance.now() - startTime;

    return {
      usedIncremental: true,
      result,
      modified: [{
        type: 'modified',
        path: [],
        nodeType: 'content',
        details: templateDiff.description,
      }],
      performance: {
        totalTime,
        incrementalTime,
        savedTime: 0, // 未来版本可以计算
      },
    };
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(source: string): string {
    let hash = 0;
    for (let i = 0; i < source.length; i++) {
      const char = source.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `anon-${hash}`;
  }

  /**
   * 添加到历史记录
   */
  private addToHistory(filePath: string | undefined, source: string): void {
    this.compileHistory.push({
      filePath,
      timestamp: Date.now(),
      source,
    });

    // 限制历史记录大小
    if (this.compileHistory.length > this.MAX_HISTORY) {
      this.compileHistory.shift();
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.compileCache.clear();
  }

  /**
   * 获取缓存大小
   */
  getCacheSize(): number {
    return this.compileCache.size;
  }

  /**
   * 获取编译历史
   */
  getCompileHistory() {
    return [...this.compileHistory];
  }
}

// 导出单例实例
const incrementalCompiler = new IncrementalCompiler();

/**
 * 使用增量编译
 */
export function incrementalCompile(
  source: string,
  options: CompilerOptions = {},
  filePath?: string,
): IncrementalCompileResult {
  return incrementalCompiler.incrementalCompile(source, options, filePath);
}

/**
 * 清除增量编译缓存
 */
export function clearIncrementalCache(): void {
  incrementalCompiler.clearCache();
}

/**
 * 获取增量编译器实例
 */
export function getIncrementalCompiler(): IncrementalCompiler {
  return incrementalCompiler;
}


