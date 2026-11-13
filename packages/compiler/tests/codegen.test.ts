// tests/codegen.test.ts
// Codegen tests：断言编译产物的**公开可观察行为**（执行后的 render 返回值 / VNode 树），
// 而不是 `expect(result.code).toContain(...)` 这类绑定产物文本的字符串断言。

import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';
import { asVNode, asVNodeList, execute, importedHelpers, renderWith } from './support/execute';

describe('codegen', () => {
  describe('basic codegen', () => {
    it('should generate a callable render function', () => {
      const render = execute(compile('<div></div>'));
      expect(typeof render).toBe('function');
      expect(asVNode(render({})).type).toBe('div');
    });

    it('should render the element described by the template', () => {
      const result = asVNode(renderWith('<div></div>'));
      expect(result.type).toBe('div');
      expect(result.props).toBeNull();
    });

    it('should declare helpers needed to execute the generated module', () => {
      expect(importedHelpers(compile('<div></div>'))).toEqual(
        expect.arrayContaining(['createElementVNode']),
      );
    });

    it('should return executable code and its helper preamble', () => {
      const result = compile('<div></div>');
      expect(typeof result.code).toBe('string');
      expect(typeof result.preamble).toBe('string');
    });
  });

  describe('element codegen', () => {
    it('should render the correct tag name', () => {
      expect(asVNode(renderWith('<span></span>')).type).toBe('span');
    });

    it('should render static attributes as props', () => {
      expect(asVNode(renderWith('<div id="app"></div>')).props).toEqual({ id: 'app' });
    });

    it('should render multiple attributes', () => {
      expect(asVNode(renderWith('<div id="app" class="container"></div>')).props).toEqual({
        id: 'app',
        class: 'container',
      });
    });
  });

  describe('interpolation codegen', () => {
    it('should display interpolation values at render time', () => {
      const render = execute(compile('<div>{{ message }}</div>'));
      expect(asVNode(render({ message: 'hello' })).children).toBe('hello');
      expect(asVNode(render({ message: 0 })).children).toBe('0');
    });

    it('should evaluate expressions at render time', () => {
      expect(asVNode(renderWith('<div>{{ 1 + 2 }}</div>')).children).toBe('3');
    });
  });

  describe('v-if codegen', () => {
    it('should branch on the condition expression', () => {
      const render = execute(compile('<div v-if="show"></div>'));
      expect(asVNode(render({ show: true })).type).toBe('div');
      expect(render({ show: false })).toBeNull();
    });

    it('should render both branches of a v-if/v-else chain', () => {
      const render = execute(compile('<div v-if="a">A</div><div v-else>B</div>'));
      expect(asVNode(render({ a: true })).children).toBe('A');
      expect(asVNode(render({ a: false })).children).toBe('B');
    });
  });

  describe('v-for codegen', () => {
    it('should render one element per list item', () => {
      const list = asVNodeList(
        renderWith('<li v-for="item in items"></li>', { items: ['a', 'b', 'c'] }),
      );
      expect(list).toHaveLength(3);
      expect(list.map((item) => item.type)).toEqual(['li', 'li', 'li']);
    });
  });

  describe('v-model codegen', () => {
    // ⚠️ 2026-10-27 修正：原生 input 不认 `modelValue` / `onUpdate:modelValue`，
    // 正确行为是 `value` + `onInput`；组件形态才是 modelValue。
    it('native input should bind value + onInput (not modelValue)', () => {
      const ctx: Record<string, unknown> = { message: 'hi' };
      const out = asVNode(execute(compile('<input v-model="message">'))(ctx));

      expect(out.props).toMatchObject({ value: 'hi' });
      expect(out.props).not.toHaveProperty('modelValue');

      (out.props!.onInput as (event: unknown) => void)({ target: { value: 'bye' } });
      expect(ctx.message).toBe('bye');
    });

    it('component should bind modelValue and onUpdate:modelValue', () => {
      const ctx: Record<string, unknown> = { message: 'hi', MyInput: 'MyInputComp' };
      const out = asVNode(execute(compile('<MyInput v-model="message" />'))(ctx));

      expect(out.type).toBe('MyInputComp');
      expect(out.props).toMatchObject({ modelValue: 'hi' });

      (out.props!['onUpdate:modelValue'] as (value: unknown) => void)('next');
      expect(ctx.message).toBe('next');
    });
  });

  describe('component codegen', () => {
    it('should resolve the component from the context', () => {
      const out = asVNode(renderWith('<MyComponent></MyComponent>', { MyComponent: 'MyComp' }));
      expect(out.type).toBe('MyComp');
    });
  });

  describe('text codegen', () => {
    it('should render text content', () => {
      expect(renderWith('hello')).toBe('hello');
    });
  });

  describe('nested elements', () => {
    it('should render nested elements', () => {
      const div = asVNode(renderWith('<div><span></span></div>'));
      expect(div.type).toBe('div');
      expect(asVNode(div.children).type).toBe('span');
    });
  });

  describe('edge cases', () => {
    it('should render nothing for a whitespace-only template', () => {
      expect(renderWith('   \n\t  ')).toBeUndefined();
    });

    it('should render deeply nested elements', () => {
      let current = asVNode(renderWith('<div><div><div><span>deep</span></div></div></div>'));
      expect(current.type).toBe('div');
      current = asVNode(current.children);
      expect(current.type).toBe('div');
      current = asVNode(current.children);
      expect(current.type).toBe('div');
      current = asVNode(current.children);
      expect(current.type).toBe('span');
      expect(current.children).toBe('deep');
    });

    it('should preserve special characters in attributes', () => {
      expect(asVNode(renderWith('<div data-value="a &lt; b"></div>')).props).toEqual({
        'data-value': 'a &lt; b',
      });
    });

    it('should render the selected v-if/v-else-if/v-else branch', () => {
      const render = execute(
        compile('<div v-if="a">A</div><div v-else-if="b">B</div><div v-else>C</div>'),
      );
      expect(asVNode(render({ a: true, b: false })).children).toBe('A');
      expect(asVNode(render({ a: false, b: true })).children).toBe('B');
      expect(asVNode(render({ a: false, b: false })).children).toBe('C');
    });

    it('should pass index and item to the v-for body', () => {
      const list = asVNodeList(
        renderWith('<li v-for="(item, index) in items">{{ index }}: {{ item }}</li>', {
          items: ['x', 'y'],
        }),
      );
      expect(list.map((item) => item.children)).toEqual(['0: x', '1: y']);
    });

    it('should bind expression values through v-bind shorthand', () => {
      expect(asVNode(renderWith('<div :id="myId"></div>', { myId: 'bound' })).props).toEqual({
        id: 'bound',
      });
    });

    it('should bind handlers through v-on shorthand', () => {
      const handler = (): void => undefined;
      const out = asVNode(
        renderWith('<button @click="handleClick">Click</button>', { handleClick: handler }),
      );
      expect(out.props).toMatchObject({ onClick: handler });
      expect(out.children).toBe('Click');
    });

    it('should handle dynamic arguments', () => {
      // 回归：动态参数名曾被 JSON.stringify 成字面量 key（`{"attrName": value}`），
      // 属性名完全不求值；正确产物应为计算键 `[_ctx.attrName]`。
      const out = asVNode(
        renderWith('<div :[attrName]="value">x</div>', { attrName: 'title', value: 'T' }),
      );
      expect(out.props).toEqual({ title: 'T' });
    });

    it('should expose v-slot content as a callable slot', () => {
      const out = asVNode(
        renderWith('<MyComponent #default="slotProps">{{ slotProps.text }}</MyComponent>', {
          MyComponent: 'MyComp',
        }),
      );
      expect(out.type).toBe('MyComp');
      const slots = out.children as Record<string, (props: Record<string, unknown>) => unknown[]>;
      expect(typeof slots.default).toBe('function');
      expect(slots.default({ text: 'hello' })).toEqual(['hello']);
    });

    it('should drop comments from the rendered tree', () => {
      const out = asVNode(renderWith('<div><!-- comment --></div>'));
      expect(out.type).toBe('div');
      expect(out.children).toBeNull();
    });

    it('should bind mixed v-bind and v-on props', () => {
      const handler = (): void => undefined;
      const out = asVNode(
        renderWith('<input :value="val" @input="onInput">', {
          val: 'current',
          onInput: handler,
        }),
      );
      expect(out.props).toEqual({ value: 'current', onInput: handler });
    });

    it('should keep v-pre subtree as literals (skip compilation)', () => {
      const out = asVNode(renderWith('<div v-pre>{{ raw }}</div>', { raw: 'compiled' }));
      expect(out.children).toBe('{{ raw }}');
    });

    it('should keep v-pre applied to nested subtrees', () => {
      const div = asVNode(
        renderWith('<div v-pre><span>{{ raw }}</span></div>', { raw: 'compiled' }),
      );
      expect(asVNode(div.children).children).toBe('{{ raw }}');
    });

    it('v-pre 子树内的指令保持字面量、不再编译（C-22）', () => {
      const div = asVNode(
        renderWith('<div v-pre><span v-if="ok" :title="t">x</span></div>', {
          ok: false,
          t: 'T',
        }),
      );
      // 修前：v-if="ok" 被编译 ⇒ ok=false 时子节点为注释/空，span 整棵消失
      const span = asVNode(div.children);
      expect(span.type).toBe('span');
      expect(span.props).toEqual({ 'v-if': 'ok', ':title': 't' });
    });

    it('v-pre 内的组件标签按普通元素渲染（C-22）', () => {
      const div = asVNode(renderWith('<div v-pre><Comp :p="a" /></div>', { a: 1 }));
      const child = asVNode(div.children);
      expect(child.type).toBe('Comp');
      expect(child.props).toEqual({ ':p': 'a' });
    });

    it('v-memo 在 vnode 路径真正生效：依赖不变复用同一 vnode（C-29）', () => {
      const render = execute(compile('<div v-memo="[x]">{{ x }}</div>'));
      const first = render({ x: 1 });
      const second = render({ x: 1 });
      expect(second).toBe(first);
      const third = render({ x: 2 });
      expect(third).not.toBe(first);
    });

    it('v-memo 在 v-for 中按项区分缓存槽位（C-29）', () => {
      const render = execute(
        compile(
          '<ul><li v-for="(item, i) in list" :key="i" v-memo="[item.n]">{{ item.n }}</li></ul>',
        ),
      );
      const ul = asVNode(render({ list: [{ n: 'a' }, { n: 'a' }] }));
      const items = asVNodeList(ul.children);
      expect(items).toHaveLength(2);
      // 若所有项共用静态槽位 0，第二项会命中第一项的缓存、拿到同一个 vnode
      expect(items[0]).not.toBe(items[1]);
    });

    it('should evaluate v-once lazily and reuse the first render', () => {
      const render = execute(compile('<div v-once>{{ message }}</div>'));
      const first = asVNode(render({ message: 'first' }));
      const second = asVNode(render({ message: 'second' }));
      expect(first.children).toBe('first');
      // 命中缓存：后续渲染复用同一个 vnode，而不是重新求值
      expect(second).toBe(first);
    });

    it('should strip v-cloak but keep rendering the subtree', () => {
      const out = asVNode(renderWith('<div v-cloak>{{ message }}</div>', { message: 'hi' }));
      expect(out.props).toBeNull();
      expect(out.children).toBe('hi');
    });

    it('should render svg elements and their attributes', () => {
      const svg = asVNode(renderWith('<svg><circle cx="50" cy="50" r="40"></circle></svg>'));
      expect(svg.type).toBe('svg');
      const circle = asVNode(svg.children);
      expect(circle.type).toBe('circle');
      expect(circle.props).toEqual({ cx: '50', cy: '50', r: '40' });
    });

    it('should expose template refs as props', () => {
      expect(asVNode(renderWith('<div ref="myRef"></div>')).props).toEqual({ ref: 'myRef' });
    });

    it('should expose the key attribute as a prop', () => {
      expect(asVNode(renderWith('<div :key="itemId"></div>', { itemId: 'k1' })).props).toEqual({
        key: 'k1',
      });
    });

    it('should select the dynamic component and not emit an is prop', () => {
      // 行为变更：`is` 是**选择器**（vnode 类型），不是 prop。
      // 旧实现把它编译成字面量元素 `<component is="x">`，组件根本不会挂载。
      const component = { name: 'MyComp' };
      const out = asVNode(
        renderWith('<component :is="componentName"></component>', {
          componentName: component,
        }),
      );
      expect(out.type).toBe(component);
      expect(out.props).toBeNull();
    });
  });
});
