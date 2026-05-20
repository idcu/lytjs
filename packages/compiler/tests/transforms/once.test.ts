/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
// tests/transforms/once.test.ts
// transformOnce 独立单元测试

import { describe, it, expect } from 'vitest';
import { transformOnce } from '../../src/transforms/once';
import { NodeTypes, ElementTypes } from '../../src/constants';
import type { TextNode } from '../../src/types';
import { createMockContext, createOnceElement, createTextChild, createAttr } from './helpers';
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
      transformOnce(textNode, context);
      expect(context.helpers.size).toBe(0);
      expect(context.hoists.length).toBe(0);
    });

    it('应该跳过没有 v-once 指令的普通元素', () => {
      const context = createMockContext();
      const element = createElement('div');
      transformOnce(element, context);
      expect(context.helpers.size).toBe(0);
      expect(context.hoists.length).toBe(0);
    });
  });

  describe('静态节点标记', () => {
    it('应该为带有 v-once 的元素生成 codegenNode', () => {
      const context = createMockContext();
      const element = createOnceElement();
      transformOnce(element, context);
      // After transformOnce, codegenNode is replaced with a hoisted reference
      expect(element.codegenNode).toBeDefined();
      // The original codegenNode (VNODE_CALL) is in hoists
      expect(context.hoists[0]?.type).toBe(NodeTypes.VNODE_CALL);
    });

    it('应该将 codegenNode 添加到 hoists 中', () => {
      const context = createMockContext();
      const element = createOnceElement();
      transformOnce(element, context);
      expect(context.hoists.length).toBe(1);
      // The hoisted node is the original VNODE_CALL codegenNode
      expect(context.hoists[0]?.type).toBe(NodeTypes.VNODE_CALL);
    });

    it('应该从元素的 props 中移除 v-once 指令', () => {
      const context = createMockContext();
      const element = createOnceElement();
      expect(element.props.some((p) => p.type === NodeTypes.DIRECTIVE && p.name === 'once')).toBe(
        true,
      );
      transformOnce(element, context);
      expect(element.props.some((p) => p.type === NodeTypes.DIRECTIVE && p.name === 'once')).toBe(
        false,
      );
    });

    it('应该保留 v-once 之外的其他 props', () => {
      const context = createMockContext();
      const element = createOnceElement({
        extraProps: [createAttr('class', 'static')],
      });
      transformOnce(element, context);
      expect(element.props.some((p) => p.type === NodeTypes.ATTRIBUTE && p.name === 'class')).toBe(
        true,
      );
    });

    it('应该为 v-once 元素注册 CREATE_VNODE helper', () => {
      const context = createMockContext();
      const element = createOnceElement();
      transformOnce(element, context);
      expect(context.helpers.has('CREATE_VNODE')).toBe(true);
    });
  });

  describe('动态内容处理', () => {
    it('应该处理带有文本子节点的 v-once 元素', () => {
      const context = createMockContext();
      const element = createOnceElement({
        children: [createTextChild('static content')],
      });
      transformOnce(element, context);
      expect(element.codegenNode).toBeDefined();
      expect(context.hoists.length).toBe(1);
    });

    it('应该处理带有多个子节点的 v-once 元素', () => {
      const context = createMockContext();
      const element = createOnceElement({
        children: [createTextChild('Hello '), createTextChild('World')],
      });
      transformOnce(element, context);
      expect(element.codegenNode).toBeDefined();
      expect(context.hoists.length).toBe(1);
    });

    it('应该处理带有属性和子节点的 v-once 元素', () => {
      const context = createMockContext();
      const element = createOnceElement({
        extraProps: [createAttr('id', 'once-block'), createAttr('class', 'container')],
        children: [createTextChild('content')],
      });
      transformOnce(element, context);
      expect(element.codegenNode).toBeDefined();
      expect(context.hoists.length).toBe(1);
    });
  });

  describe('嵌套元素处理', () => {
    it('应该正确处理不同标签的 v-once 元素', () => {
      const context = createMockContext();
      const spanElement = createOnceElement({ tag: 'span' });
      transformOnce(spanElement, context);
      expect(spanElement.codegenNode).toBeDefined();
      // After hoisting, codegenNode is a reference; check the hoisted node's tag
      expect(context.hoists[0]?.tag).toBe('"span"');
      expect(context.hoists.length).toBe(1);
    });

    it('应该为多个 v-once 元素分别添加到 hoists', () => {
      const context = createMockContext();
      const element1 = createOnceElement({ tag: 'div' });
      const element2 = createOnceElement({ tag: 'span' });
      transformOnce(element1, context);
      transformOnce(element2, context);
      expect(context.hoists.length).toBe(2);
    });
  });

  describe('边界条件', () => {
    it('应该处理只有 v-once 指令没有其他 props 的元素', () => {
      const context = createMockContext();
      const onceDir = createDirective('once');
      const element = createElement('div', [onceDir]);
      transformOnce(element, context);
      expect(element.codegenNode).toBeDefined();
      expect(element.props.length).toBe(0);
    });

    it('应该处理组件类型的 v-once 元素', () => {
      const context = createMockContext();
      const element = createOnceElement({ tag: 'MyComponent' });
      element.tagType = ElementTypes.COMPONENT;
      transformOnce(element, context);
      expect(element.codegenNode).toBeDefined();
      expect(context.hoists.length).toBe(1);
    });

    it('v-once 移除后不应影响后续 transformElement 调用', () => {
      const context = createMockContext();
      const element = createOnceElement();
      transformOnce(element, context);
      // 验证 v-once 已被移除，后续 transformElement 不会因 v-once 而提前返回
      expect(element.props.some((p) => p.type === NodeTypes.DIRECTIVE && p.name === 'once')).toBe(
        false,
      );
    });
  });
});
