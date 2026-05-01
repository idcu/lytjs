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
  node: ElementNode,
  context: TransformContext,
  properties: JSProperty[],
): void {
  switch (prop.name) {
    case "bind":
      handleVBind(prop, node, context, properties);
      break;
    case "on":
      handleVOn(prop, node, context, properties);
      break;
    case "model":
      // v-model 已有独立 transform（model.ts），保持现有调用
      handleVModel(prop, node, context, properties);
      break;
    case "show":
      handleVShow(prop, node, context, properties);
      break;
    case "html":
      handleVHtml(prop, node, context, properties);
      break;
    case "text":
      handleVText(prop, node, context, properties);
      break;
    case "cloak":
    case "pre":
      // skip
      break;
    default:
      // Unknown directive - register it
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
  const argContent = prop.arg
    ? getExpContent(prop.arg as ExpressionNode)
    : undefined;

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
}

/**
 * 处理 v-on 指令
 */
function handleVOn(
  prop: DirectiveNode,
  _node: ElementNode,
  _context: TransformContext,
  properties: JSProperty[],
): void {
  const expContent = getExpContent(prop.exp);
  const argContent = prop.arg
    ? getExpContent(prop.arg as ExpressionNode)
    : undefined;

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
        createSimpleExpression(
          `$event => (${expContent} = $event)`,
          false,
          prop.loc,
          false,
        ),
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
                '"[LytJS] v-html directive can lead to XSS attack. Make sure the content is sanitized before rendering."',
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
