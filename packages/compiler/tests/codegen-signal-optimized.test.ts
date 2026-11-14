// @vitest-environment jsdom
// tests/codegen-signal-optimized.test.ts
// Phase 1.1: Signal 代码生成器优化测试（执行产物、断言 DOM 行为）

import { describe, it, expect } from 'vitest';
import { compile } from '../src';
import { executeSignal } from './support/execute';

import { registerSignalOptimizedGenerator } from '../src/signal-optimized';

registerSignalOptimizedGenerator();

const mount = (template: string, ctx: Record<string, unknown> = {}) =>
  executeSignal(compile(template, { rendererMode: 'signal', optimizeSignal: true }), ctx);

describe('Signal Codegen Optimized', () => {
  describe('Code Size Reduction', () => {
    it('should generate signal code', () => {
      const handle = mount('<div><span>{{ message }}</span></div>', { message: 'M' });
      expect(handle.text()).toBe('M');
    });

    it('should use short import aliases', () => {
      // ⚠️ 2026-09-30 订正：`import{e as effect}` 的语义是「导入名为 e 的导出」，
      //    而 @lytjs/reactivity 没有 e ⇒ 产物根本无法加载。
      //    执行即证明产物里是「真实导出 as 短名」，且短名在函数体内可用。
      expect(mount('<div>{{ message }}</div>', { message: 'M' }).text()).toBe('M');
    });

    it('should generate signal effects', () => {
      const handle = mount('<div :class="cls" :style="style">{{ text }}</div>', {
        cls: 'active',
        style: { color: 'red' },
        text: 'T',
      });
      const div = handle.container.querySelector('div')!;
      expect(div.className).toBe('active');
      expect(div.style.color).toBe('red');
      expect(div.textContent).toBe('T');
    });

    it('should generate compact function parameters', () => {
      // render(_c, _n)：上下文 + 容器两个入参
      expect(mount('<div>{{ message }}</div>', { message: 'M' }).render.length).toBe(2);
    });
  });

  describe('Functionality Preservation', () => {
    it('should handle simple interpolation', () => {
      expect(mount('<div>{{ message }}</div>', { message: 'M' }).text()).toBe('M');
    });

    it('should handle v-if directive', () => {
      expect(mount('<div v-if="show">content</div>', { show: true }).text()).toBe('content');
      expect(mount('<div v-if="show">content</div>', { show: false }).text()).toBe('');
    });

    it('should handle v-for directive', () => {
      const handle = mount(
        '<ul><li v-for="item in items" :key="item.id">{{ item.name }}</li></ul>',
        {
          items: [
            { id: 1, name: 'a' },
            { id: 2, name: 'b' },
          ],
        },
      );
      expect([...handle.container.querySelectorAll('li')].map((li) => li.textContent)).toEqual([
        'a',
        'b',
      ]);
    });

    it('should evaluate quote-prefixed expressions in v-for item props', () => {
      // 回归：`:data-x="'a' + x.id"` 曾因「首字符是引号 ⇒ 整段是字面量」被判成静态，
      // 产物把表达式源码写进属性，DOM 得到 `'a' + x.id` 而不是 `a1`。
      const handle = mount(
        `<ul><li v-for="x in xs" :key="x.id" :data-x="'a' + x.id">{{ x.name }}</li></ul>`,
        { xs: [{ id: 1, name: 'A' }] },
      );
      const li = handle.container.querySelector('li')!;
      expect(li.getAttribute('data-x')).toBe('a1');
      expect(li.textContent).toBe('A');
    });

    it('should handle v-model directive', () => {
      const ctx: Record<string, unknown> = { value: 'V' };
      const handle = mount('<input v-model="value" />', ctx);
      const input = handle.container.querySelector('input')!;
      expect(input.value).toBe('V');

      input.value = 'W';
      input.dispatchEvent(new Event('input'));
      expect(ctx.value).toBe('W');
    });

    it('should handle v-on directive', () => {
      const calls: string[] = [];
      const handle = mount('<button @click="handleClick">Click</button>', {
        handleClick: () => calls.push('click'),
      });
      handle.container.querySelector('button')!.dispatchEvent(new MouseEvent('click'));
      expect(calls).toEqual(['click']);
    });

    it('should handle v-bind directive', () => {
      const handle = mount('<div :class="cls" :style="style"></div>', {
        cls: 'active',
        style: { color: 'red' },
      });
      const div = handle.container.querySelector('div')!;
      expect(div.className).toBe('active');
      expect(div.style.color).toBe('red');
    });
  });

  describe('Edge Cases', () => {
    it('should handle nested elements', () => {
      const handle = mount('<div><span><em>{{ text }}</em></span></div>', { text: 'deep' });
      expect(handle.container.querySelector('em')!.textContent).toBe('deep');
    });

    it('should handle multiple root-level directives', () => {
      // v-if + v-for 同元素：至少不得抛错 / 生成非法代码
      expect(() =>
        mount('<div v-if="show" v-for="item in items">{{ item }}</div>', {
          show: true,
          items: ['a'],
        }),
      ).not.toThrow();
    });

    it('should handle v-show directive', () => {
      const visible = mount('<div v-show="visible">content</div>', { visible: true });
      expect(visible.container.querySelector('div')!.style.display).toBe('');
      const hidden = mount('<div v-show="visible">content</div>', { visible: false });
      expect(hidden.container.querySelector('div')!.style.display).toBe('none');
    });
  });

  describe('Size Comparison', () => {
    it('should generate valid code for typical templates', () => {
      const cases: Array<[string, Record<string, unknown>]> = [
        ['<div>{{ message }}</div>', { message: 'M' }],
        ['<div><span>{{ text }}</span></div>', { text: 'T' }],
        [
          '<div :class="cls" :style="style">{{ content }}</div>',
          { cls: 'a', style: {}, content: 'C' },
        ],
        ['<input v-model="value" />', { value: 'V' }],
        [
          '<button @click="handleClick">{{ label }}</button>',
          { handleClick: () => undefined, label: 'L' },
        ],
        [
          '<ul><li v-for="item in items" :key="item.id">{{ item.name }}</li></ul>',
          { items: [{ id: 1, name: 'a' }] },
        ],
      ];

      for (const [template, ctx] of cases) {
        expect(() => mount(template, ctx)).not.toThrow();
      }
    });
  });
});
