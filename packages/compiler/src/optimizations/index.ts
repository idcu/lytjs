// packages/compiler/src/optimizations/index.ts
// 编译器优化模块
// Phase 1.12-1.14: 自动 memo 检测、死代码消除、AOT 预编译
// v6.9.0: Tree Shaking 优化

import { compile } from '../index';
import type { RootNode, TemplateChildNode } from '../types';
import { NodeTypes } from '../constants';

// 导出 Tree Shaking 优化
export * from './treeShaking';

// 导出静态分析优化
export * from './staticAnalysis';

// 导出增量编译优化
export * from './incremental-compile';

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
 * AOT 编译结果
 *
 * `code` 是**构建期**产出的渲染函数代码 —— 它的价值在于「AOT」本身：
 * 运行时不必再走 `new Function` 编译模板，因而不必把编译器打进产物。
 */
export interface AOTResult {
  /**
   * 完整 ESM 模块源（AOT 产物）：含 helper import（默认来自 `@lytjs/core`）
   * + 渲染函数；可直接写入 `.mjs` 后 `import()`，运行时**无需再 `new Function`**、
   * 也**不必把编译器打进产物**。这正是「运行时编译」的对立面。
   */
  code: string;
  /** 产物字符长度（构建期体积估算用） */
  size: number;
}

/**
 * AOT 预编译模板：**构建期**把模板编译为渲染函数代码。
 *
 * 这是「运行时编译」的对立面 —— 产物里只有渲染函数，不需要把 132.7KB 的编译器
 * 打进 bundle，也不需要在运行时执行 `new Function`。
 *
 * ⚠️ **历史实现（已删除）与删除依据**
 *
 * 本函数此前在 `compile()` 之后追加了三个「文本级优化」pass，并在 `AOTResult` 上
 * 暴露了四个开关。2026-10-10 用探针（`scripts/_probe-precompile.ts`）逐项实测，
 * **四个开关全部不成立**：
 *
 * | 开关 | 实现 | 实测结果 | 判定 |
 * |---|---|---|---|
 * | `inlineStatic` | 正则匹配生成代码里的 `<template static>` | `staticAssets.size` 恒为 **0**、`__getStatic` 从不出现 —— `compile()` 产物是 JS，不含该字样 | 死 pass |
 * | `precomputeConstants` | 正则 `(\d+)\s*([+\-*\/])\s*(\d+)` + `eval()` | **静默改坏代码**：`x1 + 2`→`x3`、`1.5 + 2`→`1.7`、`"1+2"`→`"3"`、`a1*2`→`a2`；且 `x - 1 - 2` 这类链式减法折叠后**语义翻转** | **有害** |
 * | `target` | 正则 `document.` → `_document.` / `createElement(` → `document.createElement(` | 产物里既无 `document.` 也无 `createElement(`，永不命中；**若命中即产生未定义引用** | 死 + 有害 |
 * | `generateTypes` | 正则抓产物里的 `defineComponent<...>` 泛型 | `compile()` 从不产出该字样，恒返回 `''`（而测试只断言 `typeof === 'string'` ⇒ 假绿） | 死 knob |
 *
 * 更关键的是：`stats.reduction` 的**唯一非 0 来源正是上述误伤** ——
 * `<div>{{ x1 + 2 }}</div>` 的 2.78% "压缩"完全来自把 `x1 + 2` 改成了 `x3`。
 * 也就是说这个"优化"是**靠破坏用户代码换来的**。
 *
 * ⇒ 结论：**在已生成的代码文本上做正则改写无法做到 sound**（需要真正的解析器才能
 * 正确处理运算符优先级与结合性），故整组删除。常量折叠若要做，应放在**模板 AST 层**
 * （codegen 之前），属于独立特性，不在本函数职责内。
 */
/**
 * AOT 预编译模板：**构建期**把模板编译为可直接 `import()` 的 ESM 模块源。
 *
 * 与「运行时编译」（`core/src/template-compiler.ts` 用 `new Function` 注入 helper）
 * 完全相反：这里**保留** helper import、不剥离、不 `new Function`，并把 `render`
 * 显式 `export`。产物可写入 `.mjs` 后由应用直接 `import`，从而把 ~132.7KB 的编译器
 * 移出运行时产物 —— 这是本框架兑现「极致轻量」卖点的唯一路径。
 *
 * 旧实现的四个优化开关经探针实测全是装饰/有害（P2-3 已删），本函数现在只做
 * 「构建期产出可导入模块源」这一件 sound 的事。
 *
 * @param template 模板字符串
 * @param options.runtimeModuleName helper 的导入来源（默认 `@lytjs/core`，其再导出
 *        `runtime-helpers` 中的全部 vdom/dom/component helper；与 `template-compiler.ts`
 *        的注入对象同源，由 `check-runtime-contract` 门禁保证一致）
 * @param options.filename 用于 sourcemap / 报错定位
 */
export function precompileTemplate(
  template: string,
  options: { runtimeModuleName?: string; filename?: string } = {},
): AOTResult {
  const runtimeModuleName = options.runtimeModuleName ?? '@lytjs/core';
  const compiled = compile(template, {
    mode: 'module',
    runtimeModuleName,
    filename: options.filename,
  });

  // 保留 import 前导；`generate()` 已把 hoist / render 写进 `code`，
  // 这里只补一个 `export { render }` 使模块可被应用直接消费。
  const preamble = compiled.preamble ?? '';
  const moduleSource = `${preamble}${preamble ? '\n' : ''}${compiled.code}\nexport { render };\n`;

  return { code: moduleSource, size: moduleSource.length };
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
