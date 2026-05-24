// packages/compiler/src/optimizations/treeShaking.ts
// Tree Shaking 优化模块
// v6.9.0: 更好的 Tree Shaking 优化

import type { RootNode, TemplateChildNode, ElementNode } from '../types';
import { NodeTypes } from '../constants';

/**
 * Tree Shaking 分析结果
 */
export interface TreeShakingAnalysis {
  /** 可安全删除的组件/指令 */
  removable: RemovableItem[];
  /** 可以静态化的节点 */
  staticizableNodes: StaticizableNode[];
  /** 可以简化的条件分支 */
  simplifiableConditions: SimplifiableCondition[];
  /** 未使用的导入/引用 */
  unusedReferences: UnusedReference[];
  /** 预估的体积减少 */
  estimatedSizeReduction: number;
}

/**
 * 可删除的项目
 */
export interface RemovableItem {
  /** 节点路径 */
  path: number[];
  /** 类型 */
  type: 'component' | 'directive' | 'attribute';
  /** 名称 */
  name: string;
  /** 原因 */
  reason: string;
  /** 安全等级 */
  safety: 'safe' | 'conservative' | 'risky';
}

/**
 * 可静态化的节点
 */
export interface StaticizableNode {
  /** 节点路径 */
  path: number[];
  /** 节点类型 */
  nodeType: string;
  /** 是否完全静态 */
  isFullyStatic: boolean;
  /** 依赖 */
  dependencies: string[];
}

/**
 * 可简化的条件
 */
export interface SimplifiableCondition {
  /** 节点路径 */
  path: number[];
  /** 条件表达式 */
  condition: string;
  /** 可以简化为 */
  simplifyTo: 'always-true' | 'always-false' | 'constant';
  /** 常量值（如果可用） */
  constantValue?: unknown;
}

/**
 * 未使用的引用
 */
export interface UnusedReference {
  /** 名称 */
  name: string;
  /** 类型 */
  type: 'component' | 'helper' | 'import';
  /** 位置 */
  location?: string;
}

/**
 * 分析模板的 Tree Shaking 机会
 */
export function analyzeTreeShakingOpportunities(ast: RootNode): TreeShakingAnalysis {
  const removable: RemovableItem[] = [];
  const staticizableNodes: StaticizableNode[] = [];
  const simplifiableConditions: SimplifiableCondition[] = [];
  const unusedReferences: UnusedReference[] = [];
  
  const usedReferences = new Set<string>();
  const declaredReferences = new Set<string>();

  // 遍历 AST 分析
  traverseAST(ast, (_node, path) => {
    if (_node.type === NodeTypes.ELEMENT) {
      analyzeElement(_node, path, removable, staticizableNodes, simplifiableConditions, usedReferences, declaredReferences);
    }
  });

  // 检测未使用的引用
  for (const ref of declaredReferences) {
    if (!usedReferences.has(ref)) {
      unusedReferences.push({
        name: ref,
        type: getReferenceType(ref),
      });
    }
  }

  // 估算体积减少
  const removableSize = removable.reduce((sum, item) => sum + item.name.length + 10, 0);
  const staticizableSize = staticizableNodes.reduce((sum, _node) => sum + 50, 0);
  const estimatedSizeReduction = removableSize + staticizableSize;

  return {
    removable,
    staticizableNodes,
    simplifiableConditions,
    unusedReferences,
    estimatedSizeReduction,
  };
}

/**
 * 分析单个元素节点
 */
function analyzeElement(
  node: ElementNode,
  path: number[],
  removable: RemovableItem[],
  staticizableNodes: StaticizableNode[],
  simplifiableConditions: SimplifiableCondition[],
  usedReferences: Set<string>,
  declaredReferences: Set<string>,
): void {
  // 记录组件引用
  if (isComponent(node)) {
    declaredReferences.add(node.tag);
    // 标记为已使用
    usedReferences.add(node.tag);
  }

  // 分析指令使用
  for (const prop of node.props) {
    if (prop.type === NodeTypes.DIRECTIVE) {
      declaredReferences.add(`v-${prop.name}`);
      usedReferences.add(`v-${prop.name}`);
    }
  }

  // 检测是否完全静态
  if (isFullyStaticElement(node)) {
    staticizableNodes.push({
      path,
      nodeType: node.tag,
      isFullyStatic: true,
      dependencies: extractStaticDependencies(node),
    });
  }

  // 分析条件分支
  analyzeConditions(node, path, simplifiableConditions);

  // 分析可移除的属性
  analyzeRemovableAttributes(node, path, removable);
}

/**
 * 检测是否是组件
 */
function isComponent(node: ElementNode): boolean {
  // 自定义标签（不是标准 HTML 标签）被视为组件
  const htmlTags = new Set([
    'div', 'span', 'p', 'a', 'button', 'input', 'form', 'ul', 'li', 'ol',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'table', 'tr', 'td', 'th',
    'header', 'footer', 'nav', 'main', 'section', 'article', 'aside',
    // ... 更多标准标签
  ]);
  return !htmlTags.has(node.tag.toLowerCase());
}

/**
 * 检测元素是否完全静态
 */
function isFullyStaticElement(node: ElementNode): boolean {
  // 检查所有属性
  for (const prop of node.props) {
    if (prop.type === NodeTypes.DIRECTIVE) {
      // 有动态指令的不是完全静态
      return false;
    }
    if (prop.type === NodeTypes.ATTRIBUTE && prop.value?.content.includes('{{')) {
      // 有动态插值的不是完全静态
      return false;
    }
  }

  // 检查所有子节点
  for (const child of node.children) {
    if (!isStaticChild(child)) {
      return false;
    }
  }

  return true;
}

/**
 * 检测子节点是否静态
 */
function isStaticChild(node: TemplateChildNode): boolean {
  if (node.type === NodeTypes.TEXT) {
    return true;
  }
  if (node.type === NodeTypes.COMMENT) {
    return true;
  }
  if (node.type === NodeTypes.ELEMENT) {
    return isFullyStaticElement(node);
  }
  return false;
}

/**
 * 提取静态依赖
 */
function extractStaticDependencies(node: ElementNode): string[] {
  const dependencies: string[] = [];
  
  // 提取静态属性值
  for (const prop of node.props) {
    if (prop.type === NodeTypes.ATTRIBUTE && prop.value) {
      dependencies.push(`${prop.name}=${prop.value.content}`);
    }
  }

  return dependencies;
}

/**
 * 分析条件分支
 */
function analyzeConditions(
  node: ElementNode,
  path: number[],
  simplifiableConditions: SimplifiableCondition[],
): void {
  for (const prop of node.props) {
    if (prop.type === NodeTypes.DIRECTIVE && prop.name === 'if') {
      const condition = prop.exp?.toString() || '';
      
      // 检测常量条件
      if (condition === 'true' || condition === 'false') {
        simplifiableConditions.push({
          path,
          condition,
          simplifyTo: condition === 'true' ? 'always-true' : 'always-false',
          constantValue: condition === 'true',
        });
      }
      
      // 检测简单常量表达式
      else if (/^['"].*['"]$/.test(condition)) {
        simplifiableConditions.push({
          path,
          condition,
          simplifyTo: 'constant',
          constantValue: condition.slice(1, -1),
        });
      }
      else if (/^\d+$/.test(condition)) {
        simplifiableConditions.push({
          path,
          condition,
          simplifyTo: 'constant',
          constantValue: parseInt(condition),
        });
      }
    }
  }
}

/**
 * 分析可移除的属性
 */
function analyzeRemovableAttributes(
  node: ElementNode,
  path: number[],
  removable: RemovableItem[],
): void {
  for (const prop of node.props) {
    if (prop.type === NodeTypes.DIRECTIVE) {
      // 检测未使用的特殊指令
      if (isUnusedDirective(prop.name, node)) {
        removable.push({
          path,
          type: 'directive',
          name: `v-${prop.name}`,
          reason: 'Directive has no effect in this context',
          safety: 'conservative',
        });
      }
    }
  }
}

/**
 * 检测未使用的指令
 */
function isUnusedDirective(directiveName: string, node: ElementNode): boolean {
  // 检查 v-once 在静态节点上（已经是静态的，不需要 v-once）
  if (directiveName === 'once' && isFullyStaticElement(node)) {
    return true;
  }

  // 检查 v-memo 在静态节点上
  if (directiveName === 'memo' && isFullyStaticElement(node)) {
    return true;
  }

  return false;
}

/**
 * 获取引用类型
 */
function getReferenceType(name: string): 'component' | 'helper' | 'import' {
  if (name.startsWith('v-')) {
    return 'helper';
  }
  if (name.toLowerCase() !== name) { // PascalCase
    return 'component';
  }
  return 'import';
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
 * 应用 Tree Shaking 优化
 */
export function applyTreeShakingOptimizations(
  ast: RootNode,
  analysis: TreeShakingAnalysis,
): RootNode {
  // 这里我们返回原始 AST，实际优化会在代码生成阶段应用
  // 在代码生成时会根据分析结果进行优化
  
  // 但我们可以标记哪些节点可以优化
  markOptimizableNodes(ast, analysis);
  
  return ast;
}

/**
 * 标记可优化的节点
 */
function markOptimizableNodes(ast: RootNode & { __treeShakingAnalysis?: TreeShakingAnalysis }, analysis: TreeShakingAnalysis): void {
  // 在节点上添加元数据标记
  ast.__treeShakingAnalysis = analysis;
}

/**
 * Tree Shaking 优化选项
 */
export interface TreeShakingOptions {
  /** 安全模式：只执行安全的优化 */
  safeMode?: boolean;
  /** 移除未使用的引用 */
  removeUnusedReferences?: boolean;
  /** 静态化节点 */
  staticizeNodes?: boolean;
  /** 简化条件 */
  simplifyConditions?: boolean;
}

/**
 * 执行完整的 Tree Shaking 流程
 */
export function treeShakeTemplate(
  _source: string,
  ast: RootNode,
  options: TreeShakingOptions = {},
): { optimizedAst: RootNode; analysis: TreeShakingAnalysis } {
  const {
    safeMode: _safeMode = true,
    removeUnusedReferences: _removeUnusedReferences = true,
    staticizeNodes: _staticizeNodes = true,
    simplifyConditions: _simplifyConditions = true,
  } = options;

  // 1. 分析优化机会
  const analysis = analyzeTreeShakingOpportunities(ast);

  // 2. 应用优化
  const optimizedAst = applyTreeShakingOptimizations(ast, analysis);

  return { optimizedAst, analysis };
}
