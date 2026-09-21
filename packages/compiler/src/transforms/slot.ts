// src/transforms/v-slot.ts
// <slot> 转换逻辑
//
// 目标：把 `<slot>` 编译为运行时调用，而不是普通元素：
//   <slot/>                 → renderSlot(_ctx.$slots, "default")
//   <slot name="header"/>   → renderSlot(_ctx.$slots, "header")
//   <slot :user="u"/>       → renderSlot(_ctx.$slots, "default", { user: _ctx.u })
//   <slot>回退内容</slot>    → renderSlot(_ctx.$slots, "default", {}, [回退内容])
//
// 注意：此处必须把结果直接写到 element.codegenNode 上（而不是造一个 VNodeCall），
// 否则 codegen 会把返回值再包一层 createVNode(...)，语义就错了。

import { NodeTypes, ElementTypes } from '../constants';
import type {
  RootNode,
  TemplateChildNode,
  ElementNode,
  TransformContext,
  JSProperty,
  JSChildNode,
} from '../types';
import {
  createCallExpression,
  createSimpleExpression,
  createObjectExpression,
  createObjectProperty,
  createArrayExpression,
} from '../ast';
import { getExpContent } from './helpers';

/** JS 内置字面量，不需要加 _ctx. 前缀 */
const GLOBALS = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity', 'this']);

function isBarePath(exp: string): boolean {
  return /^[A-Za-z_$][\w$]*(?:\.[\w$]+)*$/.test(exp) && !GLOBALS.has(exp);
}

/**
 * 动态表达式处理：裸路径自动补 `_ctx.` 前缀。
 * 与 `_ctx.$slots` 的取值方式保持一致，否则生成的代码在 render(_ctx) 里取不到绑定。
 */
function toCtxExpr(exp: string): string {
  if (exp.startsWith('_ctx.') || exp.startsWith('$')) return exp;
  return isBarePath(exp) ? `_ctx.${exp}` : exp;
}

/** 收集回退内容（子节点产出的 codegen 节点） */
function buildFallback(element: ElementNode): JSChildNode | undefined {
  const children = element.children.filter((c) => c && c.type !== NodeTypes.COMMENT);
  if (children.length === 0) return undefined;

  const nodes = children.map((child) => {
    const maybeElement = child as ElementNode;
    return (
      (maybeElement.codegenNode as JSChildNode | undefined) ?? (child as unknown as JSChildNode)
    );
  });

  if (nodes.length === 1) return nodes[0];
  return createArrayExpression(nodes, element.loc);
}

export function transformSlot(
  node: RootNode | TemplateChildNode,
  context: TransformContext,
): (() => void) | undefined {
  if (node.type !== NodeTypes.ELEMENT) return;

  const element = node as ElementNode;
  if (element.tagType !== ElementTypes.SLOT) return;

  // helper 必须在 **transform 阶段**登记：codegen 的 preamble（import 语句）
  // 是在遍历之前就生成的，若等到 codegen 时再登记，导入语句里不会有 renderSlot。
  context.helper('RENDER_SLOT');

  // 子节点需要先被转换（拿到各自的 codegenNode），因此用 exit 回调
  return () => {
    let nameArg: string = JSON.stringify('default');
    const properties: JSProperty[] = [];

    for (const prop of element.props) {
      if (prop === undefined) continue;

      if (prop.type === NodeTypes.ATTRIBUTE) {
        if (prop.name === 'name') {
          nameArg = JSON.stringify(prop.value ? prop.value.content : 'default');
          continue;
        }
        // 静态属性作为插槽参数
        properties.push(
          createObjectProperty(
            createSimpleExpression(JSON.stringify(prop.name), true),
            createSimpleExpression(prop.value ? JSON.stringify(prop.value.content) : 'true', true),
          ),
        );
        continue;
      }

      // :name="expr" / :prop="expr"
      if (prop.name === 'bind' && prop.arg) {
        const argName = getExpContent(prop.arg);
        const expContent = getExpContent(prop.exp);
        if (!argName || !expContent) continue;

        if (argName === 'name') {
          nameArg = toCtxExpr(expContent);
          continue;
        }

        properties.push(
          createObjectProperty(
            createSimpleExpression(JSON.stringify(argName), true),
            createSimpleExpression(toCtxExpr(expContent), false),
          ),
        );
      }
    }

    const args: (JSChildNode | string)[] = [
      createSimpleExpression('_ctx.$slots', false),
      nameArg,
      createObjectExpression(properties),
    ];

    const fallback = buildFallback(element);
    if (fallback) args.push(fallback);

    // 直接产出运行时调用（codegen 见 genElement → node.codegenNode 分支）。
    // ElementNode.codegenNode 的声明类型是 VNodeCall，而 slot 出口需要的是
    // 一个裸调用表达式（不能再被 createVNode 包一层），因此此处做显式断言。
    element.codegenNode = createCallExpression(
      'RENDER_SLOT',
      args,
      element.loc,
    ) as unknown as ElementNode['codegenNode'];
  };
}
