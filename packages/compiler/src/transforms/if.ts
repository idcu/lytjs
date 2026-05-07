// src/transforms/v-if.ts
// v-if / v-else-if / v-else 转换逻辑

import { NodeTypes } from '../constants';
import type {
  RootNode,
  TemplateChildNode,
  ElementNode,
  TransformContext,
  ExpressionNode,
  JSConditionalExpression,
  VNodeCall,
  JSChildNode,
} from '../types';
import { createSimpleExpression, createConditionalExpression } from '../ast';
import { getExpContent, findDirective } from './helpers';
import { transformElement } from './transform-element';

/**
 * 类型守卫：检查节点是否为 JSConditionalExpression。
 * FIX: P2-8 添加类型守卫函数，替代不安全的 as unknown as 类型断言链
 */
function isJSConditionalExpression(node: unknown): node is JSConditionalExpression {
  return (
    typeof node === 'object' &&
    node !== null &&
    (node as JSConditionalExpression).type === NodeTypes.JS_CONDITIONAL_EXPRESSION
  );
}

export function transformIf(node: RootNode | TemplateChildNode, context: TransformContext): void {
  if (node.type !== NodeTypes.ELEMENT) return;

  const element = node as ElementNode;
  const ifDir = findDirective(element, 'if');
  if (!ifDir && !findDirective(element, 'else-if') && !findDirective(element, 'else')) return;

  const parent = context.parent;
  if (!parent) return;

  const siblings = parent.children;
  const currentIndex = siblings.indexOf(node as TemplateChildNode);

  // 查找链中的第一个 v-if
  let chainStart = currentIndex;
  for (let i = currentIndex - 1; i >= 0; i--) {
    const sibling = siblings[i];
    if (
      sibling &&
      sibling.type === NodeTypes.ELEMENT &&
      (findDirective(sibling as ElementNode, 'if') ||
        findDirective(sibling as ElementNode, 'else-if'))
    ) {
      chainStart = i;
    } else {
      break;
    }
  }

  // 构建条件链
  let conditional: JSConditionalExpression | undefined;

  const toRemove: number[] = [];

  for (let i = chainStart; i < siblings.length; i++) {
    const sibling = siblings[i];
    if (!sibling || sibling.type !== NodeTypes.ELEMENT) break;

    const sibElement = sibling as ElementNode;
    const sibIf = findDirective(sibElement, 'if');
    const sibElseIf = findDirective(sibElement, 'else-if');
    const sibElse = findDirective(sibElement, 'else');

    if (!sibIf && !sibElseIf && !sibElse) break;

    // 从 props 中移除 v-if/v-else-if/v-else 指令
    sibElement.props = sibElement.props.filter(
      (p) =>
        !(
          p.type === NodeTypes.DIRECTIVE &&
          (p.name === 'if' || p.name === 'else-if' || p.name === 'else')
        ),
    );

    // 转换元素（不含 v-if）
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
      const testContent = testExpr ? getExpContent(testExpr as ExpressionNode) : undefined;
      const test = testContent
        ? createSimpleExpression(testContent, false, sibElement.loc, false)
        : createSimpleExpression('true', true, sibElement.loc, true);

      if (!conditional) {
        conditional = createConditionalExpression(test, branchNode as JSChildNode, undefined, true);
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
          createSimpleExpression('true', true, sibElement.loc, true),
          branchNode as JSChildNode,
          undefined,
          true,
        );
      } else {
        conditional.alternate = branchNode as JSChildNode;
      }
    }

    // 收集要移除的索引
    toRemove.push(i);
  }

  // 按逆序移除收集的兄弟节点以保持索引有效
  for (let i = toRemove.length - 1; i >= 0; i--) {
    siblings.splice(toRemove[i]!, 1);
  }

  if (conditional) {
    // FIX: P2-8 使用类型守卫验证后再插入，替代不安全的 as unknown as 断言
    // JSConditionalExpression 具有 type 属性，在 AST 转换阶段可作为 TemplateChildNode
    // 插入到父节点的 children 数组中
    if (isJSConditionalExpression(conditional)) {
      siblings.splice(chainStart, 0, conditional as TemplateChildNode);
    }
  }
}
