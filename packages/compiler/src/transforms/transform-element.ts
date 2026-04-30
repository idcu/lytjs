// src/transforms/transform-element.ts
// 元素节点转换逻辑

/**
 * ============================================================================
 * Block Tree 编译时优化 - 工作原理
 * ============================================================================
 *
 * Block Tree 是 Vue 3 编译时优化的核心机制，用于在编译阶段标记动态节点，
 * 从而在运行时 diff 时跳过静态子树，只追踪动态节点。
 *
 * 工作流程:
 * 1. 编译阶段: transform.ts 中的 collectDynamicChildren() 在 transform 完成后遍历 AST，
 *    将非静态子节点的 codegenNode 收集到父元素的 dynamicChildren 数组中。
 * 2. 运行时: Block VNode 在 diff 时只遍历 dynamicChildren，而非完整 children，
 *    将 O(n) 的 diff 复杂度降低到 O(动态节点数)。
 *
 * PatchFlags 标记:
 * - TEXT (1): 只有文本子节点变化（如插值表达式）
 * - CLASS (2): 只有 class 属性变化
 * - STYLE (4): 只有 style 属性变化
 * - PROPS (8): 特定 props 变化（需配合 dynamicProps）
 * - FULL_PROPS (16): props 完全动态（如 v-bind 无固定参数）
 * - STABLE_FRAGMENT (64): 子节点顺序稳定的 Fragment
 * - KEYED_FRAGMENT (128): 带 key 的 Fragment
 * - UNKEYED_FRAGMENT (256): 不带 key 的 Fragment
 * - NEED_PATCH (512): 需要 patch（如 ref 变化）
 * - DYNAMIC_SLOTS (1024): 动态插槽
 * - HOISTED (-1): 静态提升节点
 * - BAIL (-2): 退化为完整 diff
 *
 * ============================================================================
 * 已知限制
 * ============================================================================
 *
 * 1. 嵌套 v-for 的 Block 收集:
 *    当前 collectDynamicChildrenFromElement() 仅做一层浅收集。
 *    对于嵌套 v-for 场景，内层 v-for 生成的 RENDER_LIST 调用节点
 *    会被收集到外层 Block 的 dynamicChildren 中，但内层列表项的
 *    动态子节点不会被递归收集到各自的 dynamicChildren 中。
 *    这意味着嵌套列表的更新会退化为完整 diff。
 *
 * 2. 动态组件的 Block Tree:
 *    动态组件（:is 绑定）会被标记为 FULL_PROPS，但其插槽内容
 *    的动态子节点收集依赖于组件实例化后的运行时收集。
 *    编译阶段无法预知组件内部结构，因此动态组件的子 Block
 *    需要在运行时通过 createBlock() 自动建立。
 *
 * 3. v-if/v-else 分支的 Block 收集:
 *    v-if/v-else-if/v-else 链在 transformIf() 中被转换为
 *    JS_CONDITIONAL_EXPRESSION。条件表达式本身作为动态节点
 *    被收集到父 Block 的 dynamicChildren 中，但各分支内部的
 *    动态子节点不会被独立收集。分支切换时依赖条件表达式的
 *    PatchFlags 进行精确更新。
 *
 * 4. v-once 指令:
 *    v-once 节点只渲染一次，后续更新被跳过。
 *    当前实现中 v-once 节点会被 transformOnce() 处理后
 *    从动态收集中排除，这是正确的行为。
 * ============================================================================
 */

import { NodeTypes, ElementTypes, PatchFlags } from "../constants";
import type {
  ElementNode,
  InterpolationNode,
  DirectiveNode,
  SimpleExpressionNode,
  JSChildNode,
  JSObjectExpression,
  JSProperty,
  TransformContext,
  ExpressionNode,
  TemplateChildNode,
} from "../types";
import {
  createVNodeCall,
  createSimpleExpression,
  createCompoundExpression,
  createCallExpression,
  createObjectExpression,
  createObjectProperty,
  createConditionalExpression,
} from "../ast";
import { getExpContent, findDirective } from "./helpers";

export function transformElement(
  node: ElementNode,
  context: TransformContext,
): void {
  if (node.type !== NodeTypes.ELEMENT) return;

  // Handle v-if chain first
  const ifDirective = findDirective(node, "if");
  if (ifDirective) {
    return;
  }

  // Handle v-for
  const forDirective = findDirective(node, "for");
  if (forDirective) {
    return;
  }

  // Handle v-once
  const onceDirective = findDirective(node, "once");
  if (onceDirective) {
    return;
  }

  // Regular element - convert to VNodeCall
  const { tag, props, children } = node;

  const isComponent = node.tagType === ElementTypes.COMPONENT;

  // Build props object
  let propsExpression: JSObjectExpression | undefined;
  const hasDynamicProps = props.some((p) => p.type === NodeTypes.DIRECTIVE);

  if (props.length > 0) {
    const properties: JSProperty[] = [];
    for (const prop of props) {
      if (prop.type === NodeTypes.ATTRIBUTE) {
        const value = prop.value
          ? createSimpleExpression(
              JSON.stringify(prop.value.content),
              true,
              prop.loc,
              true,
            )
          : createSimpleExpression("true", true, prop.loc, true);
        properties.push(
          createObjectProperty(
            createSimpleExpression(
              JSON.stringify(prop.name),
              true,
              prop.loc,
              true,
            ),
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

  // Build children
  let vnodeChildren: JSChildNode | TemplateChildNode[] | string | undefined;
  if (children.length === 1) {
    const child = children[0];
    if (child) {
      if (child.type === NodeTypes.TEXT) {
        vnodeChildren = child.content;
      } else if (child.type === NodeTypes.INTERPOLATION) {
        context.helper("TO_DISPLAY_STRING");
        vnodeChildren = createCallExpression("TO_DISPLAY_STRING", [
          (child as InterpolationNode).content,
        ]);
      } else if (child.type === NodeTypes.ELEMENT) {
        // TemplateChildNode is a superset of JSChildNode, so direct assertion is not allowed.
        // At runtime, the transform pipeline ensures element nodes have valid codegenNode (JSChildNode).
        vnodeChildren = child as unknown as JSChildNode;
      } else {
        // TemplateChildNode is a superset of JSChildNode, so direct assertion is not allowed.
        vnodeChildren = child as unknown as JSChildNode;
      }
    }
  } else if (children.length > 1) {
    const hasNonText = children.some((c) => c.type === NodeTypes.ELEMENT);
    if (!hasNonText) {
      const parts: (string | SimpleExpressionNode | InterpolationNode)[] = [];
      for (const child of children) {
        if (child.type === NodeTypes.TEXT) {
          parts.push(JSON.stringify(child.content));
        } else if (child.type === NodeTypes.INTERPOLATION) {
          parts.push(child as InterpolationNode);
        }
      }
      if (parts.length > 0) {
        context.helper("TO_DISPLAY_STRING");
        vnodeChildren = createCompoundExpression(parts);
      }
    } else {
      // TemplateChildNode[] cannot be directly asserted to JSChildNode[] because
      // TemplateChildNode is a superset that includes non-JS types (ElementNode, TextNode, etc.).
      vnodeChildren = children as unknown as JSChildNode[];
    }
  }

  // Determine patch flag
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

  const vnodeCall = createVNodeCall(
    isComponent ? tag : JSON.stringify(tag),
    propsExpression,
    vnodeChildren,
    patchFlag,
    undefined,
    undefined,
    false,
    false,
    isComponent,
  );

  node.codegenNode = vnodeCall;

  context.helper("CREATE_VNODE");

  if (isComponent) {
    context.components.add(tag);
  }
}

/**
 * 处理元素中的指令属性
 */
function handleDirective(
  prop: DirectiveNode,
  _node: ElementNode,
  context: TransformContext,
  properties: JSProperty[],
): void {
  const expContent = getExpContent(prop.exp);
  const argContent = prop.arg
    ? getExpContent(prop.arg as ExpressionNode)
    : undefined;

  if (prop.name === "bind") {
    if (argContent !== undefined) {
      const valueExpr =
        expContent !== undefined
          ? createSimpleExpression(expContent, false, prop.loc, false)
          : createSimpleExpression("undefined", true, prop.loc, true);
      properties.push(
        createObjectProperty(
          createSimpleExpression(
            JSON.stringify(argContent),
            true,
            prop.loc,
            true,
          ),
          valueExpr,
        ),
      );
    }
  } else if (prop.name === "on") {
    if (argContent !== undefined) {
      const handler =
        expContent !== undefined
          ? createSimpleExpression(expContent, false, prop.loc, false)
          : createSimpleExpression("undefined", true, prop.loc, true);
      properties.push(
        createObjectProperty(
          createSimpleExpression(
            `"on${argContent.charAt(0).toUpperCase() + argContent.slice(1)}"`,
            true,
            prop.loc,
            true,
          ),
          handler,
        ),
      );
    }
  } else if (prop.name === "model") {
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
          createSimpleExpression(
            `$event => (${expContent} = $event)`,
            false,
            prop.loc,
            false,
          ),
        ),
      );
    }
  } else if (prop.name === "show") {
    if (expContent !== undefined) {
      properties.push(
        createObjectProperty(
          createSimpleExpression('"style"', true, prop.loc, true),
          createConditionalExpression(
            createSimpleExpression(expContent, false, prop.loc, false),
            createSimpleExpression("undefined", true, prop.loc, true),
            createObjectExpression([
              createObjectProperty(
                createSimpleExpression("display", true, prop.loc, true),
                createSimpleExpression("'none'", true, prop.loc, true),
              ),
            ], prop.loc),
            false,
          ),
        ),
      );
    }
  } else if (prop.name === "html") {
    if (expContent !== undefined) {
      // T-002 XSS fix: 对 v-html 值进行运行时消毒，防止 XSS 攻击
      context.helper("SANITIZE_HTML");
      const sanitizedValue = createCallExpression("SANITIZE_HTML", [
        createSimpleExpression(expContent, false, prop.loc, false),
      ], prop.loc);
      // 在开发模式下额外发出安全警告
      const safeValue = createCompoundExpression([
        `(${createConditionalExpression(
          createSimpleExpression("__DEV__", false, prop.loc, false),
          createCompoundExpression([
            createCallExpression(
              "console.warn",
              [
                createSimpleExpression(
                  '"[LyticsJS warn] v-html directive can lead to XSS attack. Make sure the content is sanitized before rendering."',
                  true,
                  prop.loc,
                  true,
                ),
              ],
              prop.loc,
            ),
            ", ",
            sanitizedValue,
          ]),
          sanitizedValue,
          false,
          prop.loc,
        )})`,
      ]);
      properties.push(
        createObjectProperty(
          createSimpleExpression('"innerHTML"', true, prop.loc, true),
          safeValue as JSChildNode,
        ),
      );
    }
  } else if (prop.name === "text") {
    if (expContent !== undefined) {
      properties.push(
        createObjectProperty(
          createSimpleExpression('"textContent"', true, prop.loc, true),
          createSimpleExpression(expContent, false, prop.loc, false),
        ),
      );
    }
  } else if (prop.name === "cloak" || prop.name === "pre") {
    // skip
  } else {
    // Unknown directive - register it
    context.directives.add(prop.name);
  }
}
