// tests/transforms/for.test.ts
// transformFor 独立单元测试

import { describe, it, expect } from 'vitest';
import { NodeTypes } from '../../src/constants';
import { transformFor } from '../../src/transforms/for';
import { createMockContext } from './helpers';
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
  return { context, getReplacedNode: () => replacedNode };
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

      transformFor(element, context);

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

      transformFor(element, context);

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

      transformFor(element, context);

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

      transformFor(element, context);

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

      transformFor(element, context);

      expect(context.helpers.get('RENDER_LIST')).toBe(1);
    });
  });

  describe('边界条件', () => {
    it('非元素节点应该被忽略', () => {
      const textNode = createText('hello');
      const root = createRoot([textNode]);
      const context = createMockContext({ parent: root });

      transformFor(textNode, context);

      expect(root.children).toHaveLength(1);
      expect(root.children[0]?.type).toBe(NodeTypes.TEXT);
    });

    it('没有 v-for 指令的元素应该被忽略', () => {
      const element = createElement('div', [], [createText('hello')]);
      const root = createRoot([element]);
      const context = createMockContext({ parent: root });

      transformFor(element, context);

      expect(root.children).toHaveLength(1);
      expect(root.children[0]?.type).toBe(NodeTypes.ELEMENT);
    });

    it('v-for 指令没有 exp 时应该被忽略', () => {
      const forDir = createDirective('for', undefined, undefined);
      const element = createElement('div', [forDir]);
      const root = createRoot([element]);
      const context = createMockContext({ parent: root });

      transformFor(element, context);

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

      transformFor(element, context);

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

      transformFor(element, context);

      const replaced = getReplacedNode();
      expect(replaced?.type).toBe(NodeTypes.JS_CALL_EXPRESSION);
      const callNode = replaced as any;
      expect(callNode.callee).toBe('RENDER_LIST');

      // First arg should be the source expression
      expect(callNode.arguments[0].content).toBe('entries');

      // Second arg should be a compound expression with destructuring
      const secondArg = callNode.arguments[1];
      expect(secondArg.type).toBe(NodeTypes.COMPOUND_EXPRESSION);
      const children = secondArg.children;
      // Extract text from all children (strings and SimpleExpressionNode.content)
      const allText = children
        .map((c: any) => (typeof c === 'string' ? c : (c.content ?? '')))
        .join('');
      expect(allText).toContain('__destructureItem');
      expect(allText).toContain('{ key, value }');
      expect(allText).toContain('=>');
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

      transformFor(element, context);

      const replaced = getReplacedNode();
      expect(replaced?.type).toBe(NodeTypes.JS_CALL_EXPRESSION);
      const callNode = replaced as any;
      expect(callNode.callee).toBe('RENDER_LIST');

      const secondArg = callNode.arguments[1];
      expect(secondArg.type).toBe(NodeTypes.COMPOUND_EXPRESSION);
      const allText = secondArg.children
        .map((c: any) => (typeof c === 'string' ? c : (c.content ?? '')))
        .join('');
      expect(allText).toContain('__destructureItem');
      expect(allText).toContain('[ index, value ]');
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

      transformFor(element, context);

      const replaced = getReplacedNode();
      expect(replaced?.type).toBe(NodeTypes.JS_CALL_EXPRESSION);
      const callNode = replaced as any;

      const secondArg = callNode.arguments[1];
      expect(secondArg.type).toBe(NodeTypes.COMPOUND_EXPRESSION);
      const allText = secondArg.children
        .map((c: any) => (typeof c === 'string' ? c : (c.content ?? '')))
        .join('');
      // Should contain both the temp var, index var, and destructuring
      expect(allText).toContain('__destructureItem');
      expect(allText).toContain('index');
      expect(allText).toContain('{ key, value }');
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

      transformFor(element, context);

      const replaced = getReplacedNode();
      expect(replaced?.type).toBe(NodeTypes.JS_CALL_EXPRESSION);
      const callNode = replaced as any;

      const secondArg = callNode.arguments[1];
      expect(secondArg.type).toBe(NodeTypes.COMPOUND_EXPRESSION);
      const allText = secondArg.children
        .map((c: any) => (typeof c === 'string' ? c : (c.content ?? '')))
        .join('');
      expect(allText).toContain('__destructureItem');
      expect(allText).toContain('i');
      expect(allText).toContain('[ index, value ]');
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

      transformFor(element, context);

      const replaced = getReplacedNode();
      const callNode = replaced as any;
      const secondArg = callNode.arguments[1];
      const allText = secondArg.children
        .map((c: any) => (typeof c === 'string' ? c : (c.content ?? '')))
        .join('');

      // Should use block scope { } instead of expression body
      expect(allText).toContain('=> {');
      expect(allText).toContain('}');
      expect(allText).toContain('const { name } = __destructureItem');
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

      transformFor(element, context);

      const replaced = getReplacedNode();
      const callNode = replaced as any;
      const secondArg = callNode.arguments[1];
      const allText = secondArg.children
        .map((c: any) => (typeof c === 'string' ? c : (c.content ?? '')))
        .join('');

      // Non-destructuring should still use block scope (consistent behavior)
      expect(allText).toContain('=> {');
      expect(allText).toContain('}');
    });
  });
});
