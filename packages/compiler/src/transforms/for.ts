// src/transforms/v-for.ts
// v-for 转换逻辑

import { NodeTypes } from '../constants';
import type { RootNode, TemplateChildNode, ElementNode, TransformContext } from '../types';
import { createSimpleExpression, createCallExpression, createCompoundExpression } from '../ast';
import { getExpContent, findDirective } from './helpers';
import { transformElement } from './transform-element';
import { warn } from '@lytjs/common-error';

export function transformFor(node: RootNode | TemplateChildNode, context: TransformContext): void {
  if (node.type !== NodeTypes.ELEMENT) return;

  const element = node as ElementNode;
  const forDir = findDirective(element, 'for');
  if (!forDir || !forDir.exp) return;

  // Remove v-for directive from props
  element.props = element.props.filter(
    (p) => !(p.type === NodeTypes.DIRECTIVE && p.name === 'for'),
  );

  // Parse v-for expression
  const expContent = getExpContent(forDir.exp);
  if (!expContent) return;

  const inMatch = expContent.match(/^\s*(?:\(([^)]+)\)|(\S+))\s+(?:in|of)\s+(.+)$/);
  if (!inMatch) return;

  // inMatch[1]: 括号语法 (item, index) 中括号内的内容
  // inMatch[2]: 非括号语法的单个变量名
  // inMatch[3]: 右侧迭代表达式
  const left = (inMatch[1] ?? inMatch[2])!.trim();
  const right = inMatch[3]!.trim();

  let itemVar: string;
  let indexVar: string | undefined;

  // 括号语法已在正则中提取内部内容，直接按逗号分割
  if (inMatch[1]) {
    const parts = left.split(',').map((p) => p.trim());
    if (parts.length > 2) {
      if (__DEV__) {
        warn(`v-for does not support destructuring syntax. Use (item, index) in list instead.`);
      }
    }
    itemVar = parts[0] ?? 'item';
    indexVar = parts[1];
  } else if (left.startsWith('[') && left.endsWith(']')) {
    const inner = left.slice(1, -1).trim();
    const parts = inner.split(',').map((p) => p.trim());
    if (parts.length > 2) {
      if (__DEV__) {
        warn(`v-for does not support destructuring syntax. Use (item, index) in list instead.`);
      }
    }
    itemVar = parts[0] ?? 'item';
    indexVar = parts[1];
  } else {
    itemVar = left;
  }

  // Transform the element
  transformElement(element, context);

  const codegenNode = element.codegenNode;
  if (!codegenNode) return;

  context.helper('RENDER_LIST');

  const renderListCall = createCallExpression('RENDER_LIST', [
    createSimpleExpression(right, false, forDir.exp.loc, false),
    createCompoundExpression(
      [
        `(${itemVar}${indexVar ? `, ${indexVar}` : ''}) => `,
        codegenNode as unknown as TemplateChildNode,
      ],
      forDir.exp.loc,
    ),
  ]);

  context.replaceNode(renderListCall as unknown as TemplateChildNode);
}
