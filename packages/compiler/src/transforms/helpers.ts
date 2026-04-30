// src/transforms/helpers.ts
// 共享辅助函数

import { NodeTypes } from "../constants";
import type {
  ElementNode,
  DirectiveNode,
  ExpressionNode,
  TemplateChildNode,
} from "../types";

/**
 * 获取表达式节点的内容字符串
 */
export function getExpContent(
  exp: ExpressionNode | undefined,
): string | undefined {
  if (!exp) return undefined;
  if (exp.type === NodeTypes.SIMPLE_EXPRESSION) return exp.content;
  return undefined;
}

/**
 * 在元素节点中查找指定名称的指令
 */
export function findDirective(
  node: ElementNode,
  name: string,
): DirectiveNode | undefined {
  return node.props.find(
    (p): p is DirectiveNode =>
      p.type === NodeTypes.DIRECTIVE && p.name === name,
  );
}

/**
 * 将字符串首字母大写
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 判断节点是否为 JS 类型节点
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
