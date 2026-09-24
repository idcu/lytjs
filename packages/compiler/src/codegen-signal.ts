// src/codegen-signal.ts
// Signal 模式代码生成器 - 生成 effect() + DOM 操作代码

import { NodeTypes, ElementTypes } from './constants';
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
      childrenHTML += serializeStaticHTML(child as ElementNode, varCounter, elementVars);
    }
    // 跳过 CommentNode、InterpolationNode 等动态内容
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
  // 是否存在「带子内容的组件」（决定要不要引入 createVNode/Text 做插槽）
  const usedSlots = hasComponentWithChildren(ast.children);

  // ---- Phase 1: Generate imports ----
  // FIX: P1-13 添加 runCleanups 到 import 列表
  lines.push(
    `import { effect, reconcileArray } from '@lytjs/reactivity';`,
    `import { createTemplate, getRealNode, setText, setHTML, setAttribute, setProperty, setStyle, setClass, insert, remove, createEventHandler, onCleanup, runCleanups, reconcileArray } from '@lytjs/dom-runtime';`,
  );
  // 用到组件挂载时才引入（@lytjs/renderer 提供运行时实现）
  if (usedComponents) {
    lines.push(`import { mountComponent } from '@lytjs/renderer';`);
  }
  // 组件带子内容（插槽）时才需要 vnode 构造能力
  if (usedSlots) {
    lines.push(`import { createVNode, Text } from '@lytjs/vdom';`);
  }
  lines.push('');

  // 先通过 buildStaticHTML 收集所有元素变量（使用 varCounter）
  const staticHTML = buildStaticHTML(ast.children, varCounter, elementVars);

  // ---- Phase 3: Process AST children for dynamic bindings ----
  // 此时 varCounter 已被 buildStaticHTML 初始化，processElement 不再重复分配变量名
  processChildren(ast.children, varCounter, elementVars, dynamicBindings, consumedCount);

  // ---- Phase 4: Generate render function ----
  lines.push('export function render(_ctx, _container) {');

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
      lines.push(`  const [${childVars.join(', ')}] = getRealNode(${rootVar}).children;`);
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
  }

  lines.push('  return () => { runCleanups(); };');
  lines.push('}');

  return {
    code: lines.join('\n'),
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
): string {
  let html = '';
  for (const child of children) {
    if (child.type === NodeTypes.TEXT) {
      html += (child as TextNode).content;
    } else if (child.type === NodeTypes.ELEMENT) {
      html += serializeStaticHTML(child as ElementNode, varCounter, elementVars);
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
      );
    } else if (child.type === NodeTypes.JS_CONDITIONAL_EXPRESSION) {
      processConditional(
        child as JSConditionalExpression,
        varCounter,
        elementVars,
        dynamicBindings,
        undefined,
        consumedCount,
      );
    } else if (child.type === NodeTypes.JS_CALL_EXPRESSION) {
      processCallExpression(child as JSCallExpression, varCounter, elementVars, dynamicBindings);
    }
    // 根级别的 TextNode、CommentNode、InterpolationNode 已处理
    // by the static HTML generation
  }
}

// ============================================================
// 处理元素节点
// ============================================================

function processElement(
  node: ElementNode,
  varCounter: Map<string, number>,
  elementVars: Array<{ varName: string; tag: string }>,
  dynamicBindings: Array<{ varName: string; code: string }>,
  consumedCount: Map<string, number>,
  inheritedOnce = false,
): void {
  // v-once：沿元素树向下传递（整个子树都只渲染一次）
  const onceMode = inheritedOnce || node.__isOnce === true;
  // 记录本次调用前的长度，末尾统一把"新增绑定"去掉 effect 包裹
  const bindingStart = dynamicBindings.length;

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
      code: `mountComponent(_ctx.${node.tag},${buildComponentPropsObject(node)},${hostVar}${slotsArg});`,
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
      processDirective(dir, varName, node.tag, dynamicBindings);
    }
  }

  // 处理 codegenNode 中的属性（transform 阶段将 v-text/v-html 转换为 textContent/innerHTML 属性）
  if (node.codegenNode && node.codegenNode.type === NodeTypes.VNODE_CALL) {
    const vnode = node.codegenNode as VNodeCall;
    processVNodeCallProps(vnode, varName, dynamicBindings);
  }

  // 处理子节点中的动态内容
  for (const child of node.children) {
    if (child.type === NodeTypes.INTERPOLATION) {
      const exp = getExpContent((child as InterpolationNode).content as SimpleExpressionNode);
      // FIX: P1-27 插值表达式安全验证：检查表达式是否为合法的属性访问路径，
      // 避免注入恶意代码导致 XSS 或运行时错误
      if (!exp || !/^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/.test(exp)) {
        if (__DEV__) {
          console.warn(
            `[lytjs/compiler] Invalid interpolation expression: "${exp}". ` +
              `Only simple property access paths are supported in signal mode.`,
          );
        }
        continue;
      }
      dynamicBindings.push({
        varName,
        code: `effect(() => setText(${varName}, _ctx.${exp}));`,
      });
    } else if (child.type === NodeTypes.ELEMENT) {
      processElement(
        child as ElementNode,
        varCounter,
        elementVars,
        dynamicBindings,
        consumedCount,
        onceMode,
      );
    } else if (child.type === NodeTypes.JS_CONDITIONAL_EXPRESSION) {
      processConditional(
        child as JSConditionalExpression,
        varCounter,
        elementVars,
        dynamicBindings,
        varName,
        consumedCount,
      );
    } else if (child.type === NodeTypes.JS_CALL_EXPRESSION) {
      processCallExpression(
        child as JSCallExpression,
        varCounter,
        elementVars,
        dynamicBindings,
        varName,
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
        code: `effect(() => setText(${varName}, _ctx.${value}));`,
      });
    } else if (key === 'innerHTML') {
      // v-html 转换后的结果
      dynamicBindings.push({
        varName,
        code: `effect(() => setHTML(${varName}, _ctx.${value}));`,
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

// FIX: P1-1~3 Signal 模式代码注入防护 - 表达式白名单验证
const VALID_EXPRESSION = /^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/;

// FIX: P1-S1, P1-S2 属性名和事件名验证正则
const VALID_ATTRIBUTE_NAME = /^[a-zA-Z][a-zA-Z0-9-:]*$/;
const VALID_EVENT_NAME = /^[a-zA-Z][a-zA-Z0-9-]*$/;
const VALID_COMPONENT_NAME = /^[a-zA-Z][a-zA-Z0-9-]*$/;

function validateExpression(exp: string | undefined, context: string): void {
  if (!exp) return;
  if (!VALID_EXPRESSION.test(exp)) {
    throw new Error(
      `[lytjs/compiler] Invalid expression in ${context}: "${exp}". Only simple property access paths are allowed.`,
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

function processDirective(
  dir: DirectiveNode,
  varName: string,
  tag: string,
  dynamicBindings: Array<{ varName: string; code: string }>,
): void {
  const expContent = dir.exp ? getExpContent(dir.exp as SimpleExpressionNode) : undefined;
  const argContent = dir.arg ? getExpContent(dir.arg as SimpleExpressionNode) : undefined;

  // FIX: P1-1~3 对 expContent 和 argContent 进行白名单验证
  validateExpression(expContent, `v-${dir.name}`);
  validateExpression(argContent, `v-${dir.name} argument`);
  validateArgContent(argContent);

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
          code: `let _ifFallbackEl = null;\n  effect(() => {\n    if (_ctx.${expContent}) {\n      if (!_ifFallbackEl) {\n        _ifFallbackEl = ${varName};\n        insert(_ifFallbackEl, _container);\n      }\n    } else {\n      if (_ifFallbackEl) {\n        remove(_ifFallbackEl);\n        _ifFallbackEl = null;\n      }\n    }\n  });`,
        });
      }
      break;
    }

    case 'show': {
      if (expContent) {
        dynamicBindings.push({
          varName,
          code: `effect(() => {\n    ${varName}.style.display = _ctx.${expContent} ? '' : 'none';\n  });`,
        });
      }
      break;
    }

    case 'html': {
      // v-html 在 transform 阶段已被转换为 innerHTML 属性
      // 在 processVNodeCallProps 中处理
      // 此处作为后备
      if (expContent) {
        dynamicBindings.push({
          varName,
          code: `effect(() => setHTML(${varName}, _ctx.${expContent}));`,
        });
      }
      break;
    }

    case 'bind': {
      if (argContent && expContent) {
        if (argContent === 'class') {
          dynamicBindings.push({
            varName,
            code: `effect(() => setClass(${varName}, _ctx.${expContent}));`,
          });
        } else if (argContent === 'style') {
          dynamicBindings.push({
            varName,
            code: `effect(() => setStyle(${varName}, _ctx.${expContent}));`,
          });
        } else {
          dynamicBindings.push({
            varName,
            code: `effect(() => setAttribute(${varName}, '${argContent}', _ctx.${expContent}));`,
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
            code: `onCleanup(createEventHandler(${varName}, '${argContent}', _ctx.${expContent}, { ${mods} }));`,
          });
        } else {
          // FIX: P1-12 使用 createEventHandler 替代未导入的 addEventListener
          dynamicBindings.push({
            varName,
            code: `onCleanup(createEventHandler(${varName}, '${argContent}', _ctx.${expContent}));`,
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
          code: `effect(() => { ${varName}.value = _ctx.${expContent}; });`,
        });
        dynamicBindings.push({
          varName,
          code: `onCleanup(createEventHandler(${varName}, '${eventName}', ($e) => { _ctx.${expContent} = ${setValueExpr}; }));`,
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
  consumedCount?: Map<string, number>,
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
  for (let i = 0; i < branches.length; i++) {
    const branchInfo = branches[i]!;
    const elInfo = extractElementFromBranch(branchInfo.branch);
    if (elInfo) {
      const existing = findExistingVar(elementVars, elInfo.tag, consumedCount);
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

  // FIX: P2-24 模板缩进保持：生成的代码保持与模板一致的缩进层级
  // 生成条件分支的 DOM 插入/移除代码
  let code = `let ${ifVarName}El = null;\n`;
  code += `let ${ifVarName}Active = -1;\n`;
  code += `effect(() => {\n`;

  for (let i = 0; i < branches.length; i++) {
    const branchInfo = branches[i]!;
    const branchHTML = branchHTMLs[i]!;

    if (i > 0) {
      code += `    } else `;
    }

    if (branchInfo.condition !== null) {
      code += `if (_ctx.${branchInfo.condition}) `;
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
      code += `        insert(${ifVarName}El, ${containerVar});\n`;
    }
    code += `        ${ifVarName}Active = ${i};\n`;

    // 处理分支内的动态绑定（如插值文本）
    // FIX: P2-44 缓存 extractChildrenText 结果，避免对同一分支重复调用
    const childrenText = extractChildrenText(branchInfo.branch);
    if (childrenText && branchHTML.trim()) {
      code += `        setText(${ifVarName}El, _ctx.${childrenText});\n`;
    }

    code += `      }`;

    // 如果分支已激活，更新动态内容（复用已缓存的 childrenText）
    if (childrenText && branchHTML.trim()) {
      code += ` else {\n`;
      code += `        setText(${ifVarName}El, _ctx.${childrenText});\n`;
      code += `      }`;
    }

    code += `\n`;
  }

  // 如果所有条件都不满足，移除元素
  code += `    } else {\n`;
  code += `      if (${ifVarName}El) {\n`;
  code += `        remove(${ifVarName}El);\n`;
  code += `        ${ifVarName}El = null;\n`;
  code += `        ${ifVarName}Active = -1;\n`;
  code += `      }\n`;
  code += `    }\n`;
  code += `  });`;

  dynamicBindings.push({
    varName: containerVar,
    code,
  });

  // 处理每个分支中的子元素动态绑定（如 :class, :style 等）
  for (let i = 0; i < branches.length; i++) {
    processBranchDynamics(
      branches[i]!.branch,
      containerVar,
      varCounter,
      elementVars,
      dynamicBindings,
    );
  }
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
  if (branch.type === NodeTypes.VNODE_CALL) {
    const vnode = branch as VNodeCall;
    if (typeof vnode.tag === 'string') {
      const tag = vnode.tag.replace(/^"|"$/g, '');
      // FIX: P1-S6: 验证动态组件名
      validateComponentName(tag, 'v-for dynamic component');
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
              // 只序列化静态属性值（不包含 _ctx 引用的）
              if (!value.includes('_ctx') && !value.includes('(')) {
                // FIX: P2-batch1-8 对属性值进行 HTML 转义，防止 XSS
                attrs += ` ${key}="${escapeHtmlStatic(value.replace(/^"|"$/g, ''))}"`;
              }
            }
          }
        }
      }
      // 序列化 children
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
    return serializeStaticHTML(branch as ElementNode, new Map(), []);
  }
  return '';
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
          } else if (child.type === NodeTypes.VNODE_CALL) {
            renderItem = child as VNodeCall;
          }
        }
      }
    }

    // 由渲染项 VNodeCall 生成通用 create / update 逻辑：
    // 使用 document.createElement + textContent/属性绑定，替代此前硬编码的 benchmark 表格模板
    let createBody = '';
    let updateBody = '';
    if (renderItem && typeof renderItem.tag === 'string') {
      const tag = renderItem.tag.replace(/^"|"$/g, '');
      const elVar = genVarName(tag, _varCounter);

      createBody = `const ${elVar} = document.createElement('${tag}');`;
      const children = renderItem.children;

      // 插值 {{ item.xxx }} 在 transform 后为 TO_DISPLAY_STRING 调用，
      // 通过 extractChildrenText 提取表达式；静态文本则原样写入
      const dynamicText = extractChildrenText(renderItem);
      if (dynamicText) {
        createBody += `${elVar}.textContent = ${dynamicText};`;
        // update 回调的参数是已存在元素 _el（由 reconcileArray 传入），
        // 不能引用 create 内的局部变量名
        updateBody = `_el.textContent = ${dynamicText};`;
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
          if (value.includes('_ctx') || value.includes(`(${itemVar})`) || value.includes('(')) {
            // 动态绑定：create 用新元素，update 用 reconcileArray 传入的已存在元素
            createBody += `${elVar}.setAttribute('${key}', ${value});`;
            updateBody += `_el.setAttribute('${key}', ${value});`;
          } else {
            // 静态属性
            createBody += `${elVar}.setAttribute('${key}', '${value.replace(/^"|"$/g, '')}');`;
          }
        }
      }

      createBody += `return ${elVar};`;
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
          jsProp.key.content === 'key' &&
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
      code: `effect(() => {\n    reconcileArray(${containerVar}, _ctx.${source}, {\n      key: (${itemVar}) => ${keyExpr},\n      create: (${itemVar}) => {\n        ${createBody}\n      }${updateBody ? `,\n      update: (_el, ${itemVar}) => {\n        ${updateBody}\n      }` : ''}\n    });\n  });`,
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

function extractChildrenText(
  branch: JSChildNode | TemplateChildNode | TemplateChildNode[] | string | undefined,
): string | null {
  if (!branch) return null;
  if (typeof branch === 'string') return null;
  if (Array.isArray(branch)) {
    for (const item of branch) {
      const result = extractChildrenText(item);
      if (result) return result;
    }
    return null;
  }
  if (branch.type === NodeTypes.VNODE_CALL) {
    const vnode = branch as VNodeCall;
    if (vnode.children && typeof vnode.children === 'string') {
      // 静态文本子节点，不需要动态绑定
      return null;
    }
    if (
      vnode.children &&
      typeof vnode.children !== 'string' &&
      !Array.isArray(vnode.children) &&
      vnode.children.type === NodeTypes.JS_CALL_EXPRESSION
    ) {
      const call = vnode.children as JSCallExpression;
      const callee = typeof call.callee === 'string' ? call.callee : String(call.callee);
      if (callee === 'TO_DISPLAY_STRING' || callee === 'toDisplayString') {
        const arg = call.arguments[0];
        if (
          arg &&
          typeof arg !== 'string' &&
          !Array.isArray(arg) &&
          arg.type === NodeTypes.SIMPLE_EXPRESSION
        ) {
          return (arg as SimpleExpressionNode).content;
        }
      }
    }
  }
  return null;
}

// ============================================================
// Helper: 处理条件分支中的动态绑定
// ============================================================

function processBranchDynamics(
  branch: JSChildNode | TemplateChildNode | TemplateChildNode[] | string | undefined,
  _parentVar: string,
  varCounter: Map<string, number>,
  elementVars: Array<{ varName: string; tag: string }>,
  dynamicBindings: Array<{ varName: string; code: string }>,
): void {
  if (!branch || typeof branch === 'string') return;
  if (Array.isArray(branch)) {
    for (const item of branch) {
      processBranchDynamics(item, _parentVar, varCounter, elementVars, dynamicBindings);
    }
    return;
  }
  if (branch.type === NodeTypes.VNODE_CALL) {
    const vnode = branch as VNodeCall;
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
            // 处理 :class, :style, 其他属性绑定
            if (key === 'class') {
              dynamicBindings.push({
                varName: _parentVar,
                code: `effect(() => setClass(${_parentVar}, ${value}));`,
              });
            } else if (key === 'style') {
              dynamicBindings.push({
                varName: _parentVar,
                code: `effect(() => setStyle(${_parentVar}, ${value}));`,
              });
            }
          }
        }
      }
    }
  }
}

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
  const tagCode = (vn as { isComponent?: boolean }).isComponent ? `${prefix}${vn.tag}` : vn.tag;

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
