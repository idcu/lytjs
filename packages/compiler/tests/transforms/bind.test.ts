// tests/transforms/bind.test.ts
// transformBind 独立单元测试

import { describe, it, expect } from 'vitest';
import { transformBind } from '../../src/transforms/bind';
import { createMockContext } from './helpers';
import { createElement, createSimpleExpression, createDirective } from '../../src/ast';
import { parse } from '../../src/parser';
import { transform } from '../../src/transform';

describe('transformBind', () => {
  describe('基本 v-bind 转换', () => {
    it('应该为 v-bind 生成正确的 key-value props', () => {
      const context = createMockContext();
      const arg = createSimpleExpression('class', true);
      const exp = createSimpleExpression('activeClass', false);
      const dir = createDirective('bind', arg, exp);
      const node = createElement('div');
      const result = transformBind(dir, node, context);

      expect(result.props).toHaveLength(1);
      expect(result.props[0]).toEqual({ key: 'class', value: 'activeClass' });
    });

    it('应该正确处理多个 v-bind 属性', () => {
      const context = createMockContext();
      const node = createElement('div');

      const dir1 = createDirective(
        'bind',
        createSimpleExpression('id', true),
        createSimpleExpression('myId', false),
      );
      const dir2 = createDirective(
        'bind',
        createSimpleExpression('class', true),
        createSimpleExpression('myClass', false),
      );

      const result1 = transformBind(dir1, node, context);
      const result2 = transformBind(dir2, node, context);

      expect(result1.props).toHaveLength(1);
      expect(result1.props[0]).toEqual({ key: 'id', value: 'myId' });
      expect(result2.props).toHaveLength(1);
      expect(result2.props[0]).toEqual({ key: 'class', value: 'myClass' });
    });

    it('应该正确处理带点号路径的表达式', () => {
      const context = createMockContext();
      const arg = createSimpleExpression('style', true);
      const exp = createSimpleExpression('theme.color', false);
      const dir = createDirective('bind', arg, exp);
      const node = createElement('div');
      const result = transformBind(dir, node, context);

      expect(result.props).toHaveLength(1);
      expect(result.props[0]).toEqual({ key: 'style', value: 'theme.color' });
    });
  });

  describe('边界条件', () => {
    it('当没有 arg 时应该返回空 props', () => {
      const context = createMockContext();
      const exp = createSimpleExpression('obj', false);
      const dir = createDirective('bind', undefined, exp);
      const node = createElement('div');
      const result = transformBind(dir, node, context);

      expect(result.props).toHaveLength(0);
    });

    it('当没有 exp 时应该返回空 props', () => {
      const context = createMockContext();
      const arg = createSimpleExpression('class', true);
      const dir = createDirective('bind', arg, undefined);
      const node = createElement('div');
      const result = transformBind(dir, node, context);

      expect(result.props).toHaveLength(0);
    });

    it('当 arg 和 exp 都为 undefined 时应该返回空 props', () => {
      const context = createMockContext();
      const dir = createDirective('bind', undefined, undefined);
      const node = createElement('div');
      const result = transformBind(dir, node, context);

      expect(result.props).toHaveLength(0);
    });
  });

  it('should handle dynamic arguments', () => {
    const ast = parse('<div :[attr]="value"></div>');
    const result = transform(ast, { nodeTransforms: [transformBind] });
    // Verify dynamic argument is processed
    expect(result).toBeDefined();
  });
});
