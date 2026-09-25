// @vitest-environment jsdom
/**
 * SSR 与客户端**首次渲染**的一致性（hydration 的基础）
 *
 * 做法：同一模板 + 同一状态，分别经
 *   - SSR：`renderVaporToString` → HTML 字符串
 *   - 客户端：`createSignalRenderer` → 真实 DOM
 * 再把 SSR 的 HTML 交给 jsdom 解析，与客户端 DOM 的 innerHTML 比对（规范化后）。
 *
 * 为什么要这条用例：SSR 与客户端若输出不同，hydration 就会出现不一致
 *（属性/文本被重新创建而非复用）。本会话已因此抓到一个真实缺陷
 *（`:class="[...]"` 在 Signal 下编译失败、而 SSR 却通过）。
 */

import { describe, it, expect } from 'vitest';
import { renderVaporToString } from '../src/vapor/vapor-ssr';
import { createSignalRenderer } from '../src/signal/signal-renderer';

/** 用同一份模板分别得到「SSR 的 HTML」与「客户端渲染后的 HTML」，并做规范化比较 */
async function compare(template: string, ctx: Record<string, unknown>): Promise<[string, string]> {
  const ssrHtml = (await renderVaporToString({ template, setup: () => ctx } as never)).html;

  const host = document.createElement('div');
  const renderer = createSignalRenderer(template, ctx);
  renderer.render(host);
  const clientHtml = host.innerHTML;
  renderer.unmount();

  // 规范化：把 SSR 的 HTML 也过一遍 jsdom，消除属性顺序等表面差异
  const norm = document.createElement('div');
  norm.innerHTML = ssrHtml;
  return [norm.innerHTML, clientHtml];
}

const CASES: Array<[string, string, Record<string, unknown>]> = [
  ['静态元素', '<div class="a">x</div>', {}],
  ['插值', '<div>{{ msg }}</div>', { msg: 'hi' }],
  ['属性绑定', '<div :title="t">x</div>', { t: 'tip' }],
  ['属性路径嵌套', '<div :title="obj.tip">x</div>', { obj: { tip: 'deep' } }],
  ['v-for', '<ul><li v-for="i in items">{{ i }}</li></ul>', { items: ['a', 'b', 'c'] }],
  // 注意：**组件**未纳入本文件 —— 两端结构本就不同（见下方已知差异说明）。
];

/**
 * ⚠️ **已知差异（均待专项，不应视为本文件失效）**：
 *
 * 1) 表达式类绑定（`:class="['a',{b:ok}]"` / `:style="{color:c}"` / `:title="a+'!'"` / 三元）
 *    Signal 直接**编译报错**（白名单限制），SSR 可编译 ⇒ 无法比对。
 *    修法：把 Signal codegen 里十余处 `_ctx.${exp}` 改为 `prefixIdentifiers(exp, locals)`。
 *
 * 2) **组件**：两端**结构本就不同** ——
 *      SSR 输出     `<div><strong>C</strong></div>`（组件内容直接替换）
 *      客户端输出   `<div><lyt-comp data-lyt-comp="Child">…</lyt-comp></div>`
 *                  （占位元素**保留为容器**，用于重渲染时定位）
 *    ⇒ **hydration 必然不匹配**。需统一策略（例如让客户端挂载后也去掉占位元素，
 *      或让 SSR 也输出占位元素）。
 */
describe('SSR 与客户端首次渲染应一致', () => {
  for (const [name, template, ctx] of CASES) {
    it(`${name}：${template}`, async () => {
      const [ssr, client] = await compare(template, ctx);
      expect(client).toBe(ssr);
    });
  }
});
