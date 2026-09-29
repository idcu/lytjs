// @vitest-environment jsdom
/**
 * signal codegen · 构造集**真跑**端到端
 *
 * 动机：`compiler/tests/codegen-constructs.test.ts` 只断言「不抛错 + 产物非空」——按本仓纪律，
 * 形状断言**不能证明可用**（产物可能编译通过、却根本加载不了或运行期取不到值）。
 * 2026-09-30 正是靠「真跑」才发现优化版产物 import 别名颠倒（产物无法加载）。
 *
 * 本文件把构造集**逐条编译 → 执行产物 → 挂载 → 断言真实 DOM**，两套 codegen（非优化版 / 优化版）
 * 都跑，用来抓「编译通过但运行期不对」的构造。
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

function mount(tpl: string, v: Variant, ctx: unknown) {
  return mountSignal(codeOf(tpl, v), ctx);
}

/**
 * ⚠️ **已知缺陷清单**（真跑才暴露；与「编译通过」无关）。
 * 用 `it.fails` 钉住：它们**修好之后会自动翻红**，提醒把条目挪出本清单。
 *
 * - `base/插值：表达式`、`base/插值：三元`：非优化版**丢弃复杂插值**
 *   （产物里只有文本占位 `<!--lyt-t-->`，没有对应的 setText）。
 * - `v-for 带索引`（`v-for="(i, k) in list"`）：两套 codegen 都**不渲染条目内容**
 *   （`create` 回调里只创建空 `<li>`）。
 * - `opt/v-text`：`v-text` 被**重复发射两次**，其中一次未做前缀化（`setText(el, t)`，
 *   而 `t` 是 `createTemplate` 的短名）。
 */
const KNOWN_FAIL = new Set([
  'base/插值：表达式（含算术）',
  'base/插值：三元',
  'base/v-for 带索引',
  'opt/v-for 带索引',
  'opt/v-text',
]);

describe('signal codegen · 构造集真跑（两套 codegen）', () => {
  for (const v of VARIANTS) {
    describe(v.label, () => {
      /** 已知缺陷用 `it.fails` 记，其余用正常 `it` */
      const t = (name: string, fn: () => void | Promise<void>) => {
        (KNOWN_FAIL.has(`${v.label}/${name}`) ? it.fails : it)(name, fn);
      };

      // ---------- 文本 / 插值 ----------
      t('静态文本', () => {
        const { container } = mount('<div>hello</div>', v, {});
        expect(container.innerHTML).toContain('hello');
      });

      t('插值：标识符', () => {
        const { container } = mount('<div>{{ msg }}</div>', v, { msg: 'hi' });
        expect(container.textContent).toContain('hi');
      });

      t('插值：表达式（含算术）', () => {
        const { container } = mount('<div>{{ a + b }}</div>', v, { a: 1, b: 2 });
        expect(container.textContent).toContain('3');
      });

      t('插值：属性路径', () => {
        const { container } = mount('<div>{{ obj.x }}</div>', v, { obj: { x: 'y' } });
        expect(container.textContent).toContain('y');
      });

      t('插值：三元', () => {
        const { container } = mount('<div>{{ ok ? "A" : "B" }}</div>', v, { ok: true });
        expect(container.textContent).toContain('A');
      });

      // ---------- 条件 ----------
      t('v-if 真值分支渲染', () => {
        const { container } = mount('<div v-if="ok">Y</div>', v, { ok: true });
        expect(container.textContent).toContain('Y');
      });

      t('v-if 假值不渲染', () => {
        const { container } = mount('<div v-if="ok">Y</div>', v, { ok: false });
        expect(container.textContent).not.toContain('Y');
      });

      t('v-if / v-else', () => {
        const a = mount('<div v-if="ok">Y</div><span v-else>N</span>', v, { ok: false });
        expect(a.container.textContent).toContain('N');
      });

      t('v-show=false ⇒ display:none', () => {
        const { container } = mount('<div v-show="ok">S</div>', v, { ok: false });
        const el = container.querySelector('div') as HTMLElement;
        expect(el.style.display).toBe('none');
      });

      // ---------- 列表 ----------
      t('v-for 渲染全部条目', () => {
        const { container } = mount('<ul><li v-for="i in list">{{ i }}</li></ul>', v, {
          list: [1, 2, 3],
        });
        const items = container.querySelectorAll('li');
        expect(items).toHaveLength(3);
        expect([...items].map((x) => x.textContent)).toEqual(['1', '2', '3']);
      });

      t('v-for 带索引', () => {
        const { container } = mount('<ul><li v-for="(i, k) in list">{{ k }}:{{ i }}</li></ul>', v, {
          list: ['a'],
        });
        expect(container.querySelector('li')!.textContent).toContain('0:a');
      });

      // ---------- 绑定 ----------
      t(':id 绑定', () => {
        const { container } = mount('<div :id="i">x</div>', v, { i: 'foo' });
        expect(container.querySelector('div')!.getAttribute('id')).toBe('foo');
      });

      t(':class 字符串', () => {
        const { container } = mount('<div :class="cls">x</div>', v, { cls: 'a' });
        expect(container.querySelector('div')!.className).toContain('a');
      });

      t(':class 数组', () => {
        const { container } = mount('<div :class="[a, b]">x</div>', v, { a: 'x', b: 'y' });
        const cls = container.querySelector('div')!.className;
        expect(cls).toContain('x');
        expect(cls).toContain('y');
      });

      t(':style 对象', () => {
        const { container } = mount('<div :style="{ color: c }">x</div>', v, { c: 'red' });
        expect((container.querySelector('div') as HTMLElement).style.color).toBe('red');
      });

      // ---------- 指令 ----------
      t('v-html', () => {
        const { container } = mount('<div v-html="h"></div>', v, { h: '<b>B</b>' });
        expect(container.innerHTML).toContain('<b>');
        expect(container.textContent).toContain('B');
      });

      t('v-text', () => {
        const { container } = mount('<div v-text="t"></div>', v, { t: 'T' });
        expect(container.querySelector('div')!.textContent).toBe('T');
      });

      t('v-pre 保留原文', () => {
        const { container } = mount('<div v-pre>{{ raw }}</div>', v, {});
        expect(container.innerHTML).toContain('{{ raw }}');
      });

      t('v-once 渲染一次（内容正确）', () => {
        const { container } = mount('<div v-once>{{ n }}</div>', v, { n: 7 });
        expect(container.textContent).toContain('7');
      });

      t('ref 属性不阻断渲染', () => {
        const { container } = mount('<div ref="r">x</div>', v, {});
        expect(container.textContent).toContain('x');
      });

      // ---------- 响应式更新（真实 reactivity） ----------
      t('插值随响应式数据更新', async () => {
        const ctx = reactive({ msg: 'a' });
        const { container } = mount('<div>{{ msg }}</div>', v, ctx);
        expect(container.textContent).toContain('a');

        ctx.msg = 'b';
        await new Promise((r) => setTimeout(r, 0));
        expect(container.textContent).toContain('b');
      });

      t('v-if 随响应式数据切换', async () => {
        const ctx = reactive({ ok: false });
        const { container } = mount('<div v-if="ok">Y</div>', v, ctx);
        expect(container.querySelector('div')).toBeNull();

        ctx.ok = true;
        await new Promise((r) => setTimeout(r, 0));
        expect(container.querySelector('div')).not.toBeNull();
      });

      t(':class 随响应式数据更新', async () => {
        const ctx = reactive({ cls: 'a' });
        const { container } = mount('<div :class="cls">x</div>', v, ctx);
        expect(container.querySelector('div')!.className).toContain('a');

        ctx.cls = 'b';
        await new Promise((r) => setTimeout(r, 0));
        expect(container.querySelector('div')!.className).toContain('b');
      });
    });
  }
});
