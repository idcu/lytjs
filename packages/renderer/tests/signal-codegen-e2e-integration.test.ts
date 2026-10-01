// @vitest-environment jsdom
/**
 * signal codegen · **进阶集成构造真跑**（第四批）
 *
 * 聚焦「多个特性叠加」的真实用法 —— 单特性早已覆盖，但叠加处最容易出问题：
 * 作用域插槽、`<Teleport disabled>`、`v-for` 渲染组件列表、`<Transition>` 多子、
 * `<KeepAlive>` 缓存切换。全部断言**真实 DOM**。
 *
 * 已知缺陷一律 `it.fails`（修好会自动翻红 ⇒ 请移出清单）。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { defineComponent, h, reactive } from '@lytjs/core';
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
 * ⚠️ **已知缺陷清单**（`it.fails`，修好会自动翻红 ⇒ 请移出）。
 *
 * 本批（第四批真跑）新增两类，**两套 codegen 均有**：
 *
 * ① **`v-for` 渲染*组件*列表渲染为空** —— `<Row v-for="it in list" :key=".." :label=".."/>`
 *    与「组件列表 + 插槽内容」两个构造都得到 0 个元素。
 *    对照：`v-for` 渲染**普通元素**一直正常 ⇒ 说明列表路径只处理元素，未处理**组件 vnode**。
 *
 * ② **`<KeepAlive>` 内组件的 `v-if` 切换不生效** —— `show=false` 后组件 DOM **仍在**。
 *    疑点：`v-if` 位于**插槽函数内部**，其响应式依赖未与父级 effect 建立关联
 *    （`mountComponent` 已有 `warmupSlots`，但 KeepAlive 内部渲染可能另起 effect）。
 */
/**
 * 已知缺陷清单（it.fails，修好会自动翻红 => 请移出）。
 *
 * 2026-10-01 进展：**opt（默认 codegen）已修复「v-for 渲染组件列表」**（含 props 传递）：
 * 产物由 `createElement('Row')`（无意义标签）改为
 * `create:(it)=>{const _Row=document.createElement('div');m(_c.Row,{...},_Row);return _Row;}`
 * —— 关键是 **create 回调必须 return 容器**（否则 `reconcileArray` 里
 * `reconcileKeyMap.set(node,...)` 收到 undefined，抛 `Invalid value used as weak map key`）。
 *
 * 仍钉住：
 * 1) **列表项组件的插槽内容未传递** —— `<Card v-for=..><span>{{i.id}}</span></Card>` 仍为 0 个；
 * 2) **base 版列表路径未修复** —— 仍按元素处理。
 */
/**
 * 已知缺陷清单（it.fails，修好会自动翻红 => 请移出）。
 *
 * 2026-10-01 进展：**opt（默认 codegen）已修复「v-for 渲染组件列表」**（含 props 传递）：
 * 产物由 `createElement('Row')`（无意义标签）改为
 * `create:(it)=>{const _Row=document.createElement('div');m(_c.Row,{...},_Row);return _Row;}`
 * —— 关键是 **create 回调必须 return 容器**（否则 `reconcileArray` 里
 * `reconcileKeyMap.set(node,...)` 收到 undefined，抛 `Invalid value used as weak map key`）。
 *
 * 仍钉住：
 * 1) **列表项组件的插槽内容未传递** —— `<Card v-for=..><span>{{i.id}}</span></Card>` 仍为 0 个；
 * 2) **base 版列表路径未修复** —— 仍按元素处理。
 */
const KNOWN_FAIL = new Set<string>([
  'opt/组件列表 + 传入插槽内容',
  'base/组件列表 + 传入插槽内容',
  'base/KeepAlive 包裹的组件在 v-if 切换后仍能渲染',
  'opt/KeepAlive 包裹的组件在 v-if 切换后仍能渲染',
]);

describe('signal codegen · 进阶集成构造真跑（两套 codegen）', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  for (const v of VARIANTS) {
    describe(v.label, () => {
      const t = (name: string, fn: () => void | Promise<void>) => {
        (KNOWN_FAIL.has(`${v.label}/${name}`) ? it.fails : it)(name, fn);
      };

      // ---------- 形参/作用域插槽 ----------
      t('组件通过作用域插槽向父级传数据（<slot :item="x"/>）', () => {
        const List = defineComponent({
          name: 'List',
          setup(_p: unknown, ctx: { slots?: Record<string, (p?: unknown) => unknown> }) {
            return () => [ctx?.slots?.default?.({ item: 'FROM-CHILD' })];
          },
        });
        const { container } = mount('<Comp v-slot="s"><b id="sc">{{ s.item }}</b></Comp>', v, {
          Comp: List,
        });
        expect(container.querySelector('#sc')?.textContent).toBe('FROM-CHILD');
      });

      // ---------- Teleport disabled ----------
      t('Teleport disabled 时内容留在原地（不搬走）', () => {
        const target = document.createElement('div');
        target.id = 'td-target';
        document.body.appendChild(target);

        const { container } = mount(
          '<Teleport to="#td-target" disabled><i id="stay">S</i></Teleport>',
          v,
          {},
        );
        expect(container.querySelector('#stay')?.textContent).toBe('S');
        expect(target.querySelector('#stay')).toBeNull();
      });

      // ---------- v-for 渲染组件列表 ----------
      t('v-for 渲染组件列表（每个 item 一个组件实例）', () => {
        const Row = defineComponent({
          name: 'Row',
          props: { label: { type: String } },
          setup(props: { label?: string }) {
            return () => h('li', { class: 'row' }, `R=${props.label}`);
          },
        });
        const { container } = mount(
          '<ul><Row v-for="it in list" :key="it.id" :label="it.id"/></ul>',
          v,
          { Row, list: [{ id: 'a' }, { id: 'b' }] },
        );
        const rows = container.querySelectorAll('li.row');
        expect(rows).toHaveLength(2);
        expect(container.textContent).toContain('R=a');
        expect(container.textContent).toContain('R=b');
      });

      // ---------- Transition 多子 ----------
      t('Transition 包裹单个子节点时照常渲染', () => {
        const { container } = mount(
          '<Transition name="fade"><div id="tv">TV</div></Transition>',
          v,
          {},
        );
        expect(container.querySelector('#tv')?.textContent).toBe('TV');
      });

      // ---------- KeepAlive + v-if 切换 ----------
      t('KeepAlive 包裹的组件在 v-if 切换后仍能渲染', async () => {
        const A = defineComponent({
          name: 'PanelA',
          setup() {
            return () => h('div', { id: 'panel-a' }, 'A');
          },
        });
        const ctx = reactive({ show: true });
        const { container } = mount('<KeepAlive><Comp v-if="show"/></KeepAlive>', v, {
          Comp: A,
          show: ctx,
        });

        // 首帧
        expect(container.querySelector('#panel-a')?.textContent).toBe('A');
        ctx.show = false;
        await tick();
        expect(container.querySelector('#panel-a')).toBeNull();
      });

      // ---------- 组件 + v-for + 插槽叠加 ----------
      t('组件列表 + 传入插槽内容', () => {
        const Card = defineComponent({
          name: 'Card',
          setup(_p: unknown, ctx: { slots?: Record<string, () => unknown> }) {
            return () => h('div', { class: 'card' }, (ctx?.slots?.default?.() as never) ?? []);
          },
        });
        const { container } = mount(
          '<div><Card v-for="i in list" :key="i.id"><span class="in">{{ i.id }}</span></Card></div>',
          v,
          { Card, list: [{ id: 'x' }, { id: 'y' }] },
        );
        expect(container.querySelectorAll('.card')).toHaveLength(2);
        expect(container.querySelectorAll('span.in')).toHaveLength(2);
      });
    });
  }
});
