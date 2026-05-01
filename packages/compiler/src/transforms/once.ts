// src/transforms/v-once.ts
// v-once 转换逻辑

import { NodeTypes } from "../constants";
import type {
  RootNode,
  TemplateChildNode,
  ElementNode,
  TransformContext,
} from "../types";
import { findDirective } from "./helpers";
import { transformElement } from "./transform-element";
import { createSimpleExpression } from "../ast";

export function transformOnce(
  node: RootNode | TemplateChildNode,
  context: TransformContext,
): void {
  if (node.type !== NodeTypes.ELEMENT) return;

  const element = node as ElementNode;
  const onceDir = findDirective(element, "once");
  if (!onceDir) return;

  // Remove v-once directive from props
  element.props = element.props.filter(
    (p) => !(p.type === NodeTypes.DIRECTIVE && p.name === "once"),
  );

  // Transform the element normally
  transformElement(element, context);

  // Mark as hoistable
  if (element.codegenNode) {
    context.addHoist(element.codegenNode);
    element.codegenNode = createSimpleExpression(
      `_hoisted_${context.hoists.length}`,
      false,
      element.loc,
      true,
    ) as unknown as typeof element.codegenNode;
  }
}
