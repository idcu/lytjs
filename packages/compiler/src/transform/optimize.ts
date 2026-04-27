/**
 * Lyt.js 模板编译器 — 静态优化
 *
 * 对 AST 进行静态分析，标记静态子树，以便在运行时跳过不必要的比对（diff）。
 * 静态节点可以在首次渲染后被提升（hoist）到渲染函数外部，避免重复创建。
 *
 * 静态节点的判定标准：
 *   - 文本节点：不包含 {{ }} 表达式插值
 *   - 元素节点：
 *     - 没有动态属性（:class、:style 等）
 *     - 没有事件绑定（@click 等）
 *     - 没有指令（v-if、v-each、v-bind、v-on 等）
 *     - 所有子节点都是静态的
 *
 * staticFlag 取值：
 *   -1 : 未分析
 *    0 : 动态节点（需要在每次渲染时重新创建）
 *    1 : 静态节点（可以提升，跳过 diff）
 */

import {
  type RootNode,
  type ElementNode,
  type TextNode,
  type ASTNode,
} from '../ast/nodes';

// ============================================================
// 静态提升结果
// ============================================================

/** 静态提升信息 */
export interface HoistResult {
  /** 被提升的静态节点列表 */
  hoistedNodes: ASTNode[];
  /** 被提升的静态节点对应的变量名列表 */
  hoistedNames: string[];
}

// ============================================================
// 主优化函数
// ============================================================

/**
 * 对 AST 进行静态优化
 *
 * 遍历 AST 树，标记每个节点的 staticFlag，并收集可提升的静态节点。
 *
 * @param ast 根节点
 * @returns 静态提升结果
 */
export function optimize(ast: RootNode): HoistResult {
  const result: HoistResult = {
    hoistedNodes: [],
    hoistedNames: [],
  };

  let hoistCounter = 0;

  // 遍历所有子节点，标记静态属性
  for (const child of ast.children) {
    markStatic(child, result, () => {
      hoistCounter++;
      return `_hoisted_${hoistCounter}`;
    });
  }

  return result;
}

// ============================================================
// 静态标记
// ============================================================

/**
 * 递归标记节点的静态属性
 *
 * @param node 当前节点
 * @param result 静态提升结果收集器
 * @param nameGenerator 静态变量名生成器
 * @returns 该节点是否为静态节点
 */
function markStatic(
  node: ASTNode,
  result: HoistResult,
  nameGenerator: () => string
): boolean {
  switch (node.type) {
    case 'Text':
      return markStaticText(node, result, nameGenerator);

    case 'Element':
      return markStaticElement(node, result, nameGenerator);

    default:
      return false;
  }
}

/**
 * 标记文本节点
 * 纯文本（无 {{ }} 表达式）为静态节点
 */
function markStaticText(
  node: TextNode,
  _result: HoistResult,
  _nameGenerator: () => string
): boolean {
  if (!node.isExpression) {
    // 纯文本，标记为静态
    node.staticFlag = 1;
    return true;
  }

  // 包含表达式，标记为动态
  node.staticFlag = 0;
  return false;
}

/**
 * 标记元素节点
 * 递归检查所有子节点和属性，综合判断是否为静态
 */
function markStaticElement(
  node: ElementNode,
  result: HoistResult,
  nameGenerator: () => string
): boolean {
  // 检查是否有指令（v-if、v-each 等在转换阶段已处理，但可能残留）
  if (node.directives.length > 0) {
    node.staticFlag = 0;
    return false;
  }

  // 检查转换阶段添加的动态标记
  const nodeAny = node as unknown as Record<string, unknown>;

  // 有条件渲染（v-if）
  if (nodeAny.ifCondition) {
    node.staticFlag = 0;
    return false;
  }

  // 有循环渲染（v-each）
  if (nodeAny.eachInfo) {
    node.staticFlag = 0;
    return false;
  }

  // 有动态绑定（v-bind）
  if (nodeAny.bindings && (nodeAny.bindings as unknown[]).length > 0) {
    node.staticFlag = 0;
    return false;
  }

  // 有事件绑定（v-on）
  if (nodeAny.events && (nodeAny.events as unknown[]).length > 0) {
    node.staticFlag = 0;
    return false;
  }

  // 有插槽（v-slot）
  if (nodeAny.slotInfo) {
    node.staticFlag = 0;
    return false;
  }

  // 有引用（v-ref）
  if (nodeAny.refInfo) {
    node.staticFlag = 0;
    return false;
  }

  // 检查属性中是否有动态属性或事件绑定
  for (const prop of node.props) {
    if (prop.isDynamic || prop.isEvent) {
      node.staticFlag = 0;
      return false;
    }
  }

  // 递归检查所有子节点
  let allChildrenStatic = true;
  for (const child of node.children) {
    const childStatic = markStatic(child, result, nameGenerator);
    if (!childStatic) {
      allChildrenStatic = false;
    }
  }

  if (allChildrenStatic) {
    // 所有子节点都是静态的，此节点也是静态的
    node.staticFlag = 1;

    // 如果节点足够复杂（有子节点），可以提升
    // 纯文本节点由 markStaticText 处理提升
    if (node.children.length > 0) {
      const name = nameGenerator();
      result.hoistedNodes.push(node);
      result.hoistedNames.push(name);
      // 记录提升变量名
      (node as unknown as Record<string, unknown>).hoistedName = name;
    }

    return true;
  }

  // 有动态子节点，此节点也是动态的
  node.staticFlag = 0;
  return false;
}

// ============================================================
// 静态判断工具函数
// ============================================================

/**
 * 判断节点是否为静态节点
 *
 * @param node AST 节点
 * @returns 是否为静态节点
 */
export function isStatic(node: ASTNode): boolean {
  if (node.type === 'Text') {
    return !node.isExpression;
  }

  if (node.type === 'Element') {
    // 如果已经分析过，直接使用 staticFlag
    if (node.staticFlag !== -1) {
      return node.staticFlag === 1;
    }

    // 未分析过，进行实时判断
    const nodeAny = node as unknown as Record<string, unknown>;

    // 有任何动态特征就不是静态的
    if (
      node.directives.length > 0 ||
      nodeAny.ifCondition ||
      nodeAny.eachInfo ||
      (nodeAny.bindings && (nodeAny.bindings as unknown[]).length > 0) ||
      (nodeAny.events && (nodeAny.events as unknown[]).length > 0) ||
      nodeAny.slotInfo ||
      nodeAny.refInfo
    ) {
      return false;
    }

    // 检查属性
    for (const prop of node.props) {
      if (prop.isDynamic || prop.isEvent) {
        return false;
      }
    }

    // 检查子节点
    for (const child of node.children) {
      if (!isStatic(child)) {
        return false;
      }
    }

    return true;
  }

  return false;
}
