// src/codegen-signal-optimized.ts
// Signal 模式代码生成器 - 优化版本
// 目标：生成代码体积减少 30%+
//
// 注：插槽相关的 vnode 序列化辅助函数（serializeVNodeCall* / serializeConditionalVNode*）
// 带 `export` 仅为便于单测其**严格模式边界**（正常模板无法触达的防御分支），
// 它们不经过 index.ts / signal.ts 转出，不属于公开 API。

import { NodeTypes, ElementTypes } from './constants';
import { getMemoMeta } from './transforms/v-memo';
import { prefixIdentifiers } from './prefix-identifiers';
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
// 优化策略
// ============================================================

/**
 * 优化策略：
 * 1. 短导入别名 - 使用单字符别名减少导入体积
 * 2. 模板复用 - 相同模板只生成一次
 * 3. 内联简单表达式 - 避免 effect 包装简单值
 * 4. 批量操作 - 合并多个 setAttribute 调用
 * 5. 静态提升 - 静态内容提升到模块级别
 */

// ============================================================
// 短名称映射
// ============================================================

// 运行时函数短名称映射
const RUNTIME_SHORT_NAMES = {
  effect: 'e',
  createTemplate: 't',
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
  reconcileArray: 'n',
  // 组件挂载（来自 @lytjs/renderer）
  mountComponent: 'm',
  // 组件插槽的 vnode 构造（来自 @lytjs/vdom）—— 用大写避开已占用的小写字母
  createVNode: 'V',
  Text: 'T',
} as const;

// ============================================================
// Signal 代码生成选项
// ============================================================

export interface SignalCodegenOptions {
  mode: 'signal';
  isComponent?: boolean;
  ident?: number;
  /** 是否使用短名称（优化模式） */
  useShortNames?: boolean;
  /** 是否内联简单表达式 */
  inlineSimpleExpressions?: boolean;
}

// ============================================================
// 辅助函数：获取运行时函数的短名称
// ============================================================

function getShortName(funcName: string, useShortNames: boolean): string {
  if (!useShortNames) return funcName;
  return RUNTIME_SHORT_NAMES[funcName as keyof typeof RUNTIME_SHORT_NAMES] || funcName;
}

// ============================================================
// 主生成函数 - 优化版
// ============================================================

export function generateSignalOptimized(ast: RootNode, _options?: CompilerOptions): CodegenResult {
  // 优化版与非优化版（generateSignal）现在都已支持子组件
  //（占位元素 + mountComponent 运行时），两版行为一致，均无需告警。
  const options: SignalCodegenOptions = {
    mode: 'signal',
    useShortNames: true, // 启用短别名优化以减少代码体积
    inlineSimpleExpressions: true,
  };

  const lines: string[] = [];
  const varCounter = new Map<string, number>();
  const elementVars: Array<{ varName: string; tag: string }> = [];
  const consumedCount = new Map<string, number>();
  const dynamicBindings: Array<{ varName: string; code: string }> = [];

  // 收集使用的运行时函数
  const usedRuntime = new Set<string>();

  // ---- Phase 0: 检查根节点数量 ----
  const rootElementCount = ast.children.filter(
    (child) => child.type === NodeTypes.ELEMENT || child.type === NodeTypes.VNODE_CALL,
  ).length;
  if (rootElementCount > 1) {
    const location = ast.loc?.source
      ? `\n  Location: line ${ast.loc.start.line}, column ${ast.loc.start.column}`
      : '';
    throw new Error(
      `[lytjs/compiler] Template has multiple root elements (${rootElementCount}). ` +
        `Signal mode requires a single root element.${location}` +
        `\n  Suggestion: Wrap multiple root elements in a container element like <div> or <Fragment>.`,
    );
  }

  // ---- Phase 1: Build static HTML and collect element variables ----
  const staticHTML = buildStaticHTMLOptimized(ast.children, varCounter, elementVars);

  // ---- Phase 2: Process AST children for dynamic bindings ----
  processChildrenOptimized(
    ast.children,
    varCounter,
    elementVars,
    dynamicBindings,
    consumedCount,
    usedRuntime,
    options,
  );

  // ---- Phase 3: Generate optimized imports ----
  // 手动添加必须的 runtime 函数
  usedRuntime.add('createTemplate');
  usedRuntime.add('insert');
  usedRuntime.add('onCleanup');
  usedRuntime.add('runCleanups');

  lines.push(generateOptimizedImports(usedRuntime, true));
  lines.push('');

  // ---- Phase 4: Generate render function ----
  // 使用短参数名 _c (context) 和 _n (container) 减少代码体积
  lines.push('export function render(_c,_n){');

  // 生成 createTemplate 调用 - 使用短别名
  if (elementVars.length > 0) {
    const rootVar = elementVars[0]!.varName;
    const ct = getShortName('createTemplate', options.useShortNames ?? true);
    lines.push(`const ${rootVar}=${ct}(${JSON.stringify(staticHTML)});`);

    // 解构子元素 - 优化：只有需要时才解构
    if (elementVars.length > 1) {
      const childVars = elementVars.slice(1).map((v) => v.varName);
      lines.push(`const[${childVars.join(',')}]=${rootVar}.children;`);
    }

    // 使用短别名生成 insert 调用
    const ins = getShortName('insert', options.useShortNames ?? true);
    lines.push(`${ins}(${rootVar}, _n);`);
    lines.push('');
  }

  // 生成动态绑定 - 优化：合并相似操作
  generateOptimizedBindings(dynamicBindings, lines, options);

  // 生成 cleanup - 使用短别名
  if (elementVars.length > 0) {
    const rootVar = elementVars[0]!.varName;
    const oc = getShortName('onCleanup', options.useShortNames ?? true);
    lines.push('');
    lines.push(`${oc}(()=>${rootVar}.remove());`);
  }

  const rc = getShortName('runCleanups', options.useShortNames ?? true);
  lines.push(`return()=>{${rc}()};`);
  lines.push('}');

  return {
    code: lines.join('\n'),
    preamble: '',
    ast,
  };
}

// ============================================================
// 生成优化的导入语句
// ============================================================

function generateOptimizedImports(usedRuntime: Set<string>, useShortNames: boolean): string {
  if (useShortNames) {
    // 短名称模式 - 分开 reactivity 和 dom-runtime 导入
    const reactivityImports: string[] = ['e as effect'];
    const domImports: string[] = [];

    if (usedRuntime.has('createTemplate')) domImports.push('t as createTemplate');
    if (usedRuntime.has('setText')) domImports.push('x as setText');
    if (usedRuntime.has('setHTML')) domImports.push('h as setHTML');
    if (usedRuntime.has('setAttribute')) domImports.push('a as setAttribute');
    if (usedRuntime.has('setProperty')) domImports.push('p as setProperty');
    if (usedRuntime.has('setStyle')) domImports.push('s as setStyle');
    if (usedRuntime.has('setClass')) domImports.push('c as setClass');
    if (usedRuntime.has('insert')) domImports.push('i as insert');
    if (usedRuntime.has('remove')) domImports.push('r as remove');
    if (usedRuntime.has('createEventHandler')) domImports.push('v as createEventHandler');
    if (usedRuntime.has('onCleanup')) domImports.push('o as onCleanup');
    if (usedRuntime.has('runCleanups')) domImports.push('g as runCleanups');
    if (usedRuntime.has('reconcileArray')) domImports.push('n as reconcileArray');

    let result = `import{${reactivityImports.join(',')}}from'@lytjs/reactivity';`;
    if (domImports.length > 0) {
      result += `\nimport{${domImports.join(',')}}from'@lytjs/dom-runtime';`;
    }
    if (usedRuntime.has('mountComponent')) {
      const mc = getShortName('mountComponent', true);
      result += `\nimport{${mc} as mountComponent}from'@lytjs/renderer';`;
    }
    if (usedRuntime.has('createVNode') || usedRuntime.has('Text')) {
      const vdomImports: string[] = [];
      if (usedRuntime.has('createVNode')) {
        vdomImports.push(`${getShortName('createVNode', true)} as createVNode`);
      }
      if (usedRuntime.has('Text')) {
        vdomImports.push(`${getShortName('Text', true)} as Text`);
      }
      result += `\nimport{${vdomImports.join(',')}}from'@lytjs/vdom';`;
    }
    return result;
  } else {
    // 标准名称模式
    const reactivityImports: string[] = ['effect'];
    const domImports: string[] = [];

    if (usedRuntime.has('createTemplate')) domImports.push('createTemplate');
    if (usedRuntime.has('setText')) domImports.push('setText');
    if (usedRuntime.has('setHTML')) domImports.push('setHTML');
    if (usedRuntime.has('setAttribute')) domImports.push('setAttribute');
    if (usedRuntime.has('setProperty')) domImports.push('setProperty');
    if (usedRuntime.has('setStyle')) domImports.push('setStyle');
    if (usedRuntime.has('setClass')) domImports.push('setClass');
    if (usedRuntime.has('insert')) domImports.push('insert');
    if (usedRuntime.has('remove')) domImports.push('remove');
    if (usedRuntime.has('createEventHandler')) domImports.push('createEventHandler');
    if (usedRuntime.has('onCleanup')) domImports.push('onCleanup');
    if (usedRuntime.has('runCleanups')) domImports.push('runCleanups');
    if (usedRuntime.has('reconcileArray')) domImports.push('reconcileArray');

    let result = `import{${reactivityImports.join(',')}}from'@lytjs/reactivity';`;
    if (domImports.length > 0) {
      result += `\nimport{${domImports.join(',')}}from'@lytjs/dom-runtime';`;
    }
    if (usedRuntime.has('mountComponent')) {
      result += `\nimport{mountComponent}from'@lytjs/renderer';`;
    }
    if (usedRuntime.has('createVNode') || usedRuntime.has('Text')) {
      const vdomImports: string[] = [];
      if (usedRuntime.has('createVNode')) vdomImports.push('createVNode');
      if (usedRuntime.has('Text')) vdomImports.push('Text');
      result += `\nimport{${vdomImports.join(',')}}from'@lytjs/vdom';`;
    }
    return result;
  }
}

// ============================================================
// 生成优化的动态绑定
// ============================================================

function generateOptimizedBindings(
  dynamicBindings: Array<{ varName: string; code: string }>,
  lines: string[],
  options: SignalCodegenOptions,
): void {
  // 按元素分组绑定
  const bindingsByElement = new Map<string, string[]>();

  for (const binding of dynamicBindings) {
    const existing = bindingsByElement.get(binding.varName) || [];
    existing.push(binding.code);
    bindingsByElement.set(binding.varName, existing);
  }

  // 为每个元素生成合并的绑定代码
  for (const [_varName, bindings] of bindingsByElement) {
    // 检查是否可以合并 effect - 使用短别名 e
    const e = getShortName('effect', options.useShortNames ?? true);
    const effectPattern = `${e}(`;
    const effectBindings = bindings.filter((b) => b.startsWith(effectPattern));
    const otherBindings = bindings.filter((b) => !b.startsWith(effectPattern));

    // 合并多个 effect 为单个 effect
    if (effectBindings.length > 1) {
      const effectContents = effectBindings
        .map((b) => b.match(new RegExp(`${e}\\(\\(\\)=>\\{(.+)\\}\\);`))?.[1] || b)
        .join('');
      lines.push(`${e}(()=>{${effectContents}});`);
    } else if (effectBindings.length === 1) {
      lines.push(effectBindings[0]!);
    }

    // 添加其他绑定
    for (const binding of otherBindings) {
      lines.push(binding);
    }
  }
}

// ============================================================
// 优化的静态 HTML 构建
// ============================================================

function buildStaticHTMLOptimized(
  children: TemplateChildNode[],
  varCounter: Map<string, number>,
  elementVars: Array<{ varName: string; tag: string }>,
): string {
  let html = '';
  for (const child of children) {
    if (child.type === NodeTypes.TEXT) {
      html += (child as TextNode).content;
    } else if (child.type === NodeTypes.ELEMENT) {
      html += serializeStaticHTMLOptimized(child as ElementNode, varCounter, elementVars);
    }
  }
  return html;
}

// ============================================================
// 优化的静态 HTML 序列化
// ============================================================

function escapeHtmlStatic(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function serializeStaticHTMLOptimized(
  node: ElementNode,
  varCounter: Map<string, number>,
  elementVars: Array<{ varName: string; tag: string }>,
): string {
  // 组件：不再把标签写进模板串（那会在 DOM 里留下字面量 <Child />），
  // 改为输出一个占位元素 `<lyt-comp data-lyt-comp="Child">` 保住结构位置，
  // 随后由运行时 mountComponent 把组件挂载进去。
  // 注意：占位必须是**元素**而不是注释 —— 注释不在 element.children 里，
  // 会让后续按下标取元素的 `_N` 变量全部错位。
  if (node.tagType === ElementTypes.COMPONENT) {
    const idx = elementVars.length;
    const varName = `_${idx}`;
    elementVars.push({ varName, tag: 'lyt-comp' });
    return `<lyt-comp data-lyt-comp="${node.tag}"></lyt-comp>`;
  }

  // 使用更短的变量名：_0, _1, _2...
  const idx = elementVars.length;
  const varName = `_${idx}`;
  elementVars.push({ varName, tag: node.tag });

  let attrs = '';
  for (const prop of node.props) {
    if (prop.type === NodeTypes.ATTRIBUTE && prop.value) {
      attrs += ` ${prop.name}="${escapeHtmlStatic(prop.value.content)}"`;
    } else if (prop.type === NodeTypes.ATTRIBUTE && !prop.value) {
      attrs += ` ${prop.name}`;
    }
  }

  let childrenHTML = '';
  for (const child of node.children) {
    if (child.type === NodeTypes.TEXT) {
      childrenHTML += escapeHtmlStatic((child as TextNode).content);
    } else if (child.type === NodeTypes.ELEMENT) {
      childrenHTML += serializeStaticHTMLOptimized(child as ElementNode, varCounter, elementVars);
    }
  }

  if (node.children.length === 0 && node.isSelfClosing) {
    return `<${node.tag}${attrs} />`;
  }
  return `<${node.tag}${attrs}>${childrenHTML}</${node.tag}>`;
}

// ============================================================
// 优化的子节点处理
// ============================================================

function processChildrenOptimized(
  children: TemplateChildNode[],
  varCounter: Map<string, number>,
  elementVars: Array<{ varName: string; tag: string }>,
  dynamicBindings: Array<{ varName: string; code: string }>,
  consumedCount: Map<string, number>,
  usedRuntime: Set<string>,
  options: SignalCodegenOptions,
): void {
  for (const child of children) {
    if (child.type === NodeTypes.ELEMENT) {
      processElementOptimized(
        child as ElementNode,
        varCounter,
        elementVars,
        dynamicBindings,
        consumedCount,
        usedRuntime,
        options,
      );
    } else if (child.type === NodeTypes.JS_CONDITIONAL_EXPRESSION) {
      processConditionalOptimized(
        child as JSConditionalExpression,
        varCounter,
        elementVars,
        dynamicBindings,
        undefined,
        consumedCount,
        usedRuntime,
        options,
      );
    } else if (child.type === NodeTypes.JS_CALL_EXPRESSION) {
      processCallExpressionOptimized(
        child as JSCallExpression,
        varCounter,
        elementVars,
        dynamicBindings,
        usedRuntime,
        options,
      );
    }
  }
}

// ============================================================
// 优化的元素处理
// ============================================================

/**
 * 元素的"渲染修饰符"：来自 v-once / v-memo，会沿元素树向下传
 */
interface ElementModifiers {
  /** v-once：只渲染一次，不建立响应式 effect */
  once?: boolean;
  /** v-memo：依赖数组表达式（已按 `_c.` 前缀化） */
  memo?: string;
}

function processElementOptimized(
  node: ElementNode,
  varCounter: Map<string, number>,
  elementVars: Array<{ varName: string; tag: string }>,
  dynamicBindings: Array<{ varName: string; code: string }>,
  consumedCount: Map<string, number>,
  usedRuntime: Set<string>,
  options: SignalCodegenOptions,
  mods?: ElementModifiers,
): void {
  // v-once / v-memo：此前两条指令在 Signal 模式被静默丢弃（switch 无对应分支），
  // 元素照常建立响应式 effect —— 语义完全丢失。这里显式实现：
  //   v-once → 去掉 effect 包裹，只渲染一次
  //   v-memo → 用依赖数组做守卫，依赖未变则不重新渲染
  const ownMods: ElementModifiers = { ...(mods ?? {}) };

  // 注意：transformOnce / transformVMemo 已经把 v-once、v-memo 指令**从 props 里摘掉**了，
  // 所以这里不能再去 props 里找指令，而要读转换留下的痕迹：
  //   - v-once：transformOnce 把元素的 codegenNode 换成了 `_hoisted_N` 引用
  //   - v-memo：transformVMemo 把依赖信息写进了元素元数据（getMemoMeta）
  const maybeCodegen = node.codegenNode as unknown as
    | { type?: number; content?: unknown }
    | undefined;
  if (maybeCodegen && maybeCodegen.type === NodeTypes.SIMPLE_EXPRESSION) {
    const content = maybeCodegen.content;
    if (typeof content === 'string' && content.startsWith('_hoisted_')) {
      ownMods.once = true;
    }
  }

  const memoMeta = getMemoMeta(node);
  if (memoMeta && memoMeta.deps) {
    ownMods.memo = prefixIdentifiers(memoMeta.deps, new Set()).replace(/\b_ctx\./g, '_c.');
  }

  // 本元素自身的绑定先收集到局部数组，随后按 once/memo 语义统一后处理
  const ownBindings: Array<{ varName: string; code: string }> = [];
  const sink = ownMods.once || ownMods.memo ? ownBindings : dynamicBindings;

  // 组件：生成 mountComponent(_c.Tag, props, 占位元素) 调用
  if (node.tagType === ElementTypes.COMPONENT) {
    const hostIdx = findElementIndex(elementVars, 'lyt-comp', consumedCount);
    const hostVar = hostIdx !== null ? elementVars[hostIdx]!.varName : `_${elementVars.length}`;

    usedRuntime.add('mountComponent');
    const mc = getShortName('mountComponent', options.useShortNames ?? true);
    const propsObj = buildComponentPropsObject(node);
    // 子内容 → 默认插槽（vnode 形态，slot 契约要求返回 vnode）
    const slotsObj = buildComponentSlotsObjectOptimized(node, usedRuntime, options);
    const slotsArg = slotsObj ? `,${slotsObj}` : '';

    sink.push({
      varName: hostVar,
      code: `${mc}(_c.${node.tag},${propsObj},${hostVar}${slotsArg});`,
    });
    return;
  }

  // 使用索引变量名
  const idx = findElementIndex(elementVars, node.tag, consumedCount);
  const varName = idx !== null ? elementVars[idx]!.varName : `_${elementVars.length}`;

  // 处理 props（指令）
  for (let i = 0; i < node.props.length; i++) {
    const prop = node.props[i];
    if (!prop) continue;
    if (prop.type === NodeTypes.DIRECTIVE) {
      const dir = prop as DirectiveNode;
      // 处理 v-text 和 v-html 的特殊解析
      if ((dir.name === 'text' || dir.name === 'html') && !dir.exp) {
        for (let j = i + 1; j < node.props.length; j++) {
          const nextProp = node.props[j];
          if (nextProp?.type === NodeTypes.ATTRIBUTE) {
            const eqMatch = nextProp.name.match(/^="(.*)"$/);
            if (eqMatch) {
              dir.exp = createSimpleExpressionFor(eqMatch[1]!, dir.loc);
              break;
            }
          }
        }
      }
      processDirectiveOptimized(dir, varName, node.tag, dynamicBindings, usedRuntime, options);
    }
  }

  // 处理 codegenNode 中的属性
  if (node.codegenNode && node.codegenNode.type === NodeTypes.VNODE_CALL) {
    const vnode = node.codegenNode as VNodeCall;
    processVNodeCallPropsOptimized(vnode, varName, dynamicBindings, usedRuntime, options);
  }

  // 处理子节点
  for (const child of node.children) {
    if (child.type === NodeTypes.INTERPOLATION) {
      const exp = getExpContent((child as InterpolationNode).content as SimpleExpressionNode);
      if (!exp || !/^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/.test(exp)) {
        continue;
      }

      // 优化：检查是否为简单属性访问，可以内联
      if (options.inlineSimpleExpressions && isSimplePropertyAccess(exp)) {
        usedRuntime.add('effect');
        usedRuntime.add('setText');
        const e = getShortName('effect', options.useShortNames ?? true);
        const st = getShortName('setText', options.useShortNames ?? true);
        sink.push({
          varName,
          code: `${e}(()=>${st}(${varName},_c.${exp}));`,
        });
      } else {
        usedRuntime.add('effect');
        usedRuntime.add('setText');
        const e = getShortName('effect', options.useShortNames ?? true);
        const st = getShortName('setText', options.useShortNames ?? true);
        sink.push({
          varName,
          code: `${e}(()=>${st}(${varName},_c.${exp}));`,
        });
      }
    } else if (child.type === NodeTypes.ELEMENT) {
      processElementOptimized(
        child as ElementNode,
        varCounter,
        elementVars,
        dynamicBindings,
        consumedCount,
        usedRuntime,
        options,
        ownMods.once || ownMods.memo ? ownMods : undefined,
      );
    } else if (child.type === NodeTypes.JS_CONDITIONAL_EXPRESSION) {
      processConditionalOptimized(
        child as JSConditionalExpression,
        varCounter,
        elementVars,
        dynamicBindings,
        varName,
        consumedCount,
        usedRuntime,
        options,
      );
    } else if (child.type === NodeTypes.JS_CALL_EXPRESSION) {
      processCallExpressionOptimized(
        child as JSCallExpression,
        varCounter,
        elementVars,
        dynamicBindings,
        usedRuntime,
        options,
        varName,
      );
    }
  }

  // v-once / v-memo 的统一后处理
  if (sink === ownBindings && ownBindings.length > 0) {
    dynamicBindings.push(
      ...applyElementModifiers(ownBindings, ownMods, varCounter, usedRuntime, options),
    );
  }
}

// ============================================================
// 检查是否为简单属性访问
// ============================================================

function isSimplePropertyAccess(exp: string): boolean {
  // 简单属性访问：a.b.c 或 a
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/.test(exp);
}

// ============================================================
// 优化的指令处理
// ============================================================

const VALID_EXPRESSION = /^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/;
const VALID_ATTRIBUTE_NAME = /^[a-zA-Z][a-zA-Z0-9-:]*$/;
const VALID_EVENT_NAME = /^[a-zA-Z][a-zA-Z0-9-]*$/;

function validateExpression(exp: string | undefined, context: string): void {
  if (!exp) return;
  if (!VALID_EXPRESSION.test(exp)) {
    throw new Error(
      `[lytjs/compiler] Invalid expression in ${context}: "${exp}"` +
        `\n  Suggestion: Ensure the expression contains valid JavaScript syntax.`,
    );
  }
}

function processDirectiveOptimized(
  dir: DirectiveNode,
  varName: string,
  tag: string,
  dynamicBindings: Array<{ varName: string; code: string }>,
  usedRuntime: Set<string>,
  options: SignalCodegenOptions,
): void {
  const expContent = dir.exp ? getExpContent(dir.exp as SimpleExpressionNode) : undefined;
  const argContent = dir.arg ? getExpContent(dir.arg as SimpleExpressionNode) : undefined;

  validateExpression(expContent, `v-${dir.name}`);
  validateExpression(argContent, `v-${dir.name} argument`);

  if (dir.name === 'bind' && argContent && !VALID_ATTRIBUTE_NAME.test(argContent)) {
    throw new Error(
      `[lytjs/compiler] Invalid attribute name: "${argContent}"` +
        `\n  Suggestion: Attribute names must start with a letter and contain only letters, numbers, or hyphens.`,
    );
  }
  if (dir.name === 'on' && argContent && !VALID_EVENT_NAME.test(argContent)) {
    throw new Error(
      `[lytjs/compiler] Invalid event name: "${argContent}"` +
        `\n  Suggestion: Event names must start with a letter and contain only letters, numbers, or hyphens.`,
    );
  }

  switch (dir.name) {
    case 'if': {
      if (expContent) {
        usedRuntime.add('effect');
        usedRuntime.add('insert');
        usedRuntime.add('remove');
        const e = getShortName('effect', options.useShortNames ?? true);
        const ins = getShortName('insert', options.useShortNames ?? true);
        const rm = getShortName('remove', options.useShortNames ?? true);
        dynamicBindings.push({
          varName,
          code: `let _f=null;${e}(()=>{if(_c.${expContent}){if(!_f){_f=${varName};${ins}(_f, _n);}}else{if(_f){${rm}(_f);_f=null;}}});`,
        });
      }
      break;
    }

    case 'show': {
      if (expContent) {
        usedRuntime.add('effect');
        const e = getShortName('effect', options.useShortNames ?? true);
        dynamicBindings.push({
          varName,
          code: `${e}(()=>{${varName}.style.display=_c.${expContent}?'':'none';});`,
        });
      }
      break;
    }

    case 'text': {
      if (expContent) {
        usedRuntime.add('effect');
        usedRuntime.add('setText');
        const e = getShortName('effect', options.useShortNames ?? true);
        const st = getShortName('setText', options.useShortNames ?? true);
        dynamicBindings.push({
          varName,
          code: `${e}(()=>${st}(${varName},_c.${expContent}));`,
        });
      }
      break;
    }

    case 'html': {
      if (expContent) {
        usedRuntime.add('effect');
        usedRuntime.add('setHTML');
        const e = getShortName('effect', options.useShortNames ?? true);
        const sh = getShortName('setHTML', options.useShortNames ?? true);
        dynamicBindings.push({
          varName,
          code: `${e}(()=>${sh}(${varName},_c.${expContent}));`,
        });
      }
      break;
    }

    case 'bind': {
      if (argContent && expContent) {
        usedRuntime.add('effect');
        const e = getShortName('effect', options.useShortNames ?? true);
        const sc = getShortName('setClass', options.useShortNames ?? true);
        const ss = getShortName('setStyle', options.useShortNames ?? true);
        const sa = getShortName('setAttribute', options.useShortNames ?? true);
        if (argContent === 'class') {
          usedRuntime.add('setClass');
          dynamicBindings.push({
            varName,
            code: `${e}(()=>${sc}(${varName},_c.${expContent}));`,
          });
        } else if (argContent === 'style') {
          usedRuntime.add('setStyle');
          dynamicBindings.push({
            varName,
            code: `${e}(()=>${ss}(${varName},_c.${expContent}));`,
          });
        } else {
          usedRuntime.add('setAttribute');
          dynamicBindings.push({
            varName,
            code: `${e}(()=>${sa}(${varName},'${argContent}',_c.${expContent}));`,
          });
        }
      }
      break;
    }

    case 'on': {
      if (argContent && expContent) {
        usedRuntime.add('createEventHandler');
        usedRuntime.add('onCleanup');
        const cev = getShortName('createEventHandler', options.useShortNames ?? true);
        const oc = getShortName('onCleanup', options.useShortNames ?? true);
        if (dir.modifiers.length > 0) {
          const mods = dir.modifiers.map((m) => `${m}:1`).join(',');
          dynamicBindings.push({
            varName,
            code: `${oc}(${cev}(${varName},'${argContent}',_c.${expContent},{${mods}}));`,
          });
        } else {
          dynamicBindings.push({
            varName,
            code: `${oc}(${cev}(${varName},'${argContent}',_c.${expContent}));`,
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

        let eventName = 'input';
        const getValueExpr = '$e.target.value';

        if (tagLower === 'select') {
          eventName = 'change';
        } else if (isLazy) {
          eventName = 'change';
        }

        let setValueExpr = getValueExpr;
        if (isNumber && isTrim) {
          setValueExpr = `Number((${getValueExpr}).trim())`;
        } else if (isNumber) {
          setValueExpr = `Number(${getValueExpr})`;
        } else if (isTrim) {
          setValueExpr = `(${getValueExpr}).trim()`;
        }

        usedRuntime.add('effect');
        usedRuntime.add('createEventHandler');
        usedRuntime.add('onCleanup');

        const e = getShortName('effect', options.useShortNames ?? true);
        const cev = getShortName('createEventHandler', options.useShortNames ?? true);
        const oc = getShortName('onCleanup', options.useShortNames ?? true);

        dynamicBindings.push({
          varName,
          code: `${e}(()=>{${varName}.value=_c.${expContent};});`,
        });
        dynamicBindings.push({
          varName,
          code: `${oc}(${cev}(${varName},'${eventName}',($e)=>{_c.${expContent}=${setValueExpr};}));`,
        });
      }
      break;
    }
  }
}

// ============================================================
// 优化的 VNodeCall props 处理
// ============================================================

function processVNodeCallPropsOptimized(
  vnode: VNodeCall,
  varName: string,
  dynamicBindings: Array<{ varName: string; code: string }>,
  usedRuntime: Set<string>,
  options: SignalCodegenOptions,
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
      usedRuntime.add('effect');
      usedRuntime.add('setText');
      const e = getShortName('effect', options.useShortNames ?? true);
      const st = getShortName('setText', options.useShortNames ?? true);
      dynamicBindings.push({
        varName,
        code: `${e}(()=>${st}(${varName},${value}));`,
      });
    } else if (key === 'innerHTML') {
      usedRuntime.add('effect');
      usedRuntime.add('setHTML');
      const e = getShortName('effect', options.useShortNames ?? true);
      const sh = getShortName('setHTML', options.useShortNames ?? true);
      dynamicBindings.push({
        varName,
        code: `${e}(()=>${sh}(${varName},${value}));`,
      });
    }
  }
}

// ============================================================
// 优化的条件表达式处理
// ============================================================

function processConditionalOptimized(
  node: JSConditionalExpression,
  varCounter: Map<string, number>,
  _elementVars: Array<{ varName: string; tag: string }>,
  dynamicBindings: Array<{ varName: string; code: string }>,
  parentVar: string | undefined,
  _consumedCount: Map<string, number>,
  usedRuntime: Set<string>,
  options: SignalCodegenOptions,
): void {
  const testExpr = getTestExpr(node.test);

  if (!testExpr || testExpr.trim() === '') {
    throw new Error(
      `[lytjs/compiler] v-if/v-else-if condition is empty or invalid.` +
        `\n  Suggestion: Provide a valid expression for v-if, e.g., v-if="isVisible" or v-if="count > 0".`,
    );
  }

  const branches: Array<{
    condition: string | null;
    branch: JSChildNode | TemplateChildNode | TemplateChildNode[] | string | undefined;
  }> = [];

  branches.push({ condition: testExpr, branch: node.consequent });

  let alternate = node.alternate;
  while (alternate) {
    if (
      typeof alternate !== 'string' &&
      !Array.isArray(alternate) &&
      alternate.type === NodeTypes.JS_CONDITIONAL_EXPRESSION
    ) {
      const altCond = alternate as JSConditionalExpression;
      const altTestExpr = getTestExpr(altCond.test);
      branches.push({ condition: altTestExpr || null, branch: altCond.consequent });
      alternate = altCond.alternate;
    } else {
      branches.push({ condition: null, branch: alternate });
      alternate = undefined;
    }
  }

  usedRuntime.add('effect');
  usedRuntime.add('createTemplate');
  usedRuntime.add('insert');
  usedRuntime.add('remove');

  const e = getShortName('effect', options.useShortNames ?? true);
  const ins = getShortName('insert', options.useShortNames ?? true);
  const rm = getShortName('remove', options.useShortNames ?? true);

  const containerVar = parentVar ?? '_n';
  const ifDepth = varCounter.get('_if_depth') ?? 0;
  const ifVarName = `_i${varCounter.get(`_if_${ifDepth}`) ?? 0}`;
  varCounter.set(`_if_${ifDepth}`, (varCounter.get(`_if_${ifDepth}`) ?? 0) + 1);
  varCounter.set('_if_depth', ifDepth + 1);

  let code = `let ${ifVarName}El=null,${ifVarName}Idx=-1;${e}(()=>{`;
  const branchHTMLs: string[] = [];

  for (let i = 0; i < branches.length; i++) {
    const branchInfo = branches[i]!;
    const branchHTML = serializeBranchHTML(branchInfo.branch);
    branchHTMLs.push(branchHTML);

    if (i > 0) code += 'else ';
    if (branchInfo.condition !== null) {
      code += `if(_c.${branchInfo.condition})`;
    }
    code += `{if(${ifVarName}Idx!==${i}){`;
    if (i === 0) {
      code += `if(${ifVarName}El){${rm}(${ifVarName}El);${ifVarName}El=null;}`;
    }
    code += `${ifVarName}El=createTemplate(${JSON.stringify(branchHTML)}).firstElementChild;`;
    code += `if(!${ifVarName}El)${ifVarName}El=document.createComment('');`;
    code += `${ins}(${ifVarName}El,${containerVar});`;
    code += `${ifVarName}Idx=${i};`;
    code += `}}`;
  }

  code += `else{if(${ifVarName}El){${rm}(${ifVarName}El);${ifVarName}El=null;${ifVarName}Idx=-1;}}`;
  code += '});';

  dynamicBindings.push({ varName: containerVar, code });

  varCounter.set('_if_depth', ifDepth);
}

// ============================================================
// 优化的调用表达式处理
// ============================================================

function processCallExpressionOptimized(
  node: JSCallExpression,
  _varCounter: Map<string, number>,
  _elementVars: Array<{ varName: string; tag: string }>,
  dynamicBindings: Array<{ varName: string; code: string }>,
  usedRuntime: Set<string>,
  options: SignalCodegenOptions,
  parentVar?: string,
): void {
  const callee = typeof node.callee === 'string' ? node.callee : String(node.callee);

  if (callee === 'RENDER_LIST' || callee === 'renderList') {
    const sourceExpr = node.arguments[0];
    const renderFn = node.arguments[1];

    const source = getTestExpr(sourceExpr as JSChildNode | string | undefined);
    if (!source) return;

    let itemVar = 'item';
    let keyExpr = '';
    let createBody = '';
    let updateBody = '';
    let renderItem: VNodeCall | null = null;

    if (renderFn && typeof renderFn !== 'string' && !Array.isArray(renderFn)) {
      if (renderFn.type === NodeTypes.COMPOUND_EXPRESSION) {
        const compound = renderFn as CompoundExpressionNode;
        for (const child of compound.children) {
          if (typeof child === 'string') {
            const match = child.match(/\((\w+)/);
            if (match) {
              itemVar = match[1]!;
            }
          }
        }
        for (const child of compound.children) {
          if (typeof child !== 'string' && child.type === NodeTypes.VNODE_CALL) {
            const vnode = child as VNodeCall;
            renderItem = vnode;
            const tagInfo = extractTagFromVNode(vnode);
            if (tagInfo) {
              createBody = `const ${tagInfo.varName}=document.createElement('${tagInfo.tag}');`;

              // 子节点内容：此前只认「字符串」和「裸 SIMPLE_EXPRESSION」两种形态，
              // 而模板插值 `{{ item.name }}` 在 transform 后是
              // JS_CALL_EXPRESSION(TO_DISPLAY_STRING)，于是列表项里的文本被整体丢弃
              // （产物只剩 createElement + return）。同时旧代码把表达式写成
              // `${itemVar}.${content}`，会产出 `item.item.name` 这种错误路径。
              const itemText = extractItemTextExpr(vnode.children, itemVar);
              if (itemText.static !== undefined) {
                createBody += `${tagInfo.varName}.textContent=${itemText.static};`;
              } else if (itemText.dynamic !== undefined) {
                createBody += `${tagInfo.varName}.textContent=${itemText.dynamic};`;
                // updates 由 reconcileArray 的 update 回调驱动，元素参数名固定为 _el
                updateBody += `_el.textContent=${itemText.dynamic};`;
              }

              // 属性：静态值写死，动态值在 update 里同步（:key 除外）
              const propResult = buildItemProps(vnode, itemVar, tagInfo.varName);
              createBody += propResult.create;
              updateBody += propResult.update;

              createBody += `return ${tagInfo.varName};`;
            }
          }
        }
      }
    }

    // :key 优先取用户表达式；缺失时回退 item.id 并提示（与 codegen-signal 非优化版一致）
    keyExpr = extractItemKeyExpr(renderItem, itemVar);
    if (!keyExpr) {
      if (__DEV__) {
        console.warn(
          `[lytjs/compiler] v-for is missing a "key" attribute. ` +
            `This may cause performance issues and incorrect DOM updates. ` +
            `Add a unique :key binding to the v-for element, e.g., :key="item.id" or :key="index".`,
        );
      }
      keyExpr = `${itemVar}.id`;
    }
    const containerVar = parentVar ?? '_n';

    usedRuntime.add('effect');
    usedRuntime.add('reconcileArray');
    const e = getShortName('effect', options.useShortNames ?? true);
    const ra = getShortName('reconcileArray', options.useShortNames ?? true);

    const updatePart = updateBody ? `,update:(_el,${itemVar})=>{${updateBody}}` : '';
    dynamicBindings.push({
      varName: containerVar,
      code: `${e}(()=>${ra}(${containerVar},_c.${source},{key:(${itemVar})=>${keyExpr},create:(${itemVar})=>{${createBody}}${updatePart}}));`,
    });
  }
}

// ============================================================
// Helper 函数
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

function findElementIndex(
  elementVars: Array<{ varName: string; tag: string }>,
  tag: string,
  consumedCount?: Map<string, number>,
): number | null {
  const matching = elementVars.filter((v) => v.tag === tag);
  if (matching.length > 0) {
    const idx = consumedCount?.get(tag) ?? 0;
    consumedCount?.set(tag, idx + 1);
    return elementVars.indexOf(matching[idx]!);
  }
  return null;
}

function getExpContent(node: SimpleExpressionNode | CompoundExpressionNode | undefined): string {
  if (!node) return '';
  if (node.type === NodeTypes.SIMPLE_EXPRESSION) return node.content;
  return node.children
    .map((c) => {
      if (typeof c === 'string') return c;
      if (c.type === NodeTypes.SIMPLE_EXPRESSION) return c.content;
      return '';
    })
    .join('');
}

function getTestExpr(test: JSChildNode | string | undefined): string {
  if (!test) return '';
  if (typeof test === 'string') return test;
  if (test.type === NodeTypes.SIMPLE_EXPRESSION) return test.content;
  if (test.type === NodeTypes.COMPOUND_EXPRESSION) {
    return getExpContent(test as CompoundExpressionNode);
  }
  return '';
}

function extractTagFromVNode(vnode: VNodeCall): { tag: string; varName: string } | null {
  if (typeof vnode.tag === 'string') {
    const tag = vnode.tag.replace(/^"|"$/g, '');
    return { tag, varName: `_${tag}` };
  }
  return null;
}

function serializeBranchHTML(
  branch: JSChildNode | TemplateChildNode | TemplateChildNode[] | string | undefined,
): string {
  if (!branch) return '';
  if (typeof branch === 'string') return branch;
  if (Array.isArray(branch)) {
    return branch.map((item) => serializeBranchHTML(item)).join('');
  }
  if (branch.type === NodeTypes.VNODE_CALL) {
    const vnode = branch as VNodeCall;
    if (typeof vnode.tag === 'string') {
      const tag = vnode.tag.replace(/^"|"$/g, '');
      let attrs = '';
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
              if (!value.includes('_ctx') && !value.includes('(')) {
                attrs += ` ${key}="${escapeHtmlStatic(value.replace(/^"|"$/g, ''))}"`;
              }
            }
          }
        }
      }
      let childrenHTML = '';
      if (vnode.children) {
        if (typeof vnode.children === 'string') {
          childrenHTML = vnode.children;
        } else if (Array.isArray(vnode.children)) {
          childrenHTML = vnode.children.map((c) => serializeBranchHTML(c)).join('');
        }
      }
      return `<${tag}${attrs}>${childrenHTML}</${tag}>`;
    }
  }
  if (branch.type === NodeTypes.ELEMENT) {
    return serializeStaticHTMLOptimized(branch as ElementNode, new Map(), []);
  }
  return '';
}

// ============================================================
// 导出
// ============================================================

export { RUNTIME_SHORT_NAMES };

// ============================================================
// v-for 项内容 / 属性 / key 提取（优化版）
// ============================================================

/**
 * 让表达式在 v-for 项回调里可用。
 *
 * 回调参数（如 `item`）是局部变量不能加前缀；其余标识符在本模式下前缀为 `_c.`
 * （render 的上下文形参名是 `_c`，不是 `_ctx`）。
 */
function toItemExpr(content: string, itemVar: string): string {
  return prefixIdentifiers(content, new Set([itemVar])).replace(/\b_ctx\./g, '_c.');
}

/**
 * 提取列表项元素的文本内容。
 *
 * 支持：静态字符串 / 插值（TO_DISPLAY_STRING）/ 裸表达式 / 静态文本数组。
 * 返回 `{ static }` 或 `{ dynamic }`；无法静态确定时返回空对象（不生成内容）。
 */
function extractItemTextExpr(
  children: VNodeCall['children'],
  itemVar: string,
): { static?: string; dynamic?: string } {
  if (children === undefined || children === null) return {};

  if (typeof children === 'string') {
    return { static: JSON.stringify(children) };
  }

  if (Array.isArray(children)) {
    const parts: string[] = [];
    let allStatic = true;
    for (const child of children) {
      const result = extractItemTextExpr(child as VNodeCall['children'], itemVar);
      if (result.static !== undefined) {
        parts.push(result.static);
      } else if (result.dynamic !== undefined) {
        parts.push(result.dynamic);
        allStatic = false;
      } else {
        return {};
      }
    }
    if (parts.length === 0) return {};
    const joined = parts.join(' + ');
    return allStatic ? { static: joined } : { dynamic: joined };
  }

  if (typeof children !== 'object') return {};

  const node = children as {
    type?: number;
    callee?: unknown;
    arguments?: unknown[];
    content?: string;
  };

  if (node.type === NodeTypes.JS_CALL_EXPRESSION) {
    const callee = typeof node.callee === 'string' ? node.callee : String(node.callee);
    if (callee === 'TO_DISPLAY_STRING' || callee === 'toDisplayString') {
      const arg = (node.arguments ?? [])[0] as { content?: string } | string | undefined;
      const content = typeof arg === 'string' ? arg : arg?.content;
      if (content) return { dynamic: toItemExpr(content, itemVar) };
    }
    return {};
  }

  if (node.type === NodeTypes.SIMPLE_EXPRESSION && typeof node.content === 'string') {
    return { dynamic: toItemExpr(node.content, itemVar) };
  }

  return {};
}

/**
 * 提取列表项的 :key 表达式（用户未写则返回空串）
 */
function extractItemKeyExpr(vnode: VNodeCall | null, itemVar: string): string {
  if (!vnode || !vnode.props || vnode.props.type !== NodeTypes.JS_OBJECT_EXPRESSION) return '';
  const objExpr = vnode.props as JSObjectExpression;
  for (const prop of objExpr.properties) {
    if (prop.type !== NodeTypes.JS_PROPERTY) continue;
    const jsProp = prop as JSProperty;
    const key = jsProp.key;
    const value = jsProp.value;
    if (
      key &&
      typeof key !== 'string' &&
      !Array.isArray(key) &&
      key.type === NodeTypes.SIMPLE_EXPRESSION &&
      key.content.replace(/^"|"$/g, '') === 'key' &&
      value &&
      typeof value !== 'string' &&
      !Array.isArray(value) &&
      value.type === NodeTypes.SIMPLE_EXPRESSION
    ) {
      return toItemExpr(value.content, itemVar);
    }
  }
  return '';
}

/**
 * 生成列表项属性（跳过事件与 :key）
 */
function buildItemProps(
  vnode: VNodeCall,
  itemVar: string,
  elVar: string,
): { create: string; update: string } {
  let create = '';
  let update = '';
  if (!vnode.props || vnode.props.type !== NodeTypes.JS_OBJECT_EXPRESSION)
    return { create, update };

  const objExpr = vnode.props as JSObjectExpression;
  for (const prop of objExpr.properties) {
    if (prop.type !== NodeTypes.JS_PROPERTY) continue;
    const jsProp = prop as JSProperty;
    const key = jsProp.key;
    const value = jsProp.value;
    if (
      !key ||
      typeof key === 'string' ||
      Array.isArray(key) ||
      key.type !== NodeTypes.SIMPLE_EXPRESSION ||
      !value ||
      typeof value === 'string' ||
      Array.isArray(value) ||
      value.type !== NodeTypes.SIMPLE_EXPRESSION
    ) {
      continue;
    }
    const propName = key.content.replace(/^"|"$/g, '');
    if (propName === 'key') continue;
    if (
      propName.startsWith('on') &&
      propName.length > 2 &&
      propName[2] === propName[2]!.toUpperCase()
    ) {
      continue;
    }

    const rawValue = value.content;
    const isStaticLiteral = /^["']/.test(rawValue);
    if (isStaticLiteral) {
      // 静态字面量：只在 create 里写一次
      const literal = rawValue.replace(/^"|"$/g, '');
      create += `${elVar}.setAttribute(${JSON.stringify(propName)}, ${JSON.stringify(literal)});`;
    } else {
      // 动态绑定：create 用新建元素，update 用 reconcileArray 传入的 _el
      const expr = toItemExpr(rawValue, itemVar);
      create += `${elVar}.setAttribute(${JSON.stringify(propName)}, ${expr});`;
      update += `_el.setAttribute(${JSON.stringify(propName)}, ${expr});`;
    }
  }
  return { create, update };
}

/**
 * 构造传给组件的 props 对象字面量。
 *
 * 静态属性原样写入；v-bind 的表达式按 `_c.` 前缀化（本模式上下文形参是 `_c`）。
 * 事件（v-on）暂不参与（Vapor 组件事件绑定留待后续版本）。
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
      const expr = prefixIdentifiers(raw, new Set()).replace(/\b_ctx\./g, '_c.');

      if (dir.name === 'bind') {
        parts.push(`${JSON.stringify(key)}:${expr}`);
        continue;
      }

      // 组件事件：@click="fn" → `onClick: _c.fn`（与 emit()/toHandlerKey() 约定对齐）
      if (dir.name === 'on') {
        parts.push(`${JSON.stringify(toComponentEventKey(key))}:${expr}`);
      }
    }
  }

  return `{${parts.join(',')}}`;
}

/**
 * `RENDER_LIST` 调用（v-for 产物）→ `...((source).map((item,i)=>vnode))`（优化版）
 *
 * 循环变量作为 `locals` 传入 `prefixIdentifiers`，避免 `item.id` 被误加 `_ctx.`/`_c.` 前缀。
 * 严格模式：任一段无法完整还原即整体返回 null。
 */
export function serializeListVNodeOptimized(
  node: unknown,
  usedRuntime: Set<string>,
  options: SignalCodegenOptions,
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

  const inner = serializeVNodeCallOptimized(vnodeNode, usedRuntime, options, innerLocals);
  if (!inner) return null;

  const srcExpr = prefixIdentifiers(src, locals).replace(/\b_ctx\./g, '_c.');
  return `...(${srcExpr}.map((${params.join(',')})=>${inner}))`;
}

/**
 * `JS_CONDITIONAL_EXPRESSION`（v-if 产物）→ `(cond ? vnode : null)`（优化版）
 *
 * v-else / v-else-if（alternate 非空）与无法完整还原的情况一律返回 null。
 */
export function serializeConditionalVNodeOptimized(
  node: unknown,
  usedRuntime: Set<string>,
  options: SignalCodegenOptions,
  locals: ReadonlySet<string> = new Set(),
): string | null {
  const cond = node as { test?: unknown; consequent?: unknown; alternate?: unknown };
  if (!cond || !cond.test) return null;
  if (cond.alternate) return null;

  const testExp = getExpContent(cond.test as SimpleExpressionNode);
  if (!testExp) return null;

  const inner = serializeVNodeCallOptimized(cond.consequent, usedRuntime, options, locals);
  if (!inner) return null;

  const expr = prefixIdentifiers(testExp, locals).replace(/\b_ctx\./g, '_c.');
  return `(${expr}?${inner}:null)`;
}

/** `VNODE_CALL` → `${cv}(tag, props, children)`（优化版；严格模式，失败即 null） */
export function serializeVNodeCallOptimized(
  vnode: unknown,
  usedRuntime: Set<string>,
  options: SignalCodegenOptions,
  locals: ReadonlySet<string> = new Set(),
): string | null {
  const vn = vnode as { type?: number; tag?: unknown; props?: unknown; children?: unknown };
  if (!vn || vn.type !== NodeTypes.VNODE_CALL) return null;
  if (typeof vn.tag !== 'string' || !vn.tag) return null;

  const cv = getShortName('createVNode', options.useShortNames ?? true);
  usedRuntime.add('createVNode');

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
      const expr = prefixIdentifiers(valCode, locals).replace(/\b_ctx\./g, '_c.');
      parts.push(`${keyCode}:${expr}`);
    }
    propsCode = `{${parts.join(',')}}`;
  }

  const childrenCode = serializeVNodeCallChildrenOptimized(
    vn.children,
    usedRuntime,
    options,
    locals,
  );
  if (childrenCode === null) return null;

  // 组件 tag 是**裸名**必须前缀化；HTML 标签已是 JSON 字符串
  const tagCode = (vn as { isComponent?: boolean }).isComponent ? `_c.${vn.tag}` : vn.tag;

  return `${cv}(${tagCode},${propsCode},${childrenCode})`;
}

/** `VNODE_CALL.children` → 数组代码（优化版）；无法完整识别返回 null */
export function serializeVNodeCallChildrenOptimized(
  children: unknown,
  usedRuntime: Set<string>,
  options: SignalCodegenOptions,
  locals: ReadonlySet<string> = new Set(),
): string | null {
  if (children === undefined || children === null) return 'null';

  if (typeof children === 'string') {
    if (!children.trim()) return 'null';
    usedRuntime.add('createVNode');
    usedRuntime.add('Text');
    const cv = getShortName('createVNode', options.useShortNames ?? true);
    const tx = getShortName('Text', options.useShortNames ?? true);
    return `[${cv}(${tx},null,${JSON.stringify(children)})]`;
  }

  if (Array.isArray(children)) {
    const parts: string[] = [];
    for (const ch of children) {
      const code = serializeVNodeCallChildOptimized(ch, usedRuntime, options, locals);
      if (code === null) return null;
      parts.push(code);
    }
    return parts.length ? `[${parts.join(',')}]` : 'null';
  }

  const one = serializeVNodeCallChildOptimized(children, usedRuntime, options, locals);
  return one === null ? null : `[${one}]`;
}

/** 单个 child → vnode 代码（优化版）；无法识别返回 null */
export function serializeVNodeCallChildOptimized(
  child: unknown,
  usedRuntime: Set<string>,
  options: SignalCodegenOptions,
  locals: ReadonlySet<string> = new Set(),
): string | null {
  if (!child || typeof child !== 'object') return null;
  const node = child as { type?: number };

  if (node.type === NodeTypes.JS_CALL_EXPRESSION) {
    const call = child as { callee?: unknown; arguments?: unknown[] };
    if (call.callee !== 'TO_DISPLAY_STRING') return null;
    const arg = (call.arguments && call.arguments[0]) as SimpleExpressionNode | undefined;
    const exp = arg && typeof arg.content === 'string' ? arg.content : null;
    if (!exp) return null;
    usedRuntime.add('createVNode');
    usedRuntime.add('Text');
    const cv = getShortName('createVNode', options.useShortNames ?? true);
    const tx = getShortName('Text', options.useShortNames ?? true);
    const expr = prefixIdentifiers(exp, locals).replace(/\b_ctx\./g, '_c.');
    return `${cv}(${tx},null,${expr})`;
  }

  if (node.type === NodeTypes.ELEMENT) {
    return serializeVNodeElementOptimized(child as ElementNode, usedRuntime, options, locals);
  }

  // 嵌套 vnode（transform 已把子元素转成 VNODE_CALL）
  if (node.type === NodeTypes.VNODE_CALL) {
    return serializeVNodeCallOptimized(child, usedRuntime, options, locals);
  }

  return null;
}

/**
 * 把组件的子内容编译为「插槽对象」字面量：`{default:()=>[vnode,...]}`
 *
 * 优化版：vnode 构造使用短别名（createVNode/Text），并登记到 usedRuntime 以便生成 import。
 */
function buildComponentSlotsObjectOptimized(
  node: ElementNode,
  usedRuntime: Set<string>,
  options: SignalCodegenOptions,
  locals: ReadonlySet<string> = new Set(),
): string | null {
  const parts = collectSlotVNodesOptimized(node.children, usedRuntime, options, locals);
  if (parts.length === 0) return null;
  return `{default:()=>[${parts.join(',')}]}`;
}

/** 递归收集子节点对应的 vnode 构造代码（跳过注释与动态内容） */
function collectSlotVNodesOptimized(
  children: TemplateChildNode[],
  usedRuntime: Set<string>,
  options: SignalCodegenOptions,
  locals: ReadonlySet<string> = new Set(),
): string[] {
  const cv = getShortName('createVNode', options.useShortNames ?? true);
  const tx = getShortName('Text', options.useShortNames ?? true);
  const out: string[] = [];

  for (const child of children) {
    if (!child) continue;
    if (child.type === NodeTypes.TEXT) {
      const text = (child as TextNode).content;
      if (text.trim()) {
        usedRuntime.add('createVNode');
        usedRuntime.add('Text');
        out.push(`${cv}(${tx},null,${JSON.stringify(text)})`);
      }
      continue;
    }
    // 插值 → 动态文本 vnode
    if (child.type === NodeTypes.INTERPOLATION) {
      const exp = getExpContent((child as InterpolationNode).content as SimpleExpressionNode);
      if (exp) {
        usedRuntime.add('createVNode');
        usedRuntime.add('Text');
        const expr = prefixIdentifiers(exp, locals).replace(/\b_ctx\./g, '_c.');
        out.push(`${cv}(${tx},null,${expr})`);
      }
      continue;
    }
    // v-if 的产物是条件表达式（元素已被 transform 替换掉）
    if (child.type === NodeTypes.JS_CONDITIONAL_EXPRESSION) {
      const cond = serializeConditionalVNodeOptimized(child, usedRuntime, options, locals);
      if (cond) out.push(cond);
      continue;
    }
    // v-for 的产物是 RENDER_LIST 调用
    if (child.type === NodeTypes.JS_CALL_EXPRESSION) {
      const list = serializeListVNodeOptimized(child, usedRuntime, options, locals);
      if (list) out.push(list);
      continue;
    }
    if (child.type === NodeTypes.ELEMENT) {
      const el = child as ElementNode;
      // 含其它结构性指令（v-for / v-show …）的元素暂不参与插槽编译 —— 宁缺勿错渲
      if (hasUnsupportedSlotDirectiveOptimized(el)) continue;
      out.push(serializeVNodeElementOptimized(el, usedRuntime, options, locals));
    }
  }
  return out;
}

/** 元素是否带有插槽编译尚不支持的结构性指令（只认 v-bind / v-on） */
function hasUnsupportedSlotDirectiveOptimized(node: ElementNode): boolean {
  for (const prop of node.props) {
    if (!prop || prop.type !== NodeTypes.DIRECTIVE) continue;
    const name = (prop as DirectiveNode).name;
    if (name !== 'bind' && name !== 'on') return true;
  }
  return false;
}

/** 单个元素 → `createVNode(tag, attrs, children)`（优化版用短别名） */
function serializeVNodeElementOptimized(
  node: ElementNode,
  usedRuntime: Set<string>,
  options: SignalCodegenOptions,
  locals: ReadonlySet<string> = new Set(),
): string {
  const cv = getShortName('createVNode', options.useShortNames ?? true);
  usedRuntime.add('createVNode');

  if (node.tagType === ElementTypes.COMPONENT) {
    const nestedSlots = buildComponentSlotsObjectOptimized(node, usedRuntime, options, locals);
    const nestedArg = nestedSlots ? `,${nestedSlots}` : '';
    return `${cv}(_c.${node.tag},${buildComponentPropsObject(node)}${nestedArg})`;
  }

  // 元素属性复用一个 props 构造：静态属性 + `:bind` + `@事件`（内部已用 `_c.` 前缀）
  const attrs = node.props.length ? buildComponentPropsObject(node) : 'null';
  const kids = collectSlotVNodesOptimized(node.children, usedRuntime, options, locals);
  const childrenArg = kids.length ? `[${kids.join(',')}]` : 'null';
  return `${cv}(${JSON.stringify(node.tag)},${attrs},${childrenArg})`;
}

/**
 * 把模板里的事件名转成组件的 prop 键名
 *
 * `click` → `onClick`；`my-event` → `onMyEvent`（kebab 先 camelize）。
 * 与 `@lytjs/component` 的 `toHandlerKey()` 保持同一约定。
 */
function toComponentEventKey(event: string): string {
  const camelized = event.replace(/-(\w)/g, (_m, c: string) => c.toUpperCase());
  return `on${camelized.charAt(0).toUpperCase()}${camelized.slice(1)}`;
}

/**
 * 按 v-once / v-memo 语义改写元素的动态绑定
 *
 * - v-once：去掉 `effect(()=>X)` 包裹，只渲染一次
 * - v-memo：用依赖数组守卫包裹，依赖未变化则不重新渲染（仍需要一次 effect 来判断依赖）
 */
function applyElementModifiers(
  bindings: Array<{ varName: string; code: string }>,
  mods: ElementModifiers,
  varCounter: Map<string, number>,
  usedRuntime: Set<string>,
  options: SignalCodegenOptions,
): Array<{ varName: string; code: string }> {
  const e = getShortName('effect', options.useShortNames ?? true);
  const prefix = `${e}(()=>`;

  // 去掉 effect 包裹（v-once / v-memo 内部都不需要逐绑定的 effect）
  const inner = bindings.map((b) => {
    const code = b.code;
    if (code.startsWith(prefix) && code.endsWith(');')) {
      return { varName: b.varName, code: code.slice(prefix.length, -2) + ';' };
    }
    return b;
  });

  if (mods.once) {
    return inner;
  }

  if (mods.memo) {
    usedRuntime.add('effect');
    const depth = varCounter.get('_memo_depth') ?? 0;
    varCounter.set('_memo_depth', depth + 1);
    const memoVar = `_memo_${depth}`;
    const body = inner.map((b) => b.code).join('');

    return [
      {
        varName: inner[0]?.varName ?? '_0',
        code:
          `let ${memoVar}=null;` +
          `${prefix}{const _d=${mods.memo};` +
          `if(!${memoVar}||${memoVar}.some((v,i)=>v!==_d[i])){${memoVar}=_d;${body}}});`,
      },
    ];
  }

  return bindings;
}
