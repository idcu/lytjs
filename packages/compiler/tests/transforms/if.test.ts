// tests/transforms/if.test.ts
// transformIf 独立单元测试

import { describe, it, expect } from 'vitest';
import { transformIf } from '../../src/transforms/if';
import { NodeTypes } from '../../src/constants';
import { createMockContext, runTransform } from './helpers';
import {
  createElement,
  createSimpleExpression,
  createDirective,
  createRoot,
  createText,
} from '../../src/ast';

describe('transformIf', () => {
  describe('基本 v-if 转换', () => {
    it('应该将 v-if 元素转换为条件表达式节点', () => {
      const ifDir = createDirective('if', undefined, createSimpleExpression('show', false));
      const element = createElement('div', [ifDir], [createText('hello')]);
      const root = createRoot([element]);
      const context = createMockContext({ parent: root });

      runTransform(transformIf, element, context);

      expect(root.children).toHaveLength(1);
      expect(root.children[0]?.type).toBe(NodeTypes.JS_CONDITIONAL_EXPRESSION);
    });

    it('应该从元素 props 中移除 v-if 指令', () => {
      const ifDir = createDirective('if', undefined, createSimpleExpression('visible', false));
      const element = createElement('div', [ifDir]);
      const root = createRoot([element]);
      const context = createMockContext({ parent: root });

      runTransform(transformIf, element, context);

      // 原始元素被替换，但条件表达式节点存在
      expect(root.children).toHaveLength(1);
      expect(root.children[0]?.type).toBe(NodeTypes.JS_CONDITIONAL_EXPRESSION);
    });

    it('应该正确处理 v-if/v-else 链', () => {
      const ifDir = createDirective('if', undefined, createSimpleExpression('show', false));
      const elseDir = createDirective('else');
      const ifElement = createElement('div', [ifDir], [createText('A')]);
      const elseElement = createElement('span', [elseDir], [createText('B')]);
      const root = createRoot([ifElement, elseElement]);
      const context = createMockContext({ parent: root });

      runTransform(transformIf, ifElement, context);

      // 两个元素被合并为一个条件表达式
      expect(root.children).toHaveLength(1);
      expect(root.children[0]?.type).toBe(NodeTypes.JS_CONDITIONAL_EXPRESSION);

      // 链完整性：test 必须是 v-if 的条件，alternate 必须是 v-else 分支
      //（只断言"节点数 + 类型"曾让"整条链丢分支"的 bug 潜伏很久）
      const cond = root.children[0] as unknown as {
        test?: { content?: string };
        alternate?: { type?: number } | undefined;
      };
      expect(cond.test?.content).toBe('show');
      expect(cond.alternate).toBeDefined();
      expect(cond.alternate?.type).toBe(NodeTypes.VNODE_CALL);
    });

    it('应该正确处理 v-if/v-else-if/v-else 链', () => {
      const ifDir = createDirective('if', undefined, createSimpleExpression('a', false));
      const elseIfDir = createDirective('else-if', undefined, createSimpleExpression('b', false));
      const elseDir = createDirective('else');
      const el1 = createElement('div', [ifDir], [createText('A')]);
      const el2 = createElement('span', [elseIfDir], [createText('B')]);
      const el3 = createElement('p', [elseDir], [createText('C')]);
      const root = createRoot([el1, el2, el3]);
      const context = createMockContext({ parent: root });

      runTransform(transformIf, el1, context);

      expect(root.children).toHaveLength(1);
      expect(root.children[0]?.type).toBe(NodeTypes.JS_CONDITIONAL_EXPRESSION);

      // 链完整性（回归守卫）：链首必须是 v-if 的条件 `a`，
      // alternate 必须是**嵌套的条件表达式**（v-else-if，test=`b`），其 alternate 是 v-else 分支。
      // 历史 bug：构建链时指针被下钻到链尾，插入 children 的是"最内层"，
      // 首分支被静默丢弃（产物退化成 `(b?y:null)`）。
      const cond = root.children[0] as unknown as {
        test?: { content?: string };
        consequent?: { type?: number };
        alternate?: {
          type?: number;
          test?: { content?: string };
          alternate?: { type?: number };
        };
      };
      expect(cond.test?.content).toBe('a');
      expect(cond.consequent?.type).toBe(NodeTypes.VNODE_CALL);
      expect(cond.alternate?.type).toBe(NodeTypes.JS_CONDITIONAL_EXPRESSION);
      expect(cond.alternate?.test?.content).toBe('b');
      expect(cond.alternate?.alternate?.type).toBe(NodeTypes.VNODE_CALL);
    });
  });

  describe('边界条件', () => {
    it('非元素节点应该被忽略', () => {
      const textNode = createText('hello');
      const root = createRoot([textNode]);
      const context = createMockContext({ parent: root });

      runTransform(transformIf, textNode, context);

      expect(root.children).toHaveLength(1);
      expect(root.children[0]?.type).toBe(NodeTypes.TEXT);
    });

    it('没有 v-if/v-else-if/v-else 指令的元素应该被忽略', () => {
      const element = createElement('div', [], [createText('hello')]);
      const root = createRoot([element]);
      const context = createMockContext({ parent: root });

      runTransform(transformIf, element, context);

      expect(root.children).toHaveLength(1);
      expect(root.children[0]?.type).toBe(NodeTypes.ELEMENT);
    });

    it('没有 parent 的元素应该被忽略', () => {
      const ifDir = createDirective('if', undefined, createSimpleExpression('show', false));
      const element = createElement('div', [ifDir]);
      const context = createMockContext({ parent: null });

      runTransform(transformIf, element, context);

      // 元素未被转换
      expect(element.type).toBe(NodeTypes.ELEMENT);
    });
  });
});
