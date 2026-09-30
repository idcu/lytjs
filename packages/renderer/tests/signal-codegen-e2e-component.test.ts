// @vitest-environment jsdom
/**
 * signal codegen · 组件与内置组件**真跑**
 *
 * 第三批：把「组件」这一最大未测面纳入真跑。产物形态为
 * `mountComponent(_c.Comp, props, container, slots)`（组件一律从 **ctx** 取，内置组件亦然），
 * 因此本文件用真实组件定义作为 ctx 成员，断言**真实 DOM**。
 *
 * 已知缺陷一律用 `it.fails` 钉住（修好会自动翻红）。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { defineComponent, h } from '@lytjs/core';
import { compile } from '@lytjs/compiler';
import { mountSignal } from './helpers/run-signal-code';

type Variant = { label: string; options: Record<string, unknown> };

const VARIANTS: Variant[] = [
  { label: 'base', options: { rendererMode: 'signal', optimizeSignal: false } },
  { label: 'opt', options: { rendererMode: 'signal', optimizeSignal: true } },
];

const codeOf = (tpl: string, v: Variant) => compile(tpl, v.options as never).code;
const mount = (tpl: string, v: Variant, ctx: unknown) => mountSignal(codeOf(tpl, v), ctx);

/** ⚠️ 已知缺陷清单（真跑才暴露）；修好后自动翻红 ⇒ 请移出清单 */
/**
 * ⚠️ **已知缺口**（本批新发现，`it.fails` 钉住，修好会自动翻红）：
 * `Teleport` / `Transition` / `Suspense` 三个内置组件虽已能**被正确导入**（解析层已对齐 Vue），
 * 但在 signal 的 `mountComponent` 挂载路径下**渲染为空** —— 属**组件实现层**问题：
 * 它们各自有额外契约（Teleport 需移动节点、Transition 需过渡钩子、Suspense 需异步边界），
 * 与「往容器里 mount 一棵 vnode」的当前路径尚未对接。`KeepAlive` 已验证可用。
 */
/**
 * ⚠️ **已知缺陷清单**（`it.fails`，修好会自动翻红）。
 *
 * 2026-10-01 定位的**根因**（同时解释 `Transition` 为何渲染为空）：
 * **组件渲染函数返回「vnode 数组」时渲染为空** —— 对照实验三种写法
 * （解构 `{slots}` / 用完整 context 取 `slots` / **硬编码返回 `[h(...)]`**）**全部为空**；
 * 返回**单个** vnode 时正常（`KeepAlive` 能工作正因它拿到单个 vnode）。
 * ⇒ 属**组件渲染结果归一化**层面的缺陷（多根组件整体不可用），与 codegen / slot 取法无关。
 */
const KNOWN_FAIL = new Set<string>([
  'base/内置 Suspense：内容照常渲染',
  'opt/内置 Suspense：内容照常渲染',
]);

describe('signal codegen · 组件真跑（两套 codegen）', () => {
  // 组件挂载会按 `data-lyt-comp` 在**文档范围**解析宿主元素：用例间必须清空 body，
  // 否则前一用例残留的占位元素会被命中，当前容器永远为空（历史教训：表现为「单独跑通过、成组跑失败」）。
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  for (const v of VARIANTS) {
    describe(v.label, () => {
      const t = (name: string, fn: () => void | Promise<void>) => {
        (KNOWN_FAIL.has(`${v.label}/${name}`) ? it.fails : it)(name, fn);
      };

      t('子组件被挂载并渲染出内容', () => {
        const Child = defineComponent({
          name: 'Child',
          setup() {
            return () => h('span', { id: 'child' }, 'CHILD');
          },
        });
        const { container } = mount('<Comp/>', v, { Comp: Child });
        expect(container.querySelector('#child')).not.toBeNull();
        expect(container.textContent).toContain('CHILD');
      });

      t('静态 props 传给子组件', () => {
        const Child = defineComponent({
          name: 'Child',
          props: { label: { type: String } },
          setup(props: { label?: string }) {
            return () => h('i', {}, `L=${props.label}`);
          },
        });
        const { container } = mount('<Comp label="hi"/>', v, { Comp: Child });
        expect(container.textContent).toContain('L=hi');
      });

      t('动态 props（:p="x"）传给子组件', () => {
        const Child = defineComponent({
          name: 'Child',
          props: { p: { type: Number } },
          setup(props: { p?: number }) {
            return () => h('i', {}, `P=${props.p}`);
          },
        });
        const { container } = mount('<Comp :p="n"/>', v, { Comp: Child, n: 7 });
        expect(container.textContent).toContain('P=7');
      });

      t('默认插槽内容渲染进子组件', () => {
        const Child = defineComponent({
          name: 'Child',
          setup(_p: unknown, ctx: { slots?: Record<string, () => unknown> }) {
            return () => h('div', { id: 'wrap' }, (ctx?.slots?.default?.() as never) ?? []);
          },
        });
        const { container } = mount('<Comp>SLOT-TXT</Comp>', v, { Comp: Child });
        expect(container.textContent).toContain('SLOT-TXT');
      });

      // ---------- 插槽出口（<slot/>） ----------
      // 2026-09-30 打通：`<slot/>` 出口由运行期 `mountSlot()` 把 `$slots[name]()` 的 vnode
      // 挂载进该元素（缺口三段的第 ② ③ 段已补；transform 层仍按普通元素处理，见文末说明）。
      {
        const slotName = '组件模板里的 <slot/> 应渲染 $slots.default 的内容';
        (KNOWN_FAIL.has(`${v.label}/${slotName}`) ? it.fails : it)(slotName, () => {
          const { container } = mount('<div><slot></slot></div>', v, {
            $slots: { default: () => [h('b', { id: 'slotted' }, 'SLOT')] },
          });
          expect(container.querySelector('#slotted')).not.toBeNull();
        });
      }

      t('具名插槽 <slot name="x"/> 渲染 $slots.x', () => {
        const { container } = mount('<div><slot name="x"></slot></div>', v, {
          $slots: { x: () => [h('q', { id: 'named' }, 'NAMED')] },
        });
        expect(container.querySelector('#named')?.textContent).toBe('NAMED');
      });

      // ---------- 多根组件（render 返回 vnode 数组） ----------
      {
        const multiName = '组件 render 返回 vnode 数组时应渲染全部根节点';
        (KNOWN_FAIL.has(`${v.label}/${multiName}`) ? it.fails : it)(multiName, () => {
          const Multi = defineComponent({
            name: 'Multi',
            setup() {
              return () => [h('i', { id: 'root-a' }, 'A'), h('i', { id: 'root-b' }, 'B')];
            },
          });
          const { container } = mount('<Multi/>', v, { Multi });
          expect(container.querySelector('#root-a')).not.toBeNull();
          expect(container.querySelector('#root-b')).not.toBeNull();
        });
      }

      // ---------- 内置组件（无需手动注册，codegen 直接从 @lytjs/component 导入） ----------
      t('内置 Teleport：内容被搬到目标元素', () => {
        const target = document.createElement('div');
        target.id = 'tp-target';
        document.body.appendChild(target);

        const { container } = mount(
          '<Teleport to="#tp-target"><b id="tp-inner">TP</b></Teleport>',
          v,
          {},
        );
        expect(document.querySelector('#tp-target #tp-inner')?.textContent).toBe('TP');
        // 内容应在目标处，而不是原容器里
        expect(container.querySelector('#tp-inner')).toBeNull();
      });

      t('内置 Transition：内容照常渲染（直通）', () => {
        const { container } = mount('<Transition><div id="tr">TR</div></Transition>', v, {});
        expect(container.querySelector('#tr')?.textContent).toBe('TR');
      });

      t('内置 KeepAlive：无需注册即可渲染子内容', () => {
        const { container } = mount('<KeepAlive><div id="ka">KA</div></KeepAlive>', v, {});
        expect(container.querySelector('#ka')?.textContent).toBe('KA');
      });

      t('内置 Suspense：内容照常渲染', () => {
        const { container } = mount('<Suspense><div id="sp">SP</div></Suspense>', v, {});
        expect(container.querySelector('#sp')?.textContent).toBe('SP');
      });
    });
  }
});
