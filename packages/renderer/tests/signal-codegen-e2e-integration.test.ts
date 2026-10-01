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
 * 历史：第四批真跑曾钉住 4 条钉子（v-for 组件列表 ×2、列表项插槽内容 ×2、KeepAlive+v-if ×2）。
 * 经逐条排查与修复，现**清单已清空**：
 *
 * - v-for 渲染组件列表（opt/base 两套）已修复 —— 产物改为 `create:(it)=>{…;return _Row;}`，
 *   **create 回调必须 return 容器**，否则 `reconcileArray` 抛 `Invalid value used as weak map key`；
 * - 列表项组件的插槽内容（Task A）：opt/base 两套 codegen 把列表项子节点序列化为默认插槽；
 * - KeepAlive + v-if（Task B）：经探针证实**框架本就正确**，原 KNOWN_FAIL 用例的绑定
 *   `const ctx=reactive({show:true}); mount(..., {Comp:A, show:ctx})` 使 `_ctx.show` 解析成
 *   reactive 对象（恒真），v-if 永远无法翻转 —— 属**测试绑定错误**，非框架缺陷。
 *   修正为把 reactive 状态对象本身作为上下文（`reactive({show:true, Comp:A})`）后，两套均通过。
 */
const KNOWN_FAIL = new Set<string>([]);

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
        // reactive 状态对象本身作为上下文：模板变量 `show` 读取 `ctx.show`（响应式布尔）。
        // 此前误写成 `{ Comp: A, show: ctx }`（`ctx=reactive({show:true})`）使 `_ctx.show`
        // 解析成 reactive 对象、v-if 恒真、永远无法翻转 —— 那是测试绑定错误，非框架缺陷。
        const ctx = reactive({ show: true, Comp: A });
        const { container } = mount('<KeepAlive><Comp v-if="show"/></KeepAlive>', v, ctx);

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
