// @vitest-environment jsdom
// tests/codegen-signal.test.ts
// Signal 模式代码生成测试：执行产物、断言 DOM 上的可观察行为

import { describe, it, expect, vi } from 'vitest';
import { reactive } from '@lytjs/reactivity';
import { Text } from '@lytjs/vdom';
import { compile as compileImpl } from '../src/index';
import { executeSignal } from './support/execute';

/**
 * A04/D1：`optimizeSignal` 已默认关闭，而本文件断言的是**优化版产物**的行为。
 * 因此显式开启（断言本身未改动）；显式传 `optimizeSignal:false` 的用例会覆盖此默认值。
 */
const compile = (template: string, options: Parameters<typeof compileImpl>[1] = {}) =>
  compileImpl(template, { rendererMode: 'signal', optimizeSignal: true, ...options });

/** 编译 + 在 jsdom 容器里执行，返回 DOM 句柄 */
const mount = (template: string, ctx: Record<string, unknown> = {}) =>
  executeSignal(compile(template), ctx);

const htmlOf = (template: string, ctx: Record<string, unknown> = {}) => mount(template, ctx).html();

describe('codegen-signal', () => {
  // ============================================================
  // 静态元素
  // ============================================================

  describe('static elements', () => {
    it('should generate template string for static elements', () => {
      expect(htmlOf('<div></div>')).toBe('<div></div>');
    });

    it('should generate template with static attributes', () => {
      expect(htmlOf('<div class="app"><h1>Title</h1><p></p></div>')).toBe(
        '<div class="app"><h1>Title</h1><p></p></div>',
      );
    });

    it('should destructure child elements', () => {
      // 深度 ≥ 2 时若按「直接子节点」解构，插值宿主会取到 undefined 并崩溃
      const handle = mount('<div><section><p>{{ msg }}</p></section></div>', { msg: 'deep' });
      expect(handle.html()).toBe('<div><section><p>deep</p></section></div>');
    });

    it('should generate insert call', () => {
      const handle = mount('<div></div>');
      expect(handle.container.childElementCount).toBe(1);
      expect(handle.container.firstElementChild?.tagName).toBe('DIV');
    });

    it('should import from @lytjs/reactivity and @lytjs/dom-runtime', () => {
      // executeSignal 把产物 import 解析到真实包导出；任一模块/导出缺失都会直接抛错
      expect(htmlOf('<div></div>')).toBe('<div></div>');
    });

    it('should generate render function with _c and _n params', () => {
      // render(ctx, container)：上下文决定内容，节点挂进传入容器
      const handle = mount('<div>{{ msg }}</div>', { msg: 'M' });
      expect(handle.container.textContent).toBe('M');
    });

    it('should generate onCleanup', () => {
      const handle = mount('<div></div>');
      expect(handle.html()).toBe('<div></div>');
      handle.dispose();
      // onCleanup 注册的 `_0.remove()` 在销毁时执行
      expect(handle.html()).toBe('');
    });
  });

  // ============================================================
  // v-if
  // ============================================================

  describe('v-if', () => {
    // 回归：v-else-if 链构建曾在下钻时把 `conditional` 指针移到链尾，
    // 导致最后插入 children 的是**最内层**节点，首分支被静默丢弃
    //（实测曾产出 `(_c.b?...y...:null)`，`x` 永远不渲染）。
    it('should keep EVERY branch of a v-else-if chain (regression)', () => {
      const tpl =
        '<div><span v-if="a">A</span><span v-else-if="b">B</span><span v-else>C</span></div>';
      expect(mount(tpl, { a: true }).text()).toBe('A');
      expect(mount(tpl, { a: false, b: true }).text()).toBe('B');
      expect(mount(tpl, { a: false, b: false }).text()).toBe('C');
    });

    it('should generate if statement with effect for v-if', () => {
      expect(htmlOf('<p v-if="show">hello</p>', { show: true })).toBe('<p>hello</p>');
    });

    it('should show element when v-if condition is true (code level)', () => {
      expect(mount('<p v-if="show">hello</p>', { show: true }).text()).toBe('hello');
    });

    it('should hide element when v-if condition is false (code level)', () => {
      expect(htmlOf('<p v-if="show">hello</p>', { show: false })).toBe('');
    });

    it('should generate v-else branch', () => {
      const tpl = '<p v-if="show">A</p><p v-else>B</p>';
      expect(mount(tpl, { show: true }).text()).toBe('A');
      expect(mount(tpl, { show: false }).text()).toBe('B');
    });

    it('should generate v-else-if chain', () => {
      const tpl = '<p v-if="type === 1">A</p><p v-else-if="type === 2">B</p><p v-else>C</p>';
      expect(mount(tpl, { type: 1 }).text()).toBe('A');
      expect(mount(tpl, { type: 2 }).text()).toBe('B');
      expect(mount(tpl, { type: 3 }).text()).toBe('C');
    });

    it('should generate nested v-if (outer condition)', () => {
      const tpl = '<div v-if="outer"><span v-if="inner">nested</span></div>';

      const shown = mount(tpl, { outer: true, inner: true });
      expect(shown.text()).toBe('nested');
      expect(shown.container.querySelector('span')).not.toBeNull();

      const innerHidden = mount(tpl, { outer: true, inner: false });
      expect(innerHidden.text()).toBe('');
      expect(innerHidden.container.querySelector('span')).toBeNull();

      expect(htmlOf(tpl, { outer: false, inner: true })).toBe('');
    });

    it('should generate setText inside v-if when interpolation is present', () => {
      const tpl = '<p v-if="show">{{ message }}</p>';
      expect(mount(tpl, { show: true, message: 'M' }).text()).toBe('M');
      expect(mount(tpl, { show: false, message: 'M' }).text()).toBe('');
    });
  });

  // ============================================================
  // v-for
  // ============================================================

  describe('v-for', () => {
    const items = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ];

    it('should generate reconcileArray for v-for', () => {
      expect(htmlOf('<li v-for="item in items">{{ item.name }}</li>', { items })).toBe(
        '<li>a</li><li>b</li>',
      );
    });

    it('should generate document.createElement inside create callback', () => {
      const handle = mount('<li v-for="item in items">{{ item.name }}</li>', { items });
      expect([...handle.container.querySelectorAll('li')]).toHaveLength(2);
    });

    it('should generate setText inside create callback', () => {
      const handle = mount('<li v-for="item in items">{{ item.name }}</li>', { items });
      expect(handle.text()).toBe('ab');
    });
  });

  // ============================================================
  // v-bind
  // ============================================================

  describe('v-bind', () => {
    it('should generate setClass for :class binding', () => {
      expect(htmlOf('<div :class="cls"></div>', { cls: 'active' })).toBe(
        '<div class="active"></div>',
      );
    });

    it('should generate setAttribute for :attr binding', () => {
      expect(htmlOf('<div :name="nm"></div>', { nm: 'n' })).toBe('<div name="n"></div>');
    });

    it('should generate setAttribute for :prop binding', () => {
      const handle = mount('<input :value="val" />', { val: 'v' });
      expect(handle.container.querySelector('input')?.getAttribute('value')).toBe('v');
    });
  });

  // ============================================================
  // v-on
  // ============================================================

  describe('v-on', () => {
    it('should generate addEventListener for @click binding', () => {
      const calls: string[] = [];
      const handle = mount('<button @click="handleClick">Click</button>', {
        handleClick: () => calls.push('click'),
      });
      handle.container.querySelector('button')!.dispatchEvent(new MouseEvent('click'));
      expect(calls).toEqual(['click']);
    });

    it('should generate addEventListener for multiple event handlers', () => {
      const calls: string[] = [];
      const handle = mount('<div @mouseenter="onEnter" @mouseleave="onLeave"></div>', {
        onEnter: () => calls.push('enter'),
        onLeave: () => calls.push('leave'),
      });
      const div = handle.container.querySelector('div')!;
      div.dispatchEvent(new MouseEvent('mouseenter'));
      div.dispatchEvent(new MouseEvent('mouseleave'));
      expect(calls).toEqual(['enter', 'leave']);
    });

    it('should handle event modifiers', () => {
      const calls: string[] = [];
      const handle = mount('<button @click.stop="handleClick">Stop</button>', {
        handleClick: () => calls.push('click'),
      });
      const event = new MouseEvent('click');
      const stop = vi.spyOn(event, 'stopPropagation');
      handle.container.querySelector('button')!.dispatchEvent(event);
      // 修饰符不得被静默丢弃：事件冒泡被阻止，处理器仍执行
      expect(stop).toHaveBeenCalled();
      expect(calls).toEqual(['click']);
    });
  });

  // ============================================================
  // v-model
  // ============================================================

  describe('v-model', () => {
    it('should generate value effect for v-model', () => {
      const handle = mount('<input v-model="text" />', { text: 'M' });
      expect(handle.container.querySelector('input')!.value).toBe('M');
    });

    it('should generate input event listener for v-model', () => {
      const ctx: Record<string, unknown> = { text: '' };
      const handle = mount('<input v-model="text" />', ctx);
      const input = handle.container.querySelector('input')!;
      input.value = 'N';
      input.dispatchEvent(new Event('input'));
      expect(ctx.text).toBe('N');
    });

    it('should generate v-model on textarea', () => {
      const ctx: Record<string, unknown> = { content: 'C' };
      const handle = mount('<textarea v-model="content"></textarea>', ctx);
      const textarea = handle.container.querySelector('textarea')!;
      expect(textarea.value).toBe('C');
      textarea.value = 'D';
      textarea.dispatchEvent(new Event('input'));
      expect(ctx.content).toBe('D');
    });

    it('should generate v-model on select', () => {
      const ctx: Record<string, unknown> = { selected: 'A' };
      const handle = mount('<select v-model="selected"><option>A</option></select>', ctx);
      const select = handle.container.querySelector('select')!;
      expect(select.value).toBe('A');
      select.value = 'A';
      select.dispatchEvent(new Event('change'));
      expect(ctx.selected).toBe('A');
    });

    it('should generate v-model with .lazy modifier', () => {
      const ctx: Record<string, unknown> = { text: '' };
      const handle = mount('<input v-model.lazy="text" />', ctx);
      const input = handle.container.querySelector('input')!;

      // .lazy ⇒ 监听 change 而非 input
      input.value = 'N';
      input.dispatchEvent(new Event('input'));
      expect(ctx.text).toBe('');

      input.dispatchEvent(new Event('change'));
      expect(ctx.text).toBe('N');
    });

    it('should generate v-model with .number modifier', () => {
      const ctx: Record<string, unknown> = { count: 0 };
      const handle = mount('<input v-model.number="count" />', ctx);
      const input = handle.container.querySelector('input')!;
      input.value = '42';
      input.dispatchEvent(new Event('input'));
      expect(ctx.count).toBe(42);
      expect(typeof ctx.count).toBe('number');
    });

    it('should generate v-model with .trim modifier', () => {
      const ctx: Record<string, unknown> = { text: '' };
      const handle = mount('<input v-model.trim="text" />', ctx);
      const input = handle.container.querySelector('input')!;
      input.value = '  x  ';
      input.dispatchEvent(new Event('input'));
      expect(ctx.text).toBe('x');
    });

    it('should generate v-model with combined modifiers', () => {
      const ctx: Record<string, unknown> = { count: 0 };
      const handle = mount('<input v-model.lazy.number="count" />', ctx);
      const input = handle.container.querySelector('input')!;

      input.value = '7';
      input.dispatchEvent(new Event('input'));
      expect(ctx.count).toBe(0);

      input.dispatchEvent(new Event('change'));
      expect(ctx.count).toBe(7);
    });
  });

  // ============================================================
  // v-show
  // ============================================================

  describe('v-show', () => {
    it('should generate style.display effect for v-show', () => {
      const visible = mount('<div v-show="visible">content</div>', { visible: true });
      expect(visible.container.querySelector('div')!.style.display).toBe('');
      const hidden = mount('<div v-show="visible">content</div>', { visible: false });
      expect(hidden.container.querySelector('div')!.style.display).toBe('none');
    });

    it('should restore display for v-show inside a v-if branch (C-09)', () => {
      // signal 产物用 effect 追踪 reactive 上下文；普通对象不会触发重跑
      const ctx = reactive({ ok: true, s: false });
      const handle = mount('<div><span v-if="ok" v-show="s">x</span></div>', ctx);
      const span = () => handle.container.querySelector('span')!;
      expect(span().style.display).toBe('none');

      ctx.s = true;
      // 修前：条件为真时 style 取 undefined，setStyle 视作 no-op ⇒ 永远停在 none
      expect(span().style.display).toBe('');
    });
  });

  // ============================================================
  // v-text
  // ============================================================

  describe('v-text', () => {
    it('should generate setText effect for v-text', () => {
      expect(mount('<div v-text="content"></div>', { content: '<b>' }).text()).toBe('<b>');
    });
  });

  // ============================================================
  // v-html
  // ============================================================

  describe('v-html', () => {
    it('should generate setHTML effect for v-html', () => {
      expect(htmlOf('<div v-html="htmlContent"></div>', { htmlContent: '<b>x</b>' })).toBe(
        '<div><b>x</b></div>',
      );
    });
  });

  // ============================================================
  // 插值 {{ }}
  // ============================================================

  describe('interpolation', () => {
    it('should generate setText with effect for interpolation', () => {
      expect(mount('<span>{{ message }}</span>', { message: 'M' }).text()).toBe('M');
    });
  });

  // ============================================================
  // 多个 v-if / v-for 组合
  // ============================================================

  describe('v-if and v-for combinations', () => {
    const items = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ];

    it('should generate both v-if and v-for in the same template', () => {
      const tpl = `<div>
          <p v-if="show">conditional</p>
          <li v-for="item in items">{{ item.name }}</li>
        </div>`;

      const shown = mount(tpl, { show: true, items });
      expect(shown.container.querySelector('p')?.textContent).toBe('conditional');
      expect([...shown.container.querySelectorAll('li')].map((li) => li.textContent)).toEqual([
        'a',
        'b',
      ]);

      const hidden = mount(tpl, { show: false, items });
      expect(hidden.container.querySelector('p')).toBeNull();
      expect([...hidden.container.querySelectorAll('li')].map((li) => li.textContent)).toEqual([
        'a',
        'b',
      ]);
    });

    it('should generate v-for inside v-if', () => {
      // 回归：分支静态 HTML 序列化曾把 RENDER_LIST 子节点整体丢弃，
      // 产物退化成空 `<div></div>`，列表内容完全不渲染。
      const tpl = '<div v-if="show"><li v-for="item in items">{{ item.name }}</li></div>';
      const items = [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ];

      const shown = mount(tpl, { show: true, items });
      expect([...shown.container.querySelectorAll('li')].map((li) => li.textContent)).toEqual([
        'a',
        'b',
      ]);

      const hidden = mount(tpl, { show: false, items });
      expect(hidden.container.querySelector('li')).toBeNull();
    });

    it('should generate v-if inside v-for', () => {
      const tpl =
        '<ul><li v-for="item in items"><span v-if="item.active">{{ item.name }}</span></li></ul>';
      const active = [
        { id: 1, name: 'a', active: true },
        { id: 2, name: 'b', active: false },
      ];
      expect(mount(tpl, { items: active }).text()).toBe('a');
      expect(mount(tpl, { items: active }).html()).toBe(
        '<ul><li><span>a</span></li><li></li></ul>',
      );
    });

    it('should handle multiple v-if blocks on sibling elements', () => {
      const tpl = '<div><p v-if="a">A</p><p v-if="b">B</p><p v-if="c">C</p></div>';
      expect(mount(tpl, { a: true, b: false, c: true }).text()).toBe('AC');
    });

    it('should handle multiple v-for blocks on sibling elements', () => {
      const tpl =
        '<div><li v-for="x in listX">{{ x }}</li><li v-for="y in listY">{{ y }}</li></div>';
      expect(htmlOf(tpl, { listX: ['1', '2'], listY: ['3'] })).toBe(
        '<div><li>1</li><li>2</li><li>3</li></div>',
      );
    });
  });

  // ============================================================
  // 综合测试
  // ============================================================

  describe('comprehensive template', () => {
    const tpl = `<div class="app">
          <h1>{{ title }}</h1>
          <p v-if="show">{{ message }}</p>
          <ul>
            <li v-for="item in items">{{ item.name }}</li>
          </ul>
          <input v-model="text" />
          <button @click="submit">Submit</button>
        </div>`;

    it('should generate complete render function for complex template', () => {
      const handle = mount(tpl, {
        title: 'T',
        show: true,
        message: 'M',
        items: [{ id: 1, name: 'a' }],
        text: 'K',
        submit: () => undefined,
      });

      expect(handle.container.querySelector('h1')!.textContent).toBe('T');
      expect(handle.container.querySelector('p')!.textContent).toBe('M');
      expect(handle.container.querySelector('li')!.textContent).toBe('a');
      expect(handle.container.querySelector('input')!.value).toBe('K');
      expect(handle.container.querySelector('button')!.textContent).toBe('Submit');
    });

    it('should return CodegenResult with code and ast', () => {
      const result = compile('<div></div>', { rendererMode: 'signal' });
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('ast');
      expect(result.code).toBeTruthy();
      expect(result.ast).toBeTruthy();
    });
  });
  // ============================================================
  // 非优化版（optimizeSignal: false）组件挂载 —— 运行时 SignalRenderer 走的路径
  // ============================================================

  describe('non-optimized component mounting (optimizeSignal: false)', () => {
    const opts = { rendererMode: 'signal' as const, optimizeSignal: false };
    const compile = (template: string, _options?: unknown) => compileImpl(template, opts);

    interface MountCall {
      comp: unknown;
      props?: Record<string, unknown>;
      host: Element;
      slots?: Record<string, (arg?: unknown) => unknown[]>;
    }

    /** 执行产物并捕获 mountComponent 的实参（组件、props、宿主、插槽） */
    const mountComponentCalls = (
      template: string,
      ctx: Record<string, unknown> = {},
    ): MountCall[] => {
      const calls: MountCall[] = [];
      executeSignal(compile(template), ctx, {
        mountComponent: (
          comp: unknown,
          props: Record<string, unknown>,
          host: Element,
          slots?: MountCall['slots'],
        ) => {
          calls.push({ comp, props, host, slots });
        },
      });
      return calls;
    };

    it('should emit a <lyt-comp> placeholder instead of a raw component tag', () => {
      const Child = {};
      const calls = mountComponentCalls('<div><Child/></div>', { Child });
      expect(calls).toHaveLength(1);
      // 组件标签不能原样进模板：静态壳里是运行时占位元素
      expect(calls[0].comp).toBe(Child);
      expect(calls[0].host.tagName).toBe('LYT-COMP');
      expect(calls[0].host.getAttribute('data-lyt-comp')).toBe('Child');
    });

    it('should import mountComponent from @lytjs/renderer when a component is used', () => {
      // 产物 import 由 executeSignal 解析到真实 @lytjs/renderer 导出；
      // 缺少该导出会直接抛错，而不是静默 undefined
      expect(mountComponentCalls('<div><Child/></div>', { Child: {} })).toHaveLength(1);
    });

    it('should NOT import mountComponent when no component is used', () => {
      expect(mountComponentCalls('<div>text</div>')).toHaveLength(0);
    });

    it('should call mountComponent with the ctx component, props object and host element', () => {
      const Child = {};
      const call = mountComponentCalls('<div><Child :title="t"/></div>', { Child, t: 'T' })[0];
      expect(call.comp).toBe(Child);
      expect(call.props).toEqual({ title: 'T' });
      expect(call.host.tagName).toBe('LYT-COMP');
    });

    it('should pass static attributes as props (with string values)', () => {
      const call = mountComponentCalls('<div><Child label="hi"/></div>', { Child: {} })[0];
      expect(call.props).toEqual({ label: 'hi' });
    });

    it('should pass boolean static attributes as true', () => {
      const call = mountComponentCalls('<div><Child disabled/></div>', { Child: {} })[0];
      expect(call.props).toEqual({ disabled: true });
    });

    it('should support nested components (component inside component)', () => {
      const Outer = {};
      const Inner = {};
      const call = mountComponentCalls('<div><Outer><Inner/></Outer></div>', { Outer, Inner })[0];
      expect(call.comp).toBe(Outer);
      const [inner] = call.slots!.default() as Array<{ type: unknown }>;
      expect(inner.type).toBe(Inner);
    });

    it('should produce syntactically valid render function body', () => {
      const Child = {};
      expect(() =>
        mountComponentCalls('<div><Child :title="t"/></div>', { Child, t: 'T' }),
      ).not.toThrow();
    });

    it('should compile component events (@click) into onClick props', () => {
      const onClick = () => undefined;
      const call = mountComponentCalls('<div><Child @click="onClick"/></div>', {
        Child: {},
        onClick,
      })[0];
      expect(call.props?.onClick).toBe(onClick);
    });

    it('should camelize kebab-case component event names', () => {
      const fn = () => undefined;
      const call = mountComponentCalls('<div><Child @my-event="fn"/></div>', {
        Child: {},
        fn,
      })[0];
      expect(call.props?.onMyEvent).toBe(fn);
    });

    it('should support inline arrow handlers on components (single brace set)', () => {
      // 这条同时守护「正则在 `}` 处提前收尾」的历史 bug：箭头函数体必须完整
      const ctx = { Child: {}, count: 0 };
      const call = mountComponentCalls('<div><Child @click="() => count++"/></div>', ctx)[0];
      (call.props?.onClick as () => void)();
      expect(ctx.count).toBe(1);
    });

    it('should compile component children into a default slot (vnode form)', () => {
      const call = mountComponentCalls('<div><Child>hello</Child></div>', { Child: {} })[0];
      const [vnode] = call.slots!.default();
      expect((vnode as { type: unknown }).type).toBe(Text);
      expect((vnode as { children: unknown }).children).toBe('hello');
    });

    it('should compile nested elements inside slot content as vnodes', () => {
      const call = mountComponentCalls('<div><Child><span>hi</span></Child></div>', {
        Child: {},
      })[0];
      const [span] = call.slots!.default() as Array<{ type: string; children: unknown[] }>;
      expect(span.type).toBe('span');
      expect((span.children[0] as { type: unknown }).type).toBe(Text);
      expect((span.children[0] as { children: unknown }).children).toBe('hi');
    });

    it('should NOT pass a slot argument when the component has no children', () => {
      const call = mountComponentCalls('<div><Child/></div>', { Child: {} })[0];
      expect(call.props).toEqual({});
      expect(call.slots).toBeUndefined();
    });

    it('should import createVNode/Text from @lytjs/vdom only when slots are used', () => {
      const withChild = mountComponentCalls('<div><Child>hi</Child></div>', { Child: {} })[0];
      expect((withChild.slots!.default()[0] as { __v_isVNode?: boolean }).__v_isVNode).toBe(true);

      // 没有子内容时产物不 import vdom，slots 参数也不存在
      expect(mountComponentCalls('<div><Child/></div>', { Child: {} })[0].slots).toBeUndefined();
    });

    it('should keep nested component slots recursive', () => {
      const Outside = { Inner: {} };
      const call = mountComponentCalls('<div><Outer><Inner>x</Inner></Outer></div>', {
        Outer: Outside,
        Inner: Outside.Inner,
      })[0];
      const [inner] = call.slots!.default() as Array<{ type: unknown; children: unknown }>;
      expect(inner.type).toBe(Outside.Inner);
      const slots = inner.children as Record<string, () => unknown[]>;
      expect((slots.default()[0] as { children: unknown }).children).toBe('x');
    });

    it('should compile slot interpolation into a dynamic text vnode', () => {
      const call = mountComponentCalls('<div><Child>{{ msg }}</Child></div>', {
        Child: {},
        msg: 'M',
      })[0];
      expect((call.slots!.default()[0] as { children: unknown }).children).toBe('M');
    });

    it('should compile slot element bindings and events', () => {
      const bind = mountComponentCalls('<div><Child><span :title="t">x</span></Child></div>', {
        Child: {},
        t: 'T',
      })[0];
      expect((bind.slots!.default()[0] as { props: unknown }).props).toEqual({ title: 'T' });

      const fn = () => undefined;
      const on = mountComponentCalls('<div><Child><span @click="fn">x</span></Child></div>', {
        Child: {},
        fn,
      })[0];
      expect((on.slots!.default()[0] as { props: Record<string, unknown> }).props.onClick).toBe(fn);
    });

    it('should compile v-if inside a slot into a conditional vnode', () => {
      const tpl = '<div><Child><span v-if="ok">x</span></Child></div>';
      const shown = mountComponentCalls(tpl, { Child: {}, ok: true })[0];
      expect((shown.slots!.default()[0] as { type: unknown }).type).toBe('span');

      const hidden = mountComponentCalls(tpl, { Child: {}, ok: false })[0];
      expect(hidden.slots!.default()[0]).toBeNull();
    });

    it('should keep props and interpolation inside a v-if slot', () => {
      const withProp = mountComponentCalls(
        '<div><Child><span v-if="ok" :title="t">x</span></Child></div>',
        { Child: {}, ok: true, t: 'T' },
      )[0];
      expect((withProp.slots!.default()[0] as { props: unknown }).props).toEqual({ title: 'T' });

      const withInterp = mountComponentCalls(
        '<div><Child><span v-if="ok">{{ msg }}</span></Child></div>',
        { Child: {}, ok: true, msg: 'M' },
      )[0];
      const [span] = withInterp.slots!.default() as Array<{
        children: Array<{ children: unknown }>;
      }>;
      expect(span.children[0].children).toBe('M');
    });

    it('should compile v-else inside a slot into the ternary alternate', () => {
      const tpl = '<div><Child><span v-if="ok">a</span><span v-else>b</span></Child></div>';
      const yes = mountComponentCalls(tpl, { Child: {}, ok: true })[0];
      const no = mountComponentCalls(tpl, { Child: {}, ok: false })[0];
      const textOfSpan = (call: ReturnType<typeof mountComponentCalls>[number]) =>
        (call.slots!.default()[0] as { children: Array<{ children: unknown }> }).children[0]
          .children;
      expect(textOfSpan(yes)).toBe('a');
      expect(textOfSpan(no)).toBe('b');
    });

    it('should compile a v-else-if chain inside a slot into nested ternaries', () => {
      const tpl =
        '<div><Child><span v-if="a">x</span><span v-else-if="b">y</span><span v-else>z</span></Child></div>';
      const textOfSpan = (call: ReturnType<typeof mountComponentCalls>[number]) =>
        (call.slots!.default()[0] as { children: Array<{ children: unknown }> }).children[0]
          .children;
      expect(textOfSpan(mountComponentCalls(tpl, { Child: {}, a: true })[0])).toBe('x');
      expect(textOfSpan(mountComponentCalls(tpl, { Child: {}, a: false, b: true })[0])).toBe('y');
      expect(textOfSpan(mountComponentCalls(tpl, { Child: {}, a: false, b: false })[0])).toBe('z');
    });

    it('should SKIP a slot v-if whose content uses an unsupported construct (v-for)', () => {
      const call = mountComponentCalls(
        '<div><Child><span v-if="ok"><i v-for="x in xs">y</i></span></Child></div>',
        { Child: {}, ok: true, xs: ['1'] },
      )[0];
      expect(call.slots).toBeUndefined();
    });

    it('should reconstruct nested component markup inside a slot v-if (with tag prefix)', () => {
      const Inner = {};
      const tpl = '<div><Child><div v-if="ok"><Inner/></div></Child></div>';
      const shown = mountComponentCalls(tpl, { Child: {}, Inner, ok: true })[0];
      const [wrapper] = shown.slots!.default() as Array<{
        type: string;
        children: Array<{ type: unknown }>;
      }>;
      expect(wrapper.type).toBe('div');
      expect(wrapper.children[0].type).toBe(Inner);

      const hidden = mountComponentCalls(tpl, { Child: {}, Inner, ok: false })[0];
      expect(hidden.slots!.default()[0]).toBeNull();
    });

    it('should SKIP a slot element combining v-if with another structural directive (v-show)', () => {
      const call = mountComponentCalls(
        '<div><Child><span v-if="ok" v-show="s">x</span></Child></div>',
        { Child: {}, ok: true, s: true },
      )[0];
      expect(call.slots).toBeUndefined();
    });

    it('should render a v-if slot element with no children (null children)', () => {
      const call = mountComponentCalls('<div><Child><span v-if="ok"></span></Child></div>', {
        Child: {},
        ok: true,
      })[0];
      expect((call.slots!.default()[0] as { children: unknown }).children).toBeNull();
    });

    it('should compile v-show inside a slot into a style.display binding', () => {
      const ctx: Record<string, unknown> = { Child: {}, s: true };
      const call = mountComponentCalls('<div><Child><i v-show="s">y</i></Child></div>', ctx)[0];
      const styleOf = () =>
        (call.slots!.default()[0] as { props: { style: Record<string, unknown> } }).props.style;

      expect(styleOf().display).toBe('');
      ctx.s = false;
      expect(styleOf().display).toBe('none');
    });

    it('should compile a top-level v-for slot element into a mapped list', () => {
      const call = mountComponentCalls('<div><Child><i v-for="x in xs">y</i></Child></div>', {
        Child: {},
        xs: ['1', '2'],
      })[0];
      const list = call.slots!.default() as Array<{ type: string }>;
      expect(list.map((vnode) => vnode.type)).toEqual(['i', 'i']);
    });

    it('should compile named slots into separate slot functions', () => {
      const call = mountComponentCalls(
        '<div><Child><template #header>H</template><template #footer>F</template></Child></div>',
        { Child: {} },
      )[0];
      const textOf = (name: 'header' | 'footer') =>
        (call.slots![name]()[0] as { children: unknown }).children;
      expect(textOf('header')).toBe('H');
      expect(textOf('footer')).toBe('F');
    });

    it('should pass slot scope params as the slot function argument', () => {
      const textOfDefault = (call: ReturnType<typeof mountComponentCalls>[number]) =>
        (call.slots!.default({ x: 'X' })[0] as { children: unknown }).children;

      expect(
        textOfDefault(
          mountComponentCalls(
            '<div><Child><template #default="p">{{ p.x }}</template></Child></div>',
            {
              Child: {},
            },
          )[0],
        ),
      ).toBe('X');
      expect(
        textOfDefault(
          mountComponentCalls('<div><Child v-slot="p">{{ p.x }}</Child></div>', { Child: {} })[0],
        ),
      ).toBe('X');
    });

    it('should support destructured slot scope without prefixing the locals', () => {
      const call = mountComponentCalls(
        '<div><Child><template #item="{ x, y }">{{ x }}</template></Child></div>',
        { Child: {} },
      )[0];
      const [vnode] = call.slots!.item({ x: 'X', y: 'Y' }) as Array<{ children: unknown }>;
      expect(vnode.children).toBe('X');
    });

    it('should keep named slots and the default slot side by side', () => {
      const call = mountComponentCalls(
        '<div><Child><template #header>H</template>body</Child></div>',
        { Child: {} },
      )[0];
      expect((call.slots!.header()[0] as { children: unknown }).children).toBe('H');
      expect((call.slots!.default()[0] as { children: unknown }).children).toBe('body');
    });

    it('should drop the effect wrapper for v-once (non-optimized, runtime path)', () => {
      // 运行时 SignalRenderer 走的正是非优化版；v-once 若仍被 effect 包裹，
      // 响应式更新会改写 DOM。用 reactive 上下文验证「不订阅」。
      const state = reactive({ msg: 'A' });
      const handle = executeSignal(compile('<div v-once>{{ msg }}</div>'), state);
      expect(handle.text()).toBe('A');
      state.msg = 'B';
      expect(handle.text()).toBe('A');
    });

    it('should propagate v-once down the subtree (non-optimized)', () => {
      const state = reactive({ msg: 'A' });
      const handle = executeSignal(compile('<div v-once><span>{{ msg }}</span></div>'), state);
      expect(handle.text()).toBe('A');
      state.msg = 'B';
      expect(handle.text()).toBe('A');
    });

    it('should still wrap ordinary interpolations with effect (non-optimized)', () => {
      const state = reactive({ msg: 'A' });
      const handle = executeSignal(compile('<div>{{ msg }}</div>'), state);
      expect(handle.text()).toBe('A');
      state.msg = 'B';
      expect(handle.text()).toBe('B');
    });

    it('should keep text slots for multiple interpolations (B01b 去注释只对单插值生效)', () => {
      const state = reactive({ a: 'a', b: 'b' });
      const handle = executeSignal(compile('<div>{{ a }}-{{ b }}</div>'), state);
      expect(handle.text()).toBe('a-b');
      state.a = 'x';
      expect(handle.text()).toBe('x-b');
      state.b = 'y';
      expect(handle.text()).toBe('x-y');
    });

    it('should keep text slots when static text precedes an interpolation (B01b)', () => {
      const state = reactive({ name: 'A' });
      const handle = executeSignal(compile('<div>Hi {{ name }}</div>'), state);
      expect(handle.text()).toBe('Hi A');
      state.name = 'B';
      expect(handle.text()).toBe('Hi B');
    });

    it('should treat blank-only slot content inside v-if as null children', () => {
      const call = mountComponentCalls('<div><Child><span v-if="ok"> </span></Child></div>', {
        Child: {},
        ok: true,
      })[0];
      expect((call.slots!.default()[0] as { children: unknown }).children).toBeNull();
    });

    it('should compile v-for inside a slot into a spread-mapped list', () => {
      const call = mountComponentCalls(
        '<div><Child><li v-for="item in items">{{ item.name }}</li></Child></div>',
        {
          Child: {},
          items: [
            { id: 1, name: 'a' },
            { id: 2, name: 'b' },
          ],
        },
      )[0];
      const list = call.slots!.default() as Array<{
        type: string;
        children: Array<{ children: unknown }>;
      }>;
      expect(list.map((vnode) => vnode.type)).toEqual(['li', 'li']);
      expect(list.map((vnode) => vnode.children[0].children)).toEqual(['a', 'b']);
    });

    it('should support (item, index) and :key inside a slot v-for', () => {
      const call = mountComponentCalls(
        '<div><Child><li v-for="(item, i) in items" :key="item.id">{{ item.name }}</li></Child></div>',
        {
          Child: {},
          items: [
            { id: 1, name: 'a' },
            { id: 2, name: 'b' },
          ],
        },
      )[0];
      const list = call.slots!.default() as Array<{ props: Record<string, unknown> }>;
      expect(list.map((vnode) => vnode.props.key)).toEqual([1, 2]);
    });

    it('should keep the loop variable UNPREFIXED and recurse nested elements in slot v-for', () => {
      const call = mountComponentCalls(
        '<div><Child><li v-for="item in items"><b>{{ item.n }}</b></li></Child></div>',
        { Child: {}, items: [{ id: 1, n: 'a' }] },
      )[0];
      const [li] = call.slots!.default() as Array<{
        children: Array<{ type: string; children: Array<{ children: unknown }> }>;
      }>;
      // 循环变量 item 不能被加 `_ctx.` 前缀，否则取不到 item.n（渲染成 'undefined'）
      expect(li.children[0].type).toBe('b');
      expect(li.children[0].children[0].children).toBe('a');
    });

    it('should mix static siblings with a slot v-for', () => {
      const call = mountComponentCalls(
        '<div><Child><span>head</span><li v-for="x in xs">{{ x }}</li></Child></div>',
        { Child: {}, xs: ['1', '2'] },
      )[0];
      const list = call.slots!.default() as Array<{
        type: string;
        children: Array<{ children: unknown }>;
      }>;
      expect(list[0].type).toBe('span');
      expect(list[0].children[0].children).toBe('head');
      expect(list.slice(1).map((vnode) => vnode.children[0].children)).toEqual(['1', '2']);
    });

    it('should render v-for inside a v-if branch (C-05)', () => {
      // 分支 HTML 是静态串，列表项必须由分支动态代码创建；
      // 收集器此前只递归元素/内嵌条件，RENDER_LIST 整段被跳过 ⇒ 列表消失。
      const state = reactive({
        show: true,
        items: [
          { id: 1, name: 'a' },
          { id: 2, name: 'b' },
        ],
      });
      const handle = executeSignal(
        compile(
          '<div><ul v-if="show"><li v-for="item in items" :key="item.id">{{ item.name }}</li></ul></div>',
        ),
        state,
      );
      expect(handle.html()).toBe('<div><ul><li>a</li><li>b</li></ul></div>');

      // 分支保持激活时，列表源变化要跟随
      state.items.push({ id: 3, name: 'c' });
      expect(handle.html()).toBe('<div><ul><li>a</li><li>b</li><li>c</li></ul></div>');
    });
  });
});
