/**
 * SSG renderMetaTags XSS 防护测试
 *
 * 验证 `head.meta` 的 `name` 与 `content` 在拼入 `<meta name="..." content="...">` 前，
 * 经 escapeAttrValue 做属性上下文转义（`"` 跳出属性、`=` 注入均被中和），
 * 不会被调用方传入的 `<script>` / 属性跳出字符执行或破坏结构。
 *
 * 硬约束 #9 视角：本测试即「翻转保护 ⇒ 变红」的产物级断言——
 * 若将 ssg.ts 的 renderMetaTags 改回未转义的模板拼接，下方两条断言立即失败（红）。
 */
import { describe, it, expect } from 'vitest';
import { generateStaticPages } from './ssg';

// 最小合法元素 VNode（renderToString 仅依赖 type/props/children）
const divVNode = { type: 'div', props: {}, children: 'Home' } as never;

describe('ssg - renderMetaTags XSS 防护', () => {
  it('meta 的 name/content 被属性转义，无法跳出属性注入 <script>', () => {
    const pages = [
      {
        path: '/',
        component: divVNode,
        head: {
          title: '首页',
          meta: {
            description: '正常描述',
            // 恶意 name：含跳出属性的引号
            'a"b': 'x',
            // 恶意 content：属性跳出 + 脚本注入
            evil: '""><script>alert(1)</script>',
          },
        },
      },
    ];
    const result = generateStaticPages(pages);
    const html = result.get('/index.html')!;

    // 关键 1：原始属性跳出字符不应出现在产出 HTML 中（已被转义）
    expect(html).not.toContain('"><script>');
    // 关键 2：不存在可被浏览器解析执行的注入脚本
    expect(html).not.toMatch(/<script>alert\(1\)<\/script>/);
    // 转义产物应存在
    expect(html).toContain('&quot;');
    expect(html).toContain('&lt;script&gt;');
    // 危险 name 的引号同样被转义（a"b → a&quot;b）
    expect(html).toContain('a&quot;b');
  });

  it('普通 meta 仍正常输出', () => {
    const pages = [
      {
        path: '/about',
        component: divVNode,
        head: { title: '关于', meta: { description: '关于我们', keywords: 'lytjs,ssr' } },
      },
    ];
    const html = generateStaticPages(pages).get('/about/index.html')!;
    expect(html).toContain('<meta name="description" content="关于我们">');
    expect(html).toContain('<meta name="keywords" content="lytjs,ssr">');
  });
});
