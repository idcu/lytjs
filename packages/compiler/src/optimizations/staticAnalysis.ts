// packages/compiler/src/optimizations/staticAnalysis.ts
// 编译时静态分析模块
// v6.9.0: 编译时静态分析，提前发现潜在问题

import type { RootNode, TemplateChildNode, ElementNode, AttributeNode, DirectiveNode } from '../types';
import { NodeTypes } from '../constants';

/**
 * 静态分析结果
 */
export interface StaticAnalysisResult {
  /** 警告信息 */
  warnings: StaticAnalysisWarning[];
  /** 错误信息 */
  errors: StaticAnalysisError[];
  /** 最佳实践建议 */
  suggestions: StaticAnalysisSuggestion[];
  /** 性能优化建议 */
  performanceTips: StaticAnalysisPerformanceTip[];
}

/**
 * 静态分析警告
 */
export interface StaticAnalysisWarning {
  /** 警告类型 */
  type: string;
  /** 警告信息 */
  message: string;
  /** 节点路径 */
  path?: number[];
  /** 位置信息 */
  location?: string;
  /** 修复建议 */
  suggestion?: string;
}

/**
 * 静态分析错误
 */
export interface StaticAnalysisError {
  /** 错误类型 */
  type: string;
  /** 错误信息 */
  message: string;
  /** 节点路径 */
  path?: number[];
  /** 位置信息 */
  location?: string;
}

/**
 * 最佳实践建议
 */
export interface StaticAnalysisSuggestion {
  /** 建议类型 */
  type: string;
  /** 建议内容 */
  message: string;
  /** 节点路径 */
  path?: number[];
  /** 改进示例 */
  example?: string;
}

/**
 * 性能优化建议
 */
export interface StaticAnalysisPerformanceTip {
  /** 优化类型 */
  type: string;
  /** 优化建议 */
  message: string;
  /** 节点路径 */
  path?: number[];
  /** 预期收益 */
  impact?: 'low' | 'medium' | 'high';
}

/**
 * 静态分析选项
 */
export interface StaticAnalysisOptions {
  /** 启用所有检查 */
  all?: boolean;
  /** 启用性能检查 */
  performance?: boolean;
  /** 启用最佳实践检查 */
  bestPractices?: boolean;
  /** 启用错误检查 */
  errors?: boolean;
  /** 自定义规则 */
  customRules?: StaticAnalysisRule[];
}

/**
 * 静态分析规则
 */
export interface StaticAnalysisRule {
  /** 规则名称 */
  name: string;
  /** 检查函数 */
  check: (node: TemplateChildNode, context: AnalysisContext) => void;
  /** 规则类型 */
  type: 'warning' | 'error' | 'suggestion' | 'performance';
}

/**
 * 分析上下文
 */
interface AnalysisContext {
  result: StaticAnalysisResult;
  path: number[];
  options: StaticAnalysisOptions;
}

/**
 * 执行编译时静态分析
 */
export function performStaticAnalysis(
  ast: RootNode,
  options: StaticAnalysisOptions = {},
): StaticAnalysisResult {
  const {
    all = true,
    performance = all,
    bestPractices = all,
    errors = all,
    customRules = [],
  } = options;

  const result: StaticAnalysisResult = {
    warnings: [],
    errors: [],
    suggestions: [],
    performanceTips: [],
  };

  const context: AnalysisContext = {
    result,
    path: [],
    options,
  };

  // 1. 遍历 AST 并应用规则
  traverseAST(ast, (node, path) => {
    context.path = path;
    
    // 应用内置规则
    if (errors) checkForErrors(node, context);
    if (bestPractices) checkBestPractices(node, context);
    if (performance) checkPerformanceIssues(node, context);
    
    // 应用自定义规则
    for (const rule of customRules) {
      rule.check(node, context);
    }
  });

  // 2. 执行整体分析
  performGlobalAnalysis(ast, context);

  return result;
}

/**
 * 检查错误
 */
function checkForErrors(node: TemplateChildNode, context: AnalysisContext): void {
  if (node.type !== NodeTypes.ELEMENT) return;
  
  // 检查无效的指令组合
  checkInvalidDirectiveCombinations(node, context);
  
  // 检查空标签
  checkEmptyTags(node, context);
}

/**
 * 检查无效的指令组合
 */
function checkInvalidDirectiveCombinations(node: ElementNode, context: AnalysisContext): void {
  const directives = node.props.filter(p => p.type === NodeTypes.DIRECTIVE) as DirectiveNode[];
  const directiveNames = directives.map(d => d.name);
  
  // 检查 v-if 和 v-for 的冲突（虽然技术上允许，但有潜在问题）
  const hasVIf = directiveNames.includes('if');
  const hasVFor = directiveNames.includes('for');
  
  if (hasVIf && hasVFor) {
    context.result.warnings.push({
      type: 'conflicting-directives',
      message: '使用了 v-if 和 v-for 在同一个元素上，可能导致意外行为',
      path: [...context.path],
      suggestion: '建议将 v-if 移到外层包装元素上，或者使用计算属性过滤列表',
    });
  }
}

/**
 * 检查空标签
 */
function checkEmptyTags(node: ElementNode, context: AnalysisContext): void {
  // 自闭合标签检查
  const selfClosingTags = ['img', 'br', 'hr', 'input', 'meta', 'link'];
  if (selfClosingTags.includes(node.tag.toLowerCase())) {
    // 检查是否有不必要的内容
    if (node.children.length > 0) {
      context.result.warnings.push({
        type: 'unnecessary-content',
        message: `${node.tag} 标签不应该包含子内容`,
        path: [...context.path],
        suggestion: '移除标签内的内容或使用非自闭合标签',
      });
    }
  }
}

/**
 * 检查最佳实践
 */
function checkBestPractices(node: TemplateChildNode, context: AnalysisContext): void {
  if (node.type !== NodeTypes.ELEMENT) return;
  
  // 检查 key 属性
  checkKeyAttribute(node, context);
  
  // 检查事件命名
  checkEventNaming(node, context);
  
  // 检查样式属性
  checkStyleAttribute(node, context);
}

/**
 * 检查 key 属性
 */
function checkKeyAttribute(node: ElementNode, context: AnalysisContext): void {
  const hasVFor = node.props.some(p => 
    p.type === NodeTypes.DIRECTIVE && p.name === 'for'
  );
  
  if (hasVFor) {
    const hasKey = node.props.some(p => 
      p.type === NodeTypes.DIRECTIVE && p.name === 'bind' && 
      (p.arg?.type === NodeTypes.SIMPLE_EXPRESSION && p.arg?.content === 'key')
    );
    
    if (!hasKey) {
      context.result.suggestions.push({
        type: 'missing-key',
        message: '建议为使用 v-for 的元素添加 :key 属性',
        path: [...context.path],
        example: '<div v-for="item in items" :key="item.id">',
      });
    }
  }
}

/**
 * 检查事件命名
 */
function checkEventNaming(node: ElementNode, context: AnalysisContext): void {
  const events = node.props.filter(p => 
    p.type === NodeTypes.DIRECTIVE && p.name === 'on'
  ) as DirectiveNode[];
  
  for (const event of events) {
    const eventName = event.arg?.toString().toLowerCase();
    
    // 检查是否使用了保留的原生事件
    if (eventName && eventName.startsWith('on')) {
      context.result.suggestions.push({
        type: 'event-naming',
        message: `事件名称 ${eventName} 不需要前缀 "on"`,
        path: [...context.path],
        example: `@${eventName.replace('on', '')}`,
      });
    }
  }
}

/**
 * 检查样式属性
 */
function checkStyleAttribute(node: ElementNode, context: AnalysisContext): void {
  const styleAttr = node.props.find(p => 
    p.type === NodeTypes.ATTRIBUTE && p.name === 'style'
  ) as AttributeNode;
  
  if (styleAttr && styleAttr.value) {
    // 检查动态样式是否应该使用 :style 绑定
    const styleValue = styleAttr.value.content;
    if (styleValue.includes('{{') || styleValue.includes('${')) {
      context.result.suggestions.push({
        type: 'style-binding',
        message: '建议使用 :style 绑定代替内联样式中的插值',
        path: [...context.path],
        example: '<div :style="{ color: myColor }">',
      });
    }
  }
}

/**
 * 检查性能问题
 */
function checkPerformanceIssues(node: TemplateChildNode, context: AnalysisContext): void {
  if (node.type !== NodeTypes.ELEMENT) return;
  
  // 检查大型列表
  checkLargeLists(node, context);
  
  // 检查复杂模板
  checkComplexTemplates(node, context);
  
  // 检查不必要的计算
  checkUnnecessaryComputations(node, context);
}

/**
 * 检查大型列表
 */
function checkLargeLists(node: ElementNode, context: AnalysisContext): void {
  // 检查是否有 v-for
  const hasVFor = node.props.some(p => 
    p.type === NodeTypes.DIRECTIVE && p.name === 'for'
  );
  
  if (hasVFor) {
    // 检查子节点复杂度
    const childComplexity = calculateComplexity(node);
    if (childComplexity > 5) {
      context.result.performanceTips.push({
        type: 'large-list',
        message: '检测到可能包含复杂子节点的列表，考虑使用虚拟滚动',
        path: [...context.path],
        impact: 'medium',
      });
    }
  }
}

/**
 * 检查复杂模板
 */
function checkComplexTemplates(node: ElementNode, context: AnalysisContext): void {
  const complexity = calculateComplexity(node);
  
  if (complexity > 20) {
    context.result.performanceTips.push({
      type: 'complex-template',
      message: '检测到复杂模板，考虑拆分为多个组件',
      path: [...context.path],
      impact: 'high',
    });
  }
}

/**
 * 检查不必要的计算
 */
function checkUnnecessaryComputations(node: ElementNode, context: AnalysisContext): void {
  // 检查重复的插值
  const interpolations = countInterpolations(node);
  if (interpolations > 3) {
    context.result.performanceTips.push({
      type: 'multiple-interpolations',
      message: '检测到多个插值，考虑使用计算属性',
      path: [...context.path],
      impact: 'low',
    });
  }
}

/**
 * 计算节点复杂度
 */
function calculateComplexity(node: ElementNode): number {
  let complexity = 1; // 节点本身
  
  // 递归计算子节点复杂度
  for (const child of node.children) {
    if (child.type === NodeTypes.ELEMENT) {
      complexity += calculateComplexity(child);
    }
  }
  
  // 添加属性复杂度
  complexity += node.props.length * 0.5;
  
  return complexity;
}

/**
 * 计算插值数量
 */
function countInterpolations(node: ElementNode): number {
  let count = 0;
  
  if ('children' in node) {
    for (const child of node.children) {
      if (child.type === NodeTypes.INTERPOLATION) {
        count++;
      }
      if (child.type === NodeTypes.ELEMENT) {
        count += countInterpolations(child);
      }
    }
  }
  
  return count;
}

/**
 * 执行全局分析
 */
function performGlobalAnalysis(ast: RootNode, context: AnalysisContext): void {
  // 分析模板整体结构
  const totalNodes = countNodes(ast);
  const directives = countDirectives(ast);
  
  // 整体复杂度检查
  if (totalNodes > 100) {
    context.result.performanceTips.push({
      type: 'large-template',
      message: `模板包含 ${totalNodes} 个节点，考虑拆分为多个组件`,
      impact: 'high',
    });
  }
  
  if (directives > 20) {
    context.result.suggestions.push({
      type: 'many-directives',
      message: '检测到大量指令，考虑提取为计算属性或简化逻辑',
    });
  }
}

/**
 * 统计节点数量
 */
function countNodes(ast: RootNode): number {
  let count = 0;
  
  traverseAST(ast, () => {
    count++;
  });
  
  return count;
}

/**
 * 统计指令数量
 */
function countDirectives(ast: RootNode): number {
  let count = 0;
  
  traverseAST(ast, (node) => {
    if (node.type === NodeTypes.ELEMENT) {
      count += node.props.filter(p => p.type === NodeTypes.DIRECTIVE).length;
    }
  });
  
  return count;
}

/**
 * 遍历 AST
 */
function traverseAST(
  ast: RootNode,
  callback: (node: TemplateChildNode, path: number[]) => void,
): void {
  function traverse(nodes: TemplateChildNode[], path: number[]): void {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]!;
      callback(node, [...path, i]);

      if (node.type === NodeTypes.ELEMENT && 'children' in node) {
        traverse(node.children as TemplateChildNode[], [...path, i]);
      }
    }
  }

  traverse(ast.children, []);
}

/**
 * 格式化静态分析结果
 */
export function formatStaticAnalysisResult(result: StaticAnalysisResult): string {
  const output: string[] = [];
  
  output.push('=== 静态分析结果 ===');
  
  if (result.errors.length > 0) {
    output.push(`\n错误 (${result.errors.length}):`);
    for (const error of result.errors) {
      output.push(`  ❌ [${error.type}] ${error.message}`);
      if (error.location) output.push(`     位置: ${error.location}`);
    }
  }
  
  if (result.warnings.length > 0) {
    output.push(`\n警告 (${result.warnings.length}):`);
    for (const warning of result.warnings) {
      output.push(`  ⚠️ [${warning.type}] ${warning.message}`);
      if (warning.suggestion) output.push(`     💡 ${warning.suggestion}`);
    }
  }
  
  if (result.suggestions.length > 0) {
    output.push(`\n最佳实践建议 (${result.suggestions.length}):`);
    for (const suggestion of result.suggestions) {
      output.push(`  💡 [${suggestion.type}] ${suggestion.message}`);
      if (suggestion.example) output.push(`     示例: ${suggestion.example}`);
    }
  }
  
  if (result.performanceTips.length > 0) {
    output.push(`\n性能优化建议 (${result.performanceTips.length}):`);
    for (const tip of result.performanceTips) {
      const impact = tip.impact ? ` (${tip.impact})` : '';
      output.push(`  🚀 [${tip.type}] ${tip.message}${impact}`);
    }
  }
  
  if (result.errors.length === 0 && result.warnings.length === 0 && 
      result.suggestions.length === 0 && result.performanceTips.length === 0) {
    output.push('\n✅ 未发现问题！');
  }
  
  return output.join('\n');
}
