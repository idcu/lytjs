/**
 * Lyt.js 模板编译器 — 静态提升 (Static Hoisting)
 *
 * 实现 Vue 3 风格的静态节点提升优化。
 *
 * 核心思想：
 *   - 识别 AST 中永不变化的静态子树
 *   - 将静态子树提升到渲染函数外部，只创建一次
 *   - 重新渲染时直接复用（或浅克隆）提升的节点
 *
 * 与 transform/optimize.ts 的区别：
 *   - optimize.ts 负责标记静态节点（staticFlag）
 *   - transform-static-hoist.ts 负责实际的提升操作和代码生成
 *   - 本模块在 optimize 之后运行，执行更深入的分析
 */

import {
  type RootNode,
  type ElementNode,
  type TextNode,
  type ASTNode,
} from './ast/nodes';

// ============================================================
// 类型定义
// ============================================================

/** 静态提升结果 */
export interface HoistResult {
  /** 被提升的静态节点列表 */
  hoistedNodes: ASTNode[];
  /** 提升后的 AST（替换后的版本） */
  patchedAST: ASTNode;
  /** 提升的变量名列表 */
  hoistedNames: string[];
}

/** 提升的节点信息 */
export interface HoistedNodeInfo {
  /** 原始 AST 节点 */
  node: ASTNode;
  /** 变量名 */
  name: string;
  /** 生成的代码 */
  code: string;
}

// ============================================================
// 主分析函数
// ============================================================

/**
 * 分析 AST 中的静态节点并生成提升结果
 *
 * 遍历 AST 树，识别可提升的静态子树，将其替换为引用。
 *
 * @param ast AST 根节点
 * @returns 静态提升结果
 *
 * @example
 *   const result = analyzeStatic(rootNode);
 *   // result.hoistedNodes — 被提升的节点列表
 *   // result.patchedAST — 替换后的 AST
 *   // result.hoistedNames — ['_hoisted_1', '_hoisted_2', ...]
 */
export function analyzeStatic(ast: RootNode): HoistResult {
  const hoistedNodes: ASTNode[] = [];
  const hoistedNames: string[] = [];
  let hoistCounter = 0;

  // 深度遍历 AST，收集可提升的静态子树
  for (let i = 0; i < ast.children.length; i++) {
    const child = ast.children[i];
    if (isHoistableNode(child)) {
      hoistCounter++;
      const name = `_hoisted_${hoistCounter}`;
      hoistedNodes.push(child);
      hoistedNames.push(name);
      // 在节点上记录提升变量名
      (child as any).hoistedName = name;
    }
  }

  // 递归处理子节点中的静态子树
  for (const child of ast.children) {
    walkAndHoist(child, hoistedNodes, hoistedNames, () => {
      hoistCounter++;
      return `_hoisted_${hoistCounter}`;
    });
  }

  return {
    hoistedNodes,
    patchedAST: ast as unknown as ASTNode,
    hoistedNames,
  };
}

// ============================================================
// 静态节点检测
// ============================================================

/**
 * 判断节点是否可以提升
 *
 * 提升条件：
 *   - 文本节点：不包含插值表达式
 *   - 元素节点：
 *     - 没有指令（v-if, v-each, v-bind, v-on, v-slot, v-ref）
 *     - 没有动态属性（:class, :style 等）
 *     - 没有事件绑定（@click 等）
 *     - 所有子节点都是静态的
 *     - 有子节点（单文本节点不值得提升）
 *
 * @param node AST 节点
 * @returns 是否可以提升
 */
export function isHoistableNode(node: ASTNode): boolean {
  if (node.type === 'Text') {
    // 纯文本节点可以提升（但通常不值得单独提升）
    return !node.isExpression;
  }

  if (node.type === 'Element') {
    return isHoistableElement(node);
  }

  return false;
}

/**
 * 判断元素节点是否可以提升
 */
function isHoistableElement(node: ElementNode): boolean {
  const nodeAny = node as unknown as Record<string, unknown>;

  // 有指令 → 不可提升
  if (node.directives.length > 0) return false;

  // 有条件渲染 → 不可提升
  if (nodeAny.ifCondition) return false;

  // 有循环渲染 → 不可提升
  if (nodeAny.eachInfo) return false;

  // 有动态绑定 → 不可提升
  if (nodeAny.bindings && (nodeAny.bindings as unknown[]).length > 0) return false;

  // 有事件绑定 → 不可提升
  if (nodeAny.events && (nodeAny.events as unknown[]).length > 0) return false;

  // 有插槽 → 不可提升
  if (nodeAny.slotInfo) return false;

  // 有引用 → 不可提升
  if (nodeAny.refInfo) return false;

  // 检查属性中是否有动态属性或事件
  for (const prop of node.props) {
    if (prop.isDynamic || prop.isEvent) return false;
  }

  // 递归检查所有子节点
  for (const child of node.children) {
    if (!isHoistableNode(child)) return false;
  }

  // 至少有一个子节点才值得提升（避免过度提升单个空元素）
  return true;
}

// ============================================================
// 遍历与提升
// ============================================================

/**
 * 递归遍历 AST，在动态节点内部收集可提升的静态子树
 *
 * 策略：只在动态节点的直接子节点中寻找静态子树进行提升。
 * 如果一个节点的所有子节点都是静态的，整个子树一起提升。
 *
 * @param node 当前节点
 * @param hoistedNodes 提升节点收集器
 * @param hoistedNames 提升变量名收集器
 * @param nameGenerator 变量名生成器
 */
function walkAndHoist(
  node: ASTNode,
  hoistedNodes: ASTNode[],
  hoistedNames: string[],
  nameGenerator: () => string
): void {
  if (node.type !== 'Element') return;

  const nodeAny = node as unknown as Record<string, unknown>;

  // 如果节点本身是静态的，已在顶层处理
  if (node.staticFlag === 1) return;

  // 遍历子节点，寻找连续的静态子节点组
  let i = 0;
  while (i < node.children.length) {
    const child = node.children[i];

    if (isHoistableNode(child)) {
      // 收集连续的静态子节点
      const staticStart = i;
      while (
        i < node.children.length &&
        isHoistableNode(node.children[i])
      ) {
        i++;
      }
      const staticCount = i - staticStart;

      // 如果有多个连续的静态子节点，可以作为一个整体提升
      if (staticCount >= 2) {
        // 将连续的静态子节点作为一个虚拟容器提升
        const name = nameGenerator();
        const container = createStaticContainer(
          node.children.slice(staticStart, i)
        );
        hoistedNodes.push(container);
        hoistedNames.push(name);
        // 标记这些子节点已被提升
        for (let j = staticStart; j < i; j++) {
          (node.children[j] as any).hoistedName = name;
          (node.children[j] as any).hoistedContainer = true;
        }
      } else if (staticCount === 1) {
        // 单个静态子节点，如果足够复杂（有子元素）也提升
        const singleChild = node.children[staticStart];
        if (
          singleChild.type === 'Element' &&
          singleChild.children.length > 0
        ) {
          const name = nameGenerator();
          hoistedNodes.push(singleChild);
          hoistedNames.push(name);
          (singleChild as any).hoistedName = name;
        }
      }
    } else {
      // 动态子节点，递归处理其内部
      if (child.type === 'Element') {
        walkAndHoist(child, hoistedNodes, hoistedNames, nameGenerator);
      }
      i++;
    }
  }
}

/**
 * 创建静态容器节点（虚拟包装）
 *
 * 将多个连续的静态子节点包装为一个整体进行提升。
 */
function createStaticContainer(children: (ElementNode | TextNode)[]): ASTNode {
  // 使用一个特殊的标记对象表示容器
  return {
    type: 'Element',
    tag: '__static_container__',
    props: [],
    children,
    isComponent: false,
    directives: [],
    staticFlag: 1,
    isSelfClosing: false,
    loc: { start: 0, end: 0, line: 0, column: 0 },
    // 标记为静态容器
    _isStaticContainer: true,
  } as unknown as ASTNode;
}

// ============================================================
// 代码生成辅助
// ============================================================

/**
 * 生成提升节点的声明代码
 *
 * @param hoistedNodes 提升的节点列表
 * @param hoistedNames 对应的变量名列表
 * @returns 声明代码行数组
 */
export function generateHoistedDecls(
  hoistedNodes: ASTNode[],
  hoistedNames: string[]
): string[] {
  const decls: string[] = [];

  for (let i = 0; i < hoistedNodes.length; i++) {
    const node = hoistedNodes[i];
    const name = hoistedNames[i];
    const code = generateHoistedNodeCode(node);

    if (code) {
      decls.push(`const ${name} = ${code}`);
    }
  }

  return decls;
}

/**
 * 为单个提升节点生成 h() 调用代码
 */
function generateHoistedNodeCode(node: ASTNode): string {
  if (node.type === 'Text') {
    return `'${escapeString(node.content)}'`;
  }

  if (node.type === 'Element') {
    const nodeAny = node as unknown as Record<string, unknown>;

    // 静态容器
    if (nodeAny._isStaticContainer) {
      const children = node.children as (ElementNode | TextNode)[];
      const childCodes = children.map(c => generateHoistedNodeCode(c));
      return childCodes.length === 1
        ? childCodes[0]
        : `[${childCodes.join(', ')}]`;
    }

    const tag = `'${node.tag}'`;
    const props = generateStaticPropsCode(node);
    const children = generateHoistedChildrenCode(node.children);

    let code = `h(${tag}`;
    code += props ? `, ${props}` : ', null';
    if (children) {
      code += `, ${children}`;
    }
    code += ')';
    return code;
  }

  return '';
}

/**
 * 生成静态属性代码
 */
function generateStaticPropsCode(node: ElementNode): string {
  const props: string[] = [];
  for (const attr of node.props) {
    if (attr.isDynamic || attr.isEvent) continue;
    if (attr.value === null) {
      props.push(`'${attr.name}': true`);
    } else {
      props.push(`'${attr.name}': '${escapeString(attr.value)}'`);
    }
  }
  return props.length > 0 ? `{ ${props.join(', ')} }` : '';
}

/**
 * 生成提升节点的子节点代码
 */
function generateHoistedChildrenCode(children: (ElementNode | TextNode)[]): string {
  if (children.length === 0) return '';

  const codes = children.map(c => generateHoistedNodeCode(c));

  if (codes.length === 0) return '';
  if (codes.length === 1) return codes[0];
  return `[${codes.join(', ')}]`;
}

/**
 * 转义字符串
 */
function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
