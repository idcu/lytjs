// @vitest-environment jsdom
/**
 * signal codegen · 构造集真跑（**第二批：进阶构造**）
 *
 * 延续 `signal-codegen-e2e.test.ts` 的做法：编译 → 执行产物 → 挂载 → **断言真实 DOM**，
 * 两套 codegen 都跑。本批聚焦上一批没覆盖的面：
 * v-model 双向、事件修饰符（stop / prevent / once / 按键）、动态参数 `:[dyn]`、
 * 动态事件 `@[evt]`、SVG / 注释 / 深嵌套、class+style 组合、响应式列表增删。
 *
 * 已知缺陷一律用 `it.fails` 钉住（**修好会自动翻红**，提醒移出清单）。
 */

import { describe, it, expect } from 'vitest';
import { reactive } from '@lytjs/reactivity';
import { compile } from '@lytjs/compiler';
import { mountSignal } from './helpers/run-signal-code';

type Variant = { label: string; options: Record<string, unknown> };

const VARIANTS: Variant[] = [
  { label: 'base', options: { rendererMode: 'signal', optimizeSignal: false } },
  { label: 'opt', options: { rendererMode: 'signal', optimizeSignal: true } },
];

const codeOf = (tpl: string, v: Variant) => compile(tpl, v.options as never).code;
const mount = (tpl: string, v: Variant, ctx: unknown) => mountSignal(codeOf(tpl, v), ctx);
const tick = () => new Promise((r) => setTimeout(r, 0));

/**
 * ⚠️ **已知缺陷清单（真跑才暴露）**。修好后自动翻红 ⇒ 请把条目移出并改为正常 `it`。
 */
const KNOWN_FAIL = new Set<string>([
  'base/@keyup.enter 按键修饰符：仅 Enter 触发',
  'opt/@keyup.enter 按键修饰符：仅 Enter 触发',
  'base/动态参数 :[dyn] 写到正确属性名',
  'opt/动态参数 :[dyn] 写到正确属性名',
  'base/动态事件 @[evt] 绑定到指定事件',
  'opt/动态事件 @[evt] 绑定到指定事件',
  'base/class 静态 + 动态 + 数组 + 对象混合',
  'opt/class 静态 + 动态 + 数组 + 对象混合',
]);

describe('signal codegen · 进阶构造真跑（两套 codegen）', () => {
  for (const v of VARIANTS) {
    describe(v.label, () => {
      const t = (name: string, fn: () => void | Promise<void>) => {
        (KNOWN_FAIL.has(`${v.label}/${name}`) ? it.fails : it)(name, fn);
      };

      // ---------- v-model 双向 ----------
      t('v-model 初始值写进 input.value', () => {
        const { container } = mount('<input v-model="x">', v, { x: 'hello' });
        expect((container.querySelector('input') as HTMLInputElement).value).toBe('hello');
      });

      t('v-model 双向：输入事件回写 ctx（含 .trim）', async () => {
        const ctx = reactive({ x: '' });
        const { container } = mount('<input v-model.trim="x">', v, ctx);
        const input = container.querySelector('input') as HTMLInputElement;

        input.value = '  ab  ';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await tick();
        expect(ctx.x).toBe('ab');
      });

      t('v-model.number：回写为数字', async () => {
        const ctx = reactive({ n: 0 as number | string });
        const { container } = mount('<input v-model.number="n">', v, ctx);
        const input = container.querySelector('input') as HTMLInputElement;

        input.value = '42';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await tick();
        expect(ctx.n).toBe(42);
      });

      // ---------- 事件修饰符 ----------
      t('@click.prevent 调用 preventDefault', () => {
        const { container } = mount('<a href="#x" @click.prevent="fn">y</a>', v, { fn: () => {} });
        const evt = new MouseEvent('click', { cancelable: true, bubbles: true });
        container.querySelector('a')!.dispatchEvent(evt);
        expect(evt.defaultPrevented).toBe(true);
      });

      t('@click.stop 阻止冒泡到父级', () => {
        let outer = 0;
        const { container } = mount(
          '<div @click="outside"><button @click.stop="inside">b</button></div>',
          v,
          { outside: () => outer++, inside: () => {} },
        );
        container
          .querySelector('button')!
          .dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(outer).toBe(0);
      });

      t('@click.once 只触发一次', () => {
        let n = 0;
        const { container } = mount('<button @click.once="fn">b</button>', v, {
          fn: () => n++,
        });
        const btn = container.querySelector('button')!;
        btn.click();
        btn.click();
        expect(n).toBe(1);
      });

      t('@keyup.enter 按键修饰符：仅 Enter 触发', () => {
        let n = 0;
        const { container } = mount('<input @keyup.enter="fn">', v, { fn: () => n++ });
        const input = container.querySelector('input')!;

        input.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', bubbles: true }));
        expect(n).toBe(0);
        input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
        expect(n).toBe(1);
      });

      // ---------- 动态参数 / 动态事件 ----------
      t('动态参数 :[dyn] 写到正确属性名', () => {
        const { container } = mount('<div :[dyn]="val">x</div>', v, { dyn: 'title', val: 'T' });
        expect(container.querySelector('div')!.getAttribute('title')).toBe('T');
      });

      t('动态事件 @[evt] 绑定到指定事件', () => {
        let n = 0;
        const { container } = mount('<button @[evt]="fn">b</button>', v, {
          evt: 'click',
          fn: () => n++,
        });
        container.querySelector('button')!.click();
        expect(n).toBe(1);
      });

      // ---------- class / style 组合 ----------
      t('class 静态 + 动态 + 数组 + 对象混合', () => {
        const { container } = mount('<div class="base" :class="[a, { on: ok }]">x</div>', v, {
          a: 'dyn',
          ok: true,
        });
        const cls = container.querySelector('div')!.className;
        expect(cls).toContain('base');
        expect(cls).toContain('dyn');
        expect(cls).toContain('on');
      });

      t('style 多属性 + 数值补 px', () => {
        const { container } = mount('<div :style="{ color: c, width: w }">x</div>', v, {
          c: 'red',
          w: 10,
        });
        const el = container.querySelector('div') as HTMLElement;
        expect(el.style.color).toBe('red');
        expect(el.style.width).toBe('10px');
      });

      // ---------- 结构性 ----------
      t('注释节点不渲染可见文本', () => {
        const { container } = mount('<div><!-- c --><span>S</span></div>', v, {});
        expect(container.textContent).toContain('S');
        expect(container.textContent).not.toContain('c');
      });

      t('SVG 元素正常创建', () => {
        const { container } = mount('<svg><circle cx="1" cy="2"></circle></svg>', v, {});
        expect(container.querySelector('circle')).not.toBeNull();
      });

      t('深嵌套 + 动态文本', () => {
        const { container } = mount(
          '<div><section><p><span>{{ deep }}</span></p></section></div>',
          v,
          { deep: 'D' },
        );
        expect(container.querySelector('span')!.textContent).toBe('D');
      });

      // ---------- 响应式 ----------
      t('响应式：v-show 切换 display', async () => {
        const ctx = reactive({ ok: true });
        const { container } = mount('<div v-show="ok">S</div>', v, ctx);
        const el = container.querySelector('div') as HTMLElement;
        expect(el.style.display).not.toBe('none');

        ctx.ok = false;
        await tick();
        expect(el.style.display).toBe('none');
      });

      t('响应式：列表增删（keyed reconcile）', async () => {
        const ctx = reactive({ list: [{ id: 1 }, { id: 2 }] });
        const { container } = mount(
          '<ul><li v-for="i in list" :key="i.id">{{ i.id }}</li></ul>',
          v,
          ctx,
        );
        expect(container.querySelectorAll('li')).toHaveLength(2);

        ctx.list = [{ id: 1 }, { id: 2 }, { id: 3 }];
        await tick();
        expect(container.querySelectorAll('li')).toHaveLength(3);
        expect(container.textContent).toContain('3');
      });
    });
  }
});
