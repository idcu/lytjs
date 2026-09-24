/**
 * SSR 下 v-html 的语义（回归防线）
 *
 * v-html = 输出**原始 HTML**（不是转义成文本）。
 * 此前 SSR 误用 escapeHtml ⇒ `<b>x</b>` 被输出成字面文本，指令完全失效，
 * 且与客户端 setHTML（sanitizeHTML + innerHTML）行为不一致 ⇒ hydration 对不上。
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';

function ssrCode(template: string): string {
  return compile(template, { ssr: true, ssrMode: true }).code;
}

describe('SSR - v-html', () => {
  it('产物应调用 sanitizeHTML 而不是 escapeHtml', () => {
    const code = ssrCode('<div v-html="raw"></div>');
    expect(code).toContain('sanitizeHTML(String(_ctx.raw))');
    expect(code).not.toContain('escapeHtml(String(_ctx.raw))');
  });

  it('渲染时应保留 HTML 结构（不被转义成文本）', () => {
    const code = ssrCode('<div v-html="raw"></div>');
    const sanitizeHTML = (h: string) => h; // 恒等，仅验证"未被 escape"
    const render = new Function('_ctx', 'sanitizeHTML', `${code}\n; return render(_ctx);`) as (
      c: Record<string, unknown>,
      s: (h: string) => string,
    ) => string;

    const html = render({ raw: '<b>hi</b>' }, sanitizeHTML);
    expect(html).toBe('<div><b>hi</b></div>');
    // 关键：不能出现转义后的实体
    expect(html).not.toContain('&lt;b&gt;');
  });

  it('v-text 仍应转义（与 v-html 区分）', () => {
    const code = ssrCode('<div v-text="raw"></div>');
    expect(code).toContain('escapeHtml(String(_ctx.raw))');
  });

  it('普通插值仍应转义', () => {
    const code = ssrCode('<div>{{ msg }}</div>');
    expect(code).toContain('escapeHtml(');
  });
});
