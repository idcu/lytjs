/**
 * @lytjs/html-renderer 测试
 *
 * ## P1-6 回归（2026-10-10）
 *
 * 此前两个用例的断言分别是 `toBeInstanceOf` 与 `expect(typeof renderer).toBe('object')`
 * —— **后者对任何对象都成立**（等于什么都没测），而实现还把整个 config 忽略掉。
 * 现在全部以**产出的 HTML 内容**为判据。
 */
import { describe, it, expect } from 'vitest';
import { HTMLRenderer } from '../src';

describe('@lytjs/html-renderer', () => {
  it('应该创建 HTML 渲染器', () => {
    const renderer = new HTMLRenderer();
    expect(renderer).toBeInstanceOf(HTMLRenderer);
  });

  it('默认骨架应把应用 HTML 放进 body', () => {
    const renderer = new HTMLRenderer();
    const result = renderer.render('<div id="app">hi</div>');

    expect(result.html).toContain('<!DOCTYPE html>');
    expect(result.html).toContain('<div id="app">hi</div>');
    expect(result.body).toBe('<div id="app">hi</div>');
  });

  it('head 配置应真正生成标签（title / meta: / link: / charset）', () => {
    const renderer = new HTMLRenderer({
      head: {
        title: '首页',
        charset: 'utf-8',
        'meta:description': '描述',
        'link:canonical': 'https://example.com/',
        author: 'lytjs',
      },
    });

    const { head, html } = renderer.render('<div>app</div>');

    expect(head).toContain('<title>首页</title>');
    expect(head).toContain('<meta charset="utf-8">');
    expect(head).toContain('<meta name="description" content="描述">');
    expect(head).toContain('<link rel="canonical" href="https://example.com/">');
    expect(head).toContain('<meta name="author" content="lytjs">');
    expect(html).toContain('<title>首页</title>');
  });

  it('head 值必须被转义（防止 SSR 注入）', () => {
    const renderer = new HTMLRenderer({
      head: { title: '</title><script>alert(1)</script>' },
    });

    const { head } = renderer.render('x');

    expect(head).not.toContain('<script>');
    expect(head).toContain('&lt;script&gt;');
  });

  it('bodyAttrs 应真正作用到 body 标签上', () => {
    const renderer = new HTMLRenderer({ bodyAttrs: { class: 'app', 'data-theme': 'dark' } });
    const { html } = renderer.render('x');

    expect(html).toContain('<body class="app" data-theme="dark">');
  });

  it('自定义模板应被使用（{{appHtml}} / {{head}} 占位符）', () => {
    const renderer = new HTMLRenderer({
      template: '<html><head>{{head}}</head><body class="tpl">{{appHtml}}</body></html>',
      head: { title: 'T' },
    });

    const { html } = renderer.render('<main>content</main>');

    expect(html).toContain('<html><head><title>T</title></head>');
    expect(html).toContain('<body class="tpl"><main>content</main></body>');
    expect(html).not.toContain('{{appHtml}}');
  });

  it('template 传非字符串应构造期抛错（此前被静默忽略）', () => {
    expect(() => new HTMLRenderer({ template: ((c: string) => c) as unknown as string })).toThrow(
      /template.*必须是字符串/,
    );
  });
});
