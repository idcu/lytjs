/**
 * Lyt.js 模板编译器 — AST 转换
 *
 * 对解析阶段生成的 AST 进行语义转换，将模板指令转换为更高级的中间表示。
 *
 * 转换内容：
 *   - v-if    → 标记条件渲染分支
 *   - v-each  → 标记循环渲染，提取迭代变量
 *   - v-bind  → 标记动态属性绑定
 *   - v-on    → 标记事件绑定
 *   - v-slot  → 标记插槽分发
 *   - v-ref   → 标记模板引用
 *   - 静态标记 → 为静态子树设置 staticFlag
 */

import {
  type RootNode,
  type ElementNode,
  type TextNode,
  type ASTNode,
  type DirectiveNode,
} from '../ast/nodes';

// ============================================================
// 转换选项
// ============================================================

/** 转换器选项 */
export interface TransformOptions {
  /** 是否启用静态节点标记（默认 true） */
  markStatic?: boolean;
  /** 节点转换插件列表 */
  nodeTransforms?: NodeTransform[];
}

/** 节点转换函数类型 */
export type NodeTransform = (
  node: ASTNode,
  context: TransformContext
) => void | (() => void);

// ============================================================
// 转换上下文
// ============================================================

/** 转换上下文，在转换过程中传递状态信息 */
export class TransformContext {
  /** 根节点 */
  root: RootNode;
  /** 当前父节点 */
  parent: ASTNode | null;
  /** 当前节点在父节点 children 中的索引 */
  childIndex: number;
  /** 转换选项 */
  options: TransformOptions;
  /** 需要在转换完成后执行的回调列表（用于退出钩子） */
  onExitCallbacks: Array<(node: ASTNode) => void>;
  /** 替换当前节点 */
  replaceNode: ASTNode | null;
  /** 移除当前节点的回调 */
  removeNode: (() => void) | null;

  constructor(root: RootNode, options: TransformOptions = {}) {
    this.root = root;
    this.parent = null;
    this.childIndex = 0;
    this.options = {
      markStatic: true,
      ...options,
    };
    this.onExitCallbacks = [];
    this.replaceNode = null;
    this.removeNode = null;
  }
}

// ============================================================
// 主转换函数
// ============================================================

/**
 * AST 转换入口
 * 遍历 AST 树，对每个节点执行转换插件
 *
 * @param ast 解析阶段生成的根节点
 * @param options 转换选项
 */
export function transform(ast: RootNode, options: TransformOptions = {}): void {
  const context = new TransformContext(ast, options);

  // 注册内置转换插件
  const builtInTransforms: NodeTransform[] = [
    transformIfDirective,
    transformEachDirective,
    transformBindDirective,
    transformOnDirective,
    transformSlotDirective,
    transformRefDirective,
  ];

  // 合并用户自定义转换插件
  const allTransforms = [
    ...(options.nodeTransforms || []),
    ...builtInTransforms,
  ];

  // 递归遍历并转换所有节点
  traverseNode(ast, context, allTransforms);

  // 执行所有退出回调
  executeOnExitCallbacks(ast, context);
}

// ============================================================
// 节点遍历
// ============================================================

/**
 * 递归遍历 AST 节点
 * 对每个节点执行所有转换插件的进入逻辑，然后递归处理子节点
 */
function traverseNode(
  node: ASTNode,
  context: TransformContext,
  transforms: NodeTransform[]
): void {
  context.parent = node;

  // 执行所有转换插件的进入逻辑
  for (const transform of transforms) {
    const onExit = transform(node, context);
    if (onExit) {
      // 注册退出回调
      context.onExitCallbacks.push((_n) => onExit());
    }

    // 如果节点被替换或移除，停止后续转换
    if (context.replaceNode) {
      const replacement = context.replaceNode;
      context.replaceNode = null;
      traverseNode(replacement, context, transforms);
      return;
    }
    if (context.removeNode) {
      context.removeNode = null;
      return;
    }
  }

  // 根据节点类型递归处理子节点
  switch (node.type) {
    case 'Root':
      for (let i = 0; i < node.children.length; i++) {
        context.childIndex = i;
        traverseNode(node.children[i], context, transforms);
      }
      break;

    case 'Element':
      for (let i = 0; i < node.children.length; i++) {
        context.childIndex = i;
        traverseNode(node.children[i], context, transforms);
      }
      break;

    // Text、Attribute、Directive 没有子节点，无需递归
  }
}

/**
 * 执行所有退出回调
 */
function executeOnExitCallbacks(node: ASTNode, context: TransformContext): void {
  // 执行当前节点的退出回调
  const exitCallbacks = context.onExitCallbacks.splice(0);
  for (const callback of exitCallbacks) {
    callback(node);
  }

  // 递归处理子节点的退出回调
  switch (node.type) {
    case 'Root':
      for (const child of node.children) {
        executeOnExitCallbacks(child, context);
      }
      break;

    case 'Element':
      for (const child of node.children) {
        executeOnExitCallbacks(child, context);
      }
      break;
  }
}

// ============================================================
// 内置指令转换插件
// ============================================================

/**
 * 处理 v-if 指令
 *
 * 将 v-if 指令标记到元素节点上，记录条件表达式。
 * 在代码生成阶段，此元素将被转换为三元条件表达式。
 *
 * 示例：
 *   <div v-if="show">hello</div>
 *   → 标记该节点的 ifCondition = 'show'
 */
function transformIfDirective(
  node: ASTNode,
  context: TransformContext
): void {
  if (node.type !== 'Element') return;

  const ifDirective = node.directives.find(d => d.name === 'if');
  if (!ifDirective) return;

  // 在元素节点上添加 ifCondition 元数据
  // 使用 Object.assign 避免修改原始接口定义
  Object.assign(node, {
    ifCondition: ifDirective.value,
    // 记录是否有 v-else-if 和 v-else 兄弟节点
    ifBranches: [] as Array<{ condition: string; node: ElementNode }>,
  });

  // 收集辅助函数
  context.root.helpers.add('createConditionalVNode');

  // 从指令列表中移除 v-if（已转换为 ifCondition）
  node.directives = node.directives.filter(d => d !== ifDirective);
}

/**
 * 处理 v-each 指令
 *
 * 将 v-each 指令转换为循环渲染信息。
 * 支持 "item in items" 和 "(item, index) in items" 语法。
 *
 * 示例：
 *   <li v-each="item in items">{{ item }}</li>
 *   → 标记该节点的 eachInfo = { item: 'item', index: 'index', collection: 'items' }
 */
function transformEachDirective(
  node: ASTNode,
  context: TransformContext
): void {
  if (node.type !== 'Element') return;

  const eachDirective = node.directives.find(d => d.name === 'each');
  if (!eachDirective) return;

  // 解析 "item in collection" 或 "(item, index) in collection" 语法
  const eachExpr = parseEachExpression(eachDirective.value);

  if (eachExpr) {
    // 在元素节点上添加循环渲染元数据
    Object.assign(node, {
      eachInfo: eachExpr,
    });

    // 收集辅助函数
    context.root.helpers.add('renderList');
  }

  // 从指令列表中移除 v-each
  node.directives = node.directives.filter(d => d !== eachDirective);
}

/**
 * 处理 v-bind 指令
 *
 * 将 v-bind 指令转换为动态属性绑定信息。
 * 如果 arg 为 'model'，则标记为双向绑定。
 *
 * 示例：
 *   <input v-bind:value="val" />
 *   → 标记该节点的 bindings 包含 { arg: 'value', value: 'val' }
 */
function transformBindDirective(
  node: ASTNode,
  context: TransformContext
): void {
  if (node.type !== 'Element') return;

  const bindDirectives = node.directives.filter(d => d.name === 'bind');
  if (bindDirectives.length === 0) return;

  const bindings: Array<{ arg: string; value: string; isModel: boolean }> = [];

  for (const bind of bindDirectives) {
    const isModel = bind.arg === 'model';
    bindings.push({
      arg: bind.arg,
      value: bind.value,
      isModel,
    });

    // 收集辅助函数
    if (isModel) {
      context.root.helpers.add('createModelBinding');
    }
  }

  // 在元素节点上添加绑定元数据
  Object.assign(node, {
    bindings,
  });

  // 从指令列表中移除所有 v-bind
  node.directives = node.directives.filter(d => d.name !== 'bind');
}

/**
 * 处理 v-on 指令
 *
 * 将 v-on 指令转换为事件绑定信息。
 *
 * 示例：
 *   <button v-on:click="handleClick">Click</button>
 *   → 标记该节点的 events 包含 { name: 'click', value: 'handleClick', modifiers: [] }
 */
function transformOnDirective(
  node: ASTNode,
  context: TransformContext
): void {
  if (node.type !== 'Element') return;

  const onDirectives = node.directives.filter(d => d.name === 'on');
  if (onDirectives.length === 0) return;

  const events: Array<{ name: string; value: string; modifiers: string[] }> = [];

  for (const on of onDirectives) {
    events.push({
      name: on.arg,
      value: on.value,
      modifiers: on.modifiers,
    });

    // 收集辅助函数
    context.root.helpers.add('createEventHandler');
  }

  // 在元素节点上添加事件元数据
  Object.assign(node, {
    events,
  });

  // 从指令列表中移除所有 v-on
  node.directives = node.directives.filter(d => d.name !== 'on');
}

/**
 * 处理 v-slot 指令
 *
 * 将 v-slot 指令转换为插槽分发信息。
 *
 * 示例：
 *   <template v-slot:header><h1>Title</h1></template>
 *   → 标记该节点的 slotInfo = { name: 'header' }
 */
function transformSlotDirective(
  node: ASTNode,
  context: TransformContext
): void {
  if (node.type !== 'Element') return;

  const slotDirective = node.directives.find(d => d.name === 'slot');
  if (!slotDirective) return;

  // 在元素节点上添加插槽元数据
  Object.assign(node, {
    slotInfo: {
      name: slotDirective.arg || 'default',
      value: slotDirective.value,
    },
  });

  // 收集辅助函数
  context.root.helpers.add('renderSlot');

  // 从指令列表中移除 v-slot
  node.directives = node.directives.filter(d => d !== slotDirective);
}

/**
 * 处理 v-ref 指令
 *
 * 将 v-ref 指令转换为模板引用信息。
 *
 * 示例：
 *   <div v-ref="myEl">content</div>
 *   → 标记该节点的 refInfo = { name: 'myEl' }
 */
function transformRefDirective(
  node: ASTNode,
  context: TransformContext
): void {
  if (node.type !== 'Element') return;

  const refDirective = node.directives.find(d => d.name === 'ref');
  if (!refDirective) return;

  // 在元素节点上添加引用元数据
  Object.assign(node, {
    refInfo: {
      name: refDirective.value,
    },
  });

  // 收集辅助函数
  context.root.helpers.add('createRef');

  // 从指令列表中移除 v-ref
  node.directives = node.directives.filter(d => d !== refDirective);
}

// ============================================================
// 辅助函数
// ============================================================

/** v-each 表达式解析结果 */
interface EachExpression {
  /** 迭代变量名 */
  item: string;
  /** 索引变量名（可能为空） */
  index: string;
  /** 集合表达式 */
  collection: string;
}

/**
 * 解析 v-each 指令的表达式
 *
 * 支持的语法：
 *   - "item in items"
 *   - "(item, index) in items"
 *   - "item of items"（of 作为 in 的别名）
 *
 * @param expr 指令值表达式
 * @returns 解析结果，格式不正确时返回 null
 */
function parseEachExpression(expr: string): EachExpression | null {
  // 匹配 "(item, index) in/of collection" 或 "item in/of collection"
  const match = expr.match(
    /^\s*(?:\((\w+)\s*,\s*(\w+)\)|(\w+))\s+(?:in|of)\s+(\S+)\s*$/
  );

  if (!match) return null;

  return {
    item: match[1] || match[3],
    index: match[2] || '',
    collection: match[4],
  };
}
