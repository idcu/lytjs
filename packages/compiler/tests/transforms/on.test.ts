// tests/transforms/on.test.ts
// transformOn 独立单元测试

import { describe, it, expect } from 'vitest';
import { transformOn } from '../../src/transforms/on';
import { compile } from '../../src/index';
import { asVNode, execute } from '../support/execute';
import { createMockContext } from './helpers';
import { createElement, createSimpleExpression, createDirective } from '../../src/ast';

describe('transformOn', () => {
  describe('基本 v-on 转换', () => {
    it('应该为 v-on 生成 onXxx 格式的 props key', () => {
      const context = createMockContext();
      const arg = createSimpleExpression('click', true);
      const exp = createSimpleExpression('handleClick', false);
      const dir = createDirective('on', arg, exp);
      const node = createElement('button');
      const result = transformOn(dir, node, context);

      expect(result.props).toHaveLength(1);
      expect(result.props[0]).toMatchObject({
        key: { content: '"onClick"', isStatic: true },
        value: { content: 'handleClick' },
      });
    });

    it('应该正确处理 input 事件', () => {
      const context = createMockContext();
      const arg = createSimpleExpression('input', true);
      const exp = createSimpleExpression('onInput', false);
      const dir = createDirective('on', arg, exp);
      const node = createElement('input');
      const result = transformOn(dir, node, context);

      expect(result.props).toHaveLength(1);
      expect(result.props[0]).toMatchObject({
        key: { content: '"onInput"', isStatic: true },
        value: { content: 'onInput' },
      });
    });

    it('应该正确处理 keydown 事件', () => {
      const context = createMockContext();
      const arg = createSimpleExpression('keydown', true);
      const exp = createSimpleExpression('handleKeydown', false);
      const dir = createDirective('on', arg, exp);
      const node = createElement('input');
      const result = transformOn(dir, node, context);

      expect(result.props).toHaveLength(1);
      expect(result.props[0]).toMatchObject({
        key: { content: '"onKeydown"', isStatic: true },
        value: { content: 'handleKeydown' },
      });
    });
  });

  describe('事件修饰符', () => {
    it('应该正确处理单个修饰符', () => {
      const context = createMockContext();
      const arg = createSimpleExpression('click', true);
      const exp = createSimpleExpression('handleClick', false);
      const dir = createDirective('on', arg, exp, ['stop']);
      const node = createElement('button');
      const result = transformOn(dir, node, context);

      expect(result.props).toHaveLength(1);
      // key 是 SimpleExpressionNode
      expect(result.props[0].key).toMatchObject({
        content: '"onClick"',
        isStatic: true,
        isConstant: true,
      });
      // value 应为 withModifiers 调用表达式
      // ⚠️ callee 是**大写 helper 键**（`WITH_MODIFIERS`），不是运行时名 —— 这是本仓
      //   约定（对照 `TO_DISPLAY_STRING` / `RENDER_LIST`）：codegen 的
      //   `genCallExpression` 会经 `helperNameMap` 把键映射成产物里的 `withModifiers`，
      //   同时 `ast.helpers` 才会登记它、前导 import 面才认得它。
      //   2026-10-10 订正：此前断言写的是运行时名 `'withModifiers'`，与 on.ts 改用
      //   `context.helper('WITH_MODIFIERS')` 后的事实不符。
      expect(result.props[0].value).toMatchObject({
        callee: 'WITH_MODIFIERS',
        arguments: [
          { content: 'handleClick' },
          {
            elements: [{ content: '"stop"' }],
          },
        ],
      });
    });

    it('应该正确处理多个修饰符', () => {
      const context = createMockContext();
      const arg = createSimpleExpression('click', true);
      const exp = createSimpleExpression('handleClick', false);
      const dir = createDirective('on', arg, exp, ['stop', 'prevent']);
      const node = createElement('button');
      const result = transformOn(dir, node, context);

      expect(result.props).toHaveLength(1);
      // key 是 SimpleExpressionNode
      expect(result.props[0].key).toMatchObject({
        content: '"onClick"',
        isStatic: true,
        isConstant: true,
      });
      // value 应为 withModifiers 调用表达式，包含两个修饰符
      expect(result.props[0].value).toMatchObject({
        callee: 'WITH_MODIFIERS',
        arguments: [
          { content: 'handleClick' },
          {
            elements: [{ content: '"stop"' }, { content: '"prevent"' }],
          },
        ],
      });
    });
  });

  /**
   * 产物级契约（硬约束 8：核实必须打到被验证对象）
   *
   * 上面几条断言的是 **codegen 前的中间 AST**；中间 AST 正确 ≠ 产物能跑。
   * 这里直接编译模板、断言**真实产物**：函数体里有 `withModifiers(...)`，
   * 且前导 import 面（`preamble`）里确实导出了 `withModifiers`。
   * 后者是"契约断裂"的判据 —— 只登记不 import 时产物会 ReferenceError。
   */
  describe('产物级契约（执行产物，断言事件期的真实行为）', () => {
    const propsOf = (
      template: string,
      ctx: Record<string, unknown> = {},
    ): Record<string, unknown> =>
      (asVNode(execute(compile(template))(ctx)).props ?? {}) as Record<string, unknown>;

    it('@click.stop：事件冒泡被阻止，处理器仍执行', () => {
      const calls: string[] = [];
      const props = propsOf('<button @click.stop="foo">x</button>', {
        foo: () => calls.push('foo'),
      });
      const event = {
        stopPropagation: () => calls.push('stop'),
        preventDefault: () => undefined,
      };
      (props.onClick as (e: unknown) => void)(event);
      expect(calls).toEqual(['stop', 'foo']);
    });

    it('@keyup.enter：非 Enter 键被拦截，Enter 放行（修饰符不得被静默丢弃）', () => {
      const calls: string[] = [];
      const props = propsOf('<input @keyup.enter="onEnter">', {
        onEnter: () => calls.push('enter'),
      });
      const handler = props.onKeyup as (e: unknown) => void;

      handler({ key: 'a' });
      expect(calls).toEqual([]);

      handler({ key: 'Enter' });
      expect(calls).toEqual(['enter']);
    });

    it('@click.once：产出 { handler, once }，handler 保持裸引用', () => {
      const foo = () => undefined;
      const props = propsOf('<button @click.once="foo">x</button>', { foo });
      const listener = props.onClick as { handler: unknown; once?: boolean };
      expect(listener.once).toBe(true);
      // once 是 addEventListener 的选项，不是守卫，不能包进 withModifiers
      expect(listener.handler).toBe(foo);
    });

    it('@click.stop.once：守卫型与选项型共存，各走各的通道', () => {
      const calls: string[] = [];
      const props = propsOf('<button @click.stop.once="foo">x</button>', {
        foo: () => calls.push('foo'),
      });
      const listener = props.onClick as { handler: (e: unknown) => void; once?: boolean };
      expect(listener.once).toBe(true);
      listener.handler({
        stopPropagation: () => calls.push('stop'),
        preventDefault: () => undefined,
      });
      expect(calls).toEqual(['stop', 'foo']);
    });

    it('@click（无修饰符）：保持裸处理器，不引入额外包装', () => {
      const foo = () => undefined;
      expect(propsOf('<button @click="foo">x</button>', { foo }).onClick).toBe(foo);
    });
  });

  describe('边界条件', () => {
    it('当没有 arg 时应该返回空 props', () => {
      const context = createMockContext();
      const exp = createSimpleExpression('handleClick', false);
      const dir = createDirective('on', undefined, exp);
      const node = createElement('button');
      const result = transformOn(dir, node, context);

      expect(result.props).toHaveLength(0);
    });

    it('当没有 exp 时应该返回空 props', () => {
      const context = createMockContext();
      const arg = createSimpleExpression('click', true);
      const dir = createDirective('on', arg, undefined);
      const node = createElement('button');
      const result = transformOn(dir, node, context);

      expect(result.props).toHaveLength(0);
    });
  });
});
