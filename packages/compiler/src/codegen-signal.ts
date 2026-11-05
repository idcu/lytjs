// src/codegen-signal.ts
// Signal 模式代码生成器 - 生成 effect() + DOM 操作代码

import { NodeTypes, ElementTypes } from './constants';
import { buildItemComponentProps } from './codegen-signal-optimized';
import { prefixIdentifiers } from './prefix-identifiers';
import { FRAGMENT_SENTINEL } from './transforms/transform-element';
import type {
  RootNode,
  ElementNode,
  TextNode,
  InterpolationNode,
  DirectiveNode,
  SimpleExpressionNode,
  CompoundExpressionNode,
  JSChildNode,
  VNodeCall,
  JSCallExpression,
  JSConditionalExpression,
  JSObjectExpression,
  JSProperty,
  TemplateChildNode,
  CodegenResult,
  CompilerOptions,
} from './types';

// ============================================================
// Signal 代码生成选项
// ============================================================

export interface SignalCodegenOptions {
  mode: 'signal';
  isComponent?: boolean;
  ident?: number;
}

// ============================================================
// Helper: 生成元素变量名
// ============================================================

/**
 * 根据标签名生成变量名，使用 _ 前缀
 * 重复标签通过计数器后缀区分
 */
function genVarName(tag: string, counter: Map<string, number>): string {
  const count = counter.get(tag) ?? 0;
  counter.set(tag, count + 1);
  if (count === 0) {
    return `_${tag}`;
  }
  return `_${tag}${count}`;
}

// ============================================================
// Helper: 获取表达式内容
// ============================================================

function getExpContent(node: SimpleExpressionNode | CompoundExpressionNode | undefined): string {
  if (!node) return '';
  if (node.type === NodeTypes.SIMPLE_EXPRESSION) return node.content;
  // 形态异常（非 CompoundExpression 且没有 children）时返回空串 ——
  // 此前会直接走 `node.children.map` 并对**无 type 的对象**抛 TypeError，
  // 把一次局部失败放大成整个编译中断。
  if (node.type !== NodeTypes.COMPOUND_EXPRESSION || !Array.isArray(node.children)) return '';
  // CompoundExpression: 拼接所有子节点
  return node.children
    .map((c) => {
      if (typeof c === 'string') return c;
      if (c.type === NodeTypes.SIMPLE_EXPRESSION) return c.content;
      return '';
    })
    .join('');
}

// ============================================================
// 产物短别名（B01b 体积手法）
// ============================================================

/**
 * 运行时函数 → 产物里的短别名。
 *
 * 产物的 import 与调用点会重复同一批函数名，短别名把两处字节一起压缩。
 * 可读性兜底：产物首行输出 `//lytjs-signal:<短名>=<原名>` 映射，出问题时按映射还原。
 *
 * ⚠️ 替换只作用于**代码片段**：字符串字面量（静态 HTML / 属性值 / 用户表达式里的字符串）
 * 与成员访问（`_ctx.insert`）一律不动 —— 否则会把页面文本或用户方法调用改坏。
 */
const RUNTIME_SHORT_NAMES: Record<string, string> = {
  effect: 'e',
  reconcileArray: 'n',
  createTemplate: 't',
  getRealNode: 'w',
  setText: 'x',
  setHTML: 'h',
  setAttribute: 'a',
  setProperty: 'p',
  setStyle: 's',
  setClass: 'c',
  insert: 'i',
  remove: 'r',
  createEventHandler: 'v',
  onCleanup: 'o',
  runCleanups: 'g',
  claimTextSlots: 'k',
  mountComponent: 'm',
  mountSlotOutlet: 'u',
  mountVNode: 'M',
  createVNode: 'V',
  Text: 'T',
};

/** 运行时包 → 该包负责的 helper；用于按实际引用裁剪 import */
const RUNTIME_IMPORT_GROUPS: Array<{ module: string; names: readonly string[] }> = [
  { module: '@lytjs/reactivity', names: ['effect'] },
  {
    module: '@lytjs/dom-runtime',
    names: [
      'reconcileArray',
      'createTemplate',
      'getRealNode',
      'setText',
      'setHTML',
      'setAttribute',
      'setProperty',
      'setStyle',
      'setClass',
      'insert',
      'remove',
      'createEventHandler',
      'onCleanup',
      'runCleanups',
      'claimTextSlots',
    ],
  },
  { module: '@lytjs/renderer', names: ['mountComponent', 'mountSlotOutlet', 'mountVNode'] },
  { module: '@lytjs/vdom', names: ['createVNode', 'Text', 'Teleport', 'Suspense'] },
];

/**
 * 字符串字面量片段（含模板串）。扫描/替换时整段跳过，
 * 避免把静态 HTML 里的 `insert` / `remove` 等页面文本当成运行时调用改坏。
 */
const STRING_LITERAL_RE = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/;

/** 匹配「代码位置上的 helper 名」：字符串字面量优先整体吃掉，成员访问（`_ctx.x`）排除 */
const helperMatcher = (names: string): RegExp =>
  new RegExp(`${STRING_LITERAL_RE.source}|(?<![\\w$.])(${names})\\b`, 'g');

/**
 * 收集产物实际用到的 helper：文本反查 ∪ AST 判据。
 *
 * DOM / 响应式 helper 以产物文本为准（旧实现无脑带 15 个导入，多数模板用不到）；
 * renderer / vdom / 内置组件以 AST 判据为准，避免漏引入（Teleport/Suspense 不参与别名）。
 */
function collectProductHelpers(code: string, seeds: Set<string>): Set<string> {
  const used = new Set<string>(seeds);
  const re = helperMatcher(Object.keys(RUNTIME_SHORT_NAMES).join('|'));
  let match: RegExpExecArray | null;
  while ((match = re.exec(code)) !== null) {
    const name = match[1];
    if (name) used.add(name);
  }
  return used;
}

/** 把产物用到的 helper 全名换成短别名（字符串字面量与成员访问不动） */
function applyRuntimeAliases(code: string, used: Set<string>): string {
  if (used.size === 0) return code;
  const re = helperMatcher([...used].join('|'));
  return code.replace(re, (full: string, name?: string) =>
    name ? (RUNTIME_SHORT_NAMES[name] ?? name) : full,
  );
}

/** 生成产物前缀：来源映射注释 + 按实际引用裁剪的 import */
function emitProductPrefix(used: Set<string>, builtinComponents: Set<string>): string {
  const lines: string[] = [];
  const aliased = Object.keys(RUNTIME_SHORT_NAMES).filter((name) => used.has(name));
  if (aliased.length > 0) {
    // 单一映射行：短名在前、原名在后，便于人工阅读 / 源码映射还原
    lines.push(`//lytjs-signal:${aliased.map((n) => `${RUNTIME_SHORT_NAMES[n]}=${n}`).join(',')};`);
  }
  for (const group of RUNTIME_IMPORT_GROUPS) {
    const specs = group.names
      .filter((name) => used.has(name))
      .map((name) => {
        const short = RUNTIME_SHORT_NAMES[name];
        return short ? `${name} as ${short}` : name;
      });
    if (specs.length > 0) lines.push(`import{${specs.join(',')}}from'${group.module}';`);
  }
  if (builtinComponents.size > 0) {
    lines.push(`import{${[...builtinComponents].join(',')}}from'@lytjs/component';`);
  }
  return lines.join('\n');
}

// ============================================================
// Helper: 生成静态 HTML 模板
// ============================================================

// FIX: P2-45 提取 escapeHtml 为模块级函数，避免每次调用 serializeStaticHTML 时重新创建
function escapeHtmlStatic(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 将静态元素子树序列化为 HTML 字符串，用于 createTemplate
 * 同时收集所有元素节点的变量名和标签名映射
 * 注意：只序列化静态属性（ATTRIBUTE），跳过指令（DIRECTIVE）
 */
function serializeStaticHTML(
  node: ElementNode,
  varCounter: Map<string, number>,
  elementVars: Array<{ varName: string; tag: string }>,
  staticVars?: Map<ElementNode, string>,
): string {
  // 组件：输出占位元素（不能是注释 —— 注释不在 element.children 里，会打乱下标），
  // 由运行时 mountComponent 挂载真实组件（与优化版 codegen 行为一致）
  if (node.tagType === ElementTypes.COMPONENT) {
    // 变量名不能含连字符（`genVarName('lyt-comp')` 会产出 `_lyt-comp` 这种非法标识符）
    const varName = genVarName('lytComp', varCounter);
    elementVars.push({ varName, tag: 'lyt-comp' });
    return `<lyt-comp data-lyt-comp="${node.tag}"></lyt-comp>`;
  }

  const varName = genVarName(node.tag, varCounter);
  elementVars.push({ varName, tag: node.tag });
  staticVars?.set(node, varName);

  let attrs = '';
  for (const prop of node.props) {
    if (prop.type === NodeTypes.ATTRIBUTE && prop.value) {
      // FIX: P1-11 对属性值进行 HTML 转义
      attrs += ` ${prop.name}="${escapeHtmlStatic(prop.value.content)}"`;
    } else if (prop.type === NodeTypes.ATTRIBUTE && !prop.value) {
      attrs += ` ${prop.name}`;
    }
    // 跳过 DIRECTIVE 类型的 props
  }

  let childrenHTML = '';
  for (const child of node.children) {
    if (child.type === NodeTypes.TEXT) {
      childrenHTML += escapeHtmlStatic((child as TextNode).content);
    } else if (child.type === NodeTypes.ELEMENT) {
      childrenHTML += serializeStaticHTML(
        child as ElementNode,
        varCounter,
        elementVars,
        staticVars,
      );
    } else if (child.type === NodeTypes.INTERPOLATION) {
      // 为**每个插值**留一个注释槽位（运行时由 claimTextSlots 换成独立文本节点）。
      // 不这么做的话，同一元素里的多个插值会全部写到同一个元素上 ⇒ 互相覆盖只剩最后一个。
      childrenHTML += TEXT_SLOT_COMMENT;
    }
    // 跳过 CommentNode 等其它动态内容
  }

  if (node.children.length === 0 && node.isSelfClosing) {
    return `<${node.tag}${attrs} />`;
  }
  return `<${node.tag}${attrs}>${childrenHTML}</${node.tag}>`;
}

// ============================================================
// 主生成函数
// ============================================================

export function generateSignal(ast: RootNode, _options?: CompilerOptions): CodegenResult {
  const lines: string[] = [];
  const varCounter = new Map<string, number>();
  const elementVars: Array<{ varName: string; tag: string }> = [];
  const consumedCount = new Map<string, number>();
  // 静态元素节点 → 变量名：用于给 v-if 分支找「下一个静态兄弟节点」作为插入锚点
  const staticVars = new Map<ElementNode, string>();

  // 跟踪哪些元素有动态绑定
  const dynamicBindings: Array<{ varName: string; code: string }> = [];

  // ---- Phase 0: 检查根节点数量 ----
  // FIX: P1-L3 模板根节点多个元素未报错 - 在编译时检测并报错
  const rootElementCount = ast.children.filter(
    (child) => child.type === NodeTypes.ELEMENT || child.type === NodeTypes.VNODE_CALL,
  ).length;
  if (rootElementCount > 1) {
    throw new Error(
      `[lytjs/compiler] Template has multiple root elements (${rootElementCount}). ` +
        `Signal mode requires a single root element. ` +
        `Wrap your template content in a single parent element, e.g., <div>...</div>.`,
    );
  }

  // 是否含组件（决定要不要引入 mountComponent）
  const usedComponents = containsComponent(ast.children);
  // 列表项为组件时也要引入 mountComponent：此阶段 v-for 已被 transform 成 JS 调用，
  // 故用「走 arguments 的预扫」判定（判据与列表分支一致）
  const usedListComponent = containsComponentVNode(ast.children);
  // 是否存在「带子内容的组件」（决定要不要引入 createVNode/Text 做插槽）
  const usedSlots = hasComponentWithChildren(ast.children);
  // 含 `<slot/>` 出口（决定要不要引入运行期挂载能力）
  const usedSlotOutlet = containsSlotOutlet(ast.children);
  // 用到的内置组件（决定要不要从 @lytjs/component 引入）
  const builtinComponents = collectBuiltinComponents(ast.children);

  // ---- Phase 1: import 种子（真实 import 在产物拼装阶段按引用裁剪，见 emitProductPrefix） ----
  // 旧实现固定带 15 个 dom-runtime 导入（多数模板根本用不到）；这里只记录 AST 判据要求的
  // 额外引入，DOM / 响应式 helper 由产物文本反查。
  const importSeeds = new Set<string>();
  // 用到组件挂载时才引入（@lytjs/renderer 提供运行时实现）
  if (usedComponents || usedListComponent) {
    importSeeds.add('mountComponent');
  }
  // 组件带子内容（插槽）或含 Teleport 时才需要 vnode 构造能力；
  // 列表项为组件且带插槽内容时（VNODE_CALL 形态）也需引入
  if (
    usedSlots ||
    containsTeleportOutlet(ast.children) ||
    hasListComponentVNodeWithChildren(ast.children)
  ) {
    importSeeds.add('createVNode');
    importSeeds.add('Text');
  }
  // 含 `<slot/>` 出口时才需要运行期挂载能力
  if (usedSlotOutlet) {
    importSeeds.add('mountSlotOutlet');
  }
  // `<Teleport>` / `<Suspense>` 走 vnode 路径：需运行期挂载原语 + vdom 侧符号
  // （`createVNode` / `Text` 由上面的分支负责，避免重复声明）
  if (containsTag(ast.children, 'Teleport') || containsTag(ast.children, 'Suspense')) {
    importSeeds.add('mountVNode');
    for (const sym of ['Teleport', 'Suspense']) {
      if (containsTag(ast.children, sym)) importSeeds.add(sym);
    }
  }

  // 先通过 buildStaticHTML 收集所有元素变量（使用 varCounter）
  const staticHTML = buildStaticHTML(ast.children, varCounter, elementVars, staticVars);

  // ---- Phase 3: Process AST children for dynamic bindings ----
  // 此时 varCounter 已被 buildStaticHTML 初始化，processElement 不再重复分配变量名
  processChildren(
    ast.children,
    varCounter,
    elementVars,
    dynamicBindings,
    consumedCount,
    false,
    new Set(),
    staticVars,
  );

  // ---- Phase 4: Generate render function ----
  lines.push('export function render(_ctx, _container) {');

  // 根级纯文本 / 插值（`{{msg}}`、`Hello {{name}}`）没有任何元素 ⇒ 旧实现整段丢弃，
  // 页面静默空白（P0-3 的一个具体形态）。这里按每个文本段各建一个文本节点。
  const rootTextNodes: string[] = [];
  if (elementVars.length === 0) {
    let textIdx = 0;
    for (const child of ast.children) {
      if (child.type === NodeTypes.TEXT) {
        const varName = `_rootText${textIdx++}`;
        lines.push(
          `  const ${varName} = document.createTextNode(${JSON.stringify((child as TextNode).content)});`,
        );
        lines.push(`  insert(${varName}, _container);`);
        rootTextNodes.push(varName);
      } else if (child.type === NodeTypes.INTERPOLATION) {
        const exp = getExpContent((child as InterpolationNode).content as SimpleExpressionNode);
        if (!exp) continue;
        validateExpression(exp, 'interpolation');
        const varName = `_rootText${textIdx++}`;
        lines.push(`  const ${varName} = document.createTextNode("");`);
        lines.push(`  insert(${varName}, _container);`);
        dynamicBindings.push({
          varName: '_container',
          code: `effect(() => setText(${varName}, ${prefixIdentifiers(exp, new Set())}));`,
        });
        rootTextNodes.push(varName);
      }
    }
  }

  // 生成 createTemplate 调用
  if (elementVars.length > 0) {
    // 找到根元素变量名
    const rootVar = elementVars[0]!.varName;
    lines.push(`  const ${rootVar} = createTemplate(${JSON.stringify(staticHTML)});`);

    // 解构子元素
    if (elementVars.length > 1) {
      const childVars = elementVars.slice(1).map((v) => v.varName);
      // createTemplate 返回的是 **TemplateWrapper**：它的 `.children` 只有 1 项（真实根元素），
      // 直接解构会把下标整体错位（表现为后续元素为 undefined → "Cannot set properties of undefined"）。
      // 因此必须先 getRealNode() 取到真实根元素再解构。
      // 2026-09-30 修复：同优化版 —— 元素变量覆盖全部后代元素（先序），
      // 用 children 在嵌套模板下会解构出 undefined 并在运行期崩溃。
      lines.push(
        `  const _root = getRealNode(${rootVar});` +
          `\n  const [${childVars.join(', ')}] = Array.from(_root.querySelectorAll ? _root.querySelectorAll('*') : _root.children || []);`,
      );
    }

    lines.push(`  insert(${rootVar}, _container);`);
    lines.push('');
  }

  // 生成动态绑定
  for (const binding of dynamicBindings) {
    lines.push(`  ${binding.code}`);
  }

  // 生成 cleanup
  if (elementVars.length > 0) {
    const rootVar = elementVars[0]!.varName;
    lines.push('');
    lines.push(`  onCleanup(() => ${rootVar}.remove());`);
  } else if (rootTextNodes.length > 0) {
    lines.push('');
    lines.push(`  onCleanup(() => { ${rootTextNodes.map((n) => `${n}.remove();`).join(' ')} });`);
  }

  lines.push('  return () => { runCleanups(); };');
  lines.push('}');

  const rawBody = lines.join('\n');
  const usedHelpers = collectProductHelpers(rawBody, importSeeds);
  return {
    code: `${emitProductPrefix(usedHelpers, builtinComponents)}\n\n${applyRuntimeAliases(rawBody, usedHelpers)}`,
    preamble: '',
    ast,
  };
}

// ============================================================
// 从 children 构建静态 HTML
// ============================================================

function buildStaticHTML(
  children: TemplateChildNode[],
  varCounter: Map<string, number>,
  elementVars: Array<{ varName: string; tag: string }>,
  staticVars: Map<ElementNode, string>,
): string {
  let html = '';
  for (const child of children) {
    if (child.type === NodeTypes.TEXT) {
      html += (child as TextNode).content;
    } else if (child.type === NodeTypes.ELEMENT) {
      html += serializeStaticHTML(child as ElementNode, varCounter, elementVars, staticVars);
    }
    // 跳过动态节点（JSConditionalExpression、JSCallExpression 等）
  }
  return html;
}

// ============================================================
// 处理 children 节点
// ============================================================

function processChildren(
  children: TemplateChildNode[],
  varCounter: Map<string, number>,
  elementVars: Array<{ varName: string; tag: string }>,
  dynamicBindings: Array<{ varName: string; code: string }>,
  consumedCount: Map<string, number>,
  inheritedOnce = false,
  locals: ReadonlySet<string> = new Set(),
  staticVars?: Map<ElementNode, string>,
): void {
  for (const child of children) {
    if (child.type === NodeTypes.ELEMENT) {
      processElement(
        child as ElementNode,
        varCounter,
        elementVars,
        dynamicBindings,
        consumedCount,
        inheritedOnce,
        locals,
        staticVars,
      );
    } else if (child.type === NodeTypes.JS_CONDITIONAL_EXPRESSION) {
      processConditional(
        child as JSConditionalExpression,
        varCounter,
        elementVars,
        dynamicBindings,
        undefined,
        consumedCount,
        locals,
        undefined,
      );
    } else if (child.type === NodeTypes.JS_CALL_EXPRESSION) {
      processCallExpression(
        child as JSCallExpression,
        varCounter,
        elementVars,
        dynamicBindings,
        undefined,
        new Set(),
      );
    }
    // 根级别的 TextNode、CommentNode、InterpolationNode 已处理
    // by the static HTML generation
  }
}

// ============================================================
// 处理元素节点
// ============================================================

/**
 * 取元素上的静态属性值（`name="v"`），没有则返回 null。
 */
function getStaticAttr(node: ElementNode, attrName: string): string | null {
  for (const prop of node.props) {
    if (prop && prop.type === NodeTypes.ATTRIBUTE && prop.name === attrName && prop.value) {
      return prop.value.content;
    }
  }
  return null;
}

/**
 * **内置组件**：由 codegen 直接从 `@lytjs/component` 导入，使用方无需手动注册
 * （与 Vue 一致）。2026-09-30 前一律按 `_ctx.<Name>` 解析 ⇒ 不注册就渲染为空。
 */
const BUILTIN_COMPONENT_NAMES: ReadonlySet<string> = new Set([
  'Transition',
  'TransitionGroup',
  'KeepAlive',
]);

/** 收集模板中实际用到的内置组件名。 */
function collectBuiltinComponents(children: unknown, acc = new Set<string>()): Set<string> {
  if (!Array.isArray(children)) return acc;
  for (const child of children) {
    const node = child as { type?: number; tag?: string; children?: unknown } | null;
    if (!node || typeof node !== 'object') continue;
    if (node.type === NodeTypes.ELEMENT && node.tag && BUILTIN_COMPONENT_NAMES.has(node.tag)) {
      acc.add(node.tag);
    }
    collectBuiltinComponents(node.children, acc);
  }
  return acc;
}

/** 组件标识符：带连字符的标签（`my-comp`）不能写成 `_ctx.my-comp`（会被解析成减法）。 */
function componentRef(tag: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(tag) ? `_ctx.${tag}` : `_ctx[${JSON.stringify(tag)}]`;
}

/**
 * VNODE_CALL props 里的值是否为**字面量**（静态）。
 *
 * 旧判据是「值里没有 `_ctx` 就算静态」，于是 `v-if` 分支里的 `:id="i"`（值为未加前缀的
 * 标识符 `i`）被当成静态属性序列化进 HTML ⇒ `id="i"`，动态绑定整条丢失。
 */
function isStaticPropValue(value: string): boolean {
  const v = value.trim();
  if (/^["'][\s\S]*["']$/.test(v)) return true; // 带引号的字符串字面量
  return /^(?:-?\d+(?:\.\d+)?|true|false|null|undefined)$/.test(v);
}

/** 模板中是否含指定标签（用于按需引符号）。 */
function containsTag(children: unknown, tag: string): boolean {
  if (!Array.isArray(children)) return false;
  for (const child of children) {
    const node = child as { type?: number; tag?: string; children?: unknown } | null;
    if (!node || typeof node !== 'object') continue;
    if (node.type === NodeTypes.ELEMENT && node.tag === tag) return true;
    if (containsTag(node.children, tag)) return true;
  }
  return false;
}

/** 模板中是否含 `<Teleport>` 出口（决定要不要走 vnode 路径 + 引入相关符号）。 */
function containsTeleportOutlet(children: unknown): boolean {
  if (!Array.isArray(children)) return false;
  for (const child of children) {
    const node = child as { type?: number; tag?: string; children?: unknown } | null;
    if (!node || typeof node !== 'object') continue;
    if (node.type === NodeTypes.ELEMENT && (node.tag === 'Teleport' || node.tag === 'Suspense')) {
      return true;
    }
    if (containsTeleportOutlet(node.children)) return true;
  }
  return false;
}

/** 模板中是否含 `<slot/>` 出口（决定要不要引入 `mountSlot`）。 */
function containsSlotOutlet(children: unknown): boolean {
  if (!Array.isArray(children)) return false;
  for (const child of children) {
    const node = child as { type?: number; tag?: string; children?: unknown } | null;
    if (!node || typeof node !== 'object') continue;
    if (node.type === NodeTypes.ELEMENT && node.tag === 'slot') return true;
    if (containsSlotOutlet(node.children)) return true;
  }
  return false;
}

function processElement(
  node: ElementNode,
  varCounter: Map<string, number>,
  elementVars: Array<{ varName: string; tag: string }>,
  dynamicBindings: Array<{ varName: string; code: string }>,
  consumedCount: Map<string, number>,
  inheritedOnce = false,
  locals: ReadonlySet<string> = new Set(),
  staticVars?: Map<ElementNode, string>,
): void {
  // v-once：沿元素树向下传递（整个子树都只渲染一次）
  const onceMode = inheritedOnce || node.__isOnce === true;
  // 记录本次调用前的长度，末尾统一把"新增绑定"去掉 effect 包裹
  const bindingStart = dynamicBindings.length;

  // `<Teleport>` / `<Suspense>`：产出对应 **vnode** 交给 vdom 的 patch（与优化版一致）
  if (node.tag === 'Teleport' || node.tag === 'Suspense') {
    const vpTag = node.tag;
    const vpEntry = findExistingVar(elementVars, 'lyt-comp', consumedCount);
    const vpHost = vpEntry ?? genVarName('lytComp', varCounter);
    if (!vpEntry) elementVars.push({ varName: vpHost, tag: 'lyt-comp' });

    const vpChildren = collectSlotVNodes(node.children, '_ctx.');
    dynamicBindings.push({
      varName: vpHost,
      code: `mountVNode(createVNode(${vpTag},${buildComponentPropsObject(node)},[${vpChildren.join(',')}]),${vpHost});`,
    });
    return;
  }

  // 组件：生成 mountComponent(_ctx.Tag, props, 占位元素)
  if (node.tagType === ElementTypes.COMPONENT) {
    const hostEntry = findExistingVar(elementVars, 'lyt-comp', consumedCount);
    const hostVar = hostEntry ?? genVarName('lytComp', varCounter);
    if (!hostEntry) elementVars.push({ varName: hostVar, tag: 'lyt-comp' });

    // 子内容 → 默认插槽。signal 产物本身是 DOM 操作，但 slot 契约要求返回 vnode
    // （normalizeSlotValue 会校验 `__v_isVNode`），故这里生成 vnode 构造代码。
    const slotsObj = buildComponentSlotsObject(node, '_ctx.');
    const slotsArg = slotsObj ? `,${slotsObj}` : '';

    dynamicBindings.push({
      varName: hostVar,
      code: `mountComponent(${
        BUILTIN_COMPONENT_NAMES.has(node.tag) ? node.tag : componentRef(node.tag)
      },${buildComponentPropsObject(node)},${hostVar}${slotsArg});`,
    });
    return;
  }

  // `<slot/>` 出口：由运行期 `mountSlotOutlet` 把传入的插槽内容**就地**挂载进该元素。
  // 与 `mountSlot`（挂进容器、保留 `<slot>` 包装）不同：出口元素会被替换成注释锚点，
  // 插槽内容直接落在模板原位置（mx06 实测：字面量 `<slot>` 元素残留）。
  if (node.tag === 'slot') {
    const slotName = getStaticAttr(node, 'name') ?? 'default';
    const slotVar =
      findExistingVar(elementVars, 'slot', consumedCount) ?? genVarName('slotEl', varCounter);
    dynamicBindings.push({
      varName: slotVar,
      code: `mountSlotOutlet(_ctx.$slots&&_ctx.$slots[${JSON.stringify(slotName)}],${slotVar});`,
    });
    return;
  }

  // 查找已由 buildStaticHTML 分配的变量名
  // 使用 elementVars 中已有的条目来获取变量名，而不是重新生成
  const existingEntry = findExistingVar(elementVars, node.tag, consumedCount);
  const varName = existingEntry ?? genVarName(node.tag, varCounter);

  if (!existingEntry) {
    elementVars.push({ varName, tag: node.tag });
  }

  // 处理 props（指令）- 直接从 ElementNode.props 中查找
  for (let i = 0; i < node.props.length; i++) {
    const prop = node.props[i];
    if (!prop) continue;
    if (prop.type === NodeTypes.DIRECTIVE) {
      const dir = prop as DirectiveNode;
      // v-text 和 v-html 在解析器中不解析 exp（解析器只对特定指令名解析 = 后面的值）
      // 解析器会将 ="value" 解析为独立的 AttributeNode { name: '="value"', value: undefined }
      // 所以需要从后续属性中提取值
      if ((dir.name === 'text' || dir.name === 'html') && !dir.exp) {
        for (let j = i + 1; j < node.props.length; j++) {
          const nextProp = node.props[j]!;
          if (nextProp.type === NodeTypes.ATTRIBUTE) {
            // 匹配 ="value" 格式的属性名
            const eqMatch = nextProp.name.match(/^="(.*)"$/);
            if (eqMatch) {
              dir.exp = createSimpleExpressionFor(eqMatch[1]!, dir.loc);
              break;
            }
          }
        }
      }
      processDirective(dir, varName, node.tag, dynamicBindings, locals, getStaticClass(node));
    }
  }

  // 处理 codegenNode 中的属性（transform 阶段将 v-text/v-html 转换为 textContent/innerHTML 属性）
  if (node.codegenNode && node.codegenNode.type === NodeTypes.VNODE_CALL) {
    const vnode = node.codegenNode as VNodeCall;
    processVNodeCallProps(vnode, varName, dynamicBindings, locals);
  }

  // 处理子节点中的动态内容
  // 插值：**每个插值写入各自的文本槽位**（由 claimTextSlots 从注释标记换来），
  // 而不是写整个元素 —— 后者会让同元素内的多个插值互相覆盖（只剩最后一个）。
  let slotsVar: string | undefined;
  let slotIndex = 0;
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i]!;
    if (child.type === NodeTypes.INTERPOLATION) {
      const exp = getExpContent((child as InterpolationNode).content as SimpleExpressionNode);
      // ⚠️ 2026-09-30 修复：此前这里用「只允许简单属性路径」的白名单正则，复杂插值
      //   （`{{ a + b }}` / `{{ ok ? 'A' : 'B' }}`）只打一条 DEV 警告后 **`continue` 静默丢弃**
      //   ⇒ 产物里整段文本消失（与优化版曾有的缺陷同源）。现与优化版同构：
      //   黑名单校验（拒绝危险写法）+ `prefixIdentifiers`（下方 setText 已如此）。
      if (!exp) {
        continue;
      }
      validateExpression(exp, 'interpolation');
      if (!slotsVar) {
        slotsVar = genVarName(`${node.tag}Slots`, varCounter);
        dynamicBindings.push({
          varName,
          code: `const ${slotsVar} = claimTextSlots(${varName});`,
        });
      }
      dynamicBindings.push({
        varName,
        code: `effect(() => setText(${slotsVar}[${slotIndex}], ${prefixIdentifiers(exp, locals)}));`,
      });
      slotIndex++;
    } else if (child.type === NodeTypes.ELEMENT) {
      processElement(
        child as ElementNode,
        varCounter,
        elementVars,
        dynamicBindings,
        consumedCount,
        onceMode,
        locals,
        staticVars,
      );
    } else if (child.type === NodeTypes.JS_CONDITIONAL_EXPRESSION) {
      // 插入锚点：分支元素必须落在「原位置」，而不是父容器末尾。
      // 用其后第一个静态兄弟元素作为 `insert(..., ref)` 的参考节点；
      // 若后面没有静态元素（或全是动态节点）则退回追加（ref=undefined）。
      let anchorVar: string | undefined;
      for (let j = i + 1; j < node.children.length; j++) {
        const sibling = node.children[j]!;
        if (sibling.type === NodeTypes.ELEMENT) {
          anchorVar = staticVars?.get(sibling as ElementNode);
          break;
        }
      }
      processConditional(
        child as JSConditionalExpression,
        varCounter,
        elementVars,
        dynamicBindings,
        varName,
        consumedCount,
        locals,
        anchorVar,
      );
    } else if (child.type === NodeTypes.JS_CALL_EXPRESSION) {
      processCallExpression(
        child as JSCallExpression,
        varCounter,
        elementVars,
        dynamicBindings,
        varName,
        locals,
      );
    }
  }

  // v-once：把本次产生的绑定去掉 `effect()` 包裹 —— 只渲染一次，不建响应式边界。
  // 幂等：内层递归已处理过的绑定再处理一次也无副作用。
  if (onceMode) {
    for (let i = bindingStart; i < dynamicBindings.length; i++) {
      const binding = dynamicBindings[i];
      if (binding) binding.code = stripEffectWrapper(binding.code);
    }
  }
}

/**
 * 去掉 `effect(() => X);` 的外层包裹 → `X;`（供 v-once 使用）
 *
 * 只处理本 codegen 自己生成的固定形态；不匹配时原样返回。
 */
function stripEffectWrapper(code: string): string {
  const match = /^effect\(\(\)\s*=>\s*([\s\S]*?)\);$/.exec(code.trim());
  return match && match[1] ? `${match[1]};` : code;
}

// ============================================================
// Helper: 在 elementVars 中查找已有变量名
// ============================================================

function createSimpleExpressionFor(
  content: string,
  _loc?: {
    start: { line: number; column: number; offset: number };
    end: { line: number; column: number; offset: number };
    source: string;
  },
): SimpleExpressionNode {
  return {
    type: NodeTypes.SIMPLE_EXPRESSION,
    content,
    isStatic: false,
    isConstant: false,
    loc: _loc ?? {
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 1, column: 1, offset: 0 },
      source: content,
    },
  };
}

function findExistingVar(
  elementVars: Array<{ varName: string; tag: string }>,
  tag: string,
  consumedCount?: Map<string, number>,
): string | null {
  // 查找匹配标签的、尚未被 processElement 处理过的变量
  // 通过 consumedCount 跟踪每个标签已消费的数量，避免重复标签返回相同变量名
  const matching = elementVars.filter((v) => v.tag === tag);
  if (matching.length > 0) {
    const idx = consumedCount?.get(tag) ?? 0;
    consumedCount?.set(tag, idx + 1);
    return matching[idx]!.varName;
  }
  return null;
}

// ============================================================
// 处理 VNodeCall props（用于 v-text、v-html 等转换后的指令）
// ============================================================

function processVNodeCallProps(
  vnode: VNodeCall,
  varName: string,
  dynamicBindings: Array<{ varName: string; code: string }>,
  locals: ReadonlySet<string> = new Set(),
): void {
  if (!vnode.props || vnode.props.type !== NodeTypes.JS_OBJECT_EXPRESSION) return;

  const objExpr = vnode.props as JSObjectExpression;
  for (const prop of objExpr.properties) {
    if (prop.type !== NodeTypes.JS_PROPERTY) continue;
    const jsProp = prop as JSProperty;
    if (
      jsProp.key.type !== NodeTypes.SIMPLE_EXPRESSION ||
      jsProp.value.type !== NodeTypes.SIMPLE_EXPRESSION
    ) {
      continue;
    }

    const key = (jsProp.key as SimpleExpressionNode).content.replace(/^"|"$/g, '');
    const value = (jsProp.value as SimpleExpressionNode).content;

    if (key === 'textContent') {
      // v-text 转换后的结果
      dynamicBindings.push({
        varName,
        code: `effect(() => setText(${varName}, ${prefixIdentifiers(value, locals)}));`,
      });
    } else if (key === 'innerHTML') {
      // v-html 转换后的结果。
      // 消毒由 @lytjs/dom-runtime 的 setHTML 统一负责（写入前调用 sanitizeHTML），
      // 与 vnode 模式的 `innerHTML: sanitizeHTML(x)` 共用同一真相源；
      // 一致性由 scripts/check-security-html.mjs 门禁逐字比对两种模式。
      dynamicBindings.push({
        varName,
        code: `effect(() => setHTML(${varName}, ${prefixIdentifiers(value, locals)}));`,
      });
    } else if (key === 'modelValue') {
      // v-model 转换后的结果 - 已在 processDirective 中处理
      // 跳过
    } else if (key.startsWith('onUpdate:')) {
      // v-model 的更新事件 - 已在 processDirective 中处理
      // 跳过
    } else if (key.startsWith('on')) {
      // v-on 转换后的结果 - 已在 processDirective 中处理
      // 跳过
    }
  }
}

// ============================================================
// 处理指令节点
// ============================================================

/**
 * 插值「文本槽位」在静态模板里的注释标记。
 * 与 `@lytjs/dom-runtime` 的 `claimTextSlots()` / `TEXT_SLOT_MARKER` **必须保持一致**。
 */
const TEXT_SLOT_COMMENT = '<!--lyt-t-->';

// FIX: P1-1~3 Signal 模式代码注入防护 - 表达式白名单验证
const VALID_EXPRESSION = /^[a-zA-Z_$][a-zA-Z0-9_$]*(\.([a-zA-Z_$][a-zA-Z0-9_$]*))*$/;

/**
 * 危险/带副作用的表达式模式（黑名单）。
 * 模板表达式默认**信任**（模板由开发者书写），只拦这些：
 * 语句分隔、箭头函数、声明关键字、动态导入、赋值（避免副作用与注入）。
 */
const DANGEROUS_EXPRESSION =
  /;|=>|\bfunction\b|\bnew\s|\bimport\b|\brequire\b|\bdelete\b|\bthrow\b|\bawait\b|(^|[^=!<>])\b[a-zA-Z_$][\w$]*\s*=(?!=)/;

// FIX: P1-S1, P1-S2 属性名和事件名验证正则
const VALID_ATTRIBUTE_NAME = /^[a-zA-Z][a-zA-Z0-9-:]*$/;
const VALID_EVENT_NAME = /^[a-zA-Z][a-zA-Z0-9-]*$/;
const VALID_COMPONENT_NAME = /^[a-zA-Z][a-zA-Z0-9-]*$/;

function validateExpression(exp: string | undefined, context: string): void {
  if (!exp) return;
  // 表达式生成已统一改走 `prefixIdentifiers(exp, locals)`（见各调用点），
  // 它能正确处理数组/对象/三元/拼接/索引等，并跳过属性名、字符串、locals。
  // ⇒ 这里不再限制为「简单属性路径」，改为**黑名单式**拒绝明显危险/带副作用的模式。
  if (DANGEROUS_EXPRESSION.test(exp)) {
    throw new Error(
      `[lytjs/compiler] Unsafe expression in ${context}: "${exp}".\n` +
        `  Statements, arrow functions, declarations and assignments are not allowed in templates.`,
    );
  }
}

function validateArgContent(arg: string | undefined): void {
  if (!arg) return;
  // 额外检查单引号，防止破坏生成的字符串字面量
  if (arg.includes("'")) {
    throw new Error(
      `[lytjs/compiler] Invalid argument: "${arg}". Single quotes are not allowed in directive arguments.`,
    );
  }
}

// FIX: P1-S1: v-bind 动态属性名验证
function validateAttributeName(name: string | undefined, context: string): void {
  if (!name) return;
  if (!VALID_ATTRIBUTE_NAME.test(name)) {
    throw new Error(
      `[lytjs/compiler] Invalid attribute name in ${context}: "${name}". Only alphanumeric characters, hyphens, and colons are allowed.`,
    );
  }
}

// FIX: P1-S2: v-on 事件名验证
function validateEventName(name: string | undefined, context: string): void {
  if (!name) return;
  if (!VALID_EVENT_NAME.test(name)) {
    throw new Error(
      `[lytjs/compiler] Invalid event name in ${context}: "${name}". Only alphanumeric characters and hyphens are allowed.`,
    );
  }
}

// FIX: P1-S6: 动态组件名验证
function validateComponentName(name: string | undefined, context: string): void {
  if (!name) return;
  if (!VALID_COMPONENT_NAME.test(name)) {
    throw new Error(
      `[lytjs/compiler] Invalid component name in ${context}: "${name}". Only alphanumeric characters and hyphens are allowed.`,
    );
  }
}

// FIX: P1-S8: v-island 指令验证
function validateIslandDirective(exp: string | undefined, context: string): void {
  if (!exp) return;
  // v-island 指令只允许简单的布尔表达式或属性访问
  if (!VALID_EXPRESSION.test(exp) && exp !== 'true' && exp !== 'false') {
    throw new Error(
      `[lytjs/compiler] Invalid v-island expression in ${context}: "${exp}". Only simple property access or boolean literals are allowed.`,
    );
  }
}

/**
 * handler 表达式是否为「成员路径」（方法引用）：`fn` / `obj.fn` / `a.b.c`。
 * 只有这种才可直接当作 handler 传入（点击时才调用）。
 */
const MEMBER_PATH_EXPRESSION = /^[a-zA-Z_$][\w$]*(\.[a-zA-Z_$][\w$]*)*$/;

/**
 * 渲染事件 handler。
 *
 * ⚠️ 2026-09-30 修复（预存缺陷）：`@click="fn()"` / `"count++"` 这类**内联语句**此前被
 * 直接当作 handler 表达式 ⇒ ① 在 **setup 阶段就被求值**；② 传入的是其**返回值**（通常
 * `undefined`）⇒ 点击时 `handler(e)` 抛 `TypeError`。现按 Vue 语义包成箭头：
 * 方法引用原样传，内联语句包成 `($event) => { … }`（**点击时才求值**）。
 */
function renderHandlerExpression(exp: string, locals: ReadonlySet<string> = new Set()): string {
  if (MEMBER_PATH_EXPRESSION.test(exp)) return prefixIdentifiers(exp, locals);
  return `($event) => { ${prefixIdentifiers(exp, new Set([...locals, '$event']))}; }`;
}

/**
 * 取元素上的**静态** `class` 属性值；没有则返回 `''`。
 *
 * ⚠️ 2026-09-30 修复「静态 class 丢失」：`setClass()` 整体替换 class 属性，
 * 而静态 class 已烧进 createTemplate 的 HTML ⇒ `:class` 一动就把它抹掉。
 * 修法：静态 class 并入动态取值（`setClass(el, ['a b', _ctx.cls])`）。
 */
function getStaticClass(node: ElementNode): string {
  for (const prop of node.props) {
    if (prop && prop.type === NodeTypes.ATTRIBUTE && prop.name === 'class' && prop.value) {
      return prop.value.content;
    }
  }
  return '';
}

function processDirective(
  dir: DirectiveNode,
  varName: string,
  tag: string,
  dynamicBindings: Array<{ varName: string; code: string }>,
  locals: ReadonlySet<string> = new Set(),
  staticClass = '',
): void {
  const expContent = dir.exp ? getExpContent(dir.exp as SimpleExpressionNode) : undefined;
  const argContent = dir.arg ? getExpContent(dir.arg as SimpleExpressionNode) : undefined;

  // FIX: P1-1~3 对 expContent 和 argContent 进行白名单验证
  validateExpression(expContent, `v-${dir.name}`);
  validateExpression(argContent, `v-${dir.name} argument`);
  validateArgContent(argContent);

  // 2026-09-30 修复：动态参数/事件（`:[dyn]` / `@[evt]`）的 arg 是**表达式**，不是字面量。
  const isDynamicArg = !!dir.arg && (dir.arg as { isStatic?: boolean }).isStatic === false;
  const argCode = argContent
    ? isDynamicArg
      ? prefixIdentifiers(argContent, locals)
      : `'${argContent}'`
    : "''";

  // FIX: P1-S1, P1-S2: 根据指令类型进行特定的名称验证
  if (dir.name === 'bind' && argContent) {
    validateAttributeName(argContent, `v-bind:${argContent}`);
  }
  if (dir.name === 'on' && argContent) {
    validateEventName(argContent, `v-on:${argContent}`);
  }
  // FIX: P1-S8: v-island 指令验证
  if (dir.name === 'island') {
    validateIslandDirective(expContent, 'v-island');
  }

  switch (dir.name) {
    case 'if': {
      // v-if 在 transform 阶段已被转换为 JSConditionalExpression
      // 此处作为后备处理，使用 insert/remove 方式
      // FIX: P2-13 _container 是 render 函数的第二个参数，在生成的代码中可用
      if (expContent) {
        dynamicBindings.push({
          varName,
          code: `let _ifFallbackEl = null;\n  effect(() => {\n    if (${prefixIdentifiers(expContent, locals)}) {\n      if (!_ifFallbackEl) {\n        _ifFallbackEl = ${varName};\n        insert(_ifFallbackEl, _container);\n      }\n    } else {\n      if (_ifFallbackEl) {\n        remove(_ifFallbackEl);\n        _ifFallbackEl = null;\n      }\n    }\n  });`,
        });
      }
      break;
    }

    case 'show': {
      if (expContent) {
        dynamicBindings.push({
          varName,
          code: `effect(() => {\n    ${varName}.style.display = ${prefixIdentifiers(expContent, locals)} ? '' : 'none';\n  });`,
        });
      }
      break;
    }

    case 'html': {
      // v-html 在 transform 阶段已被转换为 innerHTML 属性
      // 在 processVNodeCallProps 中处理
      // 此处作为后备（消毒同样由 dom-runtime.setHTML 承担，见上方 innerHTML 分支注释）
      if (expContent) {
        dynamicBindings.push({
          varName,
          code: `effect(() => setHTML(${varName}, ${prefixIdentifiers(expContent, locals)}));`,
        });
      }
      break;
    }

    case 'bind': {
      if (argContent && expContent) {
        if (argContent === 'class' && !isDynamicArg) {
          // 静态 class 必须并入（setClass 是整体替换），否则模板里的 class 会被抹掉
          const classValue = staticClass
            ? `[${JSON.stringify(staticClass)}, ${prefixIdentifiers(expContent, locals)}]`
            : prefixIdentifiers(expContent, locals);
          dynamicBindings.push({
            varName,
            code: `effect(() => setClass(${varName}, ${classValue}));`,
          });
        } else if (argContent === 'style' && !isDynamicArg) {
          dynamicBindings.push({
            varName,
            code: `effect(() => setStyle(${varName}, ${prefixIdentifiers(expContent, locals)}));`,
          });
        } else {
          dynamicBindings.push({
            varName,
            code: `effect(() => setAttribute(${varName}, ${argCode}, ${prefixIdentifiers(expContent, locals)}));`,
          });
        }
      }
      break;
    }

    case 'on': {
      if (argContent && expContent) {
        if (dir.modifiers.length > 0) {
          const mods = dir.modifiers.map((m) => `${m}: true`).join(', ');
          dynamicBindings.push({
            varName,
            code: `onCleanup(createEventHandler(${varName}, ${argCode}, ${renderHandlerExpression(expContent, locals)}, { ${mods} }));`,
          });
        } else {
          // FIX: P1-12 使用 createEventHandler 替代未导入的 addEventListener
          dynamicBindings.push({
            varName,
            code: `onCleanup(createEventHandler(${varName}, ${argCode}, ${renderHandlerExpression(expContent, locals)}));`,
          });
        }
      }
      break;
    }

    case 'model': {
      if (expContent) {
        const tagLower = tag.toLowerCase();
        const modifiers = dir.modifiers;
        const isLazy = modifiers.includes('lazy');
        const isNumber = modifiers.includes('number');
        const isTrim = modifiers.includes('trim');

        // 确定事件类型和取值方式
        let eventName: string;
        let getValueExpr: string;
        if (tagLower === 'select') {
          eventName = 'change';
          getValueExpr = '$e.target.value';
        } else if (tagLower === 'textarea') {
          eventName = isLazy ? 'change' : 'input';
          getValueExpr = '$e.target.value';
        } else {
          // input 元素（默认）
          eventName = isLazy ? 'change' : 'input';
          getValueExpr = '$e.target.value';
        }

        // 构建赋值表达式（应用修饰符）
        // FIX: P2-14 重构为 if-else 结构，避免 .number.trim 组合时
        // 前面的单独 if 分支被后续组合分支覆盖，导致逻辑冗余
        let setValueExpr: string;
        if (isNumber && isTrim) {
          // .number.trim 组合：先 trim 再转 number
          setValueExpr = `Number((${getValueExpr}).trim())`;
        } else if (isNumber) {
          setValueExpr = `Number(${getValueExpr})`;
        } else if (isTrim) {
          setValueExpr = `(${getValueExpr}).trim()`;
        } else {
          setValueExpr = getValueExpr;
        }

        // 生成双向绑定代码
        dynamicBindings.push({
          varName,
          code: `effect(() => { ${varName}.value = ${prefixIdentifiers(expContent, locals)}; });`,
        });
        dynamicBindings.push({
          varName,
          code: `onCleanup(createEventHandler(${varName}, '${eventName}', ($e) => { ${prefixIdentifiers(expContent, locals)} = ${setValueExpr}; }));`,
        });
      }
      break;
    }

    case 'for': {
      // v-for 在 transform 阶段已被转换为 JSCallExpression (renderList)
      // 此处作为后备处理
      break;
    }
  }
}

// ============================================================
// 处理 JSConditionalExpression（v-if 转换结果）
// 使用 createTemplate + insert/remove 实现真正的 DOM 插入/移除
// ============================================================

function processConditional(
  node: JSConditionalExpression,
  varCounter: Map<string, number>,
  elementVars: Array<{ varName: string; tag: string }>,
  dynamicBindings: Array<{ varName: string; code: string }>,
  parentVar?: string,
  _consumedCount?: Map<string, number>,
  locals: ReadonlySet<string> = new Set(),
  anchorVar?: string,
): void {
  const testExpr = getTestExpr(node.test);

  // FIX: P1-L2 v-if/v-else-if 条件为空未报错 - 添加运行时错误抛出
  if (!testExpr || testExpr.trim() === '') {
    throw new Error(
      `[lytjs/compiler] v-if/v-else-if condition is empty or invalid. ` +
        `Ensure the directive has a valid expression, e.g., v-if="condition" or v-else-if="condition".`,
    );
  }

  // 收集所有条件分支（v-if / v-else-if / v-else 链）
  const branches: Array<{
    condition: string | null; // null 表示 v-else（无条件）
    branch: JSChildNode | TemplateChildNode | TemplateChildNode[] | string | undefined;
  }> = [];

  // 收集 consequent 分支
  branches.push({
    condition: testExpr,
    branch: node.consequent,
  });

  // 递归收集 alternate 链（v-else-if / v-else）
  let alternate = node.alternate;
  while (alternate) {
    if (
      typeof alternate !== 'string' &&
      !Array.isArray(alternate) &&
      alternate.type === NodeTypes.JS_CONDITIONAL_EXPRESSION
    ) {
      const altCond = alternate as JSConditionalExpression;
      const altTestExpr = getTestExpr(altCond.test);
      branches.push({
        condition: altTestExpr || null,
        branch: altCond.consequent,
      });
      alternate = altCond.alternate;
    } else {
      // v-else 分支（无条件）
      branches.push({
        condition: null,
        branch: alternate,
      });
      alternate = undefined;
    }
  }

  // 为每个分支注册变量名（确保 varCounter 和 elementVars 正确递增）
  //
  // ⚠️ 这里**不能**消费 consumedCount：同一标签在多个分支（`<i v-if>…<i v-else-if>`）
  //   会出现多次，按「消费」计数会让第二次取值越界，直接抛
  //   `Cannot read properties of undefined (reading 'varName')`（if08 实测）。
  //   本循环只需知道「该标签是否已有变量」，不参与后续 processElement 的消费顺序。
  for (let i = 0; i < branches.length; i++) {
    const branchInfo = branches[i]!;
    const elInfo = extractElementFromBranch(branchInfo.branch);
    if (elInfo) {
      const existing = findExistingVar(elementVars, elInfo.tag);
      if (!existing) {
        const varName = genVarName(elInfo.tag, varCounter);
        elementVars.push({ varName, tag: elInfo.tag });
      }
    }
  }

  // 序列化每个分支的 HTML
  const branchHTMLs: string[] = [];
  for (const branchInfo of branches) {
    const html = serializeBranchHTML(branchInfo.branch);
    branchHTMLs.push(html);
  }

  // 确定父容器和参考节点
  const containerVar = parentVar ?? '_container';
  // FIX: P1-28 使用唯一计数器键确保嵌套 v-if 生成唯一变量名，
  // 避免嵌套场景下变量名冲突
  // FIX: P2-14 修复 `_if_undefined` 问题，确保深度值始终为数字
  const ifDepth = varCounter.get('_if_depth') ?? 0;
  const ifCounterKey = `_if_${ifDepth}`;
  const ifVarName = `_if${varCounter.get(ifCounterKey) ?? 0}`;
  varCounter.set(ifCounterKey, (varCounter.get(ifCounterKey) ?? 0) + 1);
  varCounter.set('_if_depth', ifDepth + 1);

  // 预先算好每个分支的动态绑定：文本槽位变量必须声明在 effect 外，
  // 才能在「创建分支」和「分支保持激活」两条路径里共用。
  const branchDynamics = branches.map((branchInfo, i) =>
    buildBranchDynamics(
      collectBranchDynamics(branchInfo.branch, locals),
      ifVarName,
      `${ifVarName}_b${i}`,
    ),
  );

  // FIX: P2-24 模板缩进保持：生成的代码保持与模板一致的缩进层级
  // 生成条件分支的 DOM 插入/移除代码
  let code = `let ${ifVarName}El = null;\n`;
  code += `let ${ifVarName}Active = -1;\n`;
  for (const dyn of branchDynamics) {
    if (dyn.declarations) code += `${dyn.declarations}\n`;
  }
  code += `effect(() => {\n`;

  for (let i = 0; i < branches.length; i++) {
    const branchInfo = branches[i]!;
    const branchHTML = branchHTMLs[i]!;

    if (i > 0) {
      code += `    } else `;
    }

    if (branchInfo.condition !== null) {
      code += `if (${prefixIdentifiers(branchInfo.condition, locals)}) `;
    }

    code += `{\n`;
    code += `      if (${ifVarName}Active !== ${i}) {\n`;

    // 移除之前的分支元素
    if (i === 0) {
      code += `        if (${ifVarName}El) {\n`;
      code += `          remove(${ifVarName}El);\n`;
      code += `          ${ifVarName}El = null;\n`;
      code += `        }\n`;
    }

    // 创建并插入新分支元素
    code += `        ${ifVarName}El = createTemplate(${JSON.stringify(branchHTML)}).firstElementChild;\n`;
    // FIX: P0-07 添加 null 检查，防止空 HTML 或纯文本 HTML 导致 firstElementChild 为 null 时崩溃
    code += `        if (!${ifVarName}El) { ${ifVarName}El = document.createComment(''); }\n`;
    if (branchHTML.trim()) {
      // 插入参考节点：`anchorVar` 为「原位置后面的静态兄弟元素」，
      // 保证 v-if 分支落在模板书写的位置，而不是父容器末尾（mx04 实测）。
      code += `      insert(${ifVarName}El, ${containerVar}${anchorVar ? `, ${anchorVar}` : ''});\n`;
    }
    code += `        ${ifVarName}Active = ${i};\n`;

    // 处理分支内的动态绑定（插值文本 / 动态属性 / 组件挂载）
    const dyn = branchDynamics[i]!;
    if (dyn.create) code += dyn.create;

    code += `      }`;

    // 如果分支已激活，更新动态内容（同一段代码在「保持激活」分支里再执行一次）
    if (dyn.update) {
      code += ` else {\n`;
      code += dyn.update;
      code += `      }`;
    }

    code += `\n`;
  }

  // 如果所有条件都不满足，移除元素
  //
  // ⚠️ 2026-09-30 修复：末支若已是 `v-else`（condition === null），它本身就是兜底分支；
  //   再补一个 `else {…}` 会得到 `if…else…else` ⇒ **SyntaxError: Unexpected token 'else'**。
  //   注意：无论哪种情况都必须闭合末支的外层 `{`，故此处只保留 `}`。
  const lastBranch = branches[branches.length - 1];
  if (!lastBranch || lastBranch.condition !== null) {
    code += `    } else {\n`;
    code += `      if (${ifVarName}El) {\n`;
    code += `        remove(${ifVarName}El);\n`;
    code += `        ${ifVarName}El = null;\n`;
    code += `        ${ifVarName}Active = -1;\n`;
    code += `      }\n`;
    code += `    }\n`;
  } else {
    code += `    }\n`;
  }
  code += `  });`;

  dynamicBindings.push({
    varName: containerVar,
    code,
  });

  // 分支内的动态绑定已在上面按「分支元素自身」生成。
  // ⚠️ 这里**不再**调用 processBranchDynamics：它把 `:class` / `:style` 绑到
  //   `containerVar`（分支的**父容器**）上，而且没有做 `_ctx.` 前缀 ⇒
  //   静态 class 泄漏到父元素（if07）、动态表达式直接 `ReferenceError`（if09）。
  // FIX: P2-12 在 processConditional 结束时递减 _if_depth，避免同级 v-if 时计数器持续增长
  varCounter.set('_if_depth', ifDepth);
}

// ============================================================
// Helper: 序列化条件分支为 HTML 字符串
// ============================================================

function serializeBranchHTML(
  branch: JSChildNode | TemplateChildNode | TemplateChildNode[] | string | undefined,
): string {
  if (!branch) return '';
  if (typeof branch === 'string') return branch;
  if (Array.isArray(branch)) {
    return branch.map((item) => serializeBranchHTML(item)).join('');
  }
  // 分支内的插值：留文本槽位（运行期 claimTextSlots 换成独立文本节点），
  // 这样多层嵌套里的插值不会被整段丢弃（if05 实测）
  if (branch.type === NodeTypes.INTERPOLATION) return TEXT_SLOT_COMMENT;
  if (branch.type === NodeTypes.JS_CALL_EXPRESSION) {
    const call = branch as JSCallExpression;
    const callee = typeof call.callee === 'string' ? call.callee : String(call.callee);
    return callee === 'TO_DISPLAY_STRING' || callee === 'toDisplayString' ? TEXT_SLOT_COMMENT : '';
  }
  if (branch.type === NodeTypes.COMPOUND_EXPRESSION) {
    const compound = branch as CompoundExpressionNode;
    return (compound.children ?? []).map((c) => serializeBranchHTML(c as never)).join('');
  }
  if (branch.type === NodeTypes.VNODE_CALL) {
    const vnode = branch as VNodeCall;
    if (typeof vnode.tag === 'string') {
      // 组件分支（tag 是标识符/表达式，如 `(_ctx["my-comp"] || …)`）：
      // 不能按 HTML 标签名序列化，更不能按组件名规则校验（kb05 曾直接编译抛错）。
      // 与静态组件的做法一致：输出占位元素，运行期 mountComponent 挂载真实组件。
      if (vnode.tag !== '' && !/^["']/.test(vnode.tag)) {
        return `<lyt-comp data-lyt-comp="${escapeHtmlStatic(vnode.tag)}"></lyt-comp>`;
      }
      const rawTag = vnode.tag.replace(/^"|"$/g, '');
      // `<template>` 的 Fragment 哨兵：signal 模式不支持 Fragment（见上文的说明），
      // 这里按字面量 `template` 元素序列化，并且**跳过组件名校验**
      //（哨兵名带下划线，会被 VALID_COMPONENT_NAME 判为非法）。
      const tag = rawTag === FRAGMENT_SENTINEL ? 'template' : rawTag;
      if (rawTag !== FRAGMENT_SENTINEL) {
        // FIX: P1-S6: 验证动态组件名
        validateComponentName(tag, 'v-for dynamic component');
      }
      let attrs = '';
      // 从 props 中提取静态属性
      if (vnode.props && vnode.props.type === NodeTypes.JS_OBJECT_EXPRESSION) {
        const objExpr = vnode.props as JSObjectExpression;
        for (const prop of objExpr.properties) {
          if (prop.type === NodeTypes.JS_PROPERTY) {
            const jsProp = prop as JSProperty;
            if (
              jsProp.key.type === NodeTypes.SIMPLE_EXPRESSION &&
              jsProp.value.type === NodeTypes.SIMPLE_EXPRESSION
            ) {
              const key = (jsProp.key as SimpleExpressionNode).content.replace(/^"|"$/g, '');
              const value = (jsProp.value as SimpleExpressionNode).content;
              // 只序列化**字面量**属性值；动态绑定（`:id="i"` / `_ctx.x`）留给
              // condition 内的 setAttribute（否则会以属性名当值写死，见 A04 修复）
              if (isStaticPropValue(value)) {
                // FIX: P2-batch1-8 对属性值进行 HTML 转义，防止 XSS
                attrs += ` ${key}="${escapeHtmlStatic(value.replace(/^["']|["']$/g, ''))}"`;
              }
            }
          }
        }
      }
      // 序列化 children
      let childrenHTML = '';
      if (vnode.children) {
        if (typeof vnode.children === 'string') {
          childrenHTML = escapeHtmlStatic(vnode.children);
        } else if (Array.isArray(vnode.children)) {
          childrenHTML = vnode.children.map((c) => serializeBranchHTML(c)).join('');
        } else {
          childrenHTML = serializeBranchHTML(vnode.children as never);
        }
      }
      return `<${tag}${attrs}>${childrenHTML}</${tag}>`;
    }
  }
  if (branch.type === NodeTypes.ELEMENT) {
    return serializeStaticHTML(branch as ElementNode, new Map(), []);
  }
  return '';
}

/** 分支内的动态项（文本 / 属性 / 组件挂载） */
interface BranchDynamicOp {
  /** 目标元素在分支根元素内的**先序索引**（-1 = 分支根元素自身） */
  elementIndex: number;
  kind: 'text' | 'attr' | 'class' | 'style' | 'component';
  /** 文本槽位序号（kind === 'text'） */
  slotIndex?: number;
  key?: string;
  expr?: string;
  propsCode?: string;
}

/**
 * 收集 v-if 分支子树里的动态绑定。
 *
 * 分支 HTML 是**静态**的，动态内容必须在 effect 里按位置更新：
 * - 插值 → `claimTextSlots(el)[slotIndex]`（与 processElement 同一套槽位机制）；
 * - 动态属性 → 目标元素 setAttribute / setClass / setStyle；
 * - 组件分支 → 占位元素上 mountComponent。
 *
 * 元素定位用 `rootEl.querySelectorAll('*')[n]`（先序遍历序号），
 * 需要与序列化顺序严格一致 —— 故递归时按「元素节点」计数。
 */
function collectBranchDynamics(
  branch: JSChildNode | TemplateChildNode | TemplateChildNode[] | string | undefined,
  locals: ReadonlySet<string>,
): BranchDynamicOp[] {
  const ops: BranchDynamicOp[] = [];
  let nextIndex = 0;

  const visit = (raw: unknown, selfIndex: number, inheritedLocals: ReadonlySet<string>): void => {
    if (!raw || typeof raw !== 'object') return;
    const vn = raw as VNodeCall;
    if (vn.type !== NodeTypes.VNODE_CALL || typeof vn.tag !== 'string' || vn.tag === '') return;

    // 组件：整棵子树交给组件自身渲染
    if (!/^["']/.test(vn.tag)) {
      ops.push({
        elementIndex: selfIndex,
        kind: 'component',
        expr: vn.tag,
        propsCode: buildVNodePropsCode(vn, inheritedLocals),
      });
      return;
    }

    // 动态属性
    if (vn.props && vn.props.type === NodeTypes.JS_OBJECT_EXPRESSION) {
      for (const rawProp of (vn.props as JSObjectExpression).properties) {
        if (rawProp.type !== NodeTypes.JS_PROPERTY) continue;
        const jsProp = rawProp as JSProperty;
        if (
          jsProp.key.type !== NodeTypes.SIMPLE_EXPRESSION ||
          jsProp.value.type !== NodeTypes.SIMPLE_EXPRESSION
        ) {
          continue;
        }
        const key = (jsProp.key as SimpleExpressionNode).content.replace(/^["']|["']$/g, '');
        const value = (jsProp.value as SimpleExpressionNode).content;
        if (key === 'key' || /^on[A-Z]/.test(key)) continue;
        if (isStaticPropValue(value)) continue;
        ops.push({
          elementIndex: selfIndex,
          kind: key === 'class' ? 'class' : key === 'style' ? 'style' : 'attr',
          key,
          expr: prefixIdentifiers(value, inheritedLocals),
        });
      }
    }

    // 本元素自身的文本槽位（元素子节点单独递归，不会破坏槽位顺序）
    const kids = vn.children;
    const kidList: unknown[] =
      kids === undefined || kids === null ? [] : Array.isArray(kids) ? kids : [kids];
    let textSlotIndex = 0;
    for (const kid of kidList) {
      const exp = readInterpolationExpr(kid);
      if (exp === null) continue;
      ops.push({
        elementIndex: selfIndex,
        kind: 'text',
        slotIndex: textSlotIndex,
        expr: `(${prefixIdentifiers(exp, inheritedLocals)} ?? '')`,
      });
      textSlotIndex++;
    }

    // 递归元素子节点（先序计数）
    for (const kid of kidList) {
      if (!kid || typeof kid !== 'object') continue;
      const k = kid as { type?: number; tag?: unknown };
      if (k.type === NodeTypes.VNODE_CALL || k.type === NodeTypes.ELEMENT) {
        const childIndex = nextIndex++;
        visit(kid, childIndex, inheritedLocals);
      }
    }
  };

  if (Array.isArray(branch)) {
    for (const item of branch) visit(item, -1, locals);
  } else {
    visit(branch, -1, locals);
  }
  return ops;
}

/** 叶子节点是否是一个插值（TO_DISPLAY_STRING / INTERPOLATION），返回表达式 */
function readInterpolationExpr(node: unknown): string | null {
  if (!node || typeof node !== 'object') return null;
  const n = node as {
    type?: number;
    callee?: unknown;
    arguments?: unknown[];
    content?: unknown;
  };
  if (n.type === NodeTypes.INTERPOLATION) {
    const inner = n.content as { content?: unknown } | undefined;
    return typeof inner?.content === 'string' ? inner.content : null;
  }
  if (n.type === NodeTypes.JS_CALL_EXPRESSION) {
    const callee = typeof n.callee === 'string' ? n.callee : String(n.callee);
    if (callee !== 'TO_DISPLAY_STRING' && callee !== 'toDisplayString') return null;
    const arg = (n.arguments ?? [])[0] as { content?: unknown } | undefined;
    return typeof arg?.content === 'string' ? arg.content : null;
  }
  return null;
}

/** VNODE_CALL.props → 传给 mountComponent 的 props 对象代码 */
function buildVNodePropsCode(vnode: VNodeCall, locals: ReadonlySet<string>): string {
  if (!vnode.props || vnode.props.type !== NodeTypes.JS_OBJECT_EXPRESSION) return 'null';
  const parts: string[] = [];
  for (const rawProp of (vnode.props as JSObjectExpression).properties) {
    if (rawProp.type !== NodeTypes.JS_PROPERTY) continue;
    const jsProp = rawProp as JSProperty;
    if (
      jsProp.key.type !== NodeTypes.SIMPLE_EXPRESSION ||
      jsProp.value.type !== NodeTypes.SIMPLE_EXPRESSION
    ) {
      continue;
    }
    const key = (jsProp.key as SimpleExpressionNode).content;
    const value = (jsProp.value as SimpleExpressionNode).content;
    parts.push(`${key}: ${prefixIdentifiers(value, locals)}`);
  }
  return parts.length ? `{ ${parts.join(', ')} }` : 'null';
}

/**
 * 分支动态代码生成：
 * - create：分支元素刚创建时执行（含 claimTextSlots 认领文本槽位）
 * - update：分支保持激活、依赖变化时重新执行
 * - declarations：槽位变量声明（必须在 effect 外，供 create/update 共用）
 */
function buildBranchDynamics(
  ops: BranchDynamicOp[],
  ifVar: string,
  branchTag: string,
): { declarations: string; create: string; update: string } {
  const declLines: string[] = [];
  const createLines: string[] = [];
  const updateLines: string[] = [];
  const claimed = new Set<number>();
  const pad = '        ';

  const access = (index: number): string =>
    index < 0 ? `${ifVar}El` : `${ifVar}El.querySelectorAll('*')[${index}]`;

  for (const op of ops) {
    if (op.kind === 'text') {
      const index = op.elementIndex;
      const slotsVar = `${branchTag}Text${index < 0 ? 'Root' : index}`;
      if (!claimed.has(index)) {
        claimed.add(index);
        declLines.push(`let ${slotsVar} = null;`);
        if (index < 0) {
          createLines.push(`${slotsVar} = claimTextSlots(${ifVar}El);`);
        } else {
          createLines.push(
            `{ const _e = ${access(index)}; if (_e) ${slotsVar} = claimTextSlots(_e); }`,
          );
        }
      }
      const read = `(${slotsVar} || [])[${op.slotIndex ?? 0}]`;
      createLines.push(`setText(${read}, ${op.expr});`);
      updateLines.push(`setText(${read}, ${op.expr});`);
      continue;
    }

    if (op.kind === 'component') {
      const target = access(op.elementIndex);
      const apply = `mountComponent(${op.expr}, ${op.propsCode ?? 'null'}, ${target});`;
      const stmt = op.elementIndex < 0 ? apply : `{ const _e = ${target}; if (_e) ${apply} }`;
      // 只在创建时 mount：mountComponent 自带 effect，重复调用会重复建实例
      createLines.push(stmt);
      continue;
    }

    const target = access(op.elementIndex);
    const apply =
      op.kind === 'class'
        ? `setClass(${target}, ${op.expr});`
        : op.kind === 'style'
          ? `setStyle(${target}, ${op.expr});`
          : `setAttribute(${target}, ${JSON.stringify(op.key)}, ${op.expr});`;
    const stmt = op.elementIndex < 0 ? apply : `{ const _e = ${target}; if (_e) ${apply} }`;
    createLines.push(stmt);
    updateLines.push(stmt);
  }

  return {
    declarations: declLines.join('\n'),
    create: createLines.map((line) => pad + line + '\n').join(''),
    update: updateLines.map((line) => pad + line + '\n').join(''),
  };
}

/** 列表项的 children 里是否有**嵌套元素**（`<li v-for><span>{{x}}</span></li>`）。 */
function containsElementVNode(node: unknown): boolean {
  if (node === undefined || node === null) return false;
  if (Array.isArray(node)) return node.some((n) => containsElementVNode(n));
  const n = node as { type?: number; tag?: unknown };
  return n.type === NodeTypes.VNODE_CALL && typeof n.tag === 'string' && /^["']/.test(n.tag);
}

/**
 * 生成列表项的 props 代码（字面量 → setAttribute；动态 → create/update 各一次）。
 *
 * `updateExpr` 为 null 表示该元素不参与更新（不会调用 reconcile update）。
 */
function emitListItemProps(
  props: unknown,
  createExpr: string,
  updateExpr: string | null,
  locals: ReadonlySet<string>,
  createLines: string[],
  updateLines: string[],
): void {
  if (!props || (props as { type?: number }).type !== NodeTypes.JS_OBJECT_EXPRESSION) return;
  for (const prop of (props as JSObjectExpression).properties) {
    if (prop.type !== NodeTypes.JS_PROPERTY) continue;
    const jsProp = prop as JSProperty;
    if (
      jsProp.key.type !== NodeTypes.SIMPLE_EXPRESSION ||
      jsProp.value.type !== NodeTypes.SIMPLE_EXPRESSION
    ) {
      continue;
    }
    const key = (jsProp.key as SimpleExpressionNode).content.replace(/^["']|["']$/g, '');
    const value = (jsProp.value as SimpleExpressionNode).content;
    if (key === 'key' || /^on[A-Z]/.test(key)) continue;
    if (isStaticPropValue(value)) {
      createLines.push(
        `${createExpr}.setAttribute(${JSON.stringify(key)}, ${JSON.stringify(
          value.replace(/^["']|["']$/g, ''),
        )});`,
      );
    } else {
      const code = prefixIdentifiers(value, locals);
      createLines.push(`${createExpr}.setAttribute(${JSON.stringify(key)}, ${code});`);
      if (updateExpr)
        updateLines.push(`${updateExpr}.setAttribute(${JSON.stringify(key)}, ${code});`);
    }
  }
}

/**
 * 递归生成列表项子树（元素 / 文本 / 插值）的 create 与 update 代码。
 *
 * 旧实现只认「children 直接是插值或字符串」，`<li v-for><span>{{x}}</span></li>`
 * 的嵌套元素被整段丢弃 ⇒ 每个 li 都是空的。这里按 DOM 结构逐层生成，
 * update 侧用 `childNodes[i]` 定位（创建顺序即索引，稳定）。
 */
function emitListItemNode(
  node: unknown,
  createParent: string,
  updateExpr: string | null,
  locals: ReadonlySet<string>,
  varCounter: Map<string, number>,
  createLines: string[],
  updateLines: string[],
): boolean {
  if (node === undefined || node === null) return false;
  if (Array.isArray(node)) {
    for (const child of node) {
      emitListItemNode(
        child,
        createParent,
        updateExpr,
        locals,
        varCounter,
        createLines,
        updateLines,
      );
    }
    return false;
  }

  // 静态文本 / COMPOUND_EXPRESSION 里的代码片段字符串
  if (typeof node === 'string') {
    if (!node) return false;
    const textVar = genVarName('t', varCounter);
    createLines.push(`const ${textVar} = document.createTextNode(${JSON.stringify(node)});`);
    createLines.push(`${createParent}.appendChild(${textVar});`);
    if (updateExpr) updateLines.push(`${updateExpr}.textContent = ${JSON.stringify(node)};`);
    return true;
  }

  const n = node as {
    type?: number;
    tag?: unknown;
    content?: unknown;
    callee?: unknown;
    arguments?: unknown[];
    children?: unknown;
    props?: unknown;
  };

  // 插值 / toDisplayString 叶子
  let textExpr: string | null = null;
  if (n.type === NodeTypes.INTERPOLATION) {
    const inner = n.content as { content?: unknown } | undefined;
    textExpr = typeof inner?.content === 'string' ? inner.content : null;
  } else if (n.type === NodeTypes.JS_CALL_EXPRESSION) {
    const callee = typeof n.callee === 'string' ? n.callee : String(n.callee);
    if (callee === 'TO_DISPLAY_STRING' || callee === 'toDisplayString') {
      const arg = (n.arguments ?? [])[0] as { content?: unknown } | undefined;
      textExpr = typeof arg?.content === 'string' ? arg.content : null;
    }
  } else if (n.type === NodeTypes.COMPOUND_EXPRESSION && Array.isArray(n.children)) {
    for (const child of n.children) {
      emitListItemNode(
        child,
        createParent,
        updateExpr,
        locals,
        varCounter,
        createLines,
        updateLines,
      );
    }
    return false;
  }
  if (textExpr !== null) {
    const code = `(${prefixIdentifiers(textExpr, locals)} ?? '')`;
    const textVar = genVarName('t', varCounter);
    createLines.push(`const ${textVar} = document.createTextNode(${code});`);
    createLines.push(`${createParent}.appendChild(${textVar});`);
    if (updateExpr) updateLines.push(`${updateExpr}.textContent = ${code};`);
    return true;
  }

  if (n.type !== NodeTypes.VNODE_CALL || typeof n.tag !== 'string') return false;
  const tag = n.tag.replace(/^["']|["']$/g, '');
  const elVar = genVarName(tag, varCounter);
  createLines.push(`const ${elVar} = document.createElement(${JSON.stringify(tag)});`);
  createLines.push(`${createParent}.appendChild(${elVar});`);
  emitListItemProps(n.props, elVar, updateExpr, locals, createLines, updateLines);

  // children：逐个 append，update 用 childNodes[i] 定位
  const rawKids = n.children as unknown;
  const kidList =
    rawKids === undefined || rawKids === null ? [] : Array.isArray(rawKids) ? rawKids : [rawKids];
  let childIdx = 0;
  for (const kid of kidList) {
    const kidUpdate = updateExpr ? `${updateExpr}.childNodes[${childIdx}]` : null;
    const emitted = emitListItemNode(
      kid,
      elVar,
      kidUpdate,
      locals,
      varCounter,
      createLines,
      updateLines,
    );
    if (emitted) childIdx++;
  }
  return true;
}

// ============================================================
// 处理 JSCallExpression（v-for 转换结果）
// ============================================================

function processCallExpression(
  node: JSCallExpression,
  _varCounter: Map<string, number>,
  _elementVars: Array<{ varName: string; tag: string }>,
  dynamicBindings: Array<{ varName: string; code: string }>,
  parentVar?: string,
  locals: ReadonlySet<string> = new Set(),
): void {
  const callee = typeof node.callee === 'string' ? node.callee : String(node.callee);

  // RENDER_LIST 是 v-for 转换后的 callee
  if (callee === 'RENDER_LIST' || callee === 'renderList') {
    // 提取迭代源和渲染函数
    const sourceExpr = node.arguments[0];
    const renderFn = node.arguments[1];

    const source = getTestExpr(sourceExpr as JSChildNode | string | undefined);
    if (!source) return;

    // 从箭头函数（COMPOUND_EXPRESSION）中提取 item 变量名与渲染项 VNodeCall
    let itemVar = 'item';
    let itemParams: string[] = ['item'];
    let itemLocals: ReadonlySet<string> = new Set(['item']);
    let renderItem: VNodeCall | null = null;
    if (renderFn && typeof renderFn !== 'string' && !Array.isArray(renderFn)) {
      if (renderFn.type === NodeTypes.COMPOUND_EXPRESSION) {
        const compound = renderFn as CompoundExpressionNode;
        for (const child of compound.children) {
          if (typeof child === 'string' && child.includes('=>')) {
            // 解析箭头头，拿**全部**形参（索引形参此前被整段忽略）
            const headMatch = /^\s*\(?\s*([^)]*?)\s*\)?\s*=>/.exec(child);
            const parsed = (headMatch?.[1] ?? '')
              .split(',')
              .map((x) => x.trim())
              .filter(Boolean);
            if (parsed.length > 0) {
              itemVar = parsed[0]!;
              itemParams = parsed;
            }
          } else if (typeof child !== 'string' && child.type === NodeTypes.VNODE_CALL) {
            renderItem = child as VNodeCall;
          }
        }
      }
    }
    itemLocals = new Set(itemParams);

    // 由渲染项 VNodeCall 生成通用 create / update 逻辑：
    // 使用 document.createElement + textContent/属性绑定，替代此前硬编码的 benchmark 表格模板
    let createBody = '';
    let updateBody = '';
    // 列表项是**组件**（`tag` 为裸标识符如 `Row`；元素的 `tag` 是带引号字符串 `"li"`）
    // => 不能按元素处理；改为造容器 + `mountComponent`（与优化版同构）。
    // 注意：`create` 回调**必须 return 容器节点**，否则 reconcileArray 里
    // `reconcileKeyMap.set(node, …)` 会收到 undefined。
    const itemIsComponent =
      !!renderItem &&
      typeof renderItem.tag === 'string' &&
      renderItem.tag !== '' &&
      !/^["']/.test(renderItem.tag);
    if (itemIsComponent && renderItem) {
      const rawTag = String(renderItem.tag);
      const hostVar = '_' + rawTag;
      const itemProps = buildItemComponentProps(renderItem, itemLocals);
      // 列表项的子节点（VNODE_CALL）→ 默认插槽内容。
      // 列表项 children 是 VNODE_CALL（type 9）且为「单对象」而非数组，先归一化为数组；
      // 复用既有 serializeVNodeCall（严格模式递归处理 VNODE_CALL → TO_DISPLAY_STRING 叶子）。
      const rawKids = renderItem.children as unknown;
      const kidList =
        rawKids === undefined || rawKids === null
          ? []
          : Array.isArray(rawKids)
            ? rawKids
            : [rawKids];
      const kidVNodes: string[] = [];
      for (const kid of kidList) {
        const code = serializeVNodeCall(kid, '_ctx.', itemLocals);
        if (code) kidVNodes.push(code);
      }
      const slotsArg = kidVNodes.length ? ',{default:()=>[' + kidVNodes.join(',') + ']}' : '';
      createBody =
        'const ' +
        hostVar +
        " = document.createElement('div');" +
        'mountComponent(' +
        componentRef(rawTag) +
        ',' +
        itemProps +
        ',' +
        hostVar +
        slotsArg +
        ');' +
        'return ' +
        hostVar +
        ';';
      updateBody =
        'mountComponent(' + componentRef(rawTag) + ',' + itemProps + ',_el' + slotsArg + ');';
    } else if (renderItem && typeof renderItem.tag === 'string') {
      const tag = renderItem.tag.replace(/^"|"$/g, '');
      const elVar = genVarName(tag, _varCounter);
      const children = renderItem.children;

      if (containsElementVNode(children)) {
        // 列表项含嵌套元素：逐层生成 create/update（旧实现只认直接子文本 ⇒ 子元素整段丢失）
        const createLines = [`const ${elVar} = document.createElement(${JSON.stringify(tag)});`];
        const updateLines: string[] = [];
        emitListItemProps(renderItem.props, elVar, '_el', itemLocals, createLines, updateLines);
        emitListItemNode(children, elVar, '_el', itemLocals, _varCounter, createLines, updateLines);
        createBody = `${createLines.join('\n')}\nreturn ${elVar};`;
        updateBody = updateLines.join('\n');
      } else {
        createBody = `const ${elVar} = document.createElement('${tag}');`;

        // 插值 {{ item.xxx }} 在 transform 后为 TO_DISPLAY_STRING 调用，
        // 通过 extractChildrenText 提取表达式；静态文本则原样写入
        const dynamicText = extractItemChildrenText(renderItem.children, itemLocals);
        if (dynamicText) {
          // 循环变量保持裸名（locals），其余标识符前缀化为 `_ctx.`
          const textCode = prefixIdentifiers(dynamicText, itemLocals);
          createBody += `${elVar}.textContent = ${textCode};`;
          // update 回调的参数是已存在元素 _el（由 reconcileArray 传入），
          // 不能引用 create 内的局部变量名
          updateBody = `_el.textContent = ${textCode};`;
        } else if (typeof children === 'string') {
          const escaped = children.replace(/'/g, "\\'").replace(/\\/g, '\\\\');
          createBody += `${elVar}.textContent = '${escaped}';`;
        }

        // 处理静态 props（如 class="foo"）与非静态绑定
        if (renderItem.props && renderItem.props.type === NodeTypes.JS_OBJECT_EXPRESSION) {
          const objExpr = renderItem.props as JSObjectExpression;
          for (const prop of objExpr.properties) {
            if (prop.type !== NodeTypes.JS_PROPERTY) continue;
            const jsProp = prop as JSProperty;
            if (
              !jsProp.key ||
              typeof jsProp.key === 'string' ||
              Array.isArray(jsProp.key) ||
              jsProp.key.type !== NodeTypes.SIMPLE_EXPRESSION ||
              !jsProp.value ||
              typeof jsProp.value === 'string' ||
              Array.isArray(jsProp.value) ||
              jsProp.value.type !== NodeTypes.SIMPLE_EXPRESSION
            ) {
              continue;
            }
            const key = (jsProp.key as SimpleExpressionNode).content.replace(/^"|"$/g, '');
            const value = (jsProp.value as SimpleExpressionNode).content;
            if (key === 'key') continue; // :key 不写为 DOM 属性
            // ⚠️ 旧判据「值里没有 `_ctx` / 没有 `(` 就算静态」会把 `:data-k="x"`
            //   写成字面量 `data-k="x"`（for08 实测）。静态只认**字面量**，
            //   其余一律按表达式处理并加前缀（循环变量在 locals 里保持裸名）。
            if (!isStaticPropValue(value)) {
              const valueCode = prefixIdentifiers(value, itemLocals);
              // 动态绑定：create 用新元素，update 用 reconcileArray 传入的已存在元素
              createBody += `${elVar}.setAttribute('${key}', ${valueCode});`;
              updateBody += `_el.setAttribute('${key}', ${valueCode});`;
            } else {
              // 静态属性
              createBody += `${elVar}.setAttribute('${key}', '${value.replace(/^"|"$/g, '')}');`;
            }
          }
        }

        createBody += `return ${elVar};`;
      }
    }

    // 提取 :key 绑定，缺省回退到 item.id（与优化版行为一致）
    let userKeyExpr: string | null = null;
    if (
      renderItem &&
      renderItem.props &&
      renderItem.props.type === NodeTypes.JS_OBJECT_EXPRESSION
    ) {
      const objExpr = renderItem.props as JSObjectExpression;
      for (const prop of objExpr.properties) {
        if (prop.type !== NodeTypes.JS_PROPERTY) continue;
        const jsProp = prop as JSProperty;
        if (
          jsProp.key &&
          typeof jsProp.key !== 'string' &&
          !Array.isArray(jsProp.key) &&
          jsProp.key.type === NodeTypes.SIMPLE_EXPRESSION &&
          jsProp.key.content.replace(/^["']|["']$/g, '') === 'key' &&
          jsProp.value &&
          typeof jsProp.value !== 'string' &&
          !Array.isArray(jsProp.value) &&
          jsProp.value.type === NodeTypes.SIMPLE_EXPRESSION
        ) {
          userKeyExpr = jsProp.value.content;
          break;
        }
      }
    }

    if (!userKeyExpr) {
      if (__DEV__) {
        console.warn(
          `[lytjs/compiler] v-for is missing a "key" attribute. ` +
            `This may cause performance issues and incorrect DOM updates. ` +
            `Add a unique :key binding to the v-for element, e.g., :key="item.id" or :key="index". ` +
            `See: https://lytjs.dev/guide/template-syntax.html#v-for-key`,
        );
      }
    }

    const keyExpr = userKeyExpr ?? `${itemVar}.id`;
    // 容器变量：render 的第二个形参叫 _container（见本文件 :164 生成的
    // `export function render(_ctx, _container)`）。此处曾写死 '_ul'，
    // 是为 ul/li 列表 demo 特判，换任何根容器都会产出 ReferenceError。
    const containerVar = parentVar ?? '_container';

    dynamicBindings.push({
      varName: containerVar,
      code: `effect(() => {\n    reconcileArray(${containerVar}, ${prefixIdentifiers(source, locals)}, {\n      key: (${itemParams.join(', ')}) => ${keyExpr},\n      create: (${itemParams.join(', ')}) => {\n        ${createBody}\n      }${updateBody ? `,\n      update: (_el, ${itemParams.join(', ')}) => {\n        ${updateBody}\n      }` : ''}\n    });\n  });`,
    });
  }
}

// ============================================================
// Helper: 获取 test 表达式
// ============================================================

function getTestExpr(test: JSChildNode | string | undefined): string {
  if (!test) return '';
  if (typeof test === 'string') return test;
  if (test.type === NodeTypes.SIMPLE_EXPRESSION) return test.content;
  if (test.type === NodeTypes.COMPOUND_EXPRESSION) {
    return getExpContent(test as CompoundExpressionNode);
  }
  return '';
}

// ============================================================
// Helper: 从条件分支中提取元素信息
// ============================================================

function extractElementFromBranch(
  branch: JSChildNode | TemplateChildNode | TemplateChildNode[] | string | undefined,
): { tag: string } | null {
  if (!branch) return null;
  if (typeof branch === 'string') return null;
  if (Array.isArray(branch)) {
    for (const item of branch) {
      const result = extractElementFromBranch(item);
      if (result) return result;
    }
    return null;
  }
  if (branch.type === NodeTypes.VNODE_CALL) {
    const vnode = branch as VNodeCall;
    if (typeof vnode.tag === 'string') {
      // 组件分支的 tag 是标识符/表达式（不带引号）：它不是 HTML 标签，
      // 既不能进 elementVars（会生成非法变量名），也不需要静态兄弟锚点
      if (vnode.tag === '' || !/^["']/.test(vnode.tag)) return null;
      return { tag: vnode.tag.replace(/^"|"$/g, '') };
    }
  }
  if (branch.type === NodeTypes.ELEMENT) {
    return { tag: (branch as ElementNode).tag };
  }
  return null;
}

// ============================================================
// Helper: 从条件分支中提取插值文本
// ============================================================

/**
 * 从列表项的 children 提取文本表达式（支持**复合内容** `{{ a }}:{{ b }}`）。
 *
 * ⚠️ 2026-09-30 修复：列表项内容此前只认「children 直接是 TO_DISPLAY_STRING」的形态，
 * 而 `{{ k }}:{{ i }}` 在 transform 后是 COMPOUND_EXPRESSION，其孩子是
 * **INTERPOLATION** 节点（本仓 NodeTypes.INTERPOLATION = 4）与**代码片段字符串**
 * （如 `" + "`）⇒ 整段内容丢失。
 */
function extractItemChildrenText(children: unknown, locals: ReadonlySet<string>): string | null {
  if (children === undefined || children === null) return null;
  if (typeof children === 'string') return null;

  if (Array.isArray(children)) {
    const parts: string[] = [];
    for (const kid of children) {
      const r = extractItemChildrenText(kid, locals);
      if (r === null) return null;
      parts.push(r);
    }
    return parts.length ? parts.join('') : null;
  }

  const node = children as {
    type?: number;
    content?: unknown;
    callee?: unknown;
    arguments?: unknown[];
    children?: unknown[];
  };

  if (node.type === NodeTypes.COMPOUND_EXPRESSION) {
    // 孩子里**字符串就是代码片段**（如 `" + "` / `"':' "`），原样拼接
    if (!Array.isArray(node.children)) return null;
    const parts: string[] = [];
    for (const kid of node.children) {
      if (typeof kid === 'string') {
        parts.push(kid);
        continue;
      }
      const r = extractItemChildrenText(kid, locals);
      if (r === null) return null;
      parts.push(r);
    }
    return parts.length ? parts.join('') : null;
  }

  if (node.type === NodeTypes.INTERPOLATION) {
    const inner = node.content as { content?: unknown } | undefined;
    return typeof inner?.content === 'string' ? inner.content : null;
  }

  if (node.type === NodeTypes.SIMPLE_EXPRESSION) {
    const raw = node.content;
    if (typeof raw === 'string') return raw;
    const nested = (raw as { content?: unknown } | undefined)?.content;
    return typeof nested === 'string' ? nested : null;
  }

  if (node.type === NodeTypes.JS_CALL_EXPRESSION) {
    const callee = typeof node.callee === 'string' ? node.callee : String(node.callee);
    if (callee === 'TO_DISPLAY_STRING' || callee === 'toDisplayString') {
      return extractItemChildrenText((node.arguments ?? [])[0], locals);
    }
    return null;
  }

  return null;
}

/** 列表项的 children 里是否有**嵌套元素**（`<li v-for><span>{{x}}</span></li>`）。 */

/**
 * `JS_CALL_EXPRESSION` 的 RENDER_LIST 调用（v-for 在 Signal 模式的 transform 产物）
 * → `...((source).map((item,i)=>vnode))`
 *
 * 结构（实测）：
 *   callee = 'RENDER_LIST'
 *   arguments = [ SIMPLE_EXPRESSION(source),
 *                 COMPOUND_EXPRESSION([ "(item, i) => { ", VNODE_CALL, " }" ]) ]
 *
 * **关键**：循环变量必须作为 `locals` 传给 `prefixIdentifiers`，否则 `item.id`
 * 会被误加前缀变成 `_ctx.item.id`。同样采用严格模式（失败即整体返回 null）。
 */
export function serializeListVNode(
  node: unknown,
  prefix: string,
  locals: ReadonlySet<string> = new Set(),
): string | null {
  const call = node as { type?: number; callee?: unknown; arguments?: unknown[] };
  if (!call || call.type !== NodeTypes.JS_CALL_EXPRESSION) return null;
  if (call.callee !== 'RENDER_LIST') return null;

  const args = call.arguments;
  if (!Array.isArray(args) || args.length < 2) return null;

  const srcNode = args[0] as SimpleExpressionNode | undefined;
  const src = srcNode && typeof srcNode.content === 'string' ? srcNode.content : null;
  if (!src) return null;

  const fn = args[1] as { type?: number; children?: unknown[] };
  if (!fn || fn.type !== NodeTypes.COMPOUND_EXPRESSION || !Array.isArray(fn.children)) return null;

  // 箭头函数头（含参数名），例如 "(item, i) => { "
  const head = fn.children.find((c): c is string => typeof c === 'string' && c.includes('=>'));
  if (!head) return null;
  const paramMatch = /^\s*\(?\s*([^)]*?)\s*\)?\s*=>/.exec(head);
  if (!paramMatch) return null;
  const params = (paramMatch[1] ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  if (params.length === 0) return null;

  const vnodeNode = fn.children.find(
    (c) => !!c && typeof c === 'object' && (c as { type?: number }).type === NodeTypes.VNODE_CALL,
  );
  if (!vnodeNode) return null;

  const innerLocals = new Set(locals);
  for (const param of params) innerLocals.add(param);

  const inner = serializeVNodeCall(vnodeNode, prefix, innerLocals);
  if (!inner) return null;

  const srcExpr = prefixIdentifiers(src, locals);
  return `...(${srcExpr}.map((${params.join(',')})=>${inner}))`;
}

/**
 * `JS_CONDITIONAL_EXPRESSION`（v-if 在 Signal 模式的 transform 产物）→ `(cond ? vnode : null)`
 *
 * 返回 null 表示无法完整还原（此时调用方跳过，不下发半成品）。
 * v-else / v-else-if 分支暂不支持 —— 有 alternate 时同样返回 null。
 */
export function serializeConditionalVNode(
  node: unknown,
  prefix: string,
  locals: ReadonlySet<string> = new Set(),
): string | null {
  const cond = node as { test?: unknown; consequent?: unknown; alternate?: unknown };
  if (!cond || !cond.test) return null;

  const testExp = getExpContent(cond.test as SimpleExpressionNode);
  if (!testExp) return null;

  const inner = serializeVNodeCall(cond.consequent, prefix, locals);
  if (!inner) return null;

  // alternate 有两种形态：`v-else` 是 VNODE_CALL、`v-else-if` 是嵌套的
  // JS_CONDITIONAL_EXPRESSION（递归处理）。
  let alternate = 'null';
  if (cond.alternate) {
    const altType = (cond.alternate as { type?: number }).type;
    if (altType === NodeTypes.VNODE_CALL) {
      const alt = serializeVNodeCall(cond.alternate, prefix, locals);
      if (!alt) return null;
      alternate = alt;
    } else if (altType === NodeTypes.JS_CONDITIONAL_EXPRESSION) {
      const alt = serializeConditionalVNode(cond.alternate, prefix, locals);
      if (!alt) return null;
      alternate = alt;
    } else {
      return null;
    }
  }

  return `(${prefixIdentifiers(testExp, locals)}?${inner}:${alternate})`;
}

/**
 * `VNODE_CALL` → `createVNode(tag, props, children)`
 *
 * **严格模式**：任何一段无法识别都让整体返回 null（调用方跳过），
 * 避免"只渲染一半"这种比不渲染更危险的结果。
 */
export function serializeVNodeCall(
  vnode: unknown,
  prefix: string,
  locals: ReadonlySet<string> = new Set(),
): string | null {
  const vn = vnode as {
    type?: number;
    tag?: unknown;
    props?: unknown;
    children?: unknown;
  };
  if (!vn || vn.type !== NodeTypes.VNODE_CALL) return null;
  if (typeof vn.tag !== 'string' || !vn.tag) return null;

  // props：JS_OBJECT_EXPRESSION（key 已是合法代码串，value 需前缀化）
  let propsCode = 'null';
  if (vn.props !== undefined && vn.props !== null) {
    const obj = vn.props as { type?: number; properties?: unknown[] };
    if (obj.type !== NodeTypes.JS_OBJECT_EXPRESSION || !Array.isArray(obj.properties)) return null;
    const parts: string[] = [];
    for (const raw of obj.properties) {
      const prop = raw as {
        type?: number;
        key?: { content?: unknown };
        value?: { content?: unknown };
      };
      if (!prop || prop.type !== NodeTypes.JS_PROPERTY) return null;
      const keyCode = prop.key && typeof prop.key.content === 'string' ? prop.key.content : null;
      const valCode =
        prop.value && typeof prop.value.content === 'string' ? prop.value.content : null;
      if (keyCode === null || valCode === null) return null;
      parts.push(`${keyCode}:${prefixIdentifiers(valCode, locals)}`);
    }
    propsCode = `{${parts.join(',')}}`;
  }

  const childrenCode = serializeVNodeCallChildren(vn.children, prefix, locals);
  if (childrenCode === null) return null;

  // 组件 tag 是**裸名**（如 `Inner`）必须前缀化；HTML 标签已是 JSON 字符串（如 `"div"`）
  //
  // ⚠️ 2026-10-28：`<template>` 在 **VNode 模式**下编译成 `Fragment`（见 transform-element
  //   的 isTemplateTag），但那用的是 vnode 侧的哨兵常量；**signal 模式的渲染器完全没有
  //   Fragment 概念**（`createSignalRenderer` 走 dom-runtime 的模板槽位），
  //   把哨兵原样透出去会让组件名校验抛错（实测：`Invalid component name in v-for
  //   dynamic component: "__LYTJS_FRAGMENT__"`）。
  //   因此这里退回旧行为（字面量 `template` 元素），并记在报告里：
  //   **signal 模式暂不支持 Fragment**，`<template v-if>` 在该模式下内容不可见。
  const rawTag = vn.tag === FRAGMENT_SENTINEL ? JSON.stringify('template') : vn.tag;
  const tagCode = (vn as { isComponent?: boolean }).isComponent ? `${prefix}${vn.tag}` : rawTag;

  return `createVNode(${tagCode},${propsCode},${childrenCode})`;
}

/** `VNODE_CALL.children` → 数组代码；无法完整识别返回 null */
export function serializeVNodeCallChildren(
  children: unknown,
  prefix: string,
  locals: ReadonlySet<string> = new Set(),
): string | null {
  if (children === undefined || children === null) return 'null';

  if (typeof children === 'string') {
    if (!children.trim()) return 'null';
    return `[createVNode(Text,null,${JSON.stringify(children)})]`;
  }

  if (Array.isArray(children)) {
    const parts: string[] = [];
    for (const ch of children) {
      const code = serializeVNodeCallChild(ch, prefix, locals);
      if (code === null) return null;
      parts.push(code);
    }
    return parts.length ? `[${parts.join(',')}]` : 'null';
  }

  const one = serializeVNodeCallChild(children, prefix, locals);
  return one === null ? null : `[${one}]`;
}

/** 单个 child → vnode 代码；无法识别返回 null */
export function serializeVNodeCallChild(
  child: unknown,
  prefix: string,
  locals: ReadonlySet<string> = new Set(),
): string | null {
  if (!child || typeof child !== 'object') return null;
  const node = child as { type?: number };

  // 插值：JS_CALL_EXPRESSION(TO_DISPLAY_STRING, expr)
  if (node.type === NodeTypes.JS_CALL_EXPRESSION) {
    const call = child as { callee?: unknown; arguments?: unknown[] };
    if (call.callee !== 'TO_DISPLAY_STRING') return null;
    const arg = (call.arguments && call.arguments[0]) as SimpleExpressionNode | undefined;
    const exp = arg && typeof arg.content === 'string' ? arg.content : null;
    if (!exp) return null;
    return `createVNode(Text,null,${prefixIdentifiers(exp, locals)})`;
  }

  // 嵌套元素
  if (node.type === NodeTypes.ELEMENT) {
    return serializeVNodeElement(child as ElementNode, prefix, locals);
  }

  // 嵌套 vnode（transform 已把子元素转成 VNODE_CALL，与 v-if 的 consequent 同类）
  if (node.type === NodeTypes.VNODE_CALL) {
    return serializeVNodeCall(child, prefix, locals);
  }

  return null;
}

/**
 * 判断子树中是否存在「带子内容的组件」（这类组件需要把子内容编译为插槽 vnode）
 */
function hasComponentWithChildren(children: TemplateChildNode[]): boolean {
  for (const child of children) {
    if (!child || child.type !== NodeTypes.ELEMENT) continue;
    const element = child as ElementNode;
    if (element.tagType === ElementTypes.COMPONENT && element.children.length > 0) return true;
    if (hasComponentWithChildren(element.children)) return true;
  }
  return false;
}

/**
 * 把组件的子内容编译为「插槽对象」字面量：`{default:()=>[vnode,...]}`
 *
 * 返回 null 表示没有可编译的子内容（此时不传第 4 个参数）。
 * 首版只覆盖**静态内容**（文本 / 元素 / 嵌套组件）；插值与指令仍不参与插槽编译。
 */
function buildComponentSlotsObject(
  node: ElementNode,
  prefix: string,
  locals: ReadonlySet<string> = new Set(),
): string | null {
  // 组件自身若带 `v-slot="p"`（无 arg），表示**默认插槽**的作用域参数
  const ownSlot = findSlotDirective(node);
  const ownParam = ownSlot && ownSlot.name === null ? ownSlot.param : null;

  const namedSlots: string[] = [];
  const defaultParts: string[] = [];

  for (const child of node.children) {
    if (!child) continue;

    // 具名插槽：`<template #name="scope">…</template>` → `"name":(scope)=>[…]`
    const info = child.type === NodeTypes.ELEMENT ? findSlotDirective(child as ElementNode) : null;
    if (info && info.name) {
      const scope = info.param;
      const parts = collectSlotVNodes(
        (child as ElementNode).children,
        prefix,
        withScope(locals, scope),
      );
      if (parts.length) {
        namedSlots.push(`${JSON.stringify(info.name)}:(${scope ?? ''})=>[${parts.join(',')}]`);
      }
      continue;
    }

    // 其余节点归入默认插槽（使用组件自身的作用域参数）
    defaultParts.push(...collectSlotVNodes([child], prefix, withScope(locals, ownParam)));
  }

  const all = [...namedSlots];
  if (defaultParts.length) {
    all.push(`default:(${ownParam ?? ''})=>[${defaultParts.join(',')}]`);
  }
  if (all.length === 0) return null;
  return `{${all.join(',')}}`;
}

/** 插槽指令信息 */
interface SlotDirectiveInfo {
  /** 插槽名；null 表示未显式指定（组件上的 `v-slot` 无 arg ⇒ 默认插槽） */
  name: string | null;
  /** 作用域参数表达式（`p` / `{ x, y }`）；null 表示无 */
  param: string | null;
}

/** 从元素 props 里取出 `v-slot` 指令信息（没有则返回 null） */
function findSlotDirective(el: ElementNode): SlotDirectiveInfo | null {
  for (const prop of el.props) {
    if (!prop || prop.type !== NodeTypes.DIRECTIVE) continue;
    const dir = prop as DirectiveNode;
    if (dir.name !== 'slot') continue;
    const rawName = dir.arg ? getExpContent(dir.arg as SimpleExpressionNode) : null;
    const rawParam = dir.exp ? getExpContent(dir.exp as SimpleExpressionNode) : null;
    return {
      name: rawName && /^[A-Za-z_$][\w$-]*$/.test(rawName) ? rawName : null,
      param: rawParam && rawParam.trim() ? rawParam.trim() : null,
    };
  }
  return null;
}

/** 从作用域参数表达式里提取标识符（`p` → [p]；`{ x, y }` → [x, y]） */
function extractScopeNames(param: string | null): string[] {
  if (!param) return [];
  return param.split(/[^A-Za-z0-9_$]+/).filter((x) => x && /^[A-Za-z_$][\w$]*$/.test(x));
}

/** 把作用域变量并入 locals，供 `prefixIdentifiers` 排除前缀化 */
function withScope(locals: ReadonlySet<string>, param: string | null): Set<string> {
  const out = new Set(locals);
  for (const name of extractScopeNames(param)) out.add(name);
  return out;
}

/** 递归收集子节点对应的 vnode 构造代码（跳过注释与动态内容） */
function collectSlotVNodes(
  children: TemplateChildNode[],
  prefix: string,
  locals: ReadonlySet<string> = new Set(),
): string[] {
  const out: string[] = [];
  for (const child of children) {
    if (!child) continue;
    if (child.type === NodeTypes.TEXT) {
      const text = (child as TextNode).content;
      if (text.trim()) out.push(`createVNode(Text,null,${JSON.stringify(text)})`);
      continue;
    }
    // 插值 → 动态文本 vnode：依赖由 mountComponent 的 effect 追踪，变化即整体重渲染
    if (child.type === NodeTypes.INTERPOLATION) {
      const exp = getExpContent((child as InterpolationNode).content as SimpleExpressionNode);
      if (exp) out.push(`createVNode(Text,null,${prefixIdentifiers(exp, locals)})`);
      continue;
    }
    // v-if 的产物是条件表达式（元素已被 transform 替换掉，不再是 ELEMENT）
    if (child.type === NodeTypes.JS_CONDITIONAL_EXPRESSION) {
      const cond = serializeConditionalVNode(child, prefix, locals);
      if (cond) out.push(cond);
      continue;
    }
    // v-for 的产物是 RENDER_LIST 调用
    if (child.type === NodeTypes.JS_CALL_EXPRESSION) {
      const list = serializeListVNode(child, prefix, locals);
      if (list) out.push(list);
      continue;
    }
    if (child.type === NodeTypes.ELEMENT) {
      const el = child as ElementNode;
      // 含 v-show 等暂不支持指令的元素不参与插槽编译 —— 宁可缺失，也不静默错渲
      if (hasUnsupportedSlotDirective(el)) continue;
      const elCode = serializeVNodeElement(el, prefix, locals);
      if (elCode) out.push(elCode);
    }
  }
  return out;
}

/**
 * 元素是否带有插槽编译尚不支持的结构性指令
 *
 * 目前插槽只支持 `v-bind` 与 `v-on`；`v-if`/`v-for`/`v-show` 等若被静默忽略，
 * 会导致「本不该渲染的内容被渲染」，因此这里主动判定并让调用方跳过整个元素。
 */
function hasUnsupportedSlotDirective(node: ElementNode): boolean {
  for (const prop of node.props) {
    if (!prop || prop.type !== NodeTypes.DIRECTIVE) continue;
    const name = (prop as DirectiveNode).name;
    if (name !== 'bind' && name !== 'on' && name !== 'show') return true;
  }
  return false;
}

/** 单个元素 → `createVNode(tag, attrs, children)` */
function serializeVNodeElement(
  node: ElementNode,
  prefix: string,
  locals: ReadonlySet<string> = new Set(),
): string {
  if (node.tagType === ElementTypes.COMPONENT) {
    // 嵌套组件同样要带自己的插槽
    const nestedSlots = buildComponentSlotsObject(node, prefix, locals);
    const nestedArg = nestedSlots ? `,${nestedSlots}` : '';
    return `createVNode(${prefix}${node.tag},${buildComponentPropsObject(node)}${nestedArg})`;
  }

  // v-show → `style.display` 绑定。若元素另有 style/:style，则放弃该元素
  //（两个 style 键会互相覆盖，宁可缺失也不静默错渲）
  const showDirs = node.props.filter(
    (pr) => pr.type === NodeTypes.DIRECTIVE && (pr as DirectiveNode).name === 'show',
  );
  if (showDirs.length > 1) return '';
  const showExp = showDirs.length
    ? getExpContent((showDirs[0] as DirectiveNode).exp as SimpleExpressionNode)
    : '';
  if (showDirs.length && !showExp) return '';

  // 元素属性复用一个 props 构造：静态属性 + `:bind` + `@事件`（vnode 不需要 HTML 转义）
  let attrs = node.props.length ? buildComponentPropsObject(node) : 'null';
  if (showExp) {
    const styleProp = `style:{"display":(${prefixIdentifiers(showExp, locals)}?'':'none')}`;
    attrs = attrs === 'null' || attrs === '{}' ? `{${styleProp}}` : `{...${attrs},${styleProp}}`;
  }
  const kids = collectSlotVNodes(node.children, prefix, locals);
  const childrenArg = kids.length ? `[${kids.join(',')}]` : 'null';
  return `createVNode(${JSON.stringify(node.tag)},${attrs},${childrenArg})`;
}

/**
 * 把模板里的事件名转成组件的 prop 键名
 *
 * `click` → `onClick`；`my-event` → `onMyEvent`（kebab 先 camelize）。
 * 与 `@lytjs/component` 的 `toHandlerKey()` 保持同一约定，否则组件 `emit()` 回查
 * `props.onXxx` 时会因键名不一致而找不到处理器。
 */
function toComponentEventKey(event: string): string {
  const camelized = event.replace(/-(\w)/g, (_m, c: string) => c.toUpperCase());
  return `on${camelized.charAt(0).toUpperCase()}${camelized.slice(1)}`;
}

/**
 * 判断子树中是否包含组件元素
 */
/**
 * 预扫：transformed AST 里是否存在**组件 vnode**。
 *
 * 为什么要单独写：此阶段 `v-for` 已被 transform 成 `RENDER_LIST` 的
 * `JS_CALL_EXPRESSION`（`children` 里不再有元素节点）⇒ 只走 `children` 的
 * `containsComponent` 找不到列表项里的组件；必须**连 `arguments` 一起走**。
 * 判据与列表分支一致：`VNODE_CALL` 的 `tag` 是**裸标识符**（元素是带引号字符串）。
 */
function containsComponentVNode(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false;
  if (Array.isArray(node)) return node.some(containsComponentVNode);
  const n = node as {
    type?: number;
    tag?: string;
    children?: unknown;
    arguments?: unknown;
    consequent?: unknown;
    alternate?: unknown;
  };
  if (
    n.type === NodeTypes.VNODE_CALL &&
    typeof n.tag === 'string' &&
    n.tag !== '' &&
    !/^["']/.test(n.tag)
  ) {
    return true;
  }
  return (
    containsComponentVNode(n.children) ||
    containsComponentVNode(n.arguments) ||
    // `v-if` 分支里的组件（如 `<my-comp v-if="ok"/>`）只出现在 consequent/alternate 上
    containsComponentVNode(n.consequent) ||
    containsComponentVNode(n.alternate)
  );
}

/**
 * 判定子树中是否存在「带子内容的列表项组件」—— 即出现在 RENDER_LIST / 条件表达式里的
 * 裸标识符 VNODE_CALL（组件）且带有 children（插槽内容）。
 * 这类构造需要引入 `createVNode` / `Text` 才能把子内容编译成插槽 vnode
 * （普通「直接 ELEMENT 子组件」由 hasComponentWithChildren 覆盖，而 v-for 项组件
 * 是 VNODE_CALL 形态，必须单独预扫）。
 */
function hasListComponentVNodeWithChildren(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false;
  if (Array.isArray(node)) return node.some(hasListComponentVNodeWithChildren);
  const n = node as { type?: number; tag?: string; children?: unknown; arguments?: unknown };
  if (
    n.type === NodeTypes.VNODE_CALL &&
    typeof n.tag === 'string' &&
    n.tag !== '' &&
    !/^["']/.test(n.tag)
  ) {
    const c = n.children;
    if (c !== undefined && c !== null && !(Array.isArray(c) && c.length === 0)) return true;
  }
  return (
    hasListComponentVNodeWithChildren(n.children) || hasListComponentVNodeWithChildren(n.arguments)
  );
}

function containsComponent(children: TemplateChildNode[]): boolean {
  for (const child of children) {
    if (!child || child.type !== NodeTypes.ELEMENT) continue;
    const element = child as ElementNode;
    if (element.tagType === ElementTypes.COMPONENT) return true;
    if (containsComponent(element.children)) return true;
  }
  return false;
}

/**
 * 构造传给组件的 props 对象字面量（`_ctx.` 前缀，与本 codegen 的前缀约定一致）
 */
function buildComponentPropsObject(node: ElementNode): string {
  const parts: string[] = [];

  for (const prop of node.props) {
    if (!prop) continue;
    if (prop.type === NodeTypes.ATTRIBUTE) {
      const value = prop.value ? JSON.stringify(prop.value.content) : 'true';
      parts.push(`${JSON.stringify(prop.name)}:${value}`);
      continue;
    }
    if (prop.type === NodeTypes.DIRECTIVE) {
      const dir = prop as DirectiveNode;
      if (!dir.arg || !dir.exp) continue;
      const key = getExpContent(dir.arg as SimpleExpressionNode);
      const raw = getExpContent(dir.exp as SimpleExpressionNode);
      if (!key || !raw) continue;

      if (dir.name === 'bind') {
        parts.push(`${JSON.stringify(key)}:${prefixIdentifiers(raw, new Set())}`);
        continue;
      }

      // 组件事件：@click="fn" → `onClick: _ctx.fn`
      // 与 @lytjs/component 的 emit()/toHandlerKey() 约定对齐 —— 事件以 `onXxx`
      // 形式作为 prop 传入，组件内部 emit('click') 时会回查 props/attrs.onClick。
      if (dir.name === 'on') {
        parts.push(
          `${JSON.stringify(toComponentEventKey(key))}:${prefixIdentifiers(raw, new Set())}`,
        );
      }
    }
  }

  return `{${parts.join(',')}}`;
}
