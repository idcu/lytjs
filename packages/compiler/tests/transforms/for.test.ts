// tests/transforms/for.test.ts
// transformFor 独立单元测试

import { describe, it, expect } from 'vitest';
import { NodeTypes } from '../../src/constants';
import { transformFor } from '../../src/transforms/for';
import { compile } from '../../src/index';
import { createMockContext, runTransform } from './helpers';
import {
  createElement,
  createSimpleExpression,
  createDirective,
  createRoot,
  createText,
} from '../../src/ast';
import type { TemplateChildNode } from '../../src/types';

/**
 * 创建一个能捕获 replaceNode 调用的 mock context
 */
function createContextWithReplace() {
  let replacedNode: TemplateChildNode | null = null;
  const context = createMockContext({
    replaceNode(node: TemplateChildNode) {
      replacedNode = node;
    },
  });
  // transformFor 会把 renderList 调用**直接替换进父节点 children**（使用 transform
  // 阶段捕获的父节点与下标），此时不会走 context.replaceNode。两条路径都要能取到结果。
  return {
    context,
    getReplacedNode: () =>
      replacedNode ?? (context.currentNode as unknown as TemplateChildNode | null),
  };
}

describe('transformFor', () => {
  describe('基本 v-for 转换', () => {
    it('应该将 v-for 元素转换为 RENDER_LIST 调用', () => {
      const forDir = createDirective(
        'for',
        undefined,
        createSimpleExpression('item in list', false),
      );
      const element = createElement('div', [forDir], [createText('hello')]);
      const root = createRoot([element]);
      const { context, getReplacedNode } = createContextWithReplace();
      context.parent = root;

      runTransform(transformFor, element, context);

      const replaced = getReplacedNode();
      expect(replaced?.type).toBe(NodeTypes.JS_CALL_EXPRESSION);
      const callNode = replaced as any;
      expect(callNode.callee).toBe('RENDER_LIST');
    });

    it('应该从元素 props 中移除 v-for 指令', () => {
      const forDir = createDirective(
        'for',
        undefined,
        createSimpleExpression('item in items', false),
      );
      const element = createElement('li', [forDir]);
      const root = createRoot([element]);
      const { context } = createContextWithReplace();
      context.parent = root;

      runTransform(transformFor, element, context);

      // v-for 指令已从 props 中移除
      const hasForDirective = element.props.some(
        (p) => p.type === NodeTypes.DIRECTIVE && p.name === 'for',
      );
      expect(hasForDirective).toBe(false);
    });

    it('应该正确解析简单变量语法', () => {
      const forDir = createDirective(
        'for',
        undefined,
        createSimpleExpression('item in list', false),
      );
      const element = createElement('div', [forDir]);
      const root = createRoot([element]);
      const { context, getReplacedNode } = createContextWithReplace();
      context.parent = root;

      runTransform(transformFor, element, context);

      const replaced = getReplacedNode();
      expect(replaced?.type).toBe(NodeTypes.JS_CALL_EXPRESSION);
      const callNode = replaced as any;
      expect(callNode.callee).toBe('RENDER_LIST');
      // 第二个参数应该是 CompoundExpression，包含 item
      const secondArg = callNode.arguments[1];
      expect(secondArg.type).toBe(NodeTypes.COMPOUND_EXPRESSION);
      const arrowText = secondArg.children.find((c: any) => typeof c === 'string');
      expect(arrowText).toContain('item');
      // 箭头函数应包含 codegenNode（元素渲染逻辑）
      const hasCodegenChild = secondArg.children.some((c: any) => typeof c !== 'string');
      expect(hasCodegenChild).toBe(true);
    });

    it('应该正确解析 (item,index) 无空格语法', () => {
      const forDir = createDirective(
        'for',
        undefined,
        createSimpleExpression('(item,index) in list', false),
      );
      const element = createElement('div', [forDir]);
      const root = createRoot([element]);
      const { context, getReplacedNode } = createContextWithReplace();
      context.parent = root;

      runTransform(transformFor, element, context);

      const replaced = getReplacedNode();
      expect(replaced?.type).toBe(NodeTypes.JS_CALL_EXPRESSION);
      const callNode = replaced as any;
      expect(callNode.callee).toBe('RENDER_LIST');
      const secondArg = callNode.arguments[1];
      expect(secondArg.type).toBe(NodeTypes.COMPOUND_EXPRESSION);
      const arrowText = secondArg.children.find((c: any) => typeof c === 'string');
      expect(arrowText).toContain('item');
      expect(arrowText).toContain('index');
    });

    it('应该注册 RENDER_LIST helper', () => {
      const forDir = createDirective(
        'for',
        undefined,
        createSimpleExpression('item in list', false),
      );
      const element = createElement('div', [forDir]);
      const root = createRoot([element]);
      const { context } = createContextWithReplace();
      context.parent = root;

      runTransform(transformFor, element, context);

      expect(context.helpers.get('RENDER_LIST')).toBe(1);
    });
  });

  describe('边界条件', () => {
    it('非元素节点应该被忽略', () => {
      const textNode = createText('hello');
      const root = createRoot([textNode]);
      const context = createMockContext({ parent: root });

      runTransform(transformFor, textNode, context);

      expect(root.children).toHaveLength(1);
      expect(root.children[0]?.type).toBe(NodeTypes.TEXT);
    });

    it('没有 v-for 指令的元素应该被忽略', () => {
      const element = createElement('div', [], [createText('hello')]);
      const root = createRoot([element]);
      const context = createMockContext({ parent: root });

      runTransform(transformFor, element, context);

      expect(root.children).toHaveLength(1);
      expect(root.children[0]?.type).toBe(NodeTypes.ELEMENT);
    });

    it('v-for 指令没有 exp 时应该被忽略', () => {
      const forDir = createDirective('for', undefined, undefined);
      const element = createElement('div', [forDir]);
      const root = createRoot([element]);
      const context = createMockContext({ parent: root });

      runTransform(transformFor, element, context);

      expect(root.children).toHaveLength(1);
      expect(root.children[0]?.type).toBe(NodeTypes.ELEMENT);
    });

    it('v-for 表达式格式不正确时应该被忽略', () => {
      const forDir = createDirective(
        'for',
        undefined,
        createSimpleExpression('invalid expression', false),
      );
      const element = createElement('div', [forDir]);
      const root = createRoot([element]);
      const context = createMockContext({ parent: root });

      runTransform(transformFor, element, context);

      // 表达式不匹配 "xxx in yyy" 格式，应被忽略
      expect(root.children).toHaveLength(1);
      expect(root.children[0]?.type).toBe(NodeTypes.ELEMENT);
    });
  });

  describe('解构表达式', () => {
    it('应该支持对象解构 { key, value } in entries', () => {
      const forDir = createDirective(
        'for',
        undefined,
        createSimpleExpression('{ key, value } in entries', false),
      );
      const element = createElement('div', [forDir]);
      const root = createRoot([element]);
      const { context, getReplacedNode } = createContextWithReplace();
      context.parent = root;

      runTransform(transformFor, element, context);

      const replaced = getReplacedNode();
      // 解构表达式应该被正确处理
      expect(replaced).toBeDefined();
    });

    it('应该支持数组解构 [ index, value ] in array', () => {
      const forDir = createDirective(
        'for',
        undefined,
        createSimpleExpression('[ index, value ] in array', false),
      );
      const element = createElement('div', [forDir]);
      const root = createRoot([element]);
      const { context, getReplacedNode } = createContextWithReplace();
      context.parent = root;

      runTransform(transformFor, element, context);

      const replaced = getReplacedNode();
      // 数组解构应该被正确处理
      expect(replaced).toBeDefined();
    });

    it('应该支持对象解构加索引 { key, value }, index in entries', () => {
      const forDir = createDirective(
        'for',
        undefined,
        createSimpleExpression('{ key, value }, index in entries', false),
      );
      const element = createElement('div', [forDir]);
      const root = createRoot([element]);
      const { context, getReplacedNode } = createContextWithReplace();
      context.parent = root;

      runTransform(transformFor, element, context);

      const replaced = getReplacedNode();
      // 解构表达式加索引应该被正确处理
      expect(replaced).toBeDefined();
    });

    it('应该支持数组解构加索引 [ index, value ], i in array', () => {
      const forDir = createDirective(
        'for',
        undefined,
        createSimpleExpression('[ index, value ], i in array', false),
      );
      const element = createElement('div', [forDir]);
      const root = createRoot([element]);
      const { context, getReplacedNode } = createContextWithReplace();
      context.parent = root;

      runTransform(transformFor, element, context);

      const replaced = getReplacedNode();
      // 数组解构加索引应该被正确处理
      expect(replaced).toBeDefined();
    });

    it('应该为解构表达式生成块作用域的箭头函数体', () => {
      const forDir = createDirective(
        'for',
        undefined,
        createSimpleExpression('{ name } in items', false),
      );
      const element = createElement('div', [forDir]);
      const root = createRoot([element]);
      const { context, getReplacedNode } = createContextWithReplace();
      context.parent = root;

      runTransform(transformFor, element, context);

      const replaced = getReplacedNode();
      // 解构表达式应该被正确处理
      expect(replaced).toBeDefined();
    });

    it('非解构表达式应该保持简洁的箭头函数形式', () => {
      const forDir = createDirective(
        'for',
        undefined,
        createSimpleExpression('item in list', false),
      );
      const element = createElement('div', [forDir]);
      const root = createRoot([element]);
      const { context, getReplacedNode } = createContextWithReplace();
      context.parent = root;

      runTransform(transformFor, element, context);

      const replaced = getReplacedNode();
      // 非解构表达式应该被正确处理
      expect(replaced).toBeDefined();
    });
  });
});

// ⚠️ 2026-10-27 新增（P1 回归）：解构式 v-for 此前被**整条静默忽略**
//
// 根因：`matchVForExpression` 里 `rest` 已经 trim 过（`{ a, b } in list` 的 rest 是
// "in list"，前面没有空白），而正则写的是 `\s+(?:in|of)` —— 要求至少一个空白 ⇒
// 匹配失败 ⇒ `transformFor` 直接 return，产物里连 renderList 都没有，
// 模板退化成 `_ctx.a`。
describe('v-for 解构（P1 回归）', () => {
  it('{ a, b } in list 必须产出 renderList 与解构语句', () => {
    const { code } = compile('<div v-for="{ a, b } in list">{{ a }}</div>');
    expect(code).toContain('renderList(_ctx.list');
    expect(code).toMatch(/const\s*\{\s*a\s*,\s*b\s*\}\s*=/);
  });

  it('[x, y] in pairs 同样要产出 renderList', () => {
    const { code } = compile('<div v-for="[x, y] in pairs">{{ x }}</div>');
    expect(code).toContain('renderList(_ctx.pairs');
    expect(code).toMatch(/const\s*\[\s*x\s*,\s*y\s*\]\s*=/);
  });

  it('(item, idx) in list 的既有行为不变', () => {
    const { code } = compile('<div v-for="(item, idx) in list">{{ item }}</div>');
    expect(code).toContain('renderList(_ctx.list, (item, idx)');
  });
});
