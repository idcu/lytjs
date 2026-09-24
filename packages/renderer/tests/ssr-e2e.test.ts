/**
 * SSR **端到端**验证（走真实渲染入口 renderVaporToString，而不是只检查编译产物字符串）
 *
 * 背景：v-html 那次修复只断言了产物代码、没走真实执行链路 ⇒ 漏掉了
 *「执行器没有注入 sanitizeHTML」这个会导致运行时抛错的问题。本文件专门补上。
 */

import { describe, it, expect } from 'vitest';
import { renderVaporToString } from '../src/vapor/vapor-ssr';

/** 用「模板 + 状态」定义一个最小组件并做 SSR 渲染 */
async function ssr(template: string, state: Record<string, unknown>): Promise<string> {
  const result = await renderVaporToString({
    template,
    setup: () => state,
  } as never);
  return result.html;
}

describe('SSR 端到端（renderVaporToString）', () => {
  it('v-html 应输出**经过净化的原始 HTML**（不是转义文本）', async () => {
    const html = await ssr('<div v-html="raw"></div>', { raw: '<b>hi</b>' });
    expect(html).toContain('<b>hi</b>');
    expect(html).not.toContain('&lt;b&gt;');
  });

  it('v-html 应移除危险标签与事件属性', async () => {
    const a = await ssr('<div v-html="raw"></div>', { raw: '<script>x</script>ok' });
    expect(a).not.toContain('<script>');
    const b = await ssr('<div v-html="raw"></div>', { raw: '<img onerror=alert(1)>' });
    expect(b).not.toContain('onerror');
  });

  it('class 的数组/对象形式应被序列化（不能是 [object Object]）', async () => {
    const html = await ssr("<div :class=\"['a',{'b':ok}]\">x</div>", { ok: true });
    expect(html).not.toContain('[object Object]');
    expect(html).toContain('a b');
  });

  it('style 的对象形式应被序列化', async () => {
    const html = await ssr('<div :style="s">x</div>', { s: { color: 'red' } });
    expect(html).not.toContain('[object Object]');
    expect(html).toContain('color:red');
  });

  it('插值仍应转义', async () => {
    const html = await ssr('<div>{{ msg }}</div>', { msg: '<x>' });
    expect(html).toContain('&lt;x&gt;');
  });
});
