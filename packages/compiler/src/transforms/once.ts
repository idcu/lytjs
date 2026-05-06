// src/transforms/v-once.ts
// v-once 转换逻辑

import { NodeTypes } from '../constants';
import type { RootNode, TemplateChildNode, ElementNode, TransformContext } from '../types';
import { findDirective } from './helpers';
import { transformElement } from './transform-element';
import { createSimpleExpression } from '../ast';

export function transformOnce(node: RootNode | TemplateChildNode, context: TransformContext): void {
  if (node.type !== NodeTypes.ELEMENT) return;

  const element = node as ElementNode;
  const onceDir = findDirective(element, 'once');
  if (!onceDir) return;

  // Remove v-once directive from props
  element.props = element.props.filter(
    (p) => !(p.type === NodeTypes.DIRECTIVE && p.name === 'once'),
  );

  // Transform the element normally
  transformElement(element, context);

  // Mark as hoistable
  if (element.codegenNode) {
    context.addHoist(element.codegenNode);
    // FIX: P2-11 createSimpleExpression 返回 SimpleExpressionNode，而 codegenNode
    // 可能是 VNodeCall 等类型。此处使用类型断言是安全的，因为 hoisted 引用
    // 会在后续 codegen 阶段被解析为实际的 hoisted 值。
    // 使用 as any 是有意为之：codegenNode 的联合类型中不包含 SimpleExpressionNode，
    // 但 hoisted 节点在 codegen 阶段会被特殊处理，此处需要覆盖原始类型。
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    element.codegenNode = createSimpleExpression(
      `_hoisted_${context.hoists.length}`,
      false,
      element.loc,
      true,
    ) as any; // as any: hoisted 节点在 codegen 阶段被替换为 _hoisted_N 引用
  }
}
