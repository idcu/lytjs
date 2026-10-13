/**
 * P2-4 收敛守卫：dom-runtime 的 sanitizeHTML 必须 === @lytjs/common-security 的实现。
 *
 * 收敛后 dom-runtime 仅「再导出」common-security，本测试同时防两种回退：
 *   1) 有人重新在 dom-runtime 里写一份独立（较弱）实现 → 两份输出会分叉，立即红；
 *   2) common-security 的净化逻辑被削弱（漏掉某类 XSS）→ 显式断言会红。
 */
import { describe, it, expect } from 'vitest';
// 注意：本包内自引用 `@lytjs/dom-runtime` 会落到 stale dist（别名对自包不生效），
// 故用相对路径直接吃 src，与同包其它测试（index / battery）一致。
import { sanitizeHTML as fromDomRuntime } from '../src/index';
import { sanitizeHTML as fromSecurity } from '@lytjs/common-security';

// 覆盖两类实现历史上差异最大的样本：实体解码、危险标签、on*、危险 URI 协议、
// style 标签对、foreignObject、srcdoc / formaction / xlink:href 注入属性。
const XSS_SAMPLES = [
  '<div>safe</div>',
  'plain text',
  '<script>alert(1)</script>',
  '<SCRIPT>alert(1)</SCRIPT>',
  '<div><scr<script>ipt>x</script></div>',
  '<iframe src="evil.com"></iframe><p>safe</p>',
  '<object data="evil.swf"></object>',
  '<embed src="evil.swf">',
  '<form action="evil.com"><input type="text"></form>',
  '<link rel="stylesheet" href="evil.css">',
  '<meta http-equiv="refresh" content="0;url=evil.com">',
  '<base href="https://evil.com/">',
  '<div onclick="evil()">x</div>',
  '<img src="x" onerror="alert(1)">',
  '<div onerror>content</div>',
  '<a href="javascript:alert(1)">x</a>',
  '<img src="javascript:alert(1)">',
  '<a href="java\tscript:alert(1)">x</a>',
  '<a href="data:image/svg+xml,<svg onload=alert(1)>">x</a>',
  '<a href="data:text/html,x">y</a>',
  '<style>body{background:red}</style><p>ok</p>',
  '<foreignObject><img src="x"></foreignObject>',
  '<div srcdoc="<script>alert(1)</script>">x</div>',
  '<button formaction="javascript:alert(1)">x</button>',
  '<div xlink:href="javascript:alert(1)">x</div>',
  '<div style="width: expression(alert(1))">text</div>',
  '<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>',
];

describe('sanitizeHTML: dom-runtime 与 common-security 必须行为一致（P2-4 收敛守卫）', () => {
  for (const sample of XSS_SAMPLES) {
    it(`样本一致: ${sample.slice(0, 48)}`, () => {
      expect(fromDomRuntime(sample)).toBe(fromSecurity(sample));
    });
  }

  it('两份实现为同一引用（再导出，无独立副本）', () => {
    expect(fromDomRuntime).toBe(fromSecurity);
  });
});

describe('sanitizeHTML: 权威行为断言（防止 common-security 被削弱）', () => {
  it('移除 <script> 标签对', () => {
    expect(fromSecurity('<script>alert(1)</script>')).not.toContain('<script');
  });

  it('移除 <style> 标签对（含内容）', () => {
    const r = fromSecurity('<style>x</style><p>ok</p>');
    expect(r).not.toContain('<style');
    expect(r).toContain('<p>ok</p>');
  });

  it('移除 <foreignObject> 标签', () => {
    expect(fromSecurity('<foreignObject><img/></foreignObject>')).not.toContain('foreignObject');
  });

  it('剥离 srcdoc / formaction / xlink:href 注入属性', () => {
    expect(fromSecurity('<div srcdoc="x">y</div>')).not.toContain('srcdoc');
    expect(fromSecurity('<button formaction="x">y</button>')).not.toContain('formaction');
    expect(fromSecurity('<div xlink:href="x">y</div>')).not.toContain('xlink:href');
  });

  it('中和 javascript: / data: 危险 URI 协议', () => {
    expect(fromSecurity('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript:');
    expect(fromSecurity('<a href="data:text/html,x">y</a>')).not.toContain('data:');
  });

  it('保留安全属性与文本', () => {
    const r = fromSecurity('<div class="c" id="m" data-v="1">hi</div>');
    expect(r).toContain('class="c"');
    expect(r).toContain('id="m"');
    expect(r).toContain('data-v="1"');
    expect(r).toContain('hi');
  });
});
