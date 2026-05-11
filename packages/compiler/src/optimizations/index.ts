// packages/compiler/src/optimizations/index.ts
// 编译器优化模块
// Phase 1.12-1.14: 自动 memo 检测、死代码消除、AOT 预编译

import type { RootNode, TemplateChildNode } from '../types';
import { NodeTypes } from '../constants';

// ============================================================
// Phase 1.12: 自动 memo 检测
// ============================================================

/**
 * Memo 分析结果
 */
export interface MemoAnalysis {
  /** 是否需要 memo */
  needsMemo: boolean;
  /** 检测到的静态子树 */
  staticSubtrees: StaticSubtree[];
  /** 检测到的稳定 props */
  stableProps: string[];
  /** 检测到的动态绑定 */
  dynamicBindings: DynamicBinding[];
  /** 建议的 memo 边界 */
  suggestedMemoBoundaries: MemoBoundary[];
}

/** 静态子树 */
export interface StaticSubtree {
  /** 节点路径 */
  path: number[];
  /** 节点类型 */
  nodeType: string;
  /** 是否完全静态 */
  isFullyStatic: boolean;
}

/** 动态绑定 */
export interface DynamicBinding {
  /** 绑定名称 */
  name: string;
  /** 绑定类型 */
  type: 'prop' | 'event' | 'directive' | 'interpolation';
  /** 依赖的表达式 */
  expression: string;
  /** 是否稳定（不随渲染变化） */
  isStable: boolean;
}

/** Memo 边界建议 */
export interface MemoBoundary {
  /** 节点路径 */
  path: number[];
  /** 原因 */
  reason: string;
  /** 预期收益 */
  expectedBenefit: 'high' | 'medium' | 'low';
}

/**
 * 分析模板是否需要 memo
 */
export function analyzeMemoNeeds(ast: RootNode): MemoAnalysis {
  const staticSubtrees: StaticSubtree[] = [];
  const stableProps: string[] = [];
  const dynamicBindings: DynamicBinding[] = [];
  const suggestedMemoBoundaries: MemoBoundary[] = [];

  // 遍历 AST 分析
  traverseAST(ast, (node, path) => {
    // 检测静态子树
    if (isStaticSubtree(node)) {
      staticSubtrees.push({
        path,
        nodeType: getNodeTypeName(node),
        isFullyStatic: true,
      });
    }

    // 检测动态绑定
    const bindings = extractDynamicBindings(node);
    for (const binding of bindings) {
      dynamicBindings.push(binding);

      // 检测稳定 props
      if (binding.type === 'prop' && isStableExpression(binding.expression)) {
        stableProps.push(binding.name);
      }
    }

    // 检测可能的 memo 边界
    if (shouldSuggestMemo(node, path)) {
      suggestedMemoBoundaries.push({
        path,
        reason: getMemoReason(node),
        expectedBenefit: getMemoBenefit(node),
      });
    }
  });

  return {
    needsMemo: dynamicBindings.some((b) => !b.isStable),
    staticSubtrees,
    stableProps,
    dynamicBindings,
    suggestedMemoBoundaries,
  };
}

/**
 * 检测是否是静态子树
 */
function isStaticSubtree(node: TemplateChildNode): boolean {
  if (node.type === NodeTypes.TEXT) {
    return true;
  }

  if (node.type === NodeTypes.ELEMENT) {
    // 检查所有 props 是否静态
    for (const prop of node.props) {
      if (prop.type === NodeTypes.DIRECTIVE) {
        return false;
      }
      if (prop.type === NodeTypes.ATTRIBUTE && prop.value?.content.includes('{{')) {
        return false;
      }
    }

    // 检查所有子节点是否静态
    for (const child of node.children) {
      if (!isStaticSubtree(child)) {
        return false;
      }
    }

    return true;
  }

  return false;
}

/**
 * 提取动态绑定
 */
function extractDynamicBindings(node: TemplateChildNode): DynamicBinding[] {
  const bindings: DynamicBinding[] = [];

  if (node.type === NodeTypes.ELEMENT) {
    for (const prop of node.props) {
      if (prop.type === NodeTypes.DIRECTIVE) {
        const dir = prop;
        bindings.push({
          name: dir.name,
          type: 'directive',
          expression: dir.exp?.toString() || '',
          isStable: isStableExpression(dir.exp?.toString() || ''),
        });
      } else if (prop.type === NodeTypes.ATTRIBUTE && prop.value?.content.includes('{{')) {
        bindings.push({
          name: prop.name,
          type: 'prop',
          expression: prop.value?.content ?? '',
          isStable: false,
        });
      }
    }
  }

  if (node.type === NodeTypes.INTERPOLATION) {
    bindings.push({
      name: 'textContent',
      type: 'interpolation',
      expression: node.content?.toString() || '',
      isStable: isStableExpression(node.content?.toString() || ''),
    });
  }

  return bindings;
}

/**
 * 检测表达式是否稳定
 */
function isStableExpression(expression: string): boolean {
  // 常量表达式
  if (/^['"].*['"]$/.test(expression)) return true;
  if (/^\d+$/.test(expression)) return true;
  if (expression === 'true' || expression === 'false' || expression === 'null') return true;

  // 纯函数调用（无参数）
  if (/^\w+\(\)$/.test(expression)) return true;

  return false;
}

/**
 * 是否应该建议 memo
 */
function shouldSuggestMemo(node: TemplateChildNode, path: number[]): boolean {
  if (node.type !== NodeTypes.ELEMENT) return false;

  // 大型列表
  if (hasVFor(node)) return true;

  // 复杂条件
  if (hasMultipleVIf(node)) return true;

  // 深层嵌套
  if (path.length > 3) return true;

  return false;
}

/**
 * 获取建议 memo 的原因
 */
function getMemoReason(node: TemplateChildNode): string {
  if (hasVFor(node)) return 'Large list with v-for';
  if (hasMultipleVIf(node)) return 'Complex conditional rendering';
  return 'Deeply nested component';
}

/**
 * 获取预期收益
 */
function getMemoBenefit(node: TemplateChildNode): 'high' | 'medium' | 'low' {
  if (hasVFor(node)) return 'high';
  if (hasMultipleVIf(node)) return 'medium';
  return 'low';
}

// ============================================================
// Phase 1.13: 死代码消除
// ============================================================

/**
 * 死代码分析结果
 */
export interface DeadCodeAnalysis {
  /** 未使用的变量 */
  unusedVariables: string[];
  /** 未使用的导入 */
  unusedImports: string[];
  /** 不可达代码 */
  unreachableCode: UnreachableCode[];
  /** 常量折叠机会 */
  constantFoldingOpportunities: ConstantFoldingOpportunity[];
  /** 预期体积减少 */
  estimatedSizeReduction: number;
}

/** 不可达代码 */
export interface UnreachableCode {
  /** 位置 */
  location: string;
  /** 原因 */
  reason: string;
}

/** 常量折叠机会 */
export interface ConstantFoldingOpportunity {
  /** 表达式 */
  expression: string;
  /** 计算结果 */
  result: unknown;
}

/**
 * 分析死代码
 */
export function analyzeDeadCode(source: string): DeadCodeAnalysis {
  const unusedVariables: string[] = [];
  const unusedImports: string[] = [];
  const unreachableCode: UnreachableCode[] = [];
  const constantFoldingOpportunities: ConstantFoldingOpportunity[] = [];

  // 检测未使用的变量
  const variableDeclarations = source.matchAll(/(?:const|let|var)\s+(\w+)/g);
  const variableUsages = source.matchAll(/\b(\w+)\b/g);

  const declared = new Set<string>();
  const used = new Set<string>();

  for (const match of variableDeclarations) {
    declared.add(match[1]!);
  }

  for (const match of variableUsages) {
    used.add(match[1]!);
  }

  for (const variable of declared) {
    // 检查是否只声明未使用
    const declarationCount = (
      source.match(new RegExp(`(?:const|let|var)\\s+${variable}\\b`, 'g')) || []
    ).length;
    const usageCount = (source.match(new RegExp(`\\b${variable}\\b`, 'g')) || []).length;

    if (usageCount <= declarationCount) {
      unusedVariables.push(variable);
    }
  }

  // 检测未使用的导入
  const importMatches = source.matchAll(/import\s+(?:\{([^}]+)\}|(\w+))\s+from/g);
  for (const match of importMatches) {
    const imports = match[1] ? match[1].split(',').map((s) => s.trim()) : [match[2]!];
    for (const imp of imports) {
      const name = imp.replace(/\s+as\s+\w+/, '').trim();
      if (!used.has(name) && !declared.has(name)) {
        unusedImports.push(name);
      }
    }
  }

  // 检测不可达代码
  if (source.includes('return') && source.includes('throw')) {
    const returnIndex = source.indexOf('return');
    const throwIndex = source.indexOf('throw');
    if (Math.abs(returnIndex - throwIndex) < 50) {
      unreachableCode.push({
        location: 'After return/throw',
        reason: 'Code after return or throw statement is unreachable',
      });
    }
  }

  // 检测常量折叠机会
  const constantExpressions = source.matchAll(/(['"])([^'"]+)\1\s*\+\s*(['"])([^'"]+)\3/g);
  for (const match of constantExpressions) {
    constantFoldingOpportunities.push({
      expression: match[0] ?? '',
      result: (match[2] ?? '') + (match[4] ?? ''),
    });
  }

  // 估算体积减少
  const unusedVarSize = unusedVariables.reduce((sum, v) => sum + v.length + 10, 0);
  const unusedImportSize = unusedImports.reduce((sum, i) => sum + i.length + 15, 0);
  const estimatedSizeReduction = unusedVarSize + unusedImportSize;

  return {
    unusedVariables,
    unusedImports,
    unreachableCode,
    constantFoldingOpportunities,
    estimatedSizeReduction,
  };
}

/**
 * 执行死代码消除
 */
export function eliminateDeadCode(source: string, analysis: DeadCodeAnalysis): string {
  let result = source;

  // 移除未使用的变量声明
  for (const variable of analysis.unusedVariables) {
    result = result.replace(
      new RegExp(`(?:const|let|var)\\s+${variable}\\s*(?:=[^;]+)?;?\\s*`, 'g'),
      '',
    );
  }

  // 移除未使用的导入
  for (const imp of analysis.unusedImports) {
    // 移除命名导入
    result = result.replace(new RegExp(`\\b${imp}\\s*,?\\s*`, 'g'), '');
    // 清理空导入
    result = result.replace(/import\s*\{\s*\}\s*from/g, 'import');
  }

  // 执行常量折叠
  for (const opportunity of analysis.constantFoldingOpportunities) {
    result = result.replace(opportunity.expression, JSON.stringify(opportunity.result));
  }

  return result;
}

// ============================================================
// Phase 1.14: AOT 预编译
// ============================================================

/**
 * AOT 编译选项
 */
export interface AOTOptions {
  /** 是否内联静态内容 */
  inlineStatic?: boolean;
  /** 是否预计算常量表达式 */
  precomputeConstants?: boolean;
  /** 是否生成类型定义 */
  generateTypes?: boolean;
  /** 目标环境 */
  target?: 'browser' | 'node' | 'edge';
}

/**
 * AOT 编译结果
 */
export interface AOTResult {
  /** 编译后的代码 */
  code: string;
  /** 类型定义 */
  types?: string;
  /** 静态资源映射 */
  staticAssets: Map<string, string>;
  /** 编译统计 */
  stats: {
    originalSize: number;
    compiledSize: number;
    reduction: number;
  };
}

/**
 * AOT 预编译模板
 */
export function precompileTemplate(template: string, options: AOTOptions = {}): AOTResult {
  const {
    inlineStatic = true,
    precomputeConstants = true,
    generateTypes = false,
    target = 'browser',
  } = options;

  const staticAssets = new Map<string, string>();
  let code = template;
  let types: string | undefined;

  const originalSize = template.length;

  // 1. 静态内容提取和内联
  if (inlineStatic) {
    code = extractAndInlineStatic(code, staticAssets);
  }

  // 2. 常量表达式预计算
  if (precomputeConstants) {
    code = precomputeConstantExpressions(code);
  }

  // 3. 目标环境优化
  code = optimizeForTarget(code, target);

  // 4. 生成类型定义
  if (generateTypes) {
    types = generateTypeDefinitions(code);
  }

  const compiledSize = code.length;

  return {
    code,
    types,
    staticAssets,
    stats: {
      originalSize,
      compiledSize,
      reduction: ((originalSize - compiledSize) / originalSize) * 100,
    },
  };
}

/**
 * 提取并内联静态内容
 */
function extractAndInlineStatic(code: string, staticAssets: Map<string, string>): string {
  // 提取静态 HTML 块
  const staticHTMLRegex = /<template\s+static>([\s\S]*?)<\/template>/g;
  let match;
  let counter = 0;

  while ((match = staticHTMLRegex.exec(code)) !== null) {
    const content = match[1]!;
    const id = `static_${counter++}`;
    staticAssets.set(id, content);

    // 替换为内联函数调用
    code = code.replace(match[0], `__getStatic('${id}')`);
  }

  return code;
}

/**
 * 预计算常量表达式
 */
function precomputeConstantExpressions(code: string): string {
  // 预计算简单算术表达式
  const arithmeticRegex = /(\d+)\s*([+\-*/])\s*(\d+)/g;
  code = code.replace(arithmeticRegex, (_, a, op, b) => {
    const result = eval(`${a}${op}${b}`);
    return String(result);
  });

  // 预计算字符串拼接
  const concatRegex = /(['"])([^'"]*)\1\s*\+\s*(['"])([^'"]*)\3/g;
  code = code.replace(concatRegex, (_, _q1, a, _q2, b) => {
    return `"${a}${b}"`;
  });

  return code;
}

/**
 * 针对目标环境优化
 */
function optimizeForTarget(code: string, target: string): string {
  switch (target) {
    case 'browser':
      // 浏览器优化：使用 DOM API
      code = code.replace(/createElement\(/g, 'document.createElement(');
      break;
    case 'node':
      // Node.js 优化：使用虚拟 DOM
      code = code.replace(/document\./g, '_document.');
      break;
    case 'edge':
      // Edge Runtime 优化：最小化 API 使用
      break;
  }

  return code;
}

/**
 * 生成类型定义
 */
function generateTypeDefinitions(code: string): string {
  const types: string[] = [];

  // 提取组件定义
  const componentRegex = /defineComponent\s*<\s*([^>]+)\s*>/g;
  let match;
  while ((match = componentRegex.exec(code)) !== null) {
    types.push(`// Component props: ${match[1]}`);
  }

  return types.join('\n');
}

// ============================================================
// 辅助函数
// ============================================================

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

function getNodeTypeName(node: TemplateChildNode): string {
  const names: readonly string[] = [
    'ROOT',
    'ELEMENT',
    'TEXT',
    'COMMENT',
    'INTERPOLATION',
    'ATTRIBUTE',
    'DIRECTIVE',
    'SIMPLE_EXPRESSION',
    'COMPOUND_EXPRESSION',
    'FOR',
    'IF',
    ' slotted',
    'SETUP_ONLY',
    'VNODE_CALL',
    'CACHE',
    'JS_CALL_EXPRESSION',
    'JS_OBJECT_EXPRESSION',
    'JS_PROPERTY',
    'JS_ARRAY_EXPRESSION',
    'JS_FUNCTION_EXPRESSION',
    'JS_CONDITIONAL_EXPRESSION',
    'JS_CACHE_EXPRESSION',
  ];
  return names[node.type] || 'Unknown';
}

function hasVFor(node: TemplateChildNode): boolean {
  if (node.type !== NodeTypes.ELEMENT) return false;
  return node.props.some((p) => p.type === NodeTypes.DIRECTIVE && p.name === 'for');
}

function hasMultipleVIf(node: TemplateChildNode): boolean {
  if (node.type !== NodeTypes.ELEMENT) return false;
  return node.props.filter((p) => p.type === NodeTypes.DIRECTIVE && p.name === 'if').length > 1;
}
