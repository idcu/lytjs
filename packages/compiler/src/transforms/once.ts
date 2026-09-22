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
import { createCompoundExpression } from '../ast';

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
  // 元素 children 会被整片丢掉），随后再做「转换 + 惰性缓存」。
  return () => {
    transformElement(element, context, { sync: true });

    const codegenNode = element.codegenNode;
    if (!codegenNode) return;

    // 用「模块级**惰性**变量」实现 v-once：首次求值后缓存复用。
    //
    // 为什么不用 hoisting（`const _hoisted_N = …`）？
    //   hoisted 常量在**模块级作用域**立即求值，而 v-once 的子树通常引用 `_ctx.x`
    //   ⇒ 产物运行时会抛 `_ctx is not defined`（本仓库此前的实现在此确实抛错）。
    // 为什么不用 `_cache` 数组？
    //   编译产物可能在没有 `_cache` 实参的环境下被执行（本仓库的 vapor-ssr 就只传 `_ctx`），
    //   而 `_cache[N]` 在 `_cache === undefined` 时会崩。
    //
    // 生成形态：`(_once_0 || (_once_0 = <原始 vnode 表达式>))`，模块级声明 `let _once_0;`
    // 语义标记：供各 codegen 识别（不再依赖 codegenNode 的形态）
    element.__isOnce = true;

    const index = context.cached++;
    const name = `_once_${index}`;
    const root = context.rootNode;
    if (!root.onceVars) root.onceVars = [];
    root.onceVars.push(name);

    element.codegenNode = createCompoundExpression([
      `(${name} || (${name} = `,
      codegenNode,
      `))`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any) as unknown as VNodeCall;
  };
}
