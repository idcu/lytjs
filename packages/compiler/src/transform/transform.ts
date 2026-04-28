/**
 * Lyt.js 模板编译器 — AST 转换
 *
 * 对解析阶段生成的 AST 进行语义转换，将模板指令转换为更高级的中间表示。
 */

import {
  type RootNode,
  type ElementNode,
  type ASTNode,
} from '../ast/nodes';

// ============================================================
// 转换选项
// ============================================================

export interface TransformOptions {
  markStatic?: boolean;
  nodeTransforms?: NodeTransform[];
}

export type NodeTransform = (
  node: ASTNode,
  context: TransformContext
) => void | (() => void);

// ============================================================
// 转换上下文
// ============================================================

export class TransformContext {
  root: RootNode;
  parent: ASTNode | null;
  childIndex: number;
  options: TransformOptions;
  onExitCallbacks: Array<(node: ASTNode) => void>;
  replaceNode: ASTNode | null;
  removeNode: (() => void) | null;

  constructor(root: RootNode, options: TransformOptions = {}) {
    this.root = root;
    this.parent = null;
    this.childIndex = 0;
    this.options = { markStatic: true, ...options };
    this.onExitCallbacks = [];
    this.replaceNode = null;
    this.removeNode = null;
  }
}

// ============================================================
// 主转换函数
// ============================================================

export function transform(ast: RootNode, options: TransformOptions = {}): void {
  const context = new TransformContext(ast, options);
  const allTransforms: NodeTransform[] = [
    ...(options.nodeTransforms || []),
    transformIfDirective,
    transformEachDirective,
    transformBindDirective,
    transformOnDirective,
    transformSlotDirective,
    transformRefDirective,
  ];
  traverseNode(ast, context, allTransforms);
  executeOnExitCallbacks(ast, context);
}

// ============================================================
// 节点遍历
// ============================================================

function traverseNode(
  node: ASTNode,
  context: TransformContext,
  transforms: NodeTransform[]
): void {
  context.parent = node;
  for (const transform of transforms) {
    const onExit = transform(node, context);
    if (onExit) context.onExitCallbacks.push((_n) => onExit());
    if (context.replaceNode) {
      const replacement = context.replaceNode;
      context.replaceNode = null;
      traverseNode(replacement, context, transforms);
      return;
    }
    if (context.removeNode) { context.removeNode = null; return; }
  }
  if (node.type === 'Root' || node.type === 'Element') {
    for (let i = 0; i < node.children.length; i++) {
      context.childIndex = i;
      traverseNode(node.children[i], context, transforms);
    }
  }
}

function executeOnExitCallbacks(node: ASTNode, context: TransformContext): void {
  const exitCallbacks = context.onExitCallbacks.splice(0);
  for (const callback of exitCallbacks) callback(node);
  if (node.type === 'Root' || node.type === 'Element') {
    for (const child of node.children) executeOnExitCallbacks(child, context);
  }
}

// ============================================================
// 内置指令转换插件
// ============================================================

function transformIfDirective(node: ASTNode, context: TransformContext): void {
  if (node.type !== 'Element') return;
  const ifDir = node.directives.find(d => d.name === 'if');
  if (!ifDir) return;
  Object.assign(node, { ifCondition: ifDir.value, ifBranches: [] as Array<{ condition: string; node: ElementNode }> });
  context.root.helpers.add('createConditionalVNode');
  node.directives = node.directives.filter(d => d !== ifDir);
}

function transformEachDirective(node: ASTNode, context: TransformContext): void {
  if (node.type !== 'Element') return;
  const eachDir = node.directives.find(d => d.name === 'each');
  if (!eachDir) return;
  const expr = parseEachExpression(eachDir.value);
  if (expr) {
    Object.assign(node, { eachInfo: expr });
    context.root.helpers.add('renderList');
  }
  node.directives = node.directives.filter(d => d !== eachDir);
}

function transformBindDirective(node: ASTNode, context: TransformContext): void {
  if (node.type !== 'Element') return;
  const binds = node.directives.filter(d => d.name === 'bind');
  if (!binds.length) return;
  const bindings: Array<{ arg: string; value: string; isModel: boolean }> = [];
  for (const b of binds) {
    const isModel = b.arg === 'model';
    bindings.push({ arg: b.arg, value: b.value, isModel });
    if (isModel) context.root.helpers.add('createModelBinding');
  }
  Object.assign(node, { bindings });
  node.directives = node.directives.filter(d => d.name !== 'bind');
}

function transformOnDirective(node: ASTNode, context: TransformContext): void {
  if (node.type !== 'Element') return;
  const ons = node.directives.filter(d => d.name === 'on');
  if (!ons.length) return;
  const events: Array<{ name: string; value: string; modifiers: string[] }> = [];
  for (const o of ons) {
    events.push({ name: o.arg, value: o.value, modifiers: o.modifiers });
    context.root.helpers.add('createEventHandler');
  }
  Object.assign(node, { events });
  node.directives = node.directives.filter(d => d.name !== 'on');
}

function transformSlotDirective(node: ASTNode, context: TransformContext): void {
  if (node.type !== 'Element') return;
  const slotDir = node.directives.find(d => d.name === 'slot');
  if (!slotDir) return;
  Object.assign(node, { slotInfo: { name: slotDir.arg || 'default', value: slotDir.value } });
  context.root.helpers.add('renderSlot');
  node.directives = node.directives.filter(d => d !== slotDir);
}

function transformRefDirective(node: ASTNode, context: TransformContext): void {
  if (node.type !== 'Element') return;
  const refDir = node.directives.find(d => d.name === 'ref');
  if (!refDir) return;
  Object.assign(node, { refInfo: { name: refDir.value } });
  context.root.helpers.add('createRef');
  node.directives = node.directives.filter(d => d !== refDir);
}

// ============================================================
// 辅助函数
// ============================================================

interface EachExpression { item: string; index: string; collection: string; }

function parseEachExpression(expr: string): EachExpression | null {
  const match = expr.match(/^\s*(?:\((\w+)\s*,\s*(\w+)\)|(\w+))\s+(?:in|of)\s+(\S+)\s*$/);
  if (!match) return null;
  return { item: match[1] || match[3], index: match[2] || '', collection: match[4] };
}
