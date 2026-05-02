// src/transforms/helpers.ts
// 共享辅助函数

import { NodeTypes } from '../constants';
import type { ElementNode, DirectiveNode, ExpressionNode, TemplateChildNode } from '../types';

/**
 * 获取表达式节点的内容字符串
 * @param exp - 表达式节点，如果为 null 或 undefined 则直接返回 undefined
 * @returns 表达式内容字符串，或 undefined
 */
export function getExpContent(exp: ExpressionNode | null | undefined): string | undefined {
  if (exp == null) return undefined;
  if (exp.type === NodeTypes.SIMPLE_EXPRESSION) return exp.content;
  return undefined;
}

/**
 * 在元素节点中查找指定名称的指令
 */
export function findDirective(node: ElementNode, name: string): DirectiveNode | undefined {
  return node.props.find(
    (p): p is DirectiveNode => p.type === NodeTypes.DIRECTIVE && p.name === name,
  );
}

/**
 * 判断节点是否为 JS 类型节点（codegen 阶段的节点类型）。
 *
 * 注意：此函数不包含表达式节点（SIMPLE_EXPRESSION、COMPOUND_EXPRESSION），
 * 因为表达式节点属于模板层节点，在 transform 阶段仍需要作为 TemplateChildNode 处理，
 * 而非直接作为 codegen 节点使用。
 */
export function isJS(node: TemplateChildNode): boolean {
  return (
    node.type === NodeTypes.JS_CALL_EXPRESSION ||
    node.type === NodeTypes.JS_OBJECT_EXPRESSION ||
    node.type === NodeTypes.JS_PROPERTY ||
    node.type === NodeTypes.JS_ARRAY_EXPRESSION ||
    node.type === NodeTypes.JS_FUNCTION_EXPRESSION ||
    node.type === NodeTypes.JS_CONDITIONAL_EXPRESSION ||
    node.type === NodeTypes.JS_CACHE_EXPRESSION ||
    node.type === NodeTypes.VNODE_CALL
  );
}
