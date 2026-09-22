// tests/transforms/once.test.ts
// transformOnce 独立单元测试

import { describe, it, expect } from 'vitest';
import { transformOnce } from '../../src/transforms/once';
import { NodeTypes, ElementTypes } from '../../src/constants';
import type { TextNode } from '../../src/types';
import {
  createMockContext,
  createOnceElement,
  createTextChild,
  createAttr,
  runTransform,
} from './helpers';
import { createElement, createDirective } from '../../src/ast';

describe('transformOnce', () => {
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
      runTransform(transformOnce, textNode, context);
      expect(context.helpers.size).toBe(0);
      expect(context.hoists.length).toBe(0);
    });

    it('应该跳过没有 v-once 指令的普通元素', () => {
      const context = createMockContext();
      const element = createElement('div');
      runTransform(transformOnce, element, context);
      expect(context.helpers.size).toBe(0);
      expect(context.hoists.length).toBe(0);
    });
  });

  describe('静态节点标记', () => {
    it('应该为带有 v-once 的元素生成 codegenNode', () => {
      const context = createMockContext();
      const element = createOnceElement();
      runTransform(transformOnce, element, context);
      // 新实现：元素被标记 __isOnce，codegenNode 被包成**惰性缓存表达式**
      expect(element.codegenNode).toBeDefined();
      expect(element.__isOnce).toBe(true);
      expect(element.codegenNode?.type).toBe(NodeTypes.COMPOUND_EXPRESSION);
    });

    it('应该把 v-once 记入模块级惰性变量（onceVars），而不是 hoists', () => {
      const context = createMockContext();
      const element = createOnceElement();
      runTransform(transformOnce, element, context);
      // 改用惰性变量：hoisted 常量在模块级立即求值，无法访问 `_ctx`
      expect(context.rootNode.onceVars?.length).toBe(1);
      expect(context.rootNode.onceVars?.[0]).toMatch(/^_once_\d+$/);
      expect(context.hoists.length).toBe(0);
    });

    it('应该从元素的 props 中移除 v-once 指令', () => {
      const context = createMockContext();
      const element = createOnceElement();
      expect(element.props.some((p) => p.type === NodeTypes.DIRECTIVE && p.name === 'once')).toBe(
        true,
      );
      runTransform(transformOnce, element, context);
      expect(element.props.some((p) => p.type === NodeTypes.DIRECTIVE && p.name === 'once')).toBe(
        false,
      );
    });

    it('应该保留 v-once 之外的其他 props', () => {
      const context = createMockContext();
      const element = createOnceElement({
        extraProps: [createAttr('class', 'static')],
      });
      runTransform(transformOnce, element, context);
      expect(element.props.some((p) => p.type === NodeTypes.ATTRIBUTE && p.name === 'class')).toBe(
        true,
      );
    });

    it('应该为 v-once 元素注册 CREATE_VNODE helper', () => {
      const context = createMockContext();
      const element = createOnceElement();
      runTransform(transformOnce, element, context);
      expect(context.helpers.has('CREATE_VNODE')).toBe(true);
    });
  });

  describe('动态内容处理', () => {
    it('应该处理带有文本子节点的 v-once 元素', () => {
      const context = createMockContext();
      const element = createOnceElement({
        children: [createTextChild('static content')],
      });
      runTransform(transformOnce, element, context);
      expect(element.codegenNode).toBeDefined();
      expect(context.rootNode.onceVars?.length).toBe(1);
    });

    it('应该处理带有多个子节点的 v-once 元素', () => {
      const context = createMockContext();
      const element = createOnceElement({
        children: [createTextChild('Hello '), createTextChild('World')],
      });
      runTransform(transformOnce, element, context);
      expect(element.codegenNode).toBeDefined();
      expect(context.rootNode.onceVars?.length).toBe(1);
    });

    it('应该处理带有属性和子节点的 v-once 元素', () => {
      const context = createMockContext();
      const element = createOnceElement({
        extraProps: [createAttr('id', 'once-block'), createAttr('class', 'container')],
        children: [createTextChild('content')],
      });
      runTransform(transformOnce, element, context);
      expect(element.codegenNode).toBeDefined();
      expect(context.rootNode.onceVars?.length).toBe(1);
    });
  });

  describe('嵌套元素处理', () => {
    it('应该正确处理不同标签的 v-once 元素', () => {
      const context = createMockContext();
      const spanElement = createOnceElement({ tag: 'span' });
      runTransform(transformOnce, spanElement, context);
      expect(spanElement.codegenNode).toBeDefined();
      expect(spanElement.__isOnce).toBe(true);
      expect(context.rootNode.onceVars?.length).toBe(1);
    });

    it('应该为多个 v-once 元素分别分配惰性变量', () => {
      const context = createMockContext();
      const element1 = createOnceElement({ tag: 'div' });
      const element2 = createOnceElement({ tag: 'span' });
      runTransform(transformOnce, element1, context);
      runTransform(transformOnce, element2, context);
      expect(context.rootNode.onceVars?.length).toBe(2);
    });
  });

  describe('边界条件', () => {
    it('应该处理只有 v-once 指令没有其他 props 的元素', () => {
      const context = createMockContext();
      const onceDir = createDirective('once');
      const element = createElement('div', [onceDir]);
      runTransform(transformOnce, element, context);
      expect(element.codegenNode).toBeDefined();
      expect(element.props.length).toBe(0);
    });

    it('应该处理组件类型的 v-once 元素', () => {
      const context = createMockContext();
      const element = createOnceElement({ tag: 'MyComponent' });
      element.tagType = ElementTypes.COMPONENT;
      runTransform(transformOnce, element, context);
      expect(element.codegenNode).toBeDefined();
      expect(context.rootNode.onceVars?.length).toBe(1);
    });

    it('v-once 移除后不应影响后续 transformElement 调用', () => {
      const context = createMockContext();
      const element = createOnceElement();
      runTransform(transformOnce, element, context);
      // 验证 v-once 已被移除，后续 transformElement 不会因 v-once 而提前返回
      expect(element.props.some((p) => p.type === NodeTypes.DIRECTIVE && p.name === 'once')).toBe(
        false,
      );
    });
  });
});
