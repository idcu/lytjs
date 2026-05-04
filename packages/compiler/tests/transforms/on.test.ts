// tests/transforms/on.test.ts
// transformOn 独立单元测试

import { describe, it, expect } from 'vitest';
import { transformOn } from '../../src/transforms/on';
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
      expect(result.props[0].value).toMatchObject({
        callee: 'withModifiers',
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
        callee: 'withModifiers',
        arguments: [
          { content: 'handleClick' },
          {
            elements: [{ content: '"stop"' }, { content: '"prevent"' }],
          },
        ],
      });
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
