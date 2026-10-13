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
import type {
  ElementNode,
  InterpolationNode,
  DirectiveNode,
  SimpleExpressionNode,
  CompoundExpressionNode,
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
  createObjectProperty,
  createConditionalExpression,
} from '../ast';
import { getExpContent, findDirective } from './helpers';
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

  const isComponent = node.tagType === ElementTypes.COMPONENT;

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
    if (properties.length > 0) {
      propsExpression = createObjectExpression(properties);
    }
  }

  // 构建 children
  let vnodeChildren: JSChildNode | TemplateChildNode[] | string | undefined;
  if (children.length === 1) {
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
  } else if (children.length > 1) {
    // 过滤注释节点 - 它们不是有效的 JSChildNode 类型
    const nonCommentChildren = children.filter((c) => c.type !== NodeTypes.COMMENT);
    const hasNonText = nonCommentChildren.some((c) => c.type === NodeTypes.ELEMENT);
    if (!hasNonText) {
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
      // 从代码生成中过滤非 JSChildNode 类型
      const jsChildren = nonCommentChildren.filter(
        (
          c,
        ): c is
          | SimpleExpressionNode
          | CompoundExpressionNode
          | (ElementNode & { codegenNode: JSChildNode }) =>
          c.type === NodeTypes.SIMPLE_EXPRESSION ||
          c.type === NodeTypes.COMPOUND_EXPRESSION ||
          hasCodegenNode(c),
      );
      if (jsChildren.length > 0) {
        vnodeChildren = jsChildren.map((c) =>
          c.type === NodeTypes.ELEMENT
            ? (c as ElementNode & { codegenNode: JSChildNode }).codegenNode
            : (c as JSChildNode),
        ) as JSChildNode[];
      }
    }
  }

  // 确定 patch flag
  let patchFlag: number | undefined;
  if (hasDynamicProps) {
    patchFlag = PatchFlags.FULL_PROPS;
  } else if (children.some((c) => c.type === NodeTypes.INTERPOLATION)) {
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
    isComponent ? tag : JSON.stringify(tag),
    propsExpression,
    vnodeChildren,
    patchFlag,
    undefined,
    undefined,
    shouldBeBlock,
    false,
    isComponent,
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

  if (isComponent) {
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
 * 处理 v-model 指令（内联，已有独立 transform）
 */
function handleVModel(
  prop: DirectiveNode,
  _node: ElementNode,
  _context: TransformContext,
  properties: JSProperty[],
): void {
  const expContent = getExpContent(prop.exp);

  if (expContent !== undefined) {
    properties.push(
      createObjectProperty(
        createSimpleExpression('"modelValue"', true, prop.loc, true),
        createSimpleExpression(expContent, false, prop.loc, false),
      ),
    );
    properties.push(
      createObjectProperty(
        createSimpleExpression('"onUpdate:modelValue"', true, prop.loc, true),
        createSimpleExpression(`$event => (${expContent} = $event)`, false, prop.loc, false),
      ),
    );
  }
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
