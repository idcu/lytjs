// tests/transforms/slot.test.ts
// transformSlot 独立单元测试
//
// 契约变更（2026-09）：<slot> 不再走"普通元素"路径（那是 createVNode('slot')，
// 插槽内容根本不会被渲染），而是编译为运行时调用
// `renderSlot(_ctx.$slots, name, props, fallback)`；由于需要等子节点转换完成后
// 才能拿到各自的 codegenNode，该调用是在 **exit 回调** 里写入 element.codegenNode 的。

import { describe, it, expect } from 'vitest';
import { transformSlot } from '../../src/transforms/slot';
import { NodeTypes, ElementTypes } from '../../src/constants';
import type { TextNode } from '../../src/types';
import { createMockContext, createSlotElement, createTextChild, createAttr } from './helpers';

/** 取出 codegenNode 中的 renderSlot 调用信息 */
function callInfo(element: { codegenNode?: unknown }): {
  callee: unknown;
  args: unknown[];
  type: unknown;
} {
  const node = element.codegenNode as { callee?: unknown; arguments?: unknown[]; type?: unknown };
  return { callee: node?.callee, args: node?.arguments ?? [], type: node?.type };
}

/** 执行 transformSlot 并在返回 exit 回调时立即执行（模拟 traverseNode 的流程） */
function runTransform(
  node: Parameters<typeof transformSlot>[0],
  context: ReturnType<typeof createMockContext>,
): void {
  const onExit = transformSlot(node, context);
  if (typeof onExit === 'function') onExit();
}

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
    it('应该为基本插槽生成 renderSlot 调用（而不是 VNODE_CALL）', () => {
      const context = createMockContext();
      const element = createSlotElement({ tagType: ElementTypes.SLOT });
      runTransform(element, context);

      expect(element.codegenNode).toBeDefined();
      expect(callInfo(element).type).toBe(NodeTypes.JS_CALL_EXPRESSION);
      expect(callInfo(element).callee).toBe('RENDER_SLOT');
    });

    it('默认插槽名应为 "default"', () => {
      const context = createMockContext();
      const element = createSlotElement({ tagType: ElementTypes.SLOT });
      runTransform(element, context);

      expect(callInfo(element).args[1]).toBe('"default"');
    });
  });

  describe('具名插槽转换', () => {
    it('应该为带 name 属性的具名插槽使用该名字', () => {
      const context = createMockContext();
      const element = createSlotElement({
        tagType: ElementTypes.SLOT,
        props: [createAttr('name', 'header')],
      });
      runTransform(element, context);

      expect(callInfo(element).args[1]).toBe('"header"');
    });

    it('应该为具名插槽注册 RENDER_SLOT helper', () => {
      const context = createMockContext();
      const element = createSlotElement({
        tagType: ElementTypes.SLOT,
        props: [createAttr('name', 'footer')],
      });
      runTransform(element, context);
      expect(context.helpers.has('RENDER_SLOT')).toBe(true);
    });
  });

  describe('插槽参数与回退内容', () => {
    it('第一个参数应是 _ctx.$slots', () => {
      const context = createMockContext();
      const element = createSlotElement({ tagType: ElementTypes.SLOT });
      runTransform(element, context);

      expect(callInfo(element).args[0]).toMatchObject({
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: '_ctx.$slots',
      });
    });

    it('第三个参数应是 props 对象（无参数时为空对象）', () => {
      const context = createMockContext();
      const element = createSlotElement({ tagType: ElementTypes.SLOT });
      runTransform(element, context);

      expect(callInfo(element).args[2]).toMatchObject({ type: NodeTypes.JS_OBJECT_EXPRESSION });
    });
  });

  describe('带子内容的插槽', () => {
    it('应该处理带文本子节点的插槽（作为回退内容）', () => {
      const context = createMockContext();
      const element = createSlotElement({
        tagType: ElementTypes.SLOT,
        children: [createTextChild('default content')],
      });
      runTransform(element, context);

      expect(element.codegenNode).toBeDefined();
      // 有回退内容时参数个数为 4
      expect(callInfo(element).args.length).toBe(4);
    });

    it('应该处理带多个子节点的插槽（回退内容包成数组）', () => {
      const context = createMockContext();
      const element = createSlotElement({
        tagType: ElementTypes.SLOT,
        children: [createTextChild('Hello '), createTextChild('World')],
      });
      runTransform(element, context);

      expect(callInfo(element).args.length).toBe(4);
      expect(callInfo(element).args[3]).toMatchObject({ type: NodeTypes.JS_ARRAY_EXPRESSION });
    });
  });

  describe('边界条件', () => {
    it('应该处理空 props 的 slot 元素', () => {
      const context = createMockContext();
      const element = createSlotElement({
        tagType: ElementTypes.SLOT,
        props: [],
      });
      runTransform(element, context);
      expect(element.codegenNode).toBeDefined();
    });

    it('应该处理无子节点的 slot 元素（无回退参数）', () => {
      const context = createMockContext();
      const element = createSlotElement({
        tagType: ElementTypes.SLOT,
        children: [],
      });
      runTransform(element, context);

      expect(callInfo(element).args.length).toBe(3);
    });

    it('transform 本身只登记 helper 并返回 exit 回调（不立即写 codegenNode）', () => {
      const context = createMockContext();
      const element = createSlotElement({ tagType: ElementTypes.SLOT });
      const onExit = transformSlot(element, context);

      expect(typeof onExit).toBe('function');
      expect(element.codegenNode).toBeUndefined();
      expect(context.helpers.has('RENDER_SLOT')).toBe(true);
    });
  });
});
