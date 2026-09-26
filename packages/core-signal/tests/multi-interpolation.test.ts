// @vitest-environment jsdom
/**
 * P0 修复验证：同一元素内的多个插值必须**全部**渲染出来
 *
 * 背景（修复前）：codegen 对每个插值都调用 `setText(元素变量, …)`，
 * 而 `setText` 的语义是"设置**整个元素**的文本" ⇒ 多个插值互相覆盖，只剩最后一个。
 * 例：`<div>{{ msg }}|{{ n }}</div>` 只渲染出 `n`，"|" 与 msg 全部丢失。
 *
 * 修复：静态模板为每个插值留 `<!--lyt-t-->` 注释槽位，运行时 `claimTextSlots()` 把它们
 * 换成**独立的空文本节点**，每个插值各写自己的节点。
 *
 * ⚠️ 这些用例**必须保持多插值/混排形态** —— 只用单插值模板会绕开该缺陷（这正是它长期未被发现的原因）。
 */

import { describe, it, expect } from 'vitest';
import { createApp } from '../src/index';

async function render(template: string, state: Record<string, unknown>): Promise<string> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  await createApp({ setup: () => state, template }).mount(host);
  const html = host.innerHTML;
  host.remove();
  return html;
}

describe('P0：同元素多插值（修复回归防线）', () => {
  it('单个插值仍正常', async () => {
    expect(await render('<div>{{ msg }}</div>', { msg: 'hello' })).toContain('hello');
  });

  it('两个插值必须都渲染出来', async () => {
    const html = await render('<div>{{ a }}|{{ b }}</div>', { a: 'AAA', b: 'BBB' });
    expect(html).toContain('AAA');
    expect(html).toContain('BBB');
    expect(html).toContain('|');
  });

  it('插值与静态文本混排时顺序与内容都要正确', async () => {
    const html = await render('<div>前{{ x }}后</div>', { x: 'MID' });
    expect(html).toContain('前');
    expect(html).toContain('MID');
    expect(html).toContain('后');
    // 顺序：前 → MID → 后
    expect(html.replace(/\s+/g, '')).toMatch(/前MID后/);
  });

  it('三个插值都要在', async () => {
    const html = await render('<div>{{ a }}-{{ b }}-{{ c }}</div>', { a: '1', b: '2', c: '3' });
    expect(html).toContain('1');
    expect(html).toContain('2');
    expect(html).toContain('3');
  });

  it('相邻插值（无分隔）都要在', async () => {
    const html = await render('<div>{{ a }}{{ b }}</div>', { a: 'XX', b: 'YY' });
    expect(html).toContain('XX');
    expect(html).toContain('YY');
  });

  it('嵌套元素各自的插值互不干扰', async () => {
    const html = await render('<div>{{ a }}<span>{{ b }}</span></div>', { a: 'OUT', b: 'IN' });
    expect(html).toContain('OUT');
    expect(html).toContain('IN');
    expect(html).toMatch(/OUT<span>IN<\/span>/);
  });

  it('插值不存在的字段时输出空字符串（不报错）', async () => {
    const html = await render('<div>{{ a }}|{{ missing }}</div>', { a: 'A' });
    expect(html).toContain('A');
    expect(html).toContain('|');
  });
});
