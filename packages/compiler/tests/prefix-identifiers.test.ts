/**
 * 标识符前缀化测试
 *
 * 契约：编译产物是 `function render(_ctx, _cache)` / `function render(_ctx)`，
 * 模板里的绑定必须前缀化为 `_ctx.xxx`；但局部标识符（v-for 别名、插槽参数、
 * 箭头函数参数、对象 key、成员访问属性、字符串/注释内容）**不能**加前缀。
 */

import { describe, it, expect } from 'vitest';
import { prefixIdentifiers } from '../src/prefix-identifiers';
import { compile } from '../src/index';

describe('prefixIdentifiers', () => {
  describe('基本前缀化', () => {
    it('裸标识符应加前缀', () => {
      expect(prefixIdentifiers('message')).toBe('_ctx.message');
    });

    it('属性路径只在根上加前缀', () => {
      expect(prefixIdentifiers('user.name')).toBe('_ctx.user.name');
    });

    it('函数调用参数应逐个前缀化', () => {
      expect(prefixIdentifiers('format(count)')).toBe('_ctx.format(_ctx.count)');
    });

    it('二元运算两侧都应前缀化', () => {
      expect(prefixIdentifiers('a + b')).toBe('_ctx.a + _ctx.b');
    });
  });

  describe('不应加前缀的情况', () => {
    it('JS 字面量与关键字保持不变', () => {
      expect(prefixIdentifiers('true')).toBe('true');
      expect(prefixIdentifiers('undefined')).toBe('undefined');
      expect(prefixIdentifiers('this')).toBe('this');
      expect(prefixIdentifiers('typeof value')).toBe('typeof _ctx.value');
    });

    it('局部标识符（v-for 别名等）保持不变', () => {
      expect(prefixIdentifiers('item.name', new Set(['item']))).toBe('item.name');
    });

    it('字符串字面量内容不被改写', () => {
      expect(prefixIdentifiers(`'hello world'`)).toBe(`'hello world'`);
      expect(prefixIdentifiers(`"a.b"`)).toBe(`"a.b"`);
      expect(prefixIdentifiers('`tpl ${ x }`')).toBe('`tpl ${ x }`');
    });

    it('对象 key 不变，简写值要前缀化', () => {
      expect(prefixIdentifiers('{ foo: bar }')).toBe('{ foo: _ctx.bar }');
      expect(prefixIdentifiers('{ foo }')).toBe('{ _ctx.foo }');
    });

    it('成员访问的属性名不被改写', () => {
      expect(prefixIdentifiers('obj.method')).toBe('_ctx.obj.method');
    });

    it('箭头函数单参数应视为局部变量', () => {
      expect(prefixIdentifiers('list.map(i => i.id)')).toBe('_ctx.list.map(i => i.id)');
    });

    it('const 声明的名字应视为局部变量', () => {
      expect(prefixIdentifiers('const total = count + 1')).toBe('const total = _ctx.count + 1');
    });

    it('已前缀化的内容不重复前缀', () => {
      expect(prefixIdentifiers('_ctx.message')).toBe('_ctx.message');
    });
  });

  describe('编译集成（VNode 路径）', () => {
    it('插值应前缀化', () => {
      const code = compile('<div>{{ msg }}</div>').code;
      expect(code).toContain('_ctx.msg');
    });

    it('v-bind 应前缀化', () => {
      const code = compile('<div :title="tip"></div>').code;
      expect(code).toContain('_ctx.tip');
    });

    it('v-if 条件应前缀化且分支 children 保留', () => {
      const code = compile('<div v-if="ok"><span>{{ msg }}</span></div>').code;
      expect(code).toContain('_ctx.ok');
      expect(code).toContain('_ctx.msg');
      expect(code).toContain('"span"');
    });

    it('v-for 别名不加前缀、列表表达式加前缀、children 保留', () => {
      const code = compile('<ul><li v-for="item in items">{{ item.name }}</li></ul>').code;
      expect(code).toContain('renderList(_ctx.items');
      expect(code).toContain('item.name');
      // 注意：`_ctx.items` 里天然包含 `_ctx.item` 子串，必须用词边界判断
      expect(code).not.toMatch(/_ctx\.item\b(?!s)/);
    });
  });
});
