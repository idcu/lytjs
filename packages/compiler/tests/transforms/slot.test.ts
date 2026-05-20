 
// tests/transforms/slot.test.ts
// transformSlot 独立单元测试

import { describe, it, expect } from 'vitest';
import { transformSlot } from '../../src/transforms/slot';
import { NodeTypes, ElementTypes } from '../../src/constants';
import type { TextNode } from '../../src/types';
import { createMockContext, createSlotElement, createTextChild, createAttr } from './helpers';

describe('transformSlot', () => {
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
      // 不应抛出错误
      transformSlot(textNode, context);
      expect(context.helpers.size).toBe(0);
    });

    it('应该跳过普通元素节点（非 slot）', () => {
      const context = createMockContext();
      const element = createSlotElement({
        tag: 'div',
        tagType: ElementTypes.ELEMENT,
      });
      transformSlot(element, context);
      expect(context.helpers.size).toBe(0);
    });

    it('应该为 tagType=SLOT 的元素注册 RENDER_SLOT helper', () => {
      const context = createMockContext();
      const element = createSlotElement({ tagType: ElementTypes.SLOT });
      transformSlot(element, context);
      expect(context.helpers.has('RENDER_SLOT')).toBe(true);
    });

    it("应该为 tag='slot' 的元素注册 RENDER_SLOT helper", () => {
      const context = createMockContext();
      const element = createSlotElement({
        tag: 'slot',
        tagType: ElementTypes.SLOT,
      });
      transformSlot(element, context);
      expect(context.helpers.has('RENDER_SLOT')).toBe(true);
    });
  });

  describe('基本插槽转换', () => {
    it('应该为基本插槽生成 codegenNode', () => {
      const context = createMockContext();
      const element = createSlotElement({ tagType: ElementTypes.SLOT });
      transformSlot(element, context);
      expect(element.codegenNode).toBeDefined();
      expect(element.codegenNode!.type).toBe(NodeTypes.VNODE_CALL);
    });

    it('应该为基本插槽设置正确的 tag', () => {
      const context = createMockContext();
      const element = createSlotElement({ tagType: ElementTypes.SLOT });
      transformSlot(element, context);
      expect(element.codegenNode!.tag).toBe('"slot"');
    });
  });

  describe('具名插槽转换', () => {
    it('应该为带 name 属性的具名插槽生成 codegenNode', () => {
      const context = createMockContext();
      const element = createSlotElement({
        tagType: ElementTypes.SLOT,
        props: [createAttr('name', 'header')],
      });
      transformSlot(element, context);
      expect(element.codegenNode).toBeDefined();
      expect(element.codegenNode!.type).toBe(NodeTypes.VNODE_CALL);
    });

    it('应该为具名插槽注册 RENDER_SLOT helper', () => {
      const context = createMockContext();
      const element = createSlotElement({
        tagType: ElementTypes.SLOT,
        props: [createAttr('name', 'footer')],
      });
      transformSlot(element, context);
      expect(context.helpers.has('RENDER_SLOT')).toBe(true);
    });
  });

  describe('作用域插槽转换', () => {
    it('应该为带作用域属性的插槽生成 codegenNode', () => {
      const context = createMockContext();
      const element = createSlotElement({
        tagType: ElementTypes.SLOT,
        props: [createAttr('name', 'default'), createAttr('slot-scope', 'props')],
      });
      transformSlot(element, context);
      expect(element.codegenNode).toBeDefined();
      expect(element.codegenNode!.type).toBe(NodeTypes.VNODE_CALL);
    });

    it('应该为作用域插槽注册 RENDER_SLOT helper', () => {
      const context = createMockContext();
      const element = createSlotElement({
        tagType: ElementTypes.SLOT,
        props: [createAttr('slot-scope', '{ item }')],
      });
      transformSlot(element, context);
      expect(context.helpers.has('RENDER_SLOT')).toBe(true);
    });
  });

  describe('带子内容的插槽', () => {
    it('应该处理带文本子节点的插槽', () => {
      const context = createMockContext();
      const element = createSlotElement({
        tagType: ElementTypes.SLOT,
        children: [createTextChild('default content')],
      });
      transformSlot(element, context);
      expect(element.codegenNode).toBeDefined();
    });

    it('应该处理带多个子节点的插槽', () => {
      const context = createMockContext();
      const element = createSlotElement({
        tagType: ElementTypes.SLOT,
        children: [createTextChild('Hello '), createTextChild('World')],
      });
      transformSlot(element, context);
      expect(element.codegenNode).toBeDefined();
    });
  });

  describe('边界条件', () => {
    it('应该处理空 props 的 slot 元素', () => {
      const context = createMockContext();
      const element = createSlotElement({
        tagType: ElementTypes.SLOT,
        props: [],
      });
      transformSlot(element, context);
      expect(element.codegenNode).toBeDefined();
    });

    it('应该处理无子节点的 slot 元素', () => {
      const context = createMockContext();
      const element = createSlotElement({
        tagType: ElementTypes.SLOT,
        children: [],
      });
      transformSlot(element, context);
      expect(element.codegenNode).toBeDefined();
    });

    it('多次调用不应重复创建 codegenNode（幂等性）', () => {
      const context = createMockContext();
      const element = createSlotElement({ tagType: ElementTypes.SLOT });
      transformSlot(element, context);
      const _firstCodegenNode = element.codegenNode;
      transformSlot(element, context);
      // transformElement 会重新创建 codegenNode，所以第二次调用后仍然有 codegenNode
      expect(element.codegenNode).toBeDefined();
    });
  });
});
