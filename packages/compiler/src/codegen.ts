// src/codegen.ts
// 代码生成器 - 从 AST 生成 render 函数代码

import { NodeTypes } from './constants';
import { describePatchFlag } from '@lytjs/common-vnode';
import type {
  RootNode,
  JSChildNode,
  VNodeCall,
  JSCallExpression,
  JSObjectExpression,
  JSProperty,
  JSArrayExpression,
  JSFunctionExpression,
  JSConditionalExpression,
  TextNode,
  InterpolationNode,
  SimpleExpressionNode,
  CompoundExpressionNode,
  TemplateChildNode,
  ElementNode,
  CodegenResult,
  CodegenContext,
  CodegenOptions,
  BaseNode,
} from './types';
import { helperNameMap } from './constants';
import { SourceMapGenerator } from './source-map';
import { prefixIdentifiers } from './prefix-identifiers';
import { getCodegenMemo } from './transforms/helpers';
import { FRAGMENT_SENTINEL } from './transforms/transform-element';
import { BUILTIN_COMPONENT_NAMES, BUILTIN_COMPONENT_MODULE } from './builtin-components';

// ============================================================
// 主生成函数
// ============================================================

// FIX: P1-3 COMPILER-NEW-04 - 死代码检测：检查是否为空语句序列
function isDeadCode(node: JSChildNode | TemplateChildNode | undefined): boolean {
  if (!node) return true;
  // 空数组表示空语句序列
  if (Array.isArray(node) && node.length === 0) return true;
  // 空文本节点
  if (typeof node === 'object' && 'type' in node && node.type === NodeTypes.TEXT) {
    const textNode = node as TextNode;
    if (!textNode.content || textNode.content.trim() === '') return true;
  }
  // 空复合表达式
  if (typeof node === 'object' && 'type' in node && node.type === NodeTypes.COMPOUND_EXPRESSION) {
    const compoundNode = node as CompoundExpressionNode;
    if (!compoundNode.children || compoundNode.children.length === 0) return true;
  }
  return false;
}

export function generate(ast: RootNode, options: CodegenOptions = {}): CodegenResult {
  const { context, codeParts, sourceMapGen } = createCodegenContext(ast, options);

  // 生成辅助函数导入（前导代码）
  // ⚠️ 2026-11-07（ADR 0022 / 方案 B2）：内置组件的 import 只能在正文生成**之后**
  //   才能知道（由 genVNodeCall 收集），因此 preamble 统一延后到函数末尾拼装。
  const helperImports = genHelperImports(ast.helpers, options.runtimeModuleName);

  // 生成提升的变量声明
  //
  // ★ 2026-11-03 修：只输出**正文真的引用到了**的提升。
  //
  //   此前是「`ast.hoists` 里有几条就输出几条」，但提升引用只在**部分**场景下
  //   真的被写进 render 正文 —— 例如 `<div><span>a</span><p>{{x}}</p></div>`
  //   的产物是：
  //
  //     const _hoisted_1 = createElementVNode("span", null, "a")   ← 声明了
  //     return (openBlock(), createBlock("div", null, [
  //       createElementVNode("span", null, "a"),                    ← 又造了一遍
  //       (openBlock(), createBlock("p", null, toDisplayString(_ctx.x), 1))
  //     ]))
  //
  //   `_hoisted_1` **从未被引用** ⇒ 模块级死代码：多一次 vnode 分配、
  //   多一行噪音，而且会让人误以为「静态提升生效了」。
  //
  //   现在按「引用可达性」过滤：从 `codegenNode` 出发收集实际出现的
  //   `_hoisted_N`，并处理提升之间的传递引用。编号保持不变（不重排），
  //   输出顺序也不变，因此不影响 source map。
  if (ast.hoists && ast.hoists.length > 0) {
    const usedHoists = collectUsedHoistIndices(ast);
    for (let i = 0; i < ast.hoists.length; i++) {
      const hoistedNode = ast.hoists[i];
      // FIX: P1-3 COMPILER-NEW-04 - 跳过死代码（空语句序列）
      if (isDeadCode(hoistedNode as JSChildNode)) {
        continue;
      }
      // 未被正文引用 ⇒ 不输出（否则是纯开销）
      if (!usedHoists.has(i)) {
        continue;
      }
      context.push(`const _hoisted_${i + 1} = `);
      genNode(hoistedNode as JSChildNode, context);
      context.push(`\n`);
    }
    context.push(`\n`);
  }

  // v-once 的模块级惰性变量声明（见 transforms/once.ts）
  if (ast.onceVars && ast.onceVars.length > 0) {
    context.push(`let ${ast.onceVars.join(', ')};\n\n`);
  }

  // 生成 render 函数
  // FIX: P2-23 生成代码可读性优化：添加函数注释
  context.push(`// Render function\n`);
  context.push(`function render(_ctx, _cache) {\n`);
  context.indent();

  // FIX: P1-3 COMPILER-NEW-04 - 检查 codegenNode 是否为空/死代码
  if (ast.codegenNode && !isDeadCode(ast.codegenNode)) {
    context.push(`return `);
    genNode(ast.codegenNode, context);
    context.push(`\n`);
  }

  context.deindent();
  context.push(`}`);

  const code = codeParts.join('');

  // 前导代码：helper import + 实际用到的内置组件 import（仅 module 模式）
  const preamble = helperImports + genBuiltinImports(context);

  return {
    code,
    preamble,
    ast,
    map: sourceMapGen ? sourceMapGen.toJSON() : undefined,
  };
}

/**
 * 生成内置组件的 import（`mode: 'module'` 下由 codegen 直接引入，零配置可用）。
 *
 * ⚠️ 只在 module 模式产出：`function` 模式的产物会被 `new Function` 执行，
 * import 语句不合法（core 的 `template-compiler` 会剥 import，但剥掉后裸标识符
 * 无从解析），因此 function 模式必须保留 `_ctx.X` + 显式 `registerBuiltinComponents()`。
 */
function genBuiltinImports(context: CodegenContext): string {
  if (context.mode !== 'module') return '';
  const names = context.builtinComponents;
  if (!names || names.size === 0) return '';
  return `import { ${[...names].join(', ')} } from '${BUILTIN_COMPONENT_MODULE}';\n`;
}

// ============================================================
// 提升引用的可达性分析（2026-11-03 新增）
// ============================================================

/**
 * 收集 render 正文**实际引用到**的 `_hoisted_N`（返回 0-based 索引集合）。
 *
 * 为什么要它：`ast.hoists` 是「静态提升表」，但提升引用不一定真的被写进正文。
 * 无条件输出全部声明会产生模块级死代码（见 `generate` 里的说明）。
 *
 * 处理**传递引用**：某个提升节点自身也可能引用另一个提升（历史上出现过
 * `_hoisted_1 = div(…, span(…))` 与 `_hoisted_2 = span(…)` 两份并存的形态），
 * 所以要迭代到不动点。
 */
function collectUsedHoistIndices(ast: RootNode): Set<number> {
  const used = new Set<number>();
  const seen = new WeakSet<object>();

  const scan = (node: unknown): void => {
    if (node == null || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const child of node) scan(child);
      return;
    }
    if (seen.has(node as object)) return;
    seen.add(node as object);

    const n = node as { type?: number; content?: unknown };
    if (n.type === NodeTypes.SIMPLE_EXPRESSION && typeof n.content === 'string') {
      const m = /^_hoisted_(\d+)$/.exec(n.content);
      if (m) used.add(Number(m[1]) - 1);
    }
    for (const value of Object.values(node as Record<string, unknown>)) {
      if (value && typeof value === 'object') scan(value);
    }
  };

  scan(ast.codegenNode);

  // 传递引用：被保留的提升节点自身引用到的其它提升也要保留
  let changed = true;
  while (changed) {
    changed = false;
    for (const idx of [...used]) {
      const before = used.size;
      scan(ast.hoists?.[idx]);
      if (used.size !== before) changed = true;
    }
  }

  return used;
}

// ============================================================
// 代码生成上下文
// ============================================================

function createCodegenContext(
  ast: RootNode,
  options: CodegenOptions,
): {
  context: CodegenContext;
  codeParts: string[];
  sourceMapGen: SourceMapGenerator | null;
} {
  const helpers = new Map<string, string>();
  // FIX: P1-26 移除冗余的局部 indentLevel 变量，消除双重跟踪问题。
  // 之前 context.indentLevel 和局部 indentLevel 同时存在，可能导致不同步。
  // 现在只使用 context.indentLevel 作为唯一的缩进级别来源。
  const codeParts: string[] = [];

  // Source map 支持
  const sourceMapGen: SourceMapGenerator | null = options.sourceMap
    ? new SourceMapGenerator(options.filename ?? 'template.html')
    : null;

  if (sourceMapGen) {
    sourceMapGen.addSource(options.filename ?? 'template.html', ast.loc.source);
  }

  // 跟踪当前生成位置用于 source mapping
  let currentLine = 0;
  let currentColumn = 0;

  const context: CodegenContext = {
    // 局部标识符（v-for 别名等）：它们不加 `_ctx.` 前缀
    locals: new Set<string>(ast.localIdentifiers ?? []),
    // ⚠️ 2026-11-07（ADR 0022 / 方案 B2）：mode 决定内置组件标签的产物形态
    //   · 'module'：裸标识符 + `import { X } from '@lytjs/component'`（AOT，零配置）
    //   · 其它/未传：`_ctx.X`（运行时 `new Function`，需显式注册）
    //   默认不传（等价函数模式），以免改变既有产物快照。
    mode: options.mode,
    builtinComponents: new Set<string>(),
    source: ast.loc.source,
    line: 1,
    column: 1,
    offset: 0,
    indentLevel: 0,
    pure: false,

    helper(key: string): string {
      const mapped = helperNameMap[key] ?? key;
      helpers.set(key, mapped);
      return mapped;
    },

    push(c: string, node?: BaseNode): void {
      codeParts.push(c);

      // 更新生成位置跟踪
      for (let i = 0; i < c.length; i++) {
        if (c[i] === '\n') {
          currentLine++;
          currentColumn = 0;
        } else {
          currentColumn++;
        }
      }

      // 如果启用了 source map 且节点有位置信息，则添加 source mapping
      if (sourceMapGen && node?.loc?.start) {
        sourceMapGen.addMapping(
          node.loc.start.line - 1, // Convert to 0-based
          node.loc.start.column - 1,
          currentLine,
          currentColumn - c.length, // Map to the start of this push
        );
      }
    },

    indent(): void {
      context.indentLevel++;
    },

    deindent(withoutNewline?: boolean): void {
      if (context.indentLevel > 0) {
        context.indentLevel--;
      }
      if (!withoutNewline) {
        codeParts.push(`\n${'  '.repeat(context.indentLevel)}`);
        currentLine++;
        currentColumn = context.indentLevel * 2;
      }
    },

    newline(): void {
      // FIX: P0-1 修复 newline() 引用未定义变量 indentLevel，改为使用 context.indentLevel
      codeParts.push(`\n${'  '.repeat(context.indentLevel)}`);
      currentLine++;
      currentColumn = context.indentLevel * 2;
    },
  };

  return { context, codeParts, sourceMapGen };
}

// ============================================================
// 生成辅助函数导入
// ============================================================

function genHelperImports(helpers: string[], runtimeModuleName?: string): string {
  if (helpers.length === 0) return '';

  const imports = helpers.map((h) => helperNameMap[h] ?? h);
  const uniqueImports = [...new Set(imports)];

  // FIX: P1-13 使模块名可配置，通过编译选项 runtimeModuleName 传入，默认值改为 '@lytjs/core'
  const moduleName = runtimeModuleName ?? '@lytjs/core';
  return `import { ${uniqueImports.join(', ')} } from '${moduleName}';\n`;
}

// ============================================================
// 生成节点
// ============================================================

function genNode(node: JSChildNode | TemplateChildNode, context: CodegenContext): void {
  // v-memo：在 vnode 路径上真正消费 memo 元数据。
  //
  // ⚠️ 2026-11-13 修（C-29）：此前 transformVMemo 只写了元数据 + 登记 helper，
  //   vnode codegen 没有任何读取点 ⇒ 产物从不调用 withMemo，v-memo 完全无效
  //   （性能承诺不成立，且带着一个未使用的 import）。
  //   现在统一外包：`withMemo(deps, () => (<vnode>), _cache, index)`。
  const memo = getCodegenMemo(node);
  if (memo) {
    context.push(`${context.helper('WITH_MEMO')}(`, node);
    context.push(prefixIdentifiers(memo.deps, context.locals), node);
    context.push(`, () => (`, node);
    genNodeInner(node, context);
    context.push(`), _cache, `, node);
    context.push(
      memo.indexExpr ? prefixIdentifiers(memo.indexExpr, context.locals) : String(memo.index),
      node,
    );
    context.push(`)`, node);
    return;
  }
  genNodeInner(node, context);
}

function genNodeInner(node: JSChildNode | TemplateChildNode, context: CodegenContext): void {
  switch (node.type) {
    case NodeTypes.VNODE_CALL:
      genVNodeCall(node as VNodeCall, context);
      break;
    case NodeTypes.JS_CALL_EXPRESSION:
      genCallExpression(node as JSCallExpression, context);
      break;
    case NodeTypes.JS_OBJECT_EXPRESSION:
      genObjectExpression(node as JSObjectExpression, context);
      break;
    case NodeTypes.JS_PROPERTY:
      genProperty(node as JSProperty, context);
      break;
    case NodeTypes.JS_ARRAY_EXPRESSION:
      genArrayExpression(node as JSArrayExpression, context);
      break;
    case NodeTypes.JS_FUNCTION_EXPRESSION:
      genFunctionExpression(node as JSFunctionExpression, context);
      break;
    case NodeTypes.JS_CONDITIONAL_EXPRESSION:
      genConditional(node as JSConditionalExpression, context);
      break;
    case NodeTypes.TEXT:
      genText(node as TextNode, context);
      break;
    case NodeTypes.INTERPOLATION:
      genInterpolation(node as InterpolationNode, context);
      break;
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node as SimpleExpressionNode, context);
      break;
    case NodeTypes.COMPOUND_EXPRESSION:
      genCompoundExpression(node as CompoundExpressionNode, context);
      break;
    case NodeTypes.ELEMENT:
      genElement(node as ElementNode, context);
      break;
    default: {
      // 回退：对未知节点类型进行穷举检查。
      // 如果上面处理了所有 NodeTypes，此分支不应被执行。
      const nodeType = (node as { type?: string | number }).type;
      throw new Error(`[LytJS compiler] Codegen: unknown node type "${nodeType ?? 'unknown'}"`);
    }
  }
}

// ============================================================
// 生成 VNodeCall
// ============================================================

/**
 * 函数表达式：`(p1, p2) => [ … ]`（插槽内容的载体）。
 *
 * ⚠️ 2026-10-28 新增（具名/作用域插槽）：`JS_FUNCTION_EXPRESSION` 的 NodeType 与类型
 *   早就在仓库里，但 codegen 从来没有对应分支 —— 遇到它只会落到默认分支、静默产出空串。
 */
function genFunctionExpression(node: JSFunctionExpression, context: CodegenContext): void {
  const { params, returns } = node;

  // 参数：字符串原样输出（`item` / `{ item }` 这类解构），表达式节点走 genNode
  context.push('(');
  params.forEach((param, i) => {
    if (i > 0) context.push(', ');
    if (typeof param === 'string') context.push(param);
    else genNode(param, context);
  });
  context.push(') => ');

  // 返回体：数组 → `[ … ]`；单个节点 → 原样；空 → `[]`
  if (Array.isArray(returns)) {
    context.push('[');
    returns.forEach((child, i) => {
      if (i > 0) context.push(', ');
      genNode(child as JSChildNode, context);
    });
    context.push(']');
  } else if (returns) {
    genNode(returns as JSChildNode, context);
  } else {
    context.push('[]');
  }
}

function genVNodeCall(node: VNodeCall, context: CodegenContext): void {
  const { tag, props, children, patchFlag, isBlock } = node;

  if (isBlock) {
    // Block 节点：用**逗号表达式**包住 `openBlock(), createBlock(...)`。
    //
    // ⚠️ 历史缺陷（2026-09-26 修复）：此前产物是
    //      `openBlock()` + 换行 + `createBlock(...)`
    //   两种典型后果：
    //   ① 顶层 `return openBlock()⏎createBlock(...)` 会被 **ASI** 断句，
    //      return 的是 `openBlock()`（声明为 `: void`，无返回值）⇒ render 返回
    //      undefined、页面空白，真正的 createBlock 永远执行不到；
    //   ② 当该形态出现在**表达式内部**时（v-once 的 `(_once_0 || (_once_0 = …))`、
    //      组件 slot 的 children 数组）是纯粹语法错误 ⇒
    //      `new Function` 抛 `Unexpected identifier 'createBlock'`。
    //   逗号表达式同时解决两者（与 Vue 的产物形态一致）。
    context.push(`(${context.helper('OPEN_BLOCK')}(), `, node);
    context.push(`${context.helper('CREATE_BLOCK')}(`, node);
  } else {
    // 普通节点：生成 createVNode 调用
    context.push(`${context.helper('CREATE_VNODE')}(`, node);
  }

  // 标签
  // 组件标签也要前缀化：产物是 `function render(_ctx, _cache)`，
  // `createBlock(Child, ...)` 里的裸标识符在运行时不存在（应为 `_ctx.Child`）。
  if (tag === FRAGMENT_SENTINEL) {
    // `<template>` → `createVNode(Fragment, …)`（见 transform-element 的 isTemplateTag）。
    // 这里走 `helper('FRAGMENT')`：既登记 import，又保证产物里是 `Fragment` 而不是字符串。
    context.push(context.helper('FRAGMENT'), node);
  } else if (node.isComponent && typeof tag === 'string') {
    // ⚠️ 2026-11-07（ADR 0022 / 方案 B2）：module 模式下，内置组件标签走**裸标识符**
    //   并由 preamble 产出 `import { X } from '@lytjs/component'` ⇒ 零配置可用，
    //   且只带入实际用到的实现。function 模式（运行时字符串模板）仍走 `_ctx.X`，
    //   由使用方显式 `registerBuiltinComponents()`（未注册时代理会给 DEV 告警）。
    if (
      context.mode === 'module' &&
      BUILTIN_COMPONENT_NAMES.has(tag) &&
      !context.locals?.has(tag)
    ) {
      context.builtinComponents?.add(tag);
      context.push(tag, node);
    } else {
      context.push(prefixIdentifiers(tag, context.locals), node);
    }
  } else {
    genNodeExpr(tag, context);
  }
  context.push(', ', node);

  // Props
  if (props) {
    genNode(props, context);
  } else {
    context.push('null', node);
  }

  // Children
  if (children !== undefined) {
    context.push(', ', node);
    if (typeof children === 'string') {
      context.push(JSON.stringify(children), node);
    } else if (Array.isArray(children)) {
      genChildrenArray(children, context);
    } else {
      genNode(children, context);
    }
  } else if (patchFlag !== undefined) {
    // ⚠️ children 缺省时必须补 `null` 占位，否则 patchFlag 会**落到 children 形参**上。
    // 实测（2026-09-26）：`<div v-html="raw">` 的产物是
    //   `createBlock("div", { "innerHTML": … }, 16 /* FULL_PROPS */)`
    // —— `16` 被当成 children 渲染成了文本，页面出现莫名的 "16"。
    context.push(', null', node);
  }

  // Patch flag
  if (patchFlag !== undefined) {
    context.push(', ', node);
    const flagStr = typeof patchFlag === 'string' ? patchFlag : String(patchFlag);
    context.push(flagStr, node);
    const flagNum = parseInt(flagStr, 10);
    if (!isNaN(flagNum)) {
      context.push(` /* ${describePatchFlag(flagNum)} */`, node);
    }
  }

  context.push(')', node);

  if (isBlock) {
    // 闭合逗号表达式的左括号（见 genVNodeCall 开头）
    context.push(')', node);
  }
}

// ============================================================
// 生成 CallExpression
// ============================================================

function genCallExpression(node: JSCallExpression, context: CodegenContext): void {
  const callee =
    typeof node.callee === 'string' ? context.helper(node.callee) : String(node.callee);

  context.push(`${callee}(`, node);

  for (let i = 0; i < node.arguments.length; i++) {
    const arg = node.arguments[i];
    if (arg === undefined) continue;
    if (i > 0) {
      context.push(', ', node);
    }
    if (typeof arg === 'string') {
      context.push(arg, node);
    } else if (Array.isArray(arg)) {
      genChildrenArray(arg, context);
    } else {
      genNode(arg, context);
    }
  }

  context.push(')', node);
}

// ============================================================
// 生成 ObjectExpression
// ============================================================

function genObjectExpression(node: JSObjectExpression, context: CodegenContext): void {
  const { properties } = node;

  if (properties.length === 0) {
    context.push('{}', node);
    return;
  }

  context.push('{ ', node);

  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i];
    if (prop === undefined) continue;
    if (i > 0) {
      context.push(', ', node);
    }
    genNode(prop, context);
  }

  context.push(' }', node);
}

// ============================================================
// 生成 Property
// ============================================================

function genProperty(node: JSProperty, context: CodegenContext): void {
  const { key, value } = node;

  // `{ ...expr }` —— `v-bind="obj"` 的对象展开。key 不参与输出。
  if (node.spread) {
    context.push('...', node);
    genNode(value, context);
    return;
  }

  if (key.type === NodeTypes.SIMPLE_EXPRESSION) {
    // 非静态 key（动态参数 `:[attrName]`）必须先前缀化再输出计算键
    if ((key as SimpleExpressionNode).isStatic) {
      context.push(key.content, node);
    } else {
      genExpression(key as SimpleExpressionNode, context);
    }
  } else {
    genNode(key, context);
  }

  context.push(': ', node);
  genNode(value, context);
}

// ============================================================
// 生成 ArrayExpression
// ============================================================

function genArrayExpression(node: JSArrayExpression, context: CodegenContext): void {
  context.push('[', node);

  for (let i = 0; i < node.elements.length; i++) {
    const el = node.elements[i];
    if (el === undefined) continue;
    if (i > 0) {
      context.push(', ', node);
    }
    genNode(el, context);
  }

  context.push(']', node);
}

// ============================================================
// 生成 ConditionalExpression
// ============================================================

function genConditional(node: JSConditionalExpression, context: CodegenContext): void {
  const { test, consequent, alternate } = node;

  context.push('(', node);

  if (typeof test === 'string') {
    context.push(test, node);
  } else {
    genNode(test, context);
  }

  context.push(' ? ', node);

  if (typeof consequent === 'string') {
    context.push(consequent, node);
  } else if (Array.isArray(consequent)) {
    genChildrenArray(consequent, context);
  } else {
    genNode(consequent, context);
  }

  context.push(' : ', node);

  if (typeof alternate === 'string') {
    context.push(alternate, node);
  } else if (Array.isArray(alternate)) {
    genChildrenArray(alternate, context);
  } else if (alternate) {
    genNode(alternate, context);
  } else {
    // ⚠️ 无 else 分支（如单独的 `v-if`，或 `v-show` 之类的三元回退）：
    // 必须显式输出 `null`。此前这里什么都不 push，产物是
    //   `(_ctx.ok ? createElementVNode("span", null, "Y") : )`
    // —— 冒号后为空 ⇒ 语法错误 ⇒ 组件渲染函数无法生成（表现为静默空白）。
    context.push('null', node);
  }

  context.push(')', node);
}

// ============================================================
// 生成 Text
// ============================================================

function genText(node: TextNode, context: CodegenContext): void {
  context.push(JSON.stringify(node.content), node);
}

// ============================================================
// 生成 Interpolation
// ============================================================

function genInterpolation(node: InterpolationNode, context: CodegenContext): void {
  context.push(`${context.helper('TO_DISPLAY_STRING')}(`, node);
  genNode(node.content, context);
  context.push(')', node);
}

// ============================================================
// 生成 Expression
// ============================================================

function genExpression(node: SimpleExpressionNode, context: CodegenContext): void {
  // 静态内容原样输出；动态绑定表达式需要前缀化为 `_ctx.xxx`，
  // 否则产物在 `function render(_ctx, _cache)` 里取不到绑定（值是 undefined / 报错）。
  const content = node.isStatic ? node.content : prefixIdentifiers(node.content, context.locals);
  context.push(content, node);
}

// ============================================================
// 生成 CompoundExpression
// ============================================================

function genCompoundExpression(node: CompoundExpressionNode, context: CodegenContext): void {
  for (const child of node.children) {
    if (typeof child === 'string') {
      context.push(child, node);
    } else if (child.type === NodeTypes.SIMPLE_EXPRESSION) {
      context.push(child.content, node);
    } else if (child.type === NodeTypes.INTERPOLATION) {
      context.push(`${context.helper('TO_DISPLAY_STRING')}(`, node);
      genNode(child.content, context);
      context.push(')', node);
    } else {
      genNode(child, context);
    }
  }
}

// ============================================================
// 生成 Element
// ============================================================

function genElement(node: ElementNode, context: CodegenContext): void {
  if (node.codegenNode) {
    genNode(node.codegenNode, context);
  } else {
    const callee = context.helper('CREATE_VNODE');
    context.push(`${callee}(${JSON.stringify(node.tag)}`, node);

    if (node.props.length > 0) {
      context.push(', { ', node);
      for (let i = 0; i < node.props.length; i++) {
        const prop = node.props[i];
        if (prop === undefined) continue;
        if (i > 0) context.push(', ', node);
        if (prop.type === NodeTypes.ATTRIBUTE) {
          context.push(`${JSON.stringify(prop.name)}: `, node);
          if (prop.value) {
            context.push(JSON.stringify(prop.value.content), node);
          } else {
            context.push('true', node);
          }
        }
      }
      context.push(' }', node);
    }

    if (node.children.length > 0) {
      context.push(', ', node);
      genChildrenArray(node.children, context);
    }

    context.push(')', node);
  }
}

// ============================================================
// Generate children array
// ============================================================

function genChildrenArray(children: TemplateChildNode[], context: CodegenContext): void {
  context.push('[', undefined);

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child === undefined) continue;
    if (i > 0) {
      context.push(', ', undefined);
    }
    genNode(child, context);
  }

  context.push(']', undefined);
}

// ============================================================
// Generate node expression (string or node)
// ============================================================

function genNodeExpr(expr: string | JSChildNode, context: CodegenContext): void {
  if (typeof expr === 'string') {
    context.push(expr, undefined);
  } else {
    genNode(expr, context);
  }
}

// ============================================================
// Helpers
// ============================================================
