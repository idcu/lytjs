// src/transforms/v-once.ts
// v-once 转换逻辑

import { NodeTypes } from '../constants';
import type {
  RootNode,
  TemplateChildNode,
  ElementNode,
  TransformContext,
  VNodeCall,
} from '../types';
import { findDirective } from './helpers';
import { transformElement } from './transform-element';
import { createSimpleExpression } from '../ast';

export function transformOnce(
  node: RootNode | TemplateChildNode,
  context: TransformContext,
): void | (() => void) {
  if (node.type !== NodeTypes.ELEMENT) return;

  const element = node as ElementNode;
  const onceDir = findDirective(element, 'once');
  if (!onceDir) return;

  // Remove v-once directive from props
  element.props = element.props.filter(
    (p) => !(p.type === NodeTypes.DIRECTIVE && p.name === 'once'),
  );

  // 推迟到 exit 回调：v-once 的子节点必须先被遍历（否则其 codegenNode 不存在，
  // 元素 children 会被整片丢掉），随后再做「转换 + 提升」。
  return () => {
    transformElement(element, context, { sync: true });

    // Mark as hoistable
    if (element.codegenNode) {
      context.addHoist(element.codegenNode);
      // FIX: P2-11 createSimpleExpression 返回 SimpleExpressionNode，而 codegenNode
      // 可能是 VNodeCall 等类型。此处使用双重类型断言是安全的，因为 hoisted 引用
      // 会在后续 codegen 阶段被解析为实际的 hoisted 值。
      // 使用 as unknown as VNodeCall 是有意为之：codegenNode 的联合类型中不包含 SimpleExpressionNode，
      // 但 hoisted 节点在 codegen 阶段会被特殊处理，此处需要覆盖原始类型。
      element.codegenNode = createSimpleExpression(
        `_hoisted_${context.hoists.length}`,
        false,
        element.loc,
        true,
      ) as unknown as VNodeCall; // as unknown as VNodeCall: hoisted 节点在 codegen 阶段被替换为 _hoisted_N 引用
    }
  };
}
