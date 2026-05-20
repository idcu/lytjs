/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
/**
 * @lytjs/ssr - 静态站点生成测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateStaticPages,
  generateRouteManifest,
  validatePages,
  createISRMiddleware,
  revalidateOnDemand,
  getISRCacheStats,
  clearISRCache,
} from '../src/ssg';
import type { SSGPage } from '../src/ssg';

/** 创建测试用 VNode */
function createTestVNode(
  type: string,
  props: Record<string, unknown> | null,
  children?: unknown,
): any {
  return { type, props: props || {}, children: children ?? null };
}

describe('generateStaticPages', () => {
  it('应该返回 Map 实例', () => {
    const pages: SSGPage[] = [{ path: '/', component: createTestVNode('div', null, 'Home') }];
    const result = generateStaticPages(pages);
    expect(result).toBeInstanceOf(Map);
  });

  it('应该为根路径生成 index.html', () => {
    const pages: SSGPage[] = [{ path: '/', component: createTestVNode('div', null, 'Home') }];
    const result = generateStaticPages(pages);

    expect(result.has('/index.html')).toBe(true);
    const html = result.get('/index.html')!;
    expect(html).toContain('Home');
  });

  it('应该为子路径生成正确的文件路径', () => {
    const pages: SSGPage[] = [{ path: '/about', component: createTestVNode('div', null, 'About') }];
    const result = generateStaticPages(pages);

    expect(result.has('/about/index.html')).toBe(true);
    const html = result.get('/about/index.html')!;
    expect(html).toContain('About');
  });

  it('应该生成完整的 HTML 文档', () => {
    const pages: SSGPage[] = [{ path: '/', component: createTestVNode('div', null, 'Content') }];
    const result = generateStaticPages(pages);
    const html = result.get('/index.html')!;

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="zh-CN">');
    expect(html).toContain('<head>');
    expect(html).toContain('<meta charset="UTF-8">');
    expect(html).toContain('<body>');
    expect(html).toContain('<div id="app">');
  });

  it('应该使用页面自定义标题', () => {
    const pages: SSGPage[] = [
      {
        path: '/',
        component: createTestVNode('div', null, 'Home'),
        head: { title: '自定义标题' },
      },
    ];
    const result = generateStaticPages(pages);
    const html = result.get('/index.html')!;

    expect(html).toContain('<title>自定义标题</title>');
  });

  it('应该使用默认标题当页面未设置标题时', () => {
    const pages: SSGPage[] = [{ path: '/', component: createTestVNode('div', null, 'Home') }];
    const result = generateStaticPages(pages, { defaultTitle: '默认站点' });
    const html = result.get('/index.html')!;

    expect(html).toContain('<title>默认站点</title>');
  });

  it('应该生成 meta 标签', () => {
    const pages: SSGPage[] = [
      {
        path: '/',
        component: createTestVNode('div', null, 'Home'),
        head: {
          title: '测试页',
          meta: {
            description: '这是一个测试页面',
            keywords: 'lytjs,ssr',
          },
        },
      },
    ];
    const result = generateStaticPages(pages);
    const html = result.get('/index.html')!;

    expect(html).toContain('<meta name="description" content="这是一个测试页面">');
    expect(html).toContain('<meta name="keywords" content="lytjs,ssr">');
  });

  it('应该正确处理多个页面', () => {
    const pages: SSGPage[] = [
      { path: '/', component: createTestVNode('div', null, 'Home') },
      { path: '/about', component: createTestVNode('div', null, 'About') },
      { path: '/contact', component: createTestVNode('div', null, 'Contact') },
    ];
    const result = generateStaticPages(pages);

    expect(result.size).toBe(3);
    expect(result.has('/index.html')).toBe(true);
    expect(result.has('/about/index.html')).toBe(true);
    expect(result.has('/contact/index.html')).toBe(true);
  });

  it('应该规范化不以 / 开头的路径', () => {
    const pages: SSGPage[] = [{ path: 'about', component: createTestVNode('div', null, 'About') }];
    const result = generateStaticPages(pages);

    expect(result.has('/about/index.html')).toBe(true);
  });

  it('应该去除路径末尾的 /', () => {
    const pages: SSGPage[] = [
      { path: '/about/', component: createTestVNode('div', null, 'About') },
    ];
    const result = generateStaticPages(pages);

    expect(result.has('/about/index.html')).toBe(true);
  });

  it('应该支持自定义语言设置', () => {
    const pages: SSGPage[] = [{ path: '/', component: createTestVNode('div', null, 'Home') }];
    const result = generateStaticPages(pages, { lang: 'en-US' });
    const html = result.get('/index.html')!;

    expect(html).toContain('<html lang="en-US">');
  });

  it('应该正确处理空页面数组', () => {
    const result = generateStaticPages([]);
    expect(result.size).toBe(0);
  });
});

describe('generateRouteManifest', () => {
  it('应该生成路由清单数组', () => {
    const pages: SSGPage[] = [
      { path: '/', component: createTestVNode('div', null, 'Home') },
      { path: '/about', component: createTestVNode('div', null, 'About') },
    ];
    const manifest = generateRouteManifest(pages);

    expect(manifest).toHaveLength(2);
    expect(manifest[0].path).toBe('//');
    expect(manifest[0].filePath).toBe('/index.html');
    expect(manifest[1].path).toBe('//about');
    expect(manifest[1].filePath).toBe('/about/index.html');
  });

  it('应该包含页面标题', () => {
    const pages: SSGPage[] = [
      {
        path: '/',
        component: createTestVNode('div', null, 'Home'),
        head: { title: '首页' },
      },
    ];
    const manifest = generateRouteManifest(pages);

    expect(manifest[0].title).toBe('首页');
  });

  it('应该使用自定义 baseUrl', () => {
    const pages: SSGPage[] = [{ path: '/about', component: createTestVNode('div', null, 'About') }];
    const manifest = generateRouteManifest(pages, 'https://example.com');

    expect(manifest[0].path).toBe('https://example.com/about');
  });
});

describe('validatePages', () => {
  it('应该对合法页面返回空错误数组', () => {
    const pages: SSGPage[] = [{ path: '/', component: createTestVNode('div', null, 'Home') }];
    const errors = validatePages(pages);
    expect(errors).toHaveLength(0);
  });

  it('应该检测缺失 path 的页面', () => {
    const pages = [{ component: createTestVNode('div', null, 'Home') }] as SSGPage[];
    const errors = validatePages(pages);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('path');
  });

  it('应该检测缺失 component 的页面', () => {
    const pages = [{ path: '/' }] as SSGPage[];
    const errors = validatePages(pages);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('component');
  });

  it('应该检测不以 / 开头的路径', () => {
    const pages: SSGPage[] = [{ path: 'invalid', component: createTestVNode('div', null, 'Test') }];
    const errors = validatePages(pages);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('/');
  });

  it('应该同时报告多个错误', () => {
    const pages = [{ path: 'bad-path' }, { path: '/' }] as SSGPage[];
    const errors = validatePages(pages);
    // 第一个页面：路径不以 / 开头 + 缺失 component
    // 第二个页面：缺失 component
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe('ISR (Incremental Static Regeneration)', () => {
  beforeEach(() => {
    clearISRCache();
  });

  describe('ISR 缓存管理', () => {
    it('应该返回空的缓存统计信息', () => {
      const stats = getISRCacheStats();
      expect(stats).toBeDefined();
      expect(stats.total).toBe(0);
      expect(stats.paths).toEqual([]);
    });

    it('应该能够清除缓存', () => {
      // 先创建一些缓存（通过中间件）
      const pages = new Map([['/index.html', '<html></html>']]);
      const middleware = createISRMiddleware({ staticPages: pages });

      // 调用一下中间件会初始化缓存
      const mockReq = { path: '/' };
      const mockRes = {
        setHeader: () => {},
        send: () => {},
      };

      middleware(mockReq as any, mockRes as any, () => {});

      const statsBefore = getISRCacheStats();
      expect(statsBefore.total).toBeGreaterThan(0);

      clearISRCache();

      const statsAfter = getISRCacheStats();
      expect(statsAfter.total).toBe(0);
    });
  });

  describe('createISRMiddleware', () => {
    it('应该创建 ISR 中间件函数', () => {
      const pages = new Map();
      const middleware = createISRMiddleware({ staticPages: pages });
      expect(typeof middleware).toBe('function');
    });

    it('应该初始化 ISR 缓存', () => {
      const pages = new Map([
        ['/index.html', '<html>Home</html>'],
        ['/about/index.html', '<html>About</html>'],
      ]);

      createISRMiddleware({ staticPages: pages });

      const stats = getISRCacheStats();
      expect(stats.total).toBe(2);
      expect(stats.paths).toContain('/index.html');
      expect(stats.paths).toContain('/about/index.html');
    });

    it('应该支持禁用 ISR', () => {
      const pages = new Map([['/index.html', '<html>Home</html>']]);
      let nextCalled = false;

      const middleware = createISRMiddleware({
        staticPages: pages,
        enabled: false,
      });

      const mockReq = { path: '/' };
      const mockRes = {};
      const mockNext = () => {
        nextCalled = true;
      };

      middleware(mockReq as any, mockRes as any, mockNext);

      expect(nextCalled).toBe(true);
    });
  });

  describe('revalidateOnDemand', () => {
    it('应该能够按需重新验证页面', async () => {
      let regenerateCalled = false;
      const testPath = '/page/index.html';
      const regenerateFn = async () => {
        regenerateCalled = true;
        return '<html>New Content</html>';
      };

      // 先设置缓存
      const pages = new Map([[testPath, '<html>Old Content</html>']]);
      createISRMiddleware({ staticPages: pages });

      // 执行重新验证
      const result = await revalidateOnDemand(testPath, regenerateFn);

      expect(regenerateCalled).toBe(true);
      expect(result).toBe('<html>New Content</html>');
    });

    it('应该处理重新验证过程中的错误', async () => {
      const testPath = '/error/index.html';
      const regenerateFn = async () => {
        throw new Error('Revalidation failed');
      };

      // 先设置缓存
      const pages = new Map([[testPath, '<html>Content</html>']]);
      createISRMiddleware({ staticPages: pages });

      // 应该抛出错误
      await expect(revalidateOnDemand(testPath, regenerateFn)).rejects.toThrow(
        'Revalidation failed',
      );
    });
  });
});
