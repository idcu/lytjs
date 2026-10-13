// tests/transforms/on.test.ts
// transformOn 独立单元测试

import { describe, it, expect } from 'vitest';
import { transformOn } from '../../src/transforms/on';
import { compile } from '../../src/index';
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
  describe('产物级契约（断言真实产物而非中间 AST）', () => {
    it('@click.stop：产物调用 withModifiers，且前导 import 面导出了它', () => {
      const result = compile('<button @click.stop="foo">x</button>');
      expect(result.code).toContain('withModifiers(');
      // 守卫型修饰符以数组形态作为第二实参
      expect(result.code).toContain('["stop"]');
      // 关键：前导 import 面必须认它
      expect(result.preamble).toContain('withModifiers');
    });

    it('@keyup.enter：非 stop/prevent/self 的修饰符**不得**被静默丢弃', () => {
      // 修复前：handleVOn 只认 stop/prevent/self，`.enter` 被丢弃 ⇒
      // 产物是裸 `_ctx.onEnter`，任意按键都触发。这是 P0-1 的真实缺陷。
      const result = compile('<input @keyup.enter="onEnter">');
      expect(result.code).toContain('withModifiers(');
      expect(result.code).toContain('["enter"]');
      expect(result.preamble).toContain('withModifiers');
    });

    it('@click.once：选项型修饰符产出 { handler, once: true }，且**不**进 withModifiers', () => {
      const result = compile('<button @click.once="foo">x</button>');
      expect(result.code).toContain('once: true');
      // once 是 addEventListener 的选项，不是守卫，不能包进 withModifiers
      expect(result.code).not.toContain('withModifiers(');
    });

    it('@click.stop.once：守卫型与选项型**可共存**，各走各的通道', () => {
      const result = compile('<button @click.stop.once="foo">x</button>');
      expect(result.code).toContain('handler: withModifiers(_ctx.foo, ["stop"])');
      expect(result.code).toContain('once: true');
    });

    it('@click（无修饰符）：产物保持裸处理器，不引入额外包装', () => {
      const result = compile('<button @click="foo">x</button>');
      expect(result.code).not.toContain('withModifiers(');
      expect(result.code).toContain('"onClick": _ctx.foo');
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
