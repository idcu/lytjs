// src/transforms/transform-element.ts
// 元素节点转换逻辑

import { NodeTypes, ElementTypes, PatchFlags } from '../constants';
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
} from '../types';
import {
  createVNodeCall,
  createSimpleExpression,
  createCompoundExpression,
  createCallExpression,
  createObjectExpression,
  createObjectProperty,
  createConditionalExpression,
} from '../ast';
import { getExpContent, findDirective } from './helpers';

export function transformElement(node: ElementNode, context: TransformContext): void {
  if (node.type !== NodeTypes.ELEMENT) return;

  // Handle v-if chain first
  const ifDirective = findDirective(node, 'if');
  if (ifDirective) {
    return;
  }

  // Handle v-for
  const forDirective = findDirective(node, 'for');
  if (forDirective) {
    return;
  }

  // Handle v-once
  const onceDirective = findDirective(node, 'once');
  if (onceDirective) {
    return;
  }

  // Regular element - convert to VNodeCall
  const { tag, props, children } = node;

  const isComponent = node.tagType === ElementTypes.COMPONENT;

  // Build props object
  let propsExpression: JSObjectExpression | undefined;
  const hasDynamicProps = props.some(
    (p) => p.type === NodeTypes.DIRECTIVE,
  );

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

  // Build children
  let vnodeChildren: JSChildNode | any[] | string | undefined;
  if (children.length === 1) {
    const child = children[0];
    if (child) {
      if (child.type === NodeTypes.TEXT) {
        vnodeChildren = child.content;
      } else if (child.type === NodeTypes.INTERPOLATION) {
        context.helper('TO_DISPLAY_STRING');
        vnodeChildren = createCallExpression(
          'TO_DISPLAY_STRING',
          [(child as InterpolationNode).content],
        );
      } else if (child.type === NodeTypes.ELEMENT) {
        vnodeChildren = child as unknown as JSChildNode;
      } else {
        vnodeChildren = child as unknown as JSChildNode;
      }
    }
  } else if (children.length > 1) {
    const hasNonText = children.some(
      (c) => c.type === NodeTypes.ELEMENT,
    );
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
        context.helper('TO_DISPLAY_STRING');
        vnodeChildren = createCompoundExpression(parts as any);
      }
    } else {
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

  const vnodeCall = createVNodeCall(
    isComponent ? tag : JSON.stringify(tag),
    propsExpression,
    vnodeChildren as any,
    patchFlag,
    undefined,
    undefined,
    false,
    false,
    isComponent,
  );

  node.codegenNode = vnodeCall;

  context.helper('CREATE_VNODE');

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
  const argContent = prop.arg ? getExpContent(prop.arg as ExpressionNode) : undefined;

  if (prop.name === 'bind') {
    if (argContent !== undefined) {
      const valueExpr = expContent !== undefined
        ? createSimpleExpression(expContent, false, prop.loc, false)
        : createSimpleExpression('undefined', true, prop.loc, true);
      properties.push(
        createObjectProperty(
          createSimpleExpression(JSON.stringify(argContent), true, prop.loc, true),
          valueExpr,
        ),
      );
    }
  } else if (prop.name === 'on') {
    if (argContent !== undefined) {
      const handler = expContent !== undefined
        ? createSimpleExpression(expContent, false, prop.loc, false)
        : createSimpleExpression('undefined', true, prop.loc, true);
      properties.push(
        createObjectProperty(
          createSimpleExpression(`"on${argContent.charAt(0).toUpperCase() + argContent.slice(1)}"`, true, prop.loc, true),
          handler,
        ),
      );
    }
  } else if (prop.name === 'model') {
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
  } else if (prop.name === 'show') {
    if (expContent !== undefined) {
      properties.push(
        createObjectProperty(
          createSimpleExpression('"style"', true, prop.loc, true),
          createConditionalExpression(
            createSimpleExpression(expContent, false, prop.loc, false),
            createSimpleExpression('undefined', true, prop.loc, true),
            createSimpleExpression('"{ display: none }"', true, prop.loc, true),
            false,
          ),
        ),
      );
    }
  } else if (prop.name === 'html') {
    if (expContent !== undefined) {
      // P0-05 XSS fix: 在开发模式下对 v-html 使用发出安全警告
      const safeValue = createCompoundExpression([
        `(${createConditionalExpression(
          createSimpleExpression('__DEV__', false, prop.loc, false),
          createCompoundExpression([
            createCallExpression(
              'console.warn',
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
            ', ',
            createSimpleExpression(expContent, false, prop.loc, false),
          ]),
          createSimpleExpression(expContent, false, prop.loc, false),
          false,
          prop.loc,
        )})`,
      ]);
      properties.push(
        createObjectProperty(
          createSimpleExpression('"innerHTML"', true, prop.loc, true),
          safeValue as unknown as JSChildNode,
        ),
      );
    }
  } else if (prop.name === 'text') {
    if (expContent !== undefined) {
      properties.push(
        createObjectProperty(
          createSimpleExpression('"textContent"', true, prop.loc, true),
          createSimpleExpression(expContent, false, prop.loc, false),
        ),
      );
    }
  } else if (prop.name === 'cloak' || prop.name === 'pre') {
    // skip
  } else {
    // Unknown directive - register it
    context.directives.add(prop.name);
  }
}
