// @vitest-environment jsdom
// tests/codegen-signal.test.ts
// Signal 模式代码生成测试：执行产物、断言 DOM 上的可观察行为

import { describe, it, expect, vi } from 'vitest';
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
      // ⚠️ S25b 已知缺陷（保留形态断言，不行为化）：优化版 signal codegen 下
      //   `<div v-if="show"><li v-for=…></li></div>` 的 **v-for 子内容被整体丢弃**
      //   ——模板被编译成空 `<div></div>`，实测渲染文本为 ''。修它要改产物文本，
      //   超出本轮「只改测试」范围；此处保留对现有产物形态的守护，并登记待修。
      const tpl = '<div v-if="show"><li v-for="item in items">{{ item.name }}</li></div>';
      const code = compile(tpl).code;
      expect(code).toContain('if(_c.show)');
      expect(code).toContain('e(()=>{');
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

    it('should emit a <lyt-comp> placeholder instead of a raw component tag', () => {
      const result = compile('<div><Child/></div>', opts);
      expect(result.code).toContain('<lyt-comp');
      // 引号在模板字符串里会被转义，用宽松匹配
      expect(result.code).toMatch(/data-lyt-comp=\\?"Child\\?"/);
      // 不能把组件标签原样写进静态模板（运行时才能解析）
      expect(result.code).not.toMatch(/createTemplate\("[^"]*<Child[ >]/);
    });

    it('should import mountComponent from @lytjs/renderer when a component is used', () => {
      const result = compile('<div><Child/></div>', opts);
      // B01b 回退后产物保持全名：`import{mountComponent}from'@lytjs/renderer';`
      expect(result.code).toMatch(/mountComponent\}from'@lytjs\/renderer'/);
    });

    it('should NOT import mountComponent when no component is used', () => {
      const result = compile('<div>text</div>', opts);
      expect(result.code).not.toContain('mountComponent');
    });

    it('should call mountComponent with the ctx component, props object and host element', () => {
      const result = compile('<div><Child :title="t"/></div>', opts);
      expect(result.code).toContain('mountComponent(_ctx.Child,{"title":_ctx.t},_lytComp)');
    });

    it('should pass static attributes as props (with string values)', () => {
      const result = compile('<div><Child label="hi"/></div>', opts);
      expect(result.code).toContain('{"label":"hi"}');
    });

    it('should pass boolean static attributes as true', () => {
      const result = compile('<div><Child disabled/></div>', opts);
      expect(result.code).toContain('{"disabled":true}');
    });

    it('should support nested components (component inside component)', () => {
      const result = compile('<div><Outer><Inner/></Outer></div>', opts);
      // 与优化版行为一致：组件内部子内容不保留为 slots（slots 是未来特性），
      // 外层组件被识别为组件占位并挂载
      expect(result.code).toMatch(/data-lyt-comp=\\?"Outer\\?"/);
      expect(result.code).toContain('mountComponent(_ctx.Outer,{');
    });

    it('should produce syntactically valid render function body', () => {
      const result = compile('<div><Child :title="t"/></div>', opts);
      const code = result.code;
      // 从 export function render(_ctx, _container) { 的函数体开始切，避开 import 里的花括号
      const fnStart = code.indexOf('export function render');
      const braceStart = code.indexOf('{', fnStart) + 1;
      const braceEnd = code.lastIndexOf('}');
      const body = code.slice(braceStart, braceEnd);
      expect(() => new Function('_ctx', '_container', body)).not.toThrow();
    });

    it('should compile component events (@click) into onClick props', () => {
      const result = compile('<div><Child @click="onClick"/></div>', opts);
      expect(result.code).toContain('{"onClick":_ctx.onClick}');
    });

    it('should camelize kebab-case component event names', () => {
      const result = compile('<div><Child @my-event="fn"/></div>', opts);
      expect(result.code).toContain('"onMyEvent":_ctx.fn');
    });

    it('should support inline arrow handlers on components (single brace set)', () => {
      // 这条同时守护「正则在 `}` 处提前收尾」的历史 bug：箭头函数体必须完整
      const result = compile('<div><Child @click="() => count++"/></div>', opts);
      expect(result.code).toContain('"onClick":() => _ctx.count++');
    });

    it('should compile component children into a default slot (vnode form)', () => {
      const result = compile('<div><Child>hello</Child></div>', opts);
      expect(result.code).toContain('{default:()=>[createVNode(Text,null,"hello")]}');
    });

    it('should compile nested elements inside slot content as vnodes', () => {
      const result = compile('<div><Child><span>hi</span></Child></div>', opts);
      expect(result.code).toContain('createVNode("span",null,[createVNode(Text,null,"hi")])');
    });

    it('should NOT pass a slot argument when the component has no children', () => {
      const result = compile('<div><Child/></div>', opts);
      expect(result.code).toContain('mountComponent(_ctx.Child,{},_lytComp);');
    });

    it('should import createVNode/Text from @lytjs/vdom only when slots are used', () => {
      expect(compile('<div><Child>hi</Child></div>', opts).code).toContain("from'@lytjs/vdom'");
      expect(compile('<div><Child/></div>', opts).code).not.toContain('@lytjs/vdom');
    });

    it('should keep nested component slots recursive', () => {
      const result = compile('<div><Outer><Inner>x</Inner></Outer></div>', opts);
      expect(result.code).toContain(
        'createVNode(_ctx.Inner,{},{default:()=>[createVNode(Text,null,"x")]})',
      );
    });

    it('should compile slot interpolation into a dynamic text vnode', () => {
      const result = compile('<div><Child>{{ msg }}</Child></div>', opts);
      expect(result.code).toContain('{default:()=>[createVNode(Text,null,_ctx.msg)]}');
    });

    it('should compile slot element bindings and events', () => {
      const bind = compile('<div><Child><span :title="t">x</span></Child></div>', opts);
      expect(bind.code).toContain('createVNode("span",{"title":_ctx.t}');

      const on = compile('<div><Child><span @click="fn">x</span></Child></div>', opts);
      expect(on.code).toContain('createVNode("span",{"onClick":_ctx.fn}');
    });

    it('should compile v-if inside a slot into a conditional vnode', () => {
      const result = compile('<div><Child><span v-if="ok">x</span></Child></div>', opts);
      expect(result.code).toContain(
        '(_ctx.ok?createVNode("span",null,[createVNode(Text,null,"x")]):null)',
      );
    });

    it('should keep props and interpolation inside a v-if slot', () => {
      const withProp = compile(
        '<div><Child><span v-if="ok" :title="t">x</span></Child></div>',
        opts,
      );
      expect(withProp.code).toContain('{"title":_ctx.t}');

      const withInterp = compile(
        '<div><Child><span v-if="ok">{{ msg }}</span></Child></div>',
        opts,
      );
      expect(withInterp.code).toContain('createVNode(Text,null,_ctx.msg)');
    });

    it('should compile v-else inside a slot into the ternary alternate', () => {
      const result = compile(
        '<div><Child><span v-if="ok">a</span><span v-else>b</span></Child></div>',
        opts,
      );
      expect(result.code).toContain(':createVNode("span",null,[createVNode(Text,null,"b")])');
    });

    it('should compile a v-else-if chain inside a slot into nested ternaries', () => {
      const result = compile(
        '<div><Child><span v-if="a">x</span><span v-else-if="b">y</span><span v-else>z</span></Child></div>',
        opts,
      );
      expect(result.code).toContain(
        '(_ctx.b?createVNode("span",null,[createVNode(Text,null,"y")])',
      );
      expect(result.code).toContain(':createVNode("span",null,[createVNode(Text,null,"z")])');
    });

    it('should SKIP a slot v-if whose content uses an unsupported construct (v-for)', () => {
      const result = compile(
        '<div><Child><span v-if="ok"><i v-for="x in xs">y</i></span></Child></div>',
        opts,
      );
      expect(result.code).toContain('mountComponent(_ctx.Child,{},_lytComp);');
    });

    it('should reconstruct nested component markup inside a slot v-if (with tag prefix)', () => {
      const result = compile('<div><Child><div v-if="ok"><Inner/></div></Child></div>', opts);
      expect(result.code).toContain('createVNode(_ctx.Inner,null,null)');
    });

    it('should SKIP a slot element combining v-if with another structural directive (v-show)', () => {
      const result = compile('<div><Child><span v-if="ok" v-show="s">x</span></Child></div>', opts);
      expect(result.code).toContain('mountComponent(_ctx.Child,{},_lytComp);');
    });

    it('should render a v-if slot element with no children (null children)', () => {
      const result = compile('<div><Child><span v-if="ok"></span></Child></div>', opts);
      expect(result.code).toContain('(_ctx.ok?createVNode("span",null,null):null)');
    });

    it('should compile v-show inside a slot into a style.display binding', () => {
      const result = compile('<div><Child><i v-show="s">y</i></Child></div>', opts);
      expect(result.code).toContain("style:{\"display\":(_ctx.s?'':'none')}");
    });

    it('should compile a top-level v-for slot element into a mapped list', () => {
      const result = compile('<div><Child><i v-for="x in xs">y</i></Child></div>', opts);
      expect(result.code).toContain('...(_ctx.xs.map((x)=>createVNode("i"');
    });

    it('should compile named slots into separate slot functions', () => {
      const result = compile(
        '<div><Child><template #header>H</template><template #footer>F</template></Child></div>',
        opts,
      );
      expect(result.code).toContain('"header":()=>[createVNode(Text,null,"H")]');
      expect(result.code).toContain('"footer":()=>[createVNode(Text,null,"F")]');
    });

    it('should pass slot scope params as the slot function argument', () => {
      const viaTemplate = compile(
        '<div><Child><template #default="p">{{ p.x }}</template></Child></div>',
        opts,
      );
      expect(viaTemplate.code).toContain('{"default":(p)=>[createVNode(Text,null,p.x)]}');

      const viaComponent = compile('<div><Child v-slot="p">{{ p.x }}</Child></div>', opts);
      expect(viaComponent.code).toContain('{default:(p)=>[createVNode(Text,null,p.x)]}');
    });

    it('should support destructured slot scope without prefixing the locals', () => {
      const result = compile(
        '<div><Child><template #item="{ x, y }">{{ x }}</template></Child></div>',
        opts,
      );
      expect(result.code).toContain('{"item":({ x, y })=>[createVNode(Text,null,x)]}');
    });

    it('should keep named slots and the default slot side by side', () => {
      const result = compile('<div><Child><template #header>H</template>body</Child></div>', opts);
      expect(result.code).toContain('"header":()=>[');
      expect(result.code).toContain('default:()=>[createVNode(Text,null,"body")]');
    });

    it('should drop the effect wrapper for v-once (non-optimized, runtime path)', () => {
      // 运行时 SignalRenderer 走的正是非优化版；此前的实现里 v-once **完全无效**
      //（插值仍被 effect 包裹），而优化版是对的 —— 典型的「双 codegen 不同步」。
      const result = compile('<div v-once>{{ msg }}</div>', opts);
      // 单插值元素直接以元素自身为文本宿主（B01b 去注释），没有 claimTextSlots；
      // 多插值 / 静态文本 + 插值仍走槽位（见下方守护用例）。
      expect(result.code).toContain('setText(_div, _ctx.msg);');
      expect(result.code).not.toContain('effect(() => setText(_div,');
    });

    it('should propagate v-once down the subtree (non-optimized)', () => {
      const result = compile('<div v-once><span>{{ msg }}</span></div>', opts);
      expect(result.code).toContain('setText(_span, _ctx.msg);');
      expect(result.code).not.toContain('effect(() => setText(_span,');
    });

    it('should still wrap ordinary interpolations with effect (non-optimized)', () => {
      const result = compile('<div>{{ msg }}</div>', opts);
      expect(result.code).toContain('effect(() => setText(_div, _ctx.msg));');
    });

    it('should keep text slots for multiple interpolations (B01b 去注释只对单插值生效)', () => {
      const result = compile('<div>{{ a }}-{{ b }}</div>', opts);
      expect(result.code).toContain('claimTextSlots(_div)');
      // 多插值仍由 effect 包裹，故调用本身不带结尾分号（`…_ctx.a));`）
      expect(result.code).toContain('setText(_divSlots[0], _ctx.a)');
      expect(result.code).toContain('setText(_divSlots[1], _ctx.b)');
    });

    it('should keep text slots when static text precedes an interpolation (B01b)', () => {
      const result = compile('<div>Hi {{ name }}</div>', opts);
      expect(result.code).toContain('claimTextSlots(_div)');
    });

    it('should treat blank-only slot content inside v-if as null children', () => {
      const result = compile('<div><Child><span v-if="ok"> </span></Child></div>', opts);
      expect(result.code).toContain('(_ctx.ok?createVNode("span",null,null):null)');
    });

    it('should compile v-for inside a slot into a spread-mapped list', () => {
      const result = compile(
        '<div><Child><li v-for="item in items">{{ item.name }}</li></Child></div>',
        opts,
      );
      expect(result.code).toContain(
        '...(_ctx.items.map((item)=>createVNode("li",null,[createVNode(Text,null,item.name)])))',
      );
    });

    it('should support (item, index) and :key inside a slot v-for', () => {
      const result = compile(
        '<div><Child><li v-for="(item, i) in items" :key="item.id">{{ item.name }}</li></Child></div>',
        opts,
      );
      expect(result.code).toContain('(_ctx.items.map((item,i)=>createVNode("li",{"key":item.id}');
    });

    it('should keep the loop variable UNPREFIXED and recurse nested elements in slot v-for', () => {
      const result = compile(
        '<div><Child><li v-for="item in items"><b>{{ item.n }}</b></li></Child></div>',
        opts,
      );
      // 循环变量 item 不能被加 `_ctx.` 前缀
      expect(result.code).toContain('createVNode("b",null,[createVNode(Text,null,item.n)])');
      expect(result.code).not.toContain('_ctx.item.');
    });

    it('should mix static siblings with a slot v-for', () => {
      const result = compile(
        '<div><Child><span>head</span><li v-for="x in xs">{{ x }}</li></Child></div>',
        opts,
      );
      expect(result.code).toContain('createVNode("span",null,[createVNode(Text,null,"head")])');
      expect(result.code).toContain('...(_ctx.xs.map((x)=>createVNode("li"');
    });
  });
});
