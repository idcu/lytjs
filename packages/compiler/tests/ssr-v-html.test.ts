/**
 * SSR 下 v-html 的语义（回归防线）
 *
 * v-html = 输出**原始 HTML**（不是转义成文本）。
 * 此前 SSR 误用 escapeHtml ⇒ `<b>x</b>` 被输出成字面文本，指令完全失效，
 * 且与客户端 setHTML（sanitizeHTML + innerHTML）行为不一致 ⇒ hydration 对不上。
 *
 * 断言方式：注入生产 `sanitizeHTML`（真实实现）执行产物，断言最终 HTML。
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';
import { executeSsr } from './support/execute';

const ssr = (template: string) => executeSsr(compile(template, { ssr: true, ssrMode: true }));

describe('SSR - v-html', () => {
  it('保留 HTML 结构（走 sanitizeHTML，而不是 escapeHtml）', () => {
    expect(ssr('<div v-html="raw"></div>')({ raw: '<b>hi</b>' })).toBe('<div><b>hi</b></div>');
  });

  it('危险属性被 sanitizeHTML 移除（证明不是恒等透传）', () => {
    const html = ssr('<div v-html="raw"></div>')({ raw: '<b onclick="evil()">x</b>' });
    expect(html).toBe('<div><b>x</b></div>');
  });

  it('v-text 仍应转义（与 v-html 区分）', () => {
    expect(ssr('<div v-text="raw"></div>')({ raw: '<b>hi</b>' })).toBe(
      '<div>&lt;b&gt;hi&lt;/b&gt;</div>',
    );
  });

  it('普通插值仍应转义', () => {
    expect(ssr('<div>{{ msg }}</div>')({ msg: '<b>' })).toBe('<div>&lt;b&gt;</div>');
  });
});
