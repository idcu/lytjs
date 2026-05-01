// src/transforms/v-if.ts
// v-if / v-else-if / v-else 转换逻辑

import { NodeTypes } from "../constants";
import type {
  RootNode,
  TemplateChildNode,
  ElementNode,
  TransformContext,
  ExpressionNode,
  JSConditionalExpression,
  VNodeCall,
  JSChildNode,
} from "../types";
import { createSimpleExpression, createConditionalExpression } from "../ast";
import { getExpContent, findDirective } from "./helpers";
import { transformElement } from "./transform-element";

export function transformIf(
  node: RootNode | TemplateChildNode,
  context: TransformContext,
): void {
  if (node.type !== NodeTypes.ELEMENT) return;

  const element = node as ElementNode;
  const ifDir = findDirective(element, "if");
  if (
    !ifDir &&
    !findDirective(element, "else-if") &&
    !findDirective(element, "else")
  )
    return;

  const parent = context.parent;
  if (!parent) return;

  const siblings = parent.children;
  const currentIndex = siblings.indexOf(node as TemplateChildNode);

  // Find the first v-if in the chain
  let chainStart = currentIndex;
  for (let i = currentIndex - 1; i >= 0; i--) {
    const sibling = siblings[i];
    if (
      sibling &&
      sibling.type === NodeTypes.ELEMENT &&
      (findDirective(sibling as ElementNode, "if") ||
        findDirective(sibling as ElementNode, "else-if"))
    ) {
      chainStart = i;
    } else {
      break;
    }
  }

  // Build the conditional chain
  let conditional: JSConditionalExpression | undefined;

  const toRemove: number[] = [];

  for (let i = chainStart; i < siblings.length; i++) {
    const sibling = siblings[i];
    if (!sibling || sibling.type !== NodeTypes.ELEMENT) break;

    const sibElement = sibling as ElementNode;
    const sibIf = findDirective(sibElement, "if");
    const sibElseIf = findDirective(sibElement, "else-if");
    const sibElse = findDirective(sibElement, "else");

    if (!sibIf && !sibElseIf && !sibElse) break;

    // Remove v-if/v-else-if/v-else directive from props
    sibElement.props = sibElement.props.filter(
      (p) =>
        !(
          p.type === NodeTypes.DIRECTIVE &&
          (p.name === "if" || p.name === "else-if" || p.name === "else")
        ),
    );

    // Transform the element (without v-if)
    const savedParent = context.parent;
    context.parent = parent;
    try {
      transformElement(sibElement, context);
    } finally {
      context.parent = savedParent;
    }

    if (!sibElement.codegenNode) continue;
    const branchNode = sibElement.codegenNode as VNodeCall;

    if (sibIf || sibElseIf) {
      const testExpr = sibIf?.exp ?? sibElseIf?.exp;
      const testContent = testExpr
        ? getExpContent(testExpr as ExpressionNode)
        : undefined;
      const test = testContent
        ? createSimpleExpression(testContent, false, sibElement.loc, false)
        : createSimpleExpression("true", true, sibElement.loc, true);

      if (!conditional) {
        conditional = createConditionalExpression(
          test,
          branchNode as JSChildNode,
          undefined,
          true,
        );
      } else {
        conditional.alternate = createConditionalExpression(
          test,
          branchNode as JSChildNode,
          undefined,
          true,
        );
        conditional = conditional.alternate as JSConditionalExpression;
      }
    } else {
      // v-else
      if (!conditional) {
        conditional = createConditionalExpression(
          createSimpleExpression("true", true, sibElement.loc, true),
          branchNode as JSChildNode,
          undefined,
          true,
        );
      } else {
        conditional.alternate = branchNode as JSChildNode;
      }
    }

    // Collect index for removal
    toRemove.push(i);
  }

  // Remove collected siblings in reverse order to keep indices valid
  for (let i = toRemove.length - 1; i >= 0; i--) {
    siblings.splice(toRemove[i]!, 1);
  }

  if (conditional) {
    siblings.splice(chainStart, 0, conditional as unknown as TemplateChildNode);
  }
}
