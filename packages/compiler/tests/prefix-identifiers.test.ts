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
import { asVNode, asVNodeList, execute } from './support/execute';

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
      // ⚠️ 2026-10-31 行为变更：此前断言 `` `tpl ${ x }` `` 原样返回 —— 那是**把缺陷
      //   写成了断言**：模板串里的 `${}` 是表达式，不前缀化就会在运行期抛
      //   `ReferenceError: x is not defined`（实测 `<div>{{ `hi ${name}` }}</div>`）。
      //   正确产物：字面量部分原样保留，`${}` 内部按表达式前缀化。
      expect(prefixIdentifiers('`tpl ${ x }`')).toBe('`tpl ${ _ctx.x }`');
      expect(prefixIdentifiers('`a${ b + c }d`')).toBe('`a${ _ctx.b + _ctx.c }d`');
      // 嵌套对象字面量 / 字符串里的 `}` 不能提前收尾
      expect(prefixIdentifiers('`${ { a: b } }`')).toBe('`${ { a: _ctx.b } }`');
      expect(prefixIdentifiers('`${ fn("}") }`')).toBe('`${ _ctx.fn("}") }`');
      // v-for 别名在模板串里同样不加前缀
      expect(prefixIdentifiers('`${ item.name }`', new Set(['item']))).toBe('`${ item.name }`');
    });

    it('对象 key 不变，简写值要前缀化', () => {
      expect(prefixIdentifiers('{ foo: bar }')).toBe('{ foo: _ctx.bar }');
      // ⚠️ 2026-10-27 行为变更：此前这里断言的是 `{ _ctx.foo }` —— 那是**非法 JS**
      //   （简写属性位置不能是成员表达式），`new Function` 会抛 SyntaxError，
      //   整个渲染函数不可用。这条用例等于**把缺陷写成了断言**。
      //   正确产物是显式键值对。
      expect(prefixIdentifiers('{ foo }')).toBe('{ foo: _ctx.foo }');
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

  describe('编译集成（VNode 路径，执行产物断言取值）', () => {
    const mount = (template: string, ctx: Record<string, unknown> = {}): unknown =>
      execute(compile(template))(ctx);

    it('插值按上下文取值', () => {
      expect(asVNode(mount('<div>{{ msg }}</div>', { msg: 'M' })).children).toBe('M');
    });

    it('v-bind 按上下文取值', () => {
      expect(asVNode(mount('<div :title="tip"></div>', { tip: 'T' })).props).toEqual({
        title: 'T',
      });
    });

    it('v-if 按上下文分支，且分支 children 保留', () => {
      const tpl = '<div v-if="ok"><span>{{ msg }}</span></div>';
      const shown = asVNode(mount(tpl, { ok: true, msg: 'M' }));
      expect(shown.type).toBe('div');
      const span = asVNode(shown.children);
      expect(span.type).toBe('span');
      expect(span.children).toBe('M');

      expect(mount(tpl, { ok: false, msg: 'M' })).toBeNull();
    });

    it('v-for 别名不加前缀、列表表达式取上下文、children 保留', () => {
      const list = mount('<ul><li v-for="item in items">{{ item.name }}</li></ul>', {
        items: [{ name: 'a' }, { name: 'b' }],
      });
      const items = asVNodeList(asVNode(list).children);
      expect(items.map((item) => item.children)).toEqual(['a', 'b']);
    });
  });
});

// ⚠️ 2026-10-27 新增（P0 回归）：对象字面量的**简写属性**被改写成非法 JS
//
// 旧行为：`{ color }` 里的 `color` 被当成普通变量引用 ⇒ 产物 `{ _ctx.color }`。
// 这是**语法错误**（简写位置不能是成员表达式），`new Function` 直接抛 SyntaxError
// ⇒ 整个渲染函数不可用。实测 `<span :style="{ color }">A</span>` 渲染出空，
// 而 `:style="{ color: c }"` 正常 —— 「一半能用」最容易被误判成偶发。
//
// 正确产物是 `{ color: _ctx.color }`。
describe('prefixIdentifiers · 对象简写属性（P0 回归）', () => {
  it('单个简写必须展开成键值对', () => {
    expect(prefixIdentifiers('{ color }')).toBe('{ color: _ctx.color }');
  });

  it('多个简写（逗号分隔）都要展开', () => {
    expect(prefixIdentifiers('{ a, b }')).toBe('{ a: _ctx.a, b: _ctx.b }');
  });

  it('显式 key 不受影响（key 不加前缀，值加）', () => {
    expect(prefixIdentifiers('{ active: on }')).toBe('{ active: _ctx.on }');
  });

  it('简写与显式混用', () => {
    expect(prefixIdentifiers('{ color: c, size }')).toBe('{ color: _ctx.c, size: _ctx.size }');
  });

  it('局部名的简写保持原样（v-for 别名 / 插槽参数）', () => {
    expect(prefixIdentifiers('{ item }', new Set(['item']))).toBe('{ item }');
  });

  it('数组元素不是简写（不得误展开）', () => {
    expect(prefixIdentifiers('[a, b]')).toBe('[_ctx.a, _ctx.b]');
  });

  it('函数调用的实参不是简写（不得误展开）', () => {
    expect(prefixIdentifiers('f(a, b)')).toBe('_ctx.f(_ctx.a, _ctx.b)');
  });

  it('端到端：:style 简写产物可执行，且取到上下文里的值', () => {
    // 旧行为产物是非法 JS（`{ _ctx.color }`），执行会直接 SyntaxError
    const span = asVNode(
      asVNode(execute(compile('<div><span :style="{ color }">A</span></div>'))({ color: 'red' }))
        .children,
    );
    expect(span.props).toEqual({ style: { color: 'red' } });
  });

  it('端到端：:class 简写同样可执行并取值', () => {
    const span = asVNode(
      asVNode(execute(compile('<div><span :class="{ active }">A</span></div>'))({ active: true }))
        .children,
    );
    expect(span.props).toEqual({ class: { active: true } });
  });
});
