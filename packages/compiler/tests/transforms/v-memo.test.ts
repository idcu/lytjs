/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
// tests/transforms/v-memo.test.ts
// transformVMemo 独立单元测试

import { describe, it, expect, beforeEach } from 'vitest';
import { transformVMemo, getMemoMeta, resetMemoCounter } from '../../src/transforms/v-memo';
import { NodeTypes, ElementTypes } from '../../src/constants';
import type { TextNode } from '../../src/types';
import { createMockContext, createTextChild, createAttr } from './helpers';
import { createElement, createDirective, createSimpleExpression } from '../../src/ast';

describe('transformVMemo', () => {
  // FIX: P2-28 resetMemoCounter 现在需要 context 参数
  let testContext: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    testContext = createMockContext();
    resetMemoCounter(testContext);
  });

  describe('基本功能', () => {
    it('应该跳过非元素节点', () => {
      const context = createMockContext();
      const textNode: TextNode = {
        type: NodeTypes.TEXT,
        content: 'hello',
        isStatic: true,
        loc: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 6, offset: 5 },
          source: 'hello',
        },
      };
      transformVMemo(textNode, context);
      expect(context.helpers.size).toBe(0);
    });

    it('应该跳过没有 v-memo 指令的普通元素', () => {
      const context = createMockContext();
      const element = createElement('div');
      transformVMemo(element, context);
      expect(getMemoMeta(element)).toBeUndefined();
    });
  });

  describe('v-memo 指令检测与处理', () => {
    it('应该检测 v-memo 指令并提取依赖数组', () => {
      const context = createMockContext();
      const memoDir = createDirective(
        'memo',
        undefined,
        createSimpleExpression('[count, name]', false),
      );
      const element = createElement('div', [memoDir], [createTextChild('content')]);

      transformVMemo(element, context);

      const meta = getMemoMeta(element);
      expect(meta).toBeDefined();
      expect(meta!.deps).toBe('[count, name]');
      expect(meta!.cacheKey).toBe('_memo_0');
    });

    it('应该从元素的 props 中移除 v-memo 指令', () => {
      const context = createMockContext();
      const memoDir = createDirective('memo', undefined, createSimpleExpression('[count]', false));
      const element = createElement('div', [memoDir, createAttr('class', 'container')]);

      expect(element.props.some((p) => p.type === NodeTypes.DIRECTIVE && p.name === 'memo')).toBe(
        true,
      );
      transformVMemo(element, context);
      expect(element.props.some((p) => p.type === NodeTypes.DIRECTIVE && p.name === 'memo')).toBe(
        false,
      );
    });

    it('应该保留 v-memo 之外的其他 props', () => {
      const context = createMockContext();
      const memoDir = createDirective('memo', undefined, createSimpleExpression('[a]', false));
      const element = createElement('div', [memoDir, createAttr('class', 'container')]);

      transformVMemo(element, context);
      expect(element.props.some((p) => p.type === NodeTypes.ATTRIBUTE && p.name === 'class')).toBe(
        true,
      );
    });

    it('应该为 v-memo 元素生成 codegenNode', () => {
      const context = createMockContext();
      const memoDir = createDirective('memo', undefined, createSimpleExpression('[count]', false));
      const element = createElement('div', [memoDir], [createTextChild('content')]);

      transformVMemo(element, context);
      expect(element.codegenNode).toBeDefined();
    });

    it('应该注册 WITH_MEMO helper', () => {
      const context = createMockContext();
      const memoDir = createDirective('memo', undefined, createSimpleExpression('[count]', false));
      const element = createElement('div', [memoDir]);

      transformVMemo(element, context);
      expect(context.helpers.has('WITH_MEMO')).toBe(true);
    });
  });

  describe('缓存变量名生成', () => {
    it('应该为每个 v-memo 元素生成唯一的缓存变量名', () => {
      const context = createMockContext();

      const memoDir1 = createDirective('memo', undefined, createSimpleExpression('[a]', false));
      const element1 = createElement('div', [memoDir1]);
      transformVMemo(element1, context);

      const memoDir2 = createDirective('memo', undefined, createSimpleExpression('[b]', false));
      const element2 = createElement('span', [memoDir2]);
      transformVMemo(element2, context);

      expect(getMemoMeta(element1)!.cacheKey).toBe('_memo_0');
      expect(getMemoMeta(element2)!.cacheKey).toBe('_memo_1');
    });

    // FIX: P2-28 resetMemoCounter 现在需要 context 参数
    it('resetMemoCounter 应该重置计数器', () => {
      const context = createMockContext();

      const memoDir = createDirective('memo', undefined, createSimpleExpression('[a]', false));
      const element = createElement('div', [memoDir]);
      transformVMemo(element, context);
      expect(getMemoMeta(element)!.cacheKey).toBe('_memo_0');

      resetMemoCounter(context);

      const memoDir2 = createDirective('memo', undefined, createSimpleExpression('[b]', false));
      const element2 = createElement('div', [memoDir2]);
      transformVMemo(element2, context);
      expect(getMemoMeta(element2)!.cacheKey).toBe('_memo_0');
    });
  });

  describe('边界条件', () => {
    it('应该在 v-memo 没有表达式时报错', () => {
      const context = createMockContext();
      const memoDir = createDirective('memo');
      const element = createElement('div', [memoDir]);

      expect(() => transformVMemo(element, context)).toThrow('v-memo requires an array expression');
    });

    it('应该处理带有多个子节点的 v-memo 元素', () => {
      const context = createMockContext();
      const memoDir = createDirective('memo', undefined, createSimpleExpression('[count]', false));
      const element = createElement(
        'div',
        [memoDir],
        [createTextChild('Hello '), createTextChild('World')],
      );

      transformVMemo(element, context);
      expect(element.codegenNode).toBeDefined();
      const meta = getMemoMeta(element);
      expect(meta).toBeDefined();
      expect(meta!.deps).toBe('[count]');
    });

    it('应该处理组件类型的 v-memo 元素', () => {
      const context = createMockContext();
      const memoDir = createDirective('memo', undefined, createSimpleExpression('[props]', false));
      const element = createElement('MyComponent', [memoDir]);
      element.tagType = ElementTypes.COMPONENT;

      transformVMemo(element, context);
      expect(element.codegenNode).toBeDefined();
    });

    it('应该处理带有属性的 v-memo 元素', () => {
      const context = createMockContext();
      const memoDir = createDirective('memo', undefined, createSimpleExpression('[id]', false));
      const element = createElement('div', [
        memoDir,
        createAttr('id', 'app'),
        createAttr('class', 'container'),
      ]);

      transformVMemo(element, context);
      expect(element.codegenNode).toBeDefined();
      expect(element.props.length).toBe(2); // class and id, memo removed
    });
  });

  describe('不同依赖表达式', () => {
    it('应该处理单元素依赖数组', () => {
      const context = createMockContext();
      const memoDir = createDirective('memo', undefined, createSimpleExpression('[x]', false));
      const element = createElement('div', [memoDir]);

      transformVMemo(element, context);
      expect(getMemoMeta(element)!.deps).toBe('[x]');
    });

    it('应该处理多元素依赖数组', () => {
      const context = createMockContext();
      const memoDir = createDirective(
        'memo',
        undefined,
        createSimpleExpression('[a, b, c, d]', false),
      );
      const element = createElement('div', [memoDir]);

      transformVMemo(element, context);
      expect(getMemoMeta(element)!.deps).toBe('[a, b, c, d]');
    });

    it('应该处理复杂表达式依赖', () => {
      const context = createMockContext();
      const memoDir = createDirective(
        'memo',
        undefined,
        createSimpleExpression('[item.id, item.name]', false),
      );
      const element = createElement('div', [memoDir]);

      transformVMemo(element, context);
      expect(getMemoMeta(element)!.deps).toBe('[item.id, item.name]');
    });
  });
});
