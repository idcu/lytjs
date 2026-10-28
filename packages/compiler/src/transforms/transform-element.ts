// src/transforms/transform-element.ts
// 元素节点转换逻辑

/**
 * Block Tree 编译时优化
 *
 * 核心思路：编译阶段标记动态节点，运行时 diff 时跳过静态子树，只追踪 dynamicChildren。
 * - PatchFlags 标记节点变更类型（TEXT/CLASS/STYLE/PROPS/FULL_PROPS 等），实现精确更新。
 * - collectDynamicChildren() 在 transform 完成后遍历 AST，将非静态子节点的 codegenNode
 *   收集到父元素的 dynamicChildren 数组中。
 *
 * 已知限制：嵌套 v-for 仅做浅收集；动态组件子 Block 需运行时建立；
 * v-if/v-else 分支内部动态子节点不独立收集。
 */

import { NodeTypes, ElementTypes, PatchFlags } from '../constants';
import { warn } from '@lytjs/common-error';
import type {
  ElementNode,
  AttributeNode,
  InterpolationNode,
  DirectiveNode,
  SimpleExpressionNode,
  TextNode,
  JSChildNode,
  JSObjectExpression,
  JSProperty,
  TransformContext,
  ExpressionNode,
  TemplateChildNode,
  Property,
} from '../types';
import {
  createVNodeCall,
  createSimpleExpression,
  createCompoundExpression,
  createCallExpression,
  createArrayExpression,
  createObjectExpression,
  createFunctionExpression,
  createObjectProperty,
  createConditionalExpression,
} from '../ast';
import { getExpContent, findDirective } from './helpers';
import { prefixIdentifiers } from '../prefix-identifiers';
import { capitalize } from '@lytjs/common-string';

/**
 * 类型守卫：检查 TemplateChildNode 是否有 codegenNode（JSChildNode）。
 * 用于安全地缩小类型范围，而非使用 `as unknown as JSChildNode`。
 */
function hasCodegenNode(
  node: TemplateChildNode,
): node is ElementNode & { codegenNode: JSChildNode } {
  return node.type === NodeTypes.ELEMENT && (node as ElementNode).codegenNode != null;
}

/**
 * 元素转换
 *
 * ⚠️ 关键：真正的 codegen 构建必须放到 **exit 回调** 中执行。
 *
 * 此前本函数是同步构建的：父元素在构建自己的 children 时，子元素的
 * `codegenNode` 还没生成（子元素要等自己被遍历时才转换），于是
 * `hasCodegenNode(child)` 全部为 false —— 结果 `<div><slot/></div>`、
 * `<div><span/></div>` 这类模板的 children 会被**整片丢掉**，产物只剩
 * `createElementVNode("div", null)`。改成 exit 回调后，父元素的构建发生在
 * 所有子节点遍历完成之后，children 才完整。
 *
 * 需要同步拿到结果的调用方（v-if 链 / v-for / v-once / v-memo 会在自己的
 * 转换里立刻读取 `element.codegenNode`）请传 `{ sync: true }`。
 */
export const FRAGMENT_SENTINEL = '__LYTJS_FRAGMENT__';

export function transformElement(
  node: ElementNode,
  context: TransformContext,
  options: { sync?: boolean } = {},
): void | (() => void) {
  if (node.type !== NodeTypes.ELEMENT) return;

  // <slot> 出口由 transformSlot 处理（编译为 renderSlot(...) 调用）。
  // 若继续走普通元素路径，会产出 createVNode('slot')，插槽内容将无法被渲染。
  if (node.tagType === ElementTypes.SLOT) return;

  // v-if / v-for / v-once / v-memo 各自由专门的转换负责
  if (
    findDirective(node, 'if') ||
    findDirective(node, 'for') ||
    findDirective(node, 'once') ||
    findDirective(node, 'memo')
  ) {
    return;
  }

  if (options.sync) {
    buildElementCodegen(node, context);
    return;
  }

  return () => buildElementCodegen(node, context);
}

/**
 * 真正的元素 codegen 构建（不做守卫判断，由 transformElement 调用）
 */
function buildElementCodegen(node: ElementNode, context: TransformContext): void {
  // 常规元素 - 转换为 VNodeCall
  const { tag, props, children } = node;

  // `<component :is="…">` —— 动态组件。
  //
  // ⚠️ 2026-10-28 修（P0）：此前 `component` 被当成**普通标签**，产物是
  //   `createBlock("component", { "is": _ctx.tag })` —— 浏览器把 `<component>` 当未知元素，
  //   于是「内容能看见、但组件根本没挂」：props 不透传、事件不接、`is` 变了也不重建。
  //   这是「看起来能用」的最坏形态。
  const dynamic = resolveDynamicComponent(node);
  const isComponent = node.tagType === ElementTypes.COMPONENT || dynamic !== undefined;

  if (dynamic) {
    // `is` 只是选择器，不是要传给组件的 prop —— 从 props 里摘掉（原地修改，
    // 与上面解构出的 `props` 是同一个数组引用）。
    for (let i = props.length - 1; i >= 0; i--) {
      if (isIsProp(props[i])) props.splice(i, 1);
    }
  }

  // ⚠️ 2026-10-28：具名 / 作用域插槽**尚未实现**，但语法能被解析（`#header` → `v-slot:header`）。
  //   此前它被静默当成普通属性 ⇒ 产物里出现字面量 `<template #header>` 元素，
  //   插槽内容既不进 `header` 也不进 `default`（`<template>` 是惰性元素，内容不可见）。
  //   现在至少**说出来**：告警 + 可操作的替代写法。
  //
  //   为什么不是「顺手实现」：需要 AST 的 JS_FUNCTION_EXPRESSION 节点 + codegen 支持
  //   + 作用域参数登记为局部绑定（否则 `#default="{ item }"` 里的 `item` 会被改写成
  //   `_ctx.item`），是编译器的一个独立特性，不适合夹在缺陷修复里做半套。
  if (isComponent) {
    // ⚠️ 只在 **vnode 模式**告警：signal / vapor 的 codegen 已经支持具名插槽
    //   （产物是 `mountComponent(_ctx.Card, {}, el, { header: () => [...] })`），
    //   在那些模式里发「尚未实现」是**假警报**（实测会把 slots demo 的用例吓成红）。
    // ⚠️ 2026-10-28：`<template #name>` 已经实现（见 buildSlotsExpression），
    //   只剩「v-slot 直接写在组件标签上」这一种形态没做（`<Child v-slot="{x}">`）。
    if ((context.rendererMode ?? 'vnode') === 'vnode') {
      warnUnsupportedSlotSyntax(children, node);
    }
  }

  // 构建 props 对象
  let propsExpression: JSObjectExpression | undefined;
  const hasDynamicProps = props.some((p) => p.type === NodeTypes.DIRECTIVE);

  if (props.length > 0) {
    const properties: JSProperty[] = [];
    for (const prop of props) {
      if (prop.type === NodeTypes.ATTRIBUTE) {
        const value = prop.value
          ? createSimpleExpression(JSON.stringify(prop.value.content), true, prop.loc, true)
          : createSimpleExpression('true', true, prop.loc, true);
        properties.push(
          createObjectProperty(
            createSimpleExpression(JSON.stringify(prop.name), true, prop.loc, true),
            value,
          ),
        );
      } else if (prop.type === NodeTypes.DIRECTIVE) {
        handleDirective(prop, node, context, properties);
      }
    }
    // `class` / `style` 的**静态 + 动态混写**必须合并，不能留两个同名键。
    //
    // ⚠️ 2026-10-29 修（P0）：`<div class="a" :class="{ b: on }">` 此前产出
    //   `{ "class": "a", "class": { b: _ctx.on } }` —— JS 对象字面量里**同名键后者胜**
    //   ⇒ 静态的 `a` **整条丢失**（实测渲染出 `class="b"`）。`style` 同病。
    //   修法：合并成数组 —— 运行时的 `normalizeClass` / `patchStyle` 都能吃数组
    //   （`normalizeClass` 本就支持嵌套数组；`patchStyle` 本批补上数组合并）。
    mergeDuplicateProps(properties, 'class');
    mergeDuplicateProps(properties, 'style');

    if (properties.length > 0) {
      propsExpression = createObjectExpression(properties);
    }
  }

  // `<template>` 不是元素，是 **Fragment**（与 Vue 一致）。
  //
  // ⚠️ 2026-10-28 修（P0）：此前 `<template>` 被当成普通元素，产物是
  //   `createElementVNode("template", null, …)` —— 而 `<template>` 在浏览器里是
  //   **惰性元素**，其子内容根本不渲染。于是最常见的分组写法**静默不可见**：
  //     <div><template v-if="ok">A</template></div>   → 渲染出 <template>A</template>，A 看不见
  //     <div><template v-for="x in l">…</template></div> → 同上
  //   实测两例都只在 DOM 里留下一个空的 <template>。
  const isTemplateTag = node.tagType === ElementTypes.TEMPLATE;

  // helper 必须在 **transform 阶段**登记：preamble（import 语句）在遍历之前生成，
  // 若等到 codegen 才 `helper('FRAGMENT')`，产物里会出现裸标识符 `Fragment`
  // 而 import 里没有它 —— 运行时报 `Fragment is not defined`。
  if (isTemplateTag) context.helper('FRAGMENT');

  // 构建 children
  let vnodeChildren: JSChildNode | TemplateChildNode[] | string | undefined;

  // 组件的具名 / 作用域插槽：`<Child><template #header>…</template>…</Child>`
  //
  // ⚠️ 2026-10-28：这一步必须**先于**下面的常规 children 逻辑 —— 一旦存在具名插槽，
  //   children 就不是「vnode 数组」而是「插槽对象」，两者语义完全不同。
  const slotsExpression =
    isComponent && (context.rendererMode ?? 'vnode') === 'vnode'
      ? buildSlotsExpression(children, context)
      : undefined;

  if (slotsExpression) {
    vnodeChildren = slotsExpression;
  } else if (children.length === 1 && !isTemplateTag) {
    const child = children[0];
    if (child) {
      if (child.type === NodeTypes.TEXT) {
        vnodeChildren = child.content;
      } else if (child.type === NodeTypes.INTERPOLATION) {
        context.helper('TO_DISPLAY_STRING');
        vnodeChildren = createCallExpression('TO_DISPLAY_STRING', [
          (child as InterpolationNode).content,
        ]);
      } else if (child.type === NodeTypes.ELEMENT) {
        // 使用类型守卫安全访问 codegenNode，无需双重断言
        if (hasCodegenNode(child)) {
          vnodeChildren = child.codegenNode;
        }
      } else if (child.type === NodeTypes.COMMENT) {
        // 跳过注释节点 - 它们不是 JSChildNode，不应包含在代码生成中
        vnodeChildren = undefined;
      } else {
        // 对于其他节点类型（SimpleExpressionNode、CompoundExpressionNode、JSChildNode），
        // they are valid JSChildNode subtypes - safe to narrow directly
        if (
          child.type === NodeTypes.SIMPLE_EXPRESSION ||
          child.type === NodeTypes.COMPOUND_EXPRESSION ||
          child.type === NodeTypes.VNODE_CALL ||
          child.type === NodeTypes.JS_CALL_EXPRESSION ||
          child.type === NodeTypes.JS_OBJECT_EXPRESSION ||
          child.type === NodeTypes.JS_PROPERTY ||
          child.type === NodeTypes.JS_ARRAY_EXPRESSION ||
          child.type === NodeTypes.JS_FUNCTION_EXPRESSION ||
          child.type === NodeTypes.JS_CONDITIONAL_EXPRESSION ||
          child.type === NodeTypes.JS_CACHE_EXPRESSION
        ) {
          vnodeChildren = child as JSChildNode;
        }
      }
    }
  } else if (children.length > 1 || isTemplateTag) {
    // 过滤注释节点 - 它们不是有效的 JSChildNode 类型
    const nonCommentChildren = children.filter((c) => c.type !== NodeTypes.COMMENT);
    // ⚠️ 2026-10-27 修（P0）：判据从「有没有 ELEMENT」改成「有没有**非文本**节点」。
    //
    // 原因：`transformIf` / `transformFor` 在本函数**之前**执行，已经把带结构指令的
    // 元素**替换成了 JS 节点**（v-for → JS_CALL_EXPRESSION(10)，v-if → JS_CONDITIONAL_EXPRESSION(15)）。
    // 于是「两个 v-for 并列」时 children 里**一个 ELEMENT 都没有**，旧判据判定
    // 「纯文本」⇒ 走下面的文本拼接分支 ⇒ 那里只收 TEXT / INTERPOLATION ⇒
    // **整棵子树被静默丢弃**。实测：
    //   <div><i v-for="i in n">…</i><b v-for="j in n">…</b></div>  → createElementVNode("div", null)
    //   <div><i v-if="a">A</i><b v-if="b">B</b></div>              → 同上（A/B 全没了）
    // 而「v-for + 普通元素」能出结果，正是因为它恰好还有一个 ELEMENT 兜住了判据 ——
    // 这种「一半能用」的形态最容易让人误判成「只是某个指令有问题」。
    const hasNonText = nonCommentChildren.some(
      (c) => c.type !== NodeTypes.TEXT && c.type !== NodeTypes.INTERPOLATION,
    );
    if (!hasNonText && !isTemplateTag) {
      const parts: (string | SimpleExpressionNode | InterpolationNode)[] = [];
      for (const child of nonCommentChildren) {
        if (child.type === NodeTypes.TEXT) {
          parts.push(JSON.stringify(child.content));
        } else if (child.type === NodeTypes.INTERPOLATION) {
          parts.push(child as InterpolationNode);
        }
      }
      if (parts.length > 0) {
        context.helper('TO_DISPLAY_STRING');
        // ⚠️ 相邻片段之间必须显式插入 ` + `：
        // `genCompoundExpression` 对**字符串片段是原样输出代码**（不做任何包裹），
        // 因此拼接运算符要自己写进 children 里。
        // 此前直接把 `JSON.stringify(text)` 与插值节点相邻放入 ⇒ 产物是
        //   `toDisplayString(_ctx.a)" "toDisplayString(_ctx.b)`
        // —— 缺 `+` 的语法错误 ⇒ 渲染函数无法生成（表现为静默空白 / 挂载报错）。
        const joined: (string | SimpleExpressionNode | InterpolationNode)[] = [];
        for (let i = 0; i < parts.length; i++) {
          if (i > 0) joined.push(' + ');
          joined.push(parts[i]!);
        }
        vnodeChildren = createCompoundExpression(joined);
      }
    } else {
      // 把每个子节点映射成合法的 JSChildNode。
      //
      // ⚠️ 2026-10-27 修（P0）：此前这里是一个**白名单过滤**
      //   （只留 SIMPLE_EXPRESSION / COMPOUND_EXPRESSION / 带 codegenNode 的 ELEMENT），
      //   于是 TEXT、INTERPOLATION、以及被 transform 改写成 JS 节点的 v-if / v-for
      //   全部被**静默丢弃**。实测：
      //     <div><span/>hello</div>                → hello 消失
      //     <div><span/>{{ msg }}</div>            → 插值消失
      //     <div><span/><p v-if="ok">A</p></div>   → v-if 整支消失（连 _ctx.ok 都不出现）
      //   「文字与元素混排」是最常见的模板形态 ⇒ 这不是 v-if 专属缺陷，而是通用丢节点。
      const jsChildren: JSChildNode[] = [];
      for (const c of nonCommentChildren) {
        const mapped = childToJSNode(c, context);
        if (mapped) jsChildren.push(mapped);
      }
      if (jsChildren.length > 0) {
        vnodeChildren = jsChildren;
      }
    }
  }

  // 确定 patch flag
  //
  // ⚠️ 2026-10-27 修（P0）：TEXT 位的语义是「children 是一整段文本，只需 setElementText」。
  // 此前判据是「children 里**存在**插值」，于是 `<div><span/>{{ msg }}</div>` 这种
  // 混排也会带上 TEXT ⇒ 运行时会用文本覆盖整个子节点数组（表现为 `[object Object]`）。
  // 改为「**全部**子节点都是文本/插值」才允许 TEXT。
  const isTextOnlyChildren =
    !isTemplateTag &&
    children.length > 0 &&
    children.every(
      (c) =>
        c.type === NodeTypes.TEXT ||
        c.type === NodeTypes.INTERPOLATION ||
        c.type === NodeTypes.COMMENT,
    );
  let patchFlag: number | undefined;
  if (hasDynamicProps) {
    patchFlag = PatchFlags.FULL_PROPS;
  } else if (isTextOnlyChildren && children.some((c) => c.type === NodeTypes.INTERPOLATION)) {
    patchFlag = PatchFlags.TEXT;
  }

  // 同步 patchFlag 到 ElementNode.patchFlag（供运行时和测试使用）
  if (patchFlag !== undefined) {
    node.patchFlag = patchFlag;
  }

  // 判断是否为 Block 根节点
  // 根元素或具有动态子节点的元素应作为 Block
  const shouldBeBlock = !node.isStatic && (patchFlag !== undefined || hasDynamicChildren(node));

  const vnodeCall = createVNodeCall(
    dynamic
      ? dynamic.tag
      : isComponent
        ? tag
        : isTemplateTag
          ? FRAGMENT_SENTINEL
          : JSON.stringify(tag),
    propsExpression,
    vnodeChildren,
    patchFlag,
    undefined,
    undefined,
    shouldBeBlock,
    false,
    // ⚠️ 动态组件的 tag 是**已自带前缀的表达式**（见 resolveDynamicComponent），
    //   这里必须传 false —— 传 true 会让 genVNodeCall 再跑一遍 prefixIdentifiers，
    //   把 `_ctx` 前缀成 `_ctx._ctx`（实测过）。
    isComponent && !dynamic,
  );

  node.codegenNode = vnodeCall;

  if (shouldBeBlock) {
    context.helper('CREATE_BLOCK');
    context.helper('OPEN_BLOCK');
  } else {
    context.helper('CREATE_VNODE');
  }

  // 为动态子节点注册 trackDynamicChild helper
  if (shouldBeBlock && patchFlag !== undefined) {
    context.helper('SET_BLOCK_TRACKING');
  }

  if (isComponent && !dynamic) {
    context.components.add(tag);
  }
}

/**
 * 判断元素是否包含动态子节点（递归检查一层）
 */
function hasDynamicChildren(node: ElementNode): boolean {
  return node.children.some((child) => {
    if (child.type === NodeTypes.ELEMENT) {
      const el = child as ElementNode;
      return el.patchFlag !== undefined && el.patchFlag !== 0;
    }
    return child.type === NodeTypes.INTERPOLATION;
  });
}

/**
 * 把指令转换注册表的产出归一化为 `JSProperty`。
 *
 * 注册表实现存在**两种形状**（`types.ts` 里 `Property` 是联合类型）：
 *  - `JSProperty`（AST 节点）—— 如 `transforms/on.ts`
 *  - `{ key, value }`（纯字符串对）—— 如 `transforms/{bind,model,show}.ts`
 *
 * `transformElement` 需要的是前者，故在此统一转换：
 * 字符串键走 `JSON.stringify` 变成字面量 key（与内联处理器一致），
 * 字符串值按**非静态表达式**处理（原样输出，不加引号）。
 */
function normalizeDirectiveProp(p: Property, dir: DirectiveNode): JSProperty {
  if (typeof p === 'object' && p !== null && 'type' in p) {
    return p as JSProperty;
  }
  const pair = p as { key: string; value: string };
  return createObjectProperty(
    createSimpleExpression(JSON.stringify(pair.key), true, dir.loc, true),
    createSimpleExpression(pair.value, false, dir.loc, false),
  );
}

/**
 * 处理元素中的指令属性
 *
 * **registry-first**（2026-10-10 打通）：若用户在 `compile()` 里传了
 * `directiveTransforms[name]`，则**优先**用它；否则回落到下面的内建内联分支。
 *
 * ⚠️ 修复前 `context.directiveTransforms` 根本不存在（`createTransformContext`
 * 逐字段构造时漏了它）⇒ 该公开选项**静默失效**：探针实测自定义 on/bind/custom
 * 三个 transform 的调用计数全为 0，而对照组 `nodeTransforms` 为 1。
 */
function handleDirective(
  prop: DirectiveNode,
  node: ElementNode,
  context: TransformContext,
  properties: JSProperty[],
): void {
  const custom = context.directiveTransforms?.[prop.name];
  if (custom) {
    const result = custom(prop, node, context);
    for (const p of result.props) {
      properties.push(normalizeDirectiveProp(p, prop));
    }
    return;
  }

  switch (prop.name) {
    case 'bind':
      handleVBind(prop, node, context, properties);
      break;
    case 'on':
      handleVOn(prop, node, context, properties);
      break;
    case 'model':
      // v-model 已有独立 transform（model.ts），保持现有调用
      handleVModel(prop, node, context, properties);
      break;
    case 'show':
      handleVShow(prop, node, context, properties);
      break;
    case 'html':
      handleVHtml(prop, node, context, properties);
      break;
    case 'text':
      handleVText(prop, node, context, properties);
      break;
    case 'cloak':
    case 'pre':
      // skip
      break;
    default:
      // FIX: P2-26 自定义指令编译缓存：
      // 未知指令 - 注册它以供运行时解析
      context.directives.add(prop.name);
      break;
  }
}

/**
 * 处理 v-bind 指令
 */
function handleVBind(
  prop: DirectiveNode,
  _node: ElementNode,
  _context: TransformContext,
  properties: JSProperty[],
): void {
  const expContent = getExpContent(prop.exp);
  const argContent = prop.arg ? getExpContent(prop.arg as ExpressionNode) : undefined;

  if (argContent !== undefined) {
    const valueExpr =
      expContent !== undefined
        ? createSimpleExpression(expContent, false, prop.loc, false)
        : createSimpleExpression('undefined', true, prop.loc, true);
    properties.push(
      createObjectProperty(
        createSimpleExpression(JSON.stringify(argContent), true, prop.loc, true),
        valueExpr,
      ),
    );
  }
}

/**
 * 处理 v-on 指令（**默认路径 / 实际生效的那条**）
 *
 * FIX: P1-30 添加事件修饰符处理，支持 .stop/.prevent/.capture/.once/.self/.passive
 *
 * ⚠️ 2026-10-10 订正：本函数此前挂着一条**与实测相反**的 NOTE，自称
 *   「实际编译时，v-on 会优先走 on.ts 的 transformOn 路径（通过
 *   builtInDirectiveTransforms），此处的 handleVOn 只是备用路径」。
 *
 * 实证（探针 `scripts/_probe-directive-transforms.ts`，用完即删）：
 *   `options.directiveTransforms` **完全未被消费** —— 自定义 on/bind/custom 三个
 *   transform 的调用计数全为 0，而对照组 `nodeTransforms` 为 1。
 *   根因：`createTransformContext` 逐字段构造 context、从未透传该字段。
 *   ⇒ `transforms/on.ts` 的 `transformOn` 是**死代码**；本函数才是唯一生效路径。
 *   ⇒ 那条"优先走 transformOn"的说明是错的，且会误导后续维护者去改错文件。
 *
 * 现状：该字段已透传（见 `handleDirective` 的 registry-first 分支），
 * 但它**只承载用户自定义项**；内建 v-on 仍走本函数（`on.ts` 产出的是
 * `{key,value}` 之外的形状约定不同，且其修饰符处理不区分"监听器选项"，
 * 若改走它会让 `.once/.capture/.passive` 退化）。
 * 两处若将来要合一，请以本函数的语义为准（含选项对象分支）。
 */
function handleVOn(
  prop: DirectiveNode,
  _node: ElementNode,
  context: TransformContext,
  properties: JSProperty[],
): void {
  const expContent = getExpContent(prop.exp);
  const argContent = prop.arg ? getExpContent(prop.arg as ExpressionNode) : undefined;

  if (argContent !== undefined) {
    const handler =
      expContent !== undefined
        ? createSimpleExpression(expContent, false, prop.loc, false)
        : createSimpleExpression('undefined', true, prop.loc, true);

    // FIX: P1-30 处理事件修饰符：守卫型走 withModifiers，选项型走事件选项对象
    const modifiers = prop.modifiers;
    if (modifiers && modifiers.length > 0) {
      // 构建带修饰符的事件处理器
      // 类型用 JSChildNode：既可能是原表达式（SimpleExpression），
      // 也可能是 withModifiers(...) 调用（JSCallExpression）。
      let eventHandler: JSChildNode = handler;

      // 修饰符分两类，**必须分开处理**（2026-10-10 统一）：
      //   ① 「守卫型」：stop / prevent / self / ctrl / shift / alt / meta / exact
      //      + 按键名（.enter / .esc / 任意 KeyboardEvent.key）+ 鼠标键（.left/.middle/.right）
      //      ⇒ 统一交给运行时 `withModifiers(fn, [...])` 包装。
      //        此前这里**内联拼** `$event.stopPropagation()` 等字符串，且只认 stop/prevent/self，
      //        其余修饰符**被静默丢弃**（`@keyup.enter` 对任意键都触发）。
      //        改为单一运行时实现后，语义与 Signal 路径（`createEventHandler`）共用同一张表。
      //   ② 「监听器选项」：capture / once / passive
      //      ⇒ 它们是 `addEventListener` 的选项，**不是守卫**，只能以
      //        `{ handler, capture: true }` 形态传给 patchEvent。
      const listenerOptionNames = ['capture', 'once', 'passive'];
      const guardModifiers = modifiers.filter((m) => !listenerOptionNames.includes(m));

      if (guardModifiers.length > 0) {
        eventHandler = createCallExpression(
          context.helper('WITH_MODIFIERS'),
          [
            handler,
            createArrayExpression(
              guardModifiers.map((m) => createSimpleExpression(`"${m}"`, true, prop.loc, true)),
              prop.loc,
            ),
          ],
          prop.loc,
        );
      }

      // 事件选项对象（capture / once / passive）
      const eventOptions: JSProperty[] = [];
      if (modifiers.includes('capture')) {
        eventOptions.push(
          createObjectProperty(
            createSimpleExpression('capture', true, prop.loc, true),
            createSimpleExpression('true', true, prop.loc, true),
          ),
        );
      }
      if (modifiers.includes('once')) {
        eventOptions.push(
          createObjectProperty(
            createSimpleExpression('once', true, prop.loc, true),
            createSimpleExpression('true', true, prop.loc, true),
          ),
        );
      }
      if (modifiers.includes('passive')) {
        eventOptions.push(
          createObjectProperty(
            createSimpleExpression('passive', true, prop.loc, true),
            createSimpleExpression('true', true, prop.loc, true),
          ),
        );
      }
      if (eventOptions.length > 0) {
        properties.push(
          createObjectProperty(
            createSimpleExpression(`"on${capitalize(argContent)}"`, true, prop.loc, true),
            createObjectExpression([
              createObjectProperty(
                createSimpleExpression('handler', true, prop.loc, true),
                eventHandler as JSChildNode,
              ),
              ...eventOptions,
            ]),
          ),
        );
      } else {
        properties.push(
          createObjectProperty(
            createSimpleExpression(`"on${capitalize(argContent)}"`, true, prop.loc, true),
            eventHandler as JSChildNode,
          ),
        );
      }
    } else {
      properties.push(
        createObjectProperty(
          createSimpleExpression(`"on${capitalize(argContent)}"`, true, prop.loc, true),
          handler,
        ),
      );
    }
  }
}

/**
 * 处理 v-model 指令
 *
 * ⚠️ 2026-10-27 修（P0）：此前**不分元素类型**，一律产出
 *   `{ modelValue, "onUpdate:modelValue" }`。
 *   这对组件是对的，对原生表单元素是**静默失效**：
 *   `<input v-model="msg">` 会渲染出一个叫 modelValue 的未知属性，
 *   既没有初值也不回写 —— 用户打字，`msg` 永远不变。
 *
 * 现在按元素类型分派：
 *   - 组件            → `modelValue` / `onUpdate:modelValue`（组件侧约定，保持不变）
 *   - input[text…]    → `value` / `onInput`（`.lazy` 走 `onChange`）
 *   - textarea        → `value` / `onInput`
 *   - select          → `value` / `onChange`
 *   - input[checkbox] → `checked` / `onChange`（布尔模型）
 *   - input[radio]    → `checked`（与 `value` 比较）/ `onChange`（赋 `value`）
 *
 * 支持修饰符：`.lazy` / `.number` / `.trim`。
 * 已知未支持：checkbox 绑定数组（`v-model` + `:value` 的多选语义）——
 *   需要运行时 helper，留待单独设计；当前会退化为布尔语义并在产物注释中标注。
 */
function handleVModel(
  prop: DirectiveNode,
  node: ElementNode,
  _context: TransformContext,
  properties: JSProperty[],
): void {
  const expContent = getExpContent(prop.exp);
  if (expContent === undefined) return;

  const push = (key: string, value: string, isStaticValue: boolean): void => {
    properties.push(
      createObjectProperty(
        createSimpleExpression(JSON.stringify(key), true, prop.loc, true),
        createSimpleExpression(value, isStaticValue, prop.loc, isStaticValue),
      ),
    );
  };

  // ① 组件：沿用 modelValue 约定
  if (node.tagType === ElementTypes.COMPONENT) {
    push('modelValue', expContent, false);
    push('onUpdate:modelValue', `$event => (${expContent} = $event)`, false);
    return;
  }

  const tag = node.tag.toLowerCase();
  const modifiers = new Set(prop.modifiers ?? []);
  const eventName = modifiers.has('lazy') ? 'onChange' : 'onInput';

  const readValue = (): string => {
    let e = '$event.target.value';
    if (modifiers.has('trim')) e = `${e}.trim()`;
    // ⚠️ 用一元 `+` 而不是 `Number(...)`：本仓的 `prefix-identifiers` 会把裸标识符
    //   当成 `_ctx` 上的属性改写（实测产出 `_ctx.Number(...)`，运行时 undefined）。
    //   一元 `+` 无标识符，语义与 `Number()` 一致（空串→0、非法→NaN）。
    if (modifiers.has('number')) e = `+(${e})`;
    return e;
  };

  const findStaticAttr = (name: string): string | undefined => {
    const attr = node.props.find(
      (p) => p.type === NodeTypes.ATTRIBUTE && (p as { name?: string }).name === name,
    );
    if (!attr) return undefined;
    const value = (attr as { value?: { content?: string } }).value;
    return value?.content;
  };

  // ② checkbox / radio：绑定的是 checked，不是 value
  if (tag === 'input') {
    const inputType = findStaticAttr('type') ?? 'text';
    if (inputType === 'checkbox') {
      push('checked', expContent, false);
      push('onChange', `$event => (${expContent} = $event.target.checked)`, false);
      return;
    }
    if (inputType === 'radio') {
      const value = findStaticAttr('value');
      if (value !== undefined) {
        push('checked', `${expContent} === ${JSON.stringify(value)}`, false);
        push('onChange', `$event => (${expContent} = ${JSON.stringify(value)})`, false);
      } else {
        push('checked', expContent, false);
        push('onChange', `$event => (${expContent} = $event.target.checked)`, false);
      }
      return;
    }
  }

  // ③ textarea / select / 其余 input：绑定 value
  if (tag === 'select') {
    push('value', expContent, false);
    push('onChange', `$event => (${expContent} = ${readValue()})`, false);
    return;
  }

  push('value', expContent, false);
  push(eventName, `$event => (${expContent} = ${readValue()})`, false);
}

/**
 * 处理 v-show 指令
 */
function handleVShow(
  prop: DirectiveNode,
  _node: ElementNode,
  _context: TransformContext,
  properties: JSProperty[],
): void {
  const expContent = getExpContent(prop.exp);

  if (expContent !== undefined) {
    properties.push(
      createObjectProperty(
        createSimpleExpression('"style"', true, prop.loc, true),
        createConditionalExpression(
          createSimpleExpression(expContent, false, prop.loc, false),
          createSimpleExpression('undefined', true, prop.loc, true),
          createObjectExpression(
            [
              createObjectProperty(
                createSimpleExpression('display', true, prop.loc, true),
                createSimpleExpression("'none'", true, prop.loc, true),
              ),
            ],
            prop.loc,
          ),
          false,
        ),
      ),
    );
  }
}

/**
 * 处理 v-html 指令
 */
function handleVHtml(
  prop: DirectiveNode,
  _node: ElementNode,
  context: TransformContext,
  properties: JSProperty[],
): void {
  const expContent = getExpContent(prop.exp);

  if (expContent !== undefined) {
    // T-002 XSS fix: 对 v-html 值进行运行时消毒，防止 XSS 攻击
    context.helper('SANITIZE_HTML');
    const sanitizedValue = createCallExpression(
      'SANITIZE_HTML',
      [createSimpleExpression(expContent, false, prop.loc, false)],
      prop.loc,
    );
    // 在开发模式下额外发出安全警告
    // FIX: P1-32 使用 __DEV__ 替代 process.env.NODE_ENV，
    // 与框架其他部分的开发模式检测保持一致
    // ⚠️ 历史缺陷（2026-09-26 修复）：此前把 createConditionalExpression(...) 的
    // **返回值（AST 对象）**用模板字符串插值进一个字符串 ⇒ `${obj}` 得到
    // `"[object Object]"`，产物变成 `{ "innerHTML": ([object Object]) }`，
    // `new Function` 抛 `Unexpected identifier 'Object'`。
    // 正确做法：把它作为 compound expression 的**子节点**（数组元素）由 codegen
    // 递归生成，括号用独立的字符串片段给出。
    const safeValue = createCompoundExpression([
      '(',
      createConditionalExpression(
        // ⚠️ `__DEV__` 是**构建期常量**，必须 isStatic=true：
        // 若为 false，prefixIdentifiers 会把它改写成 `_ctx.__DEV__`（运行期不存在）。
        createSimpleExpression('__DEV__', true, prop.loc, true),
        // ⚠️ 逗号序列出现在 `?:` 的 consequent 位置时**必须自带括号**：
        // `a ? b, c : d` 是语法错误，`a ? (b, c) : d` 才合法。
        createCompoundExpression([
          '(',
          createCallExpression(
            'console.warn',
            [
              createSimpleExpression(
                '"[LytJS] v-html directive can lead to XSS attack. Make sure the content is sanitized before rendering."',
                true,
                prop.loc,
                true,
              ),
            ],
            prop.loc,
          ),
          ', ',
          sanitizedValue,
          ')',
        ]),
        sanitizedValue,
        false,
        prop.loc,
      ),
      ')',
    ]);
    properties.push(
      createObjectProperty(
        createSimpleExpression('"innerHTML"', true, prop.loc, true),
        safeValue as JSChildNode,
      ),
    );
  }
}

/**
 * 处理 v-text 指令
 */
function handleVText(
  prop: DirectiveNode,
  _node: ElementNode,
  _context: TransformContext,
  properties: JSProperty[],
): void {
  const expContent = getExpContent(prop.exp);

  if (expContent !== undefined) {
    properties.push(
      createObjectProperty(
        createSimpleExpression('"textContent"', true, prop.loc, true),
        createSimpleExpression(expContent, false, prop.loc, false),
      ),
    );
  }
}

/**
 * 检测组件子节点里的**具名 / 作用域插槽语法**并告警（该特性尚未实现）。
 *
 * 语法已经能被正确解析（`#header` → `DirectiveNode{ name: 'slot', arg: 'header' }`），
 * 但 transform 层完全忽略它 —— 于是 `<template #header>` 被当成普通 `<template>` 元素，
 * 插槽内容既不进 `header` 也不进 `default`，且**不报错**。
 *
 * 这是「语法能写、语义不存在」的典型形态：比语法错误更难发现，因为模板本身是合法的。
 */
function warnUnsupportedSlotSyntax(children: TemplateChildNode[], node: ElementNode): void {
  void children;
  // 只针对「v-slot 写在**组件标签自身**上」的形态（`<Child v-slot="{ x }">`）。
  // `<template #name>` 已由 buildSlotsExpression 支持，不再告警。
  const own = node.props.find(
    (p) => p !== undefined && p.type === NodeTypes.DIRECTIVE && p.name === 'slot',
  );
  if (!own) return;
  warn(
    `组件标签上的 v-slot（<${node.tag} v-slot="…">）尚未实现：` +
      `该插槽的内容不会被传给子组件。请改用 <template #name>…</template> 包裹。`,
  );
}

/**
 * 单个子节点 → 合法的 codegen 节点。
 *
 * ⚠️ 2026-10-28 抽出：这段映射原本内联在「多子节点」分支里，写具名插槽时需要同一套
 *   规则（默认插槽的内容也是子节点）。**同一份逻辑只能有一处实现** —— 复制一份
 *   就是下一个「一半能用」的来源。
 *
 * 返回 `undefined` 表示该节点不该产出任何东西（纯空白文本、无 codegenNode 的元素）。
 */
function childToJSNode(c: TemplateChildNode, context: TransformContext): JSChildNode | undefined {
  if (c.type === NodeTypes.TEXT) {
    const content = (c as TextNode).content;
    // 纯空白（源码缩进 / 换行）不产节点：与浏览器渲染语义一致，
    // 也避免产物里出现一串 `"  "` 常量。
    if (!content.trim()) return undefined;
    return createSimpleExpression(JSON.stringify(content), true);
  }
  if (c.type === NodeTypes.INTERPOLATION) {
    context.helper('TO_DISPLAY_STRING');
    return createCallExpression(context.helper('TO_DISPLAY_STRING'), [
      (c as InterpolationNode).content,
    ]);
  }
  if (c.type === NodeTypes.ELEMENT) {
    return hasCodegenNode(c) ? c.codegenNode : undefined;
  }
  // 其余是 transform 阶段产出的 JS 节点（v-if 的 JSConditionalExpression 等）
  if (c.type >= NodeTypes.SIMPLE_EXPRESSION) {
    return c as unknown as JSChildNode;
  }
  return undefined;
}

/** 从 `#default="{ item, index }"` 的作用域参数里取出**绑定名**（用于登记局部名） */
function extractParamNames(param: string | undefined): string[] {
  if (!param) return [];
  const trimmed = param.trim();
  // 解构形态：`{ item }` / `{ item, index }` / `{ item: it }`
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const inner = trimmed.slice(1, trimmed.lastIndexOf(trimmed.startsWith('{') ? '}' : ']'));
    return inner
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const afterColon = part.includes(':') ? part.slice(part.indexOf(':') + 1) : part;
        // `item = 1` 这类默认值：取等号左边
        return afterColon.split('=')[0]!.trim();
      })
      .filter((name) => /^[A-Za-z_$][\w$]*$/.test(name));
  }
  // 简单标识符
  return /^[A-Za-z_$][\w$]*$/.test(trimmed) ? [trimmed] : [];
}

/**
 * 把组件子节点里的 `<template #name>` 收成**插槽对象表达式**：
 * `{ header: () => [...], default: (item) => [...] }`
 *
 * ⚠️ 2026-10-28 新增（P0）：具名/作用域插槽此前**完全没有实现** —— `#header` 能被解析成
 *   `DirectiveNode{ name: 'slot' }`，但 transform 层完全忽略它，`<template>` 被当成普通
 *   元素（且是惰性元素，内容不可见）。用户写的是标准 Vue 语法，得到的是空白。
 *
 * 返回 `undefined` 表示「没有具名插槽语法」，调用方走原来的 children 逻辑。
 */
function buildSlotsExpression(
  children: TemplateChildNode[],
  context: TransformContext,
): JSObjectExpression | undefined {
  const slotTemplates: { name: string; params: string[]; node: ElementNode }[] = [];
  const defaultChildren: TemplateChildNode[] = [];

  for (const child of children) {
    if (!child) continue;
    if (child.type === NodeTypes.ELEMENT) {
      const el = child as ElementNode;
      if (el.tagType === ElementTypes.TEMPLATE) {
        const dir = el.props.find(
          (p) => p !== undefined && p.type === NodeTypes.DIRECTIVE && p.name === 'slot',
        );
        if (dir && dir.type === NodeTypes.DIRECTIVE) {
          const name = getExpContent(dir.arg) || 'default';
          const paramText = getExpContent(dir.exp) || '';
          slotTemplates.push({ name, params: paramText ? [paramText] : [], node: el });
          continue;
        }
      }
    }
    // 有具名插槽时，纯空白文本不进默认插槽（否则 default 会多出模板缩进）
    if (child.type === NodeTypes.TEXT && !(child as TextNode).content.trim()) continue;
    defaultChildren.push(child);
  }

  if (slotTemplates.length === 0) return undefined;

  const properties: JSProperty[] = [];

  for (const slot of slotTemplates) {
    // 作用域参数必须登记为**局部名**：否则 `{{ item }}` 会被 prefix-identifiers
    // 改写成 `_ctx.item`（运行时 undefined）—— 这正是「作用域插槽」的核心语义。
    for (const name of extractParamNames(slot.params[0])) {
      context.addIdentifiers(name);
    }
    properties.push(
      createObjectProperty(
        createSimpleExpression(JSON.stringify(slot.name), true),
        createFunctionExpression(
          slot.params,
          (slot.node.codegenNode ?? []) as JSChildNode,
          false,
          true,
        ),
      ),
    );
  }

  if (defaultChildren.length > 0) {
    const nodes: JSChildNode[] = [];
    for (const child of defaultChildren) {
      const mapped = childToJSNode(child, context);
      if (mapped) nodes.push(mapped);
    }
    if (nodes.length > 0) {
      properties.push(
        createObjectProperty(
          createSimpleExpression('"default"', true),
          createFunctionExpression([], nodes, false, true),
        ),
      );
    }
  }

  return createObjectExpression(properties);
}

/** 是否是 `<component :is>` 的 `is` 属性（静态 `is` 或 `:is`） */
function isIsProp(p: AttributeNode | DirectiveNode | undefined): boolean {
  if (!p) return false;
  if (p.type === NodeTypes.ATTRIBUTE) return p.name === 'is';
  return p.type === NodeTypes.DIRECTIVE && p.name === 'bind' && getExpContent(p.arg) === 'is';
}

/**
 * 解析 `<component is="…">` / `<component :is="…">`，返回要作为 vnode 类型的表达式。
 *
 * 规则：
 * - `:is="expr"` ⇒ 原样作为表达式（裸标识符会在 codegen 时补 `_ctx.`）
 * - `is="Foo"`（**大写开头**）⇒ 视作组件名，按 `_ctx.Foo` 解析
 *   （与模板里写 `<Foo>` 得到 `_ctx.Foo` 的约定一致）
 * - `is="div"`（小写）⇒ 原生标签，输出 JSON 字符串
 *
 * ⚠️ 这里用「首字母大小写」区分组件与原生标签，是**编译期的约定**，不是运行期解析。
 *   代价：`is="my-comp"` 这种 kebab-case 组件名会被当成原生标签。
 *   本仓的模板里组件一律按 `_ctx.Xxx` 解析（`<my-comp>` 也一样会变成 `_ctx["my-comp"]`？不 ——
 *   见 `isComponentTag`），所以这里与既有约定保持同一套判据，不做第二套。
 */
function resolveDynamicComponent(node: ElementNode): { tag: string } | undefined {
  if (node.tag.toLowerCase() !== 'component') return undefined;

  for (const p of node.props) {
    if (!p) continue;

    if (p.type === NodeTypes.ATTRIBUTE && p.name === 'is') {
      const literal = p.value?.content ?? '';
      if (!literal) continue;
      return { tag: /^[A-Z]/.test(literal) ? literal : JSON.stringify(literal) };
    }

    if (p.type === NodeTypes.DIRECTIVE && p.name === 'bind' && getExpContent(p.arg) === 'is') {
      const exp = getExpContent(p.exp);
      if (exp) {
        // `:is` 的值**可能是字符串**（组件名 / 原生标签），也可能是组件对象。
        // 编译期无法区分 ⇒ 生成一段运行期解析：
        //   字符串 ⇒ 先按名字查 ctx（局部 / 全局 / 内置组件都挂在 ctx 上），查不到就当原生标签；
        //   其它   ⇒ 原样作为 vnode 类型。
        // 注：`${exp}` 会被 genVNodeCall 的 prefixIdentifiers 补成 `_ctx.xxx`，
        // 方括号里的同名引用同理变成 `_ctx[_ctx.xxx]` —— 正是需要的形态。
        // ⚠️ 不能把这个表达式当**裸字符串**交出去：genVNodeCall 会对组件 tag 跑一遍
        //   `prefixIdentifiers`，它会把我写的 `_ctx` 再前缀一次（实测产出
        //   `_ctx._ctx[_ctx.tag]`）。这里先自己前缀好，再包成 `isStatic: true` 的
        //   简单表达式 —— codegen 对静态表达式**原样输出**。
        const prefixed = prefixIdentifiers(exp);
        return {
          tag: `(typeof ${prefixed} === 'string' ? (_ctx[${prefixed}] || ${prefixed}) : ${prefixed})`,
        };
      }
    }
  }

  return undefined;
}

/**
 * 把同名 prop（只用于 `class` / `style`）合并成一个**数组值**。
 *
 * 对象字面量里同名键后者胜 ⇒ 静态值会被动态值整条覆盖。合并成数组后由运行时的
 * `normalizeClass` / `patchStyle` 按 CSS 层叠语义处理（后者覆盖前者的同名项，
 * 不同名项全部保留）。
 */
function mergeDuplicateProps(properties: JSProperty[], name: string): void {
  const quoted = JSON.stringify(name);
  const indexes: number[] = [];

  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i];
    if (!prop || prop.type !== NodeTypes.JS_PROPERTY) continue;
    const key = prop.key;
    if (key && key.type === NodeTypes.SIMPLE_EXPRESSION && key.content === quoted) {
      indexes.push(i);
    }
  }

  if (indexes.length < 2) return;

  const values = indexes.map((i) => properties[i]!.value as JSChildNode);
  const merged = createArrayExpression(values);

  // 从后往前删，再在第一个位置插入合并后的属性
  for (let i = indexes.length - 1; i >= 1; i--) {
    properties.splice(indexes[i]!, 1);
  }
  properties[indexes[0]!] = createObjectProperty(createSimpleExpression(quoted, true), merged);
}
