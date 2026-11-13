// src/codegen-ssr.ts
// SSR code generator - generates renderToString format code from AST
//
// SSR 模式下：
// - 跳过事件绑定（v-on）
// - 跳过双向绑定（v-model）
// - 跳过 v-show
// - 保留 v-if/v-for/v-text/v-html/v-bind
// - 生成 renderToString 格式的代码

import { NodeTypes, ElementTypes } from './constants';
import { escapeHTML } from '@lytjs/common-string';
import { FRAGMENT_SENTINEL } from './transforms/transform-element';
import { prefixIdentifiers } from './prefix-identifiers';
import type {
  RootNode,
  ElementNode,
  TextNode,
  InterpolationNode,
  DirectiveNode,
  SimpleExpressionNode,
  CompoundExpressionNode,
  TemplateChildNode,
  JSChildNode,
  JSConditionalExpression,
  JSCallExpression,
  JSObjectExpression,
  VNodeCall,
  CodegenResult,
  CodegenOptions,
} from './types';

// ============================================================
// 模块级常量
// ============================================================

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

// ============================================================
// 辅助函数
// ============================================================

// FIX: P2-1 消除 escapeHtml 函数重复定义
// 复用 @lytjs/common-string 中的 escapeHTML 函数
// 注意：生成的代码字符串中仍内联 escapeHtml 函数，确保运行时独立可用
export const escapeHtml = escapeHTML;

/**
 * 当前编译的局部标识符（v-for 别名 / 插槽参数等），据此决定哪些标识符不加 `_ctx.` 前缀。
 * SSR 产物同样是 `function render(_ctx) {...}`，绑定必须写成 `_ctx.xxx` 才能取到值。
 */
let ssrLocals: ReadonlySet<string> = new Set<string>();
// 编译期上下文：当前正在生成的 <select> 的 v-model 表达式。
// 代码生成是同步的，用模块级变量把值传给嵌套的 <option>，避免给所有 children 函数加参数。
let ssrSelectModel: string | undefined;
// 本次编译是否用到 v-for；只有用到时才注入 __lytRenderList，避免无关产物全部位移。
let usesRenderList = false;

const ElementTypes_SLOT = ElementTypes.SLOT;

/** 绑定表达式前缀化（仅用于动态绑定；静态字面量不要走这里） */
function px(content: string): string {
  return prefixIdentifiers(content, ssrLocals);
}

// ============================================================
// 主 SSR 生成函数
// ============================================================

export function generateSSR(ast: RootNode, _options: CodegenOptions = {}): CodegenResult {
  const parts: string[] = [];

  // 每次编译重置局部标识符（v-for 别名等）
  ssrLocals = new Set<string>(ast.localIdentifiers ?? []);
  usesRenderList = false;

  // 生成 render 函数
  parts.push(`function render(_ctx) {\n`);
  parts.push(`  return renderToString(`);

  // 将 children 生成为字符串拼接
  const body = genSSRChildren(ast.children);
  parts.push(body);

  parts.push(`);\n`);
  parts.push(`}\n\n`);

  // escapeHtml helper (used by renderToString and interpolation output)
  parts.push(`function escapeHtml(str) {\n`);
  parts.push(`  return String(str)\n`);
  parts.push(`    .replace(/&/g, '&amp;')\n`);
  parts.push(`    .replace(/</g, '&lt;')\n`);
  parts.push(`    .replace(/>/g, '&gt;')\n`);
  parts.push(`    .replace(/"/g, '&quot;')\n`);
  parts.push(`    .replace(/'/g, '&#39;');\n`);
  parts.push(`}\n\n`);

  // v-for 的 SSR 渲染：与运行时 renderList 语义一致，
  // 覆盖数组/字符串、数字（1..n）、对象（键值对）；结果直接拼成 HTML 字符串。
  if (usesRenderList) {
    parts.push(`function __lytRenderList(source, renderItem) {\n`);
    parts.push(`  const out = [];\n`);
    parts.push(`  if (Array.isArray(source) || typeof source === 'string') {\n`);
    parts.push(
      `    for (let i = 0; i < source.length; i++) out.push(renderItem(source[i], i, i));\n`,
    );
    parts.push(`  } else if (typeof source === 'number') {\n`);
    parts.push(`    for (let i = 0; i < source; i++) out.push(renderItem(i + 1, i + 1, i));\n`);
    parts.push(`  } else if (source && typeof source === 'object') {\n`);
    parts.push(`    const keys = Object.keys(source);\n`);
    parts.push(
      `    for (let i = 0; i < keys.length; i++) out.push(renderItem(source[keys[i]], keys[i], i));\n`,
    );
    parts.push(`  }\n`);
    parts.push(`  return out.join('');\n`);
    parts.push(`}\n\n`);
  }

  // 辅助函数
  // NOTE: renderToString is intentionally inlined into each compilation result
  // to ensure every compiled output is self-contained and independently executable,
  // without relying on external runtime imports. This trades a small amount of
  // code duplication for maximum portability and zero runtime coupling.
  // FIX: P2-15 提取 voidElements 为模块级常量，避免每次调用都创建新 Set
  parts.push(
    `const VOID_ELEMENTS = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);\n\n`,
  );
  parts.push(`function renderToString(vnode) {\n`);
  parts.push(`  if (typeof vnode === 'string') return vnode;\n`);
  parts.push(`  if (vnode == null) return '';\n`);
  parts.push(`  if (Array.isArray(vnode)) return vnode.map(renderToString).join('');\n`);
  // 组件 vnode（type 为对象/函数）⇒ 先渲染成 vnode 再递归序列化。
  // renderComponentVNode 由执行方注入（与 sanitizeHTML 同一机制）。
  parts.push(`  if (typeof vnode.type === 'object' || typeof vnode.type === 'function') {\n`);
  parts.push(
    `    return renderToString(renderComponentVNode(vnode.type, vnode.props, vnode.children));\n`,
  );
  parts.push(`  }\n`);
  // 兼容两种形态：codegen 生成的内部对象用 tag；真 vnode 用 type。
  parts.push(`  const tag = vnode.tag !== undefined ? vnode.tag : vnode.type;\n`);
  parts.push(`  const { props, children } = vnode;\n`);
  parts.push(`  let html = '<' + tag;\n`);
  parts.push(`  if (props) {\n`);
  parts.push(`    for (const [key, value] of Object.entries(props)) {\n`);
  // FIX: P2-46 布尔属性特殊处理：值为 true 时只输出属性名（如 disabled），
  // 值为 false 或 null 时跳过，其他值正常输出带引号的属性值
  parts.push(`      if (value === true) {\n`);
  parts.push(`        html += ' ' + key;\n`);
  parts.push(`      } else if (value != null && value !== false) {\n`);
  parts.push(`        html += ' ' + key + '="' + escapeHtml(value) + '"';\n`);
  parts.push(`      }\n`);
  parts.push(`    }\n`);
  parts.push(`  }\n`);
  parts.push(`  html += '>';\n`);
  parts.push(`  if (!VOID_ELEMENTS.has(tag)) {\n`);
  parts.push(`    if (children != null) {\n`);
  parts.push(`      html += renderToString(children);\n`);
  parts.push(`    }\n`);
  parts.push(`    html += '</' + tag + '>';\n`);
  parts.push(`  }\n`);
  parts.push(`  return html;\n`);
  parts.push(`}\n`);

  return {
    code: parts.join(''),
    preamble: '',
    ast,
  };
}

// ============================================================
// 生成 SSR children
// ============================================================

function genSSRChildren(children: TemplateChildNode[]): string {
  const parts: string[] = [];

  for (const child of children) {
    if (!child) continue;

    switch (child.type) {
      case NodeTypes.TEXT:
        parts.push(JSON.stringify((child as TextNode).content));
        break;

      case NodeTypes.INTERPOLATION: {
        const node = child as InterpolationNode;
        const content = (node.content as SimpleExpressionNode).content;
        // 2026-11-13 撤销 P1-14 的「简单属性路径」白名单：
        // 模板代码由开发者编写、编译成 render 函数后执行，不是不可信输入；
        // 白名单不构成安全边界，只会让 SSR 与 vnode 路径行为分叉（复杂表达式变占位符）。
        // XSS 防护由下方 escapeHtml 负责，表达式语法交给解析器。
        parts.push(`escapeHtml(${px(content)} == null ? '' : String(${px(content)}))`);
        break;
      }

      case NodeTypes.ELEMENT: {
        const element = child as ElementNode;
        parts.push(genSSRElement(element));
        break;
      }

      case NodeTypes.COMMENT:
        // 注释在 SSR 中被省略
        break;

      case NodeTypes.JS_CONDITIONAL_EXPRESSION: {
        const cond = child as JSConditionalExpression;
        parts.push(genSSRConditional(cond));
        break;
      }

      case NodeTypes.JS_CALL_EXPRESSION: {
        const call = child as JSCallExpression;
        parts.push(genSSRCallExpression(call));
        break;
      }

      case NodeTypes.VNODE_CALL: {
        // v-for / v-once 等元素的 codegenNode 是 VNODE_CALL；此前该分支缺失，
        // 导致 SSR 下 `renderList(..., (x) => '')` —— 列表项被整体渲染成空串。
        const vnode = child as VNodeCall;
        parts.push(genSSRVNodeCall(vnode));
        break;
      }

      case NodeTypes.COMPOUND_EXPRESSION: {
        const compound = child as CompoundExpressionNode;
        const childParts: string[] = [];
        for (const c of compound.children) {
          if (typeof c === 'string') {
            childParts.push(c);
          } else if (c.type === NodeTypes.SIMPLE_EXPRESSION) {
            // FIX: P0-1 CompoundExpression 中的表达式需要转义输出，防止 XSS
            childParts.push(
              `escapeHtml(${px((c as SimpleExpressionNode).content)} == null ? '' : String(${px((c as SimpleExpressionNode).content)}))`,
            );
          } else if (c.type === NodeTypes.INTERPOLATION) {
            const content = ((c as InterpolationNode).content as SimpleExpressionNode).content;
            // 与上方 INTERPOLATION 同理：表达式取自解析器产物，白名单不构成安全边界，
            // 输出侧统一 escapeHtml；此处不再把复杂表达式替换成占位符。
            childParts.push(`escapeHtml(${px(content)} == null ? '' : String(${px(content)}))`);
          }
        }
        parts.push(`(${childParts.join(' + ')})`);
        break;
      }

      default:
        break;
    }
  }

  if (parts.length === 0) return "''";
  if (parts.length === 1) return parts[0]!;
  return parts.join(' + ');
}

// ============================================================
// 生成 SSR 元素
// ============================================================

/**
 * 组件在 SSR 下的渲染：`renderToString(renderComponentVNode(Comp, props, slots))`
 *
 * 组件从 `_ctx` 解析（与客户端一致）；props 支持静态属性与 `:bind`；
 * 默认插槽即组件的 children（具名/作用域插槽见方案 4.3，后续补）。
 */
function genSSRComponent(element: ElementNode): string {
  // 简单标识符可直接点取；含连字符的 kebab 组件名必须用方括号，
  // 否则 `_ctx.my-comp` 会被当成 `_ctx.my - comp`（SSR 执行期 ReferenceError）。
  const compExpr = /^[A-Za-z_$][\w$]*$/.test(element.tag)
    ? `_ctx.${element.tag}`
    : `_ctx[${JSON.stringify(element.tag)}]`;

  const propsParts: string[] = [];
  for (const prop of element.props) {
    if (prop.type === NodeTypes.ATTRIBUTE) {
      const v = prop.value ? JSON.stringify(prop.value.content) : 'true';
      propsParts.push(`${JSON.stringify(prop.name)}:${v}`);
    } else if (prop.type === NodeTypes.DIRECTIVE && prop.name === 'bind') {
      const argNode = prop.arg as SimpleExpressionNode | undefined;
      const arg = argNode?.content;
      const exp = prop.exp ? (prop.exp as SimpleExpressionNode).content : undefined;
      if (arg && exp) {
        // 动态参数 `:[attrName]` 用计算键，属性名在运行期求值
        const key = argNode && !argNode.isStatic ? `[${px(arg)}]` : JSON.stringify(arg);
        propsParts.push(`${key}:${px(exp)}`);
      }
    } else if (prop.type === NodeTypes.DIRECTIVE && prop.name === 'model' && prop.exp) {
      // 组件 v-model ⇒ modelValue prop（SSR 首屏需要带上，否则子组件拿到 undefined）
      propsParts.push(`"modelValue":${px((prop.exp as SimpleExpressionNode).content)}`);
    }
  }
  const propsCode = propsParts.length ? `{${propsParts.join(',')}}` : 'null';

  // 组件上的 `v-slot="scope"`：作用于**默认插槽**（作用域插槽）
  let defaultScope: string | undefined;
  for (const prop of element.props) {
    if (prop.type === NodeTypes.DIRECTIVE && prop.name === 'slot' && !prop.arg && prop.exp) {
      defaultScope = (prop.exp as SimpleExpressionNode).content;
    }
  }

  // 分拣 children：`<template #name>` ⇒ 具名插槽；其余 ⇒ 默认插槽
  const slotEntries: string[] = [];
  const defaultChildren: TemplateChildNode[] = [];
  for (const child of element.children) {
    if (child && child.type === NodeTypes.ELEMENT) {
      const el = child as ElementNode;
      if (el.tagType === ElementTypes.TEMPLATE) {
        const slotDir = el.props.find(
          (pp) => pp.type === NodeTypes.DIRECTIVE && pp.name === 'slot',
        ) as DirectiveNode | undefined;
        const name = slotDir
          ? slotDir.arg
            ? (slotDir.arg as SimpleExpressionNode).content
            : 'default'
          : undefined;
        if (name) {
          const innerScope = slotDir?.exp
            ? (slotDir.exp as SimpleExpressionNode).content
            : undefined;
          slotEntries.push(`${JSON.stringify(name)}:${genSSRSlotFn(el.children, innerScope)}`);
          continue;
        }
      }
    }
    defaultChildren.push(child);
  }
  if (defaultChildren.length && !slotEntries.some((entry) => entry.startsWith('"default":'))) {
    slotEntries.unshift(`default:${genSSRSlotFn(defaultChildren, defaultScope)}`);
  }
  const slotsCode = slotEntries.length ? `{${slotEntries.join(',')}}` : 'null';

  return `renderToString(renderComponentVNode(${compExpr},${propsCode},${slotsCode}))`;
}

/**
 * 生成插槽函数：`()=>…` 或 `(scope)=>…`
 *
 * 作用域插槽的关键：插槽参数必须作为 **locals** 参与前缀化，
 * 否则 `scope.item` 会被误写成 `_ctx.scope.item`（作用域插槽完全失效）。
 */
function genSSRSlotFn(children: TemplateChildNode[], scopeParam?: string): string {
  if (!scopeParam) return `()=>${genSSRChildren(children)}`;

  const prev = ssrLocals;
  ssrLocals = new Set<string>([...prev, scopeParam]);
  const inner = genSSRChildren(children);
  ssrLocals = prev;
  return `(${scopeParam})=>${inner}`;
}

function genSSRElement(element: ElementNode): string {
  // <slot> 出口：SSR 下优先渲染父组件提供的插槽内容，否则渲染回退内容。
  // 此前会把 <slot> 当成普通标签输出成 `<slot ...></slot>` —— 这不是合法 HTML。
  if ((element as { tagType?: number }).tagType === ElementTypes_SLOT) {
    return genSSRSlotOutlet(element);
  }

  // 组件：此前被当普通标签输出成 `<Child></Child>`（非法 HTML）。
  // 现改为走 renderComponentVNode（由执行方注入），默认插槽即其 children。
  if ((element as { tagType?: number }).tagType === ElementTypes.COMPONENT) {
    return genSSRComponent(element);
  }

  const tag = element.tag;
  const parts: string[] = [];

  // 开始标签
  parts.push(`'<${tag}'`);

  // 处理 props（属性和 SSR 相关指令）
  const propParts: string[] = [];
  // 收集 v-html/v-text 内容以便在 children 区域渲染（而非属性）
  let directiveChildren: string | undefined;

  // v-show 先扫一遍：它需要**合并进 style**，不能额外再输出一个 style 属性
  // （HTML 里重复的 style 属性只有第一个生效，会让 v-show 失效）。
  let showExpr: string | undefined;
  for (const p of element.props) {
    if (p.type === NodeTypes.DIRECTIVE && p.name === 'show') {
      const e = p.exp ? (p.exp as SimpleExpressionNode).content : undefined;
      if (e) showExpr = px(e);
    }
  }
  // 是否存在 style 属性（静态 style 或 :style）——**预扫描**决定 v-show 的去向。
  // 不能用循环中的动态标志：props 顺序不定，v-show 可能出现在 :style 之前，那样判断会失效
  // （曾导致同时输出两个 style 属性 ⇒ 后者被浏览器忽略）。
  const hasStyleAttr = element.props.some(
    (p) =>
      (p.type === NodeTypes.ATTRIBUTE && p.name === 'style') ||
      (p.type === NodeTypes.DIRECTIVE &&
        p.name === 'bind' &&
        (p.arg as SimpleExpressionNode | undefined)?.content === 'style'),
  );

  // v-model 的初态由控件类型决定（value / checked / selected / textarea 文本）
  const staticAttr = (name: string): string | undefined => {
    const found = element.props.find((p) => p.type === NodeTypes.ATTRIBUTE && p.name === name) as
      | { value?: { content: string } }
      | undefined;
    return found?.value?.content;
  };
  const boundValueExp = (() => {
    const found = element.props.find(
      (p) =>
        p.type === NodeTypes.DIRECTIVE &&
        p.name === 'bind' &&
        (p.arg as SimpleExpressionNode | undefined)?.content === 'value',
    ) as DirectiveNode | undefined;
    return found?.exp ? px((found.exp as SimpleExpressionNode).content) : undefined;
  })();
  const inputType = staticAttr('type');
  const staticValue = staticAttr('value');
  const valueExpr = staticValue !== undefined ? JSON.stringify(staticValue) : boundValueExp;
  let selectModel: string | undefined;

  for (const prop of element.props) {
    if (prop.type === NodeTypes.ATTRIBUTE) {
      const name = prop.name;
      if (name === 'style' && showExpr) {
        // 静态 style + v-show：合并成一个属性
        const base = prop.value ? escapeHtml(prop.value.content) : '';
        propParts.push(`' style="${base}' + (${showExpr} ? '' : ';display:none') + '"'`);
      } else {
        const value = prop.value ? escapeHtml(prop.value.content) : '';
        propParts.push(`' ${name}="${value}"'`);
      }
    } else if (prop.type === NodeTypes.DIRECTIVE) {
      // 在 SSR 模式下，只处理 bind 指令（v-bind）
      // 跳过 v-on、v-model、v-show
      if (prop.name === 'bind') {
        const argContent = prop.arg ? (prop.arg as SimpleExpressionNode).content : undefined;
        const expContent = prop.exp ? (prop.exp as SimpleExpressionNode).content : undefined;
        const isDynamicArg =
          !!prop.arg &&
          (prop.arg as SimpleExpressionNode).type === NodeTypes.SIMPLE_EXPRESSION &&
          !(prop.arg as SimpleExpressionNode).isStatic;
        // FIX: P2-17 对 v-bind 属性值进行 HTML 转义，防止 XSS 攻击
        if (argContent && expContent) {
          // class / style 需要**归一化**：数组与对象形式（`:class="['a',{'b':ok}]"`）
          // 若直接 String(...) 会得到 `[object Object]` —— 客户端与 SSR 曾都有此问题。
          // 现两端共用 dom-runtime 的 normalizeClass / normalizeStyle（SSR 由执行方注入）。
          let valueExpr: string;
          if (argContent === 'class') {
            valueExpr = `normalizeClass(${px(expContent)})`;
          } else if (argContent === 'style') {
            // v-show 为假时追加 display:none（与 :style 合并成一个属性）
            valueExpr =
              `normalizeStyle(${px(expContent)})` +
              (showExpr ? ` + (${showExpr} ? '' : ';display:none')` : '');
          } else {
            valueExpr = `String(${px(expContent)})`;
          }
          if (isDynamicArg) {
            // 动态参数 `:[attrName]`：属性名在运行期求值；class/style 仍需归一化
            const nameExpr = `String(${px(argContent)})`;
            const normalized =
              `(${nameExpr} === 'class' ? normalizeClass(${px(expContent)})` +
              ` : ${nameExpr} === 'style' ? normalizeStyle(${px(expContent)})` +
              ` : String(${px(expContent)}))`;
            propParts.push(`' ' + ${nameExpr} + '="' + escapeHtml(${normalized}) + '"'`);
          } else {
            propParts.push(`' ${argContent}="' + escapeHtml(${valueExpr}) + '"'`);
          }
        }
      }
      // v-html: output raw HTML content as children (not as attribute)
      if (prop.name === 'html') {
        const expContent = prop.exp ? (prop.exp as SimpleExpressionNode).content : undefined;
        if (expContent) {
          // v-html 的语义是**输出原始 HTML**（不是转义成文本）。
          // 此前误用 escapeHtml —— 会把 `<b>x</b>` 输出成字面文本，v-html 完全失效，
          // 且与客户端 setHTML（sanitizeHTML + innerHTML）行为不一致 ⇒ SSR 与 hydration 对不上。
          // 现在与客户端统一走 sanitizeHTML：保留 HTML 结构、移除危险内容。
          directiveChildren =
            (directiveChildren ? directiveChildren + ' + ' : '') +
            `sanitizeHTML(String(${px(expContent)}))`;
        }
      }
      // v-text: output escaped text content as children (not as attribute)
      if (prop.name === 'text') {
        const expContent = prop.exp ? (prop.exp as SimpleExpressionNode).content : undefined;
        if (expContent) {
          directiveChildren =
            (directiveChildren ? directiveChildren + ' + ' : '') +
            `escapeHtml(String(${px(expContent)}))`;
        }
      }

      // v-model：SSR 下应输出受控元素的初始状态。
      // 之前一律输出 value，导致 checkbox/radio 没有 checked、select 没有 selected、
      // textarea 用了非法 value 属性 —— 服务端首屏与客户端状态不一致。
      if (prop.name === 'model') {
        const expContent = prop.exp ? (prop.exp as SimpleExpressionNode).content : undefined;
        if (expContent && (tag === 'input' || tag === 'textarea' || tag === 'select')) {
          const model = px(expContent);
          if (tag === 'input' && inputType === 'checkbox') {
            const checked = valueExpr
              ? `(Array.isArray(${model}) ? ${model}.includes(${valueExpr}) : !!${model})`
              : `!!${model}`;
            propParts.push(`(${checked} ? ' checked="checked"' : '')`);
          } else if (tag === 'input' && inputType === 'radio') {
            const checked = valueExpr ? `String(${model}) === String(${valueExpr})` : `!!${model}`;
            propParts.push(`(${checked} ? ' checked="checked"' : '')`);
          } else if (tag === 'textarea') {
            directiveChildren = `escapeHtml(String(${model}))`;
          } else if (tag === 'select') {
            selectModel = model;
          } else {
            propParts.push(`' value="' + escapeHtml(String(${model})) + '"'`);
          }
        }
      }

      // v-show：只在**没有 style 属性**时才单独输出（有则已在上面合并进 style）
      if (prop.name === 'show' && !hasStyleAttr) {
        const expContent = prop.exp ? (prop.exp as SimpleExpressionNode).content : undefined;
        if (expContent) {
          propParts.push(`' style="' + (${px(expContent)} ? '' : 'display:none') + '"'`);
        }
      }
    }
  }

  if (propParts.length > 0) {
    parts.push(' + ' + propParts.join(' + '));
  }

  // <option> 的初态由外层 <select v-model> 决定
  if (tag === 'option' && ssrSelectModel && valueExpr !== undefined) {
    parts.push(
      ` + (String(${ssrSelectModel}) === String(${valueExpr}) ? ' selected="selected"' : '')`,
    );
  }

  // 自闭合检查
  if (VOID_ELEMENTS.has(tag)) {
    parts.push(" + '>'");
    return `(${parts.join('')})`;
  }

  parts.push(" + '>'");

  // Children：指令 children（v-html/v-text）优先，否则渲染元素 children
  if (directiveChildren) {
    parts.push(' + ' + directiveChildren);
  } else if (element.children.length > 0) {
    const prevSelectModel = ssrSelectModel;
    if (selectModel) ssrSelectModel = selectModel;
    const childrenStr = genSSRChildren(element.children);
    ssrSelectModel = prevSelectModel;
    parts.push(' + ' + childrenStr);
  }

  // 结束标签
  parts.push(` + '</${tag}>'`);

  return `(${parts.join('')})`;
}

// ============================================================
// 生成 SSR 条件表达式
// ============================================================

function genSSRConditional(cond: JSConditionalExpression): string {
  const testStr = genSSRExpr(cond.test);
  const consequentStr = genSSRBranch(cond.consequent);
  const alternateStr = cond.alternate ? genSSRBranch(cond.alternate) : "''";
  return `(${testStr} ? ${consequentStr} : ${alternateStr})`;
}

function genSSRBranch(
  branch: JSChildNode | TemplateChildNode | TemplateChildNode[] | string | undefined,
): string {
  if (branch === undefined) return "''";
  if (typeof branch === 'string') return JSON.stringify(branch);
  if (Array.isArray(branch)) return genSSRChildren(branch);

  if (branch.type === NodeTypes.JS_CONDITIONAL_EXPRESSION) {
    return genSSRConditional(branch as JSConditionalExpression);
  }

  if (branch.type === NodeTypes.VNODE_CALL) {
    return genSSRVNodeCall(branch as VNodeCall);
  }

  if (branch.type === NodeTypes.JS_CALL_EXPRESSION) {
    return genSSRCallExpression(branch as JSCallExpression);
  }

  if (branch.type === NodeTypes.ELEMENT) {
    return genSSRElement(branch as ElementNode);
  }

  if (branch.type === NodeTypes.COMPOUND_EXPRESSION) {
    // v-for / 文本+插值混排会在 transform 阶段合成 CompoundExpression，
    // 其 children 已是可执行的 JS 片段（字符串是原样代码，SimpleExpression 需补前缀）。
    const raw = (branch as CompoundExpressionNode).children
      .map((child) => {
        if (typeof child === 'string') return child;
        if (child.type === NodeTypes.INTERPOLATION) {
          return genSSRExpr((child as InterpolationNode).content as JSChildNode);
        }
        return genSSRExpr(child as JSChildNode);
      })
      .join('');
    return `escapeHtml(String(${raw}))`;
  }

  if (branch.type === NodeTypes.SIMPLE_EXPRESSION) {
    // FIX: P0-1 SSR 表达式需要转义输出，防止 XSS
    return `escapeHtml(String(${px((branch as SimpleExpressionNode).content)}))`;
  }

  if (branch.type === NodeTypes.TEXT) {
    return JSON.stringify((branch as TextNode).content);
  }

  return "''";
}

// ============================================================
// 生成 SSR 表达式
// ============================================================

function genSSRExpr(expr: JSChildNode | string): string {
  if (typeof expr === 'string') return expr;
  if (expr.type === NodeTypes.SIMPLE_EXPRESSION) {
    return px((expr as SimpleExpressionNode).content);
  }
  return "'[expr]'";
}

// ============================================================
// 生成 SSR VNodeCall
// ============================================================

/**
 * SSR 下的 `<slot>` 处理
 *
 * 生成 `(typeof _ctx.$slots?.[name] === 'function' ? renderToString(_ctx.$slots[name]({})) : 回退HTML)`
 */
function genSSRSlotOutlet(element: ElementNode): string {
  let nameExpr = JSON.stringify('default');
  for (const prop of element.props) {
    if (prop === undefined) continue;
    if (prop.type === NodeTypes.ATTRIBUTE && prop.name === 'name') {
      nameExpr = JSON.stringify(prop.value ? prop.value.content : 'default');
    } else if (prop.type === NodeTypes.DIRECTIVE && prop.name === 'bind' && prop.arg) {
      const argName = (prop.arg as SimpleExpressionNode).content;
      if (argName === 'name' && prop.exp) {
        nameExpr = px((prop.exp as SimpleExpressionNode).content);
      }
    }
  }

  const fallback = genSSRChildren(element.children);
  return (
    `(typeof _ctx.$slots?.[${nameExpr}] === 'function'` +
    ` ? renderToString(_ctx.$slots[${nameExpr}]({}))` +
    ` : ${fallback})`
  );
}

/** Fragment 的 children 序列化：透明容器，不产生任何包装标签 */
function genSSRFragmentChildren(children: VNodeCall['children']): string {
  if (children === undefined || children === null) return "''";
  if (typeof children === 'string') return JSON.stringify(children);
  if (Array.isArray(children)) return genSSRChildren(children as TemplateChildNode[]);
  return genSSRBranch(children as JSChildNode);
}

function genSSRVNodeCall(vnode: VNodeCall): string {
  const tag = typeof vnode.tag === 'string' ? vnode.tag.replace(/"/g, '') : String(vnode.tag);

  // `<template v-for>` / `<template v-if>` 的 vnode 是 Fragment（见 transform-element
  // 的 FRAGMENT_SENTINEL）。Fragment 在 DOM 里没有对应元素，SSR 必须只输出子节点；
  // 此前把它当普通标签，产物里直接出现 `<__LYTJS_FRAGMENT__ key="…">` 字面量。
  if (tag === FRAGMENT_SENTINEL) {
    return genSSRFragmentChildren(vnode.children);
  }

  const parts: string[] = [`'<${tag}'`];

  // Props
  if (vnode.props && vnode.props.type === NodeTypes.JS_OBJECT_EXPRESSION) {
    const objExpr = vnode.props as JSObjectExpression;
    for (const prop of objExpr.properties) {
      if (prop.type === NodeTypes.JS_PROPERTY) {
        const key =
          prop.key.type === NodeTypes.SIMPLE_EXPRESSION
            ? (prop.key as SimpleExpressionNode).content.replace(/"/g, '')
            : String(prop.key);
        // 跳过事件处理器（on*）
        if (key.startsWith('on') && key.length > 2 && key[2] === key[2]!.toUpperCase()) {
          continue;
        }
        // 跳过 style（v-show 生成的）
        if (key === 'style') {
          continue;
        }
        const value =
          prop.value.type === NodeTypes.SIMPLE_EXPRESSION
            ? px((prop.value as SimpleExpressionNode).content)
            : "'[value]'";
        // FIX: P0-1 属性值 SSR 模式下需要转义输出，防止 XSS
        parts.push(` + ' ${key}="' + escapeHtml(String(${value})) + '"'`);
      }
    }
  }

  if (VOID_ELEMENTS.has(tag)) {
    parts.push(" + '>'");
    return `(${parts.join('')})`;
  }

  parts.push(" + '>'");

  // Children
  if (vnode.children !== undefined) {
    if (typeof vnode.children === 'string') {
      parts.push(` + ${JSON.stringify(vnode.children)}`);
    } else if (Array.isArray(vnode.children)) {
      const childrenStr = genSSRChildren(vnode.children as TemplateChildNode[]);
      parts.push(' + ' + childrenStr);
    } else {
      const childStr = genSSRBranch(vnode.children as JSChildNode);
      parts.push(' + ' + childStr);
    }
  }

  parts.push(` + '</${tag}>'`);
  return `(${parts.join('')})`;
}

// ============================================================
// 生成 SSR 调用表达式
// ============================================================

function genSSRCallExpression(call: JSCallExpression): string {
  const callee = typeof call.callee === 'string' ? call.callee : String(call.callee);

  // 处理插值（客户端 codegen 里是 TO_DISPLAY_STRING）
  // 此前未处理，SSR 下 `<li>{{ x }}</li>` 会输出字面量 '[call]'。
  if (callee === 'toDisplayString' || callee === 'TO_DISPLAY_STRING') {
    const first = call.arguments[0];
    const expr =
      typeof first === 'string'
        ? first
        : first && !Array.isArray(first) && first.type === NodeTypes.SIMPLE_EXPRESSION
          ? px((first as SimpleExpressionNode).content)
          : "'[expr]'";
    return `escapeHtml(${expr} == null ? '' : String(${expr}))`;
  }

  // 处理 renderList
  if (callee === 'renderList' || callee === 'RENDER_LIST') {
    usesRenderList = true;
    const args = call.arguments;
    if (args.length >= 2) {
      const firstArg = args[0];
      const listExpr =
        typeof firstArg === 'string'
          ? firstArg
          : firstArg && !Array.isArray(firstArg) && firstArg.type === NodeTypes.SIMPLE_EXPRESSION
            ? px((firstArg as SimpleExpressionNode).content)
            : '[]';
      const secondArg = args[1];
      // 第二个参数是表示箭头函数的 CompoundExpressionNode：
      // children: ['(item, index) => { ', ...arrowBody, ' }']
      let arrowParams = 'item';
      let arrowBodyStr = "''";
      if (
        secondArg &&
        !Array.isArray(secondArg) &&
        typeof secondArg !== 'string' &&
        secondArg.type === NodeTypes.COMPOUND_EXPRESSION
      ) {
        const compound = secondArg as CompoundExpressionNode;
        const children = compound.children;
        // 从第一个子节点字符串中提取箭头函数参数
        const firstChild = children[0];
        if (typeof firstChild === 'string') {
          // 使用平衡括号提取来处理解构中的嵌套花括号
          const arrowStart = firstChild.indexOf('=>');
          if (arrowStart !== -1) {
            const parenStart = firstChild.indexOf('(');
            if (parenStart !== -1 && parenStart < arrowStart) {
              // 查找匹配的右括号，考虑嵌套括号
              let depth = 0;
              let parenEnd = -1;
              for (let i = parenStart; i < arrowStart; i++) {
                if (firstChild[i] === '(') depth++;
                else if (firstChild[i] === ')') depth--;
                if (depth === 0) {
                  parenEnd = i;
                  break;
                }
              }
              if (parenEnd !== -1) {
                arrowParams = firstChild.slice(parenStart + 1, parenEnd).trim();
              }
            }
          }
        }
        // Extract the body (everything between first and last child)
        const bodyChildren = children.slice(1, -1);
        if (bodyChildren.length > 0) {
          arrowBodyStr = genSSRChildren(bodyChildren as TemplateChildNode[]);
        }
      } else if (
        secondArg &&
        !Array.isArray(secondArg) &&
        typeof secondArg !== 'string' &&
        secondArg.type === NodeTypes.SIMPLE_EXPRESSION
      ) {
        arrowBodyStr = (secondArg as SimpleExpressionNode).content;
      }
      return `__lytRenderList(${listExpr}, (${arrowParams}) => ${arrowBodyStr})`;
    }
  }

  return "'[call]'";
}
