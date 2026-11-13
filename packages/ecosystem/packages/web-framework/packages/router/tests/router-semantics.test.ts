/**
 * 路由语义回归（2026-11-04）
 *
 * 与门禁 `scripts/check-router-semantics.mjs` 的分工：
 * · 门禁跑的是 **dist**（消费视角，含构建期常量替换）；
 * · 本文件跑 **src**，把每条规则钉在实现层，便于定位。
 *
 * 这 6 条的共同点：**页面能打开、只是不对** —— 不抛异常，肉眼验收容易被当成「我配错了」。
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRouter } from '../src/router';
import { createMemoryHistory } from '../src/history';
import { comparePriority, priorityOf, tokenizePath, parseQuery } from '../src/matcher';
import { setCurrentRouter } from '../src/composables/useRouter';
import { useLink } from '../src/composables/useLink';

const mk = (routes: unknown[], path = '/') =>
  createRouter({ history: createMemoryHistory(path), routes: routes as never });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('路由优先级：逐段字典序（不是分数求和）', () => {
  it('priorityOf / comparePriority 的基本方向', () => {
    const staticFirst = priorityOf(tokenizePath('/a/b/*'));
    const params = priorityOf(tokenizePath('/a/:x/:y'));
    // 第 2 段 3(static) > 2(param) ⇒ 通配符路由更具体（此前的「求和」判反了）
    expect(comparePriority(staticFirst, params)).toBeGreaterThan(0);
    // 反向对照：第 3 段 2(param) > 0(wildcard)
    expect(comparePriority(priorityOf(tokenizePath('/a/:x/:y')), staticFirst)).toBeLessThan(0);
  });

  it('★ /a/b/d 命中 /a/b/*，而不是 /a/:x/:y（旧行为：后者 3+2+2=7 压过 3+3+0=6）', async () => {
    const router = mk([
      { path: '/a/b/*', component: { name: 'Wild' }, name: 'wild' },
      { path: '/a/:x/:y', component: { name: 'Params' }, name: 'params' },
    ]);
    await router.push('/a/b/d');
    expect(router.currentRoute().name).toBe('wild');
    expect(router.currentRoute().params['*']).toBe('d');
  });

  it('静态段优先于参数段', async () => {
    const router = mk([
      { path: '/a/:x', component: { name: 'P' }, name: 'p' },
      { path: '/a/b', component: { name: 'S' }, name: 's' },
    ]);
    await router.push('/a/b');
    expect(router.currentRoute().name).toBe('s');
  });
});

describe('记录级重定向（此前类型里有、实现里没有）', () => {
  it('字符串形式：/old ⇒ /new', async () => {
    const router = mk([
      { path: '/old', redirect: '/new' },
      { path: '/new', component: { name: 'New' }, name: 'new' },
    ]);
    const failure = await router.push('/old');
    expect(router.currentRoute().path).toBe('/new');
    expect(failure?.type).toBe(8); // redirected
  });

  it('函数形式可以带参数与 query', async () => {
    const router = mk([
      { path: '/u/:id', component: { name: 'U' }, name: 'u' },
      {
        path: '/legacy/:id',
        redirect: (to: { params: Record<string, string> }) => ({
          name: 'u',
          params: { id: to.params.id },
        }),
      },
    ]);
    await router.push('/legacy/7');
    expect(router.currentRoute().path).toBe('/u/7');
    expect(router.currentRoute().params).toEqual({ id: '7' });
  });

  it('重定向目标的守卫照常执行', async () => {
    const seen: string[] = [];
    const router = mk([
      { path: '/old', redirect: '/target' },
      { path: '/target', component: { name: 'T' } },
    ]);
    router.beforeEach((to) => {
      seen.push(to.path);
    });
    await router.push('/old');
    expect(seen).toEqual(['/target']);
  });

  it('重定向循环有上限（不挂死）', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const router = mk([
      { path: '/l1', redirect: '/l2' },
      { path: '/l2', redirect: '/l1' },
    ]);
    await Promise.race([
      router.push('/l1'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('HANG')), 1000)),
    ]);
    expect(errorSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('重定向超过');
  });
});

describe('嵌套路由', () => {
  it('★ 默认子路由（path: ""）命中子路由，而不是父路由', async () => {
    const router = mk([
      {
        path: '/parent/:pid',
        component: { name: 'Parent' },
        children: [
          { path: '', component: { name: 'ChildIndex' }, name: 'childIndex' },
          { path: 'detail/:cid', component: { name: 'ChildDetail' }, name: 'childDetail' },
        ],
      },
    ]);
    await router.push('/parent/1');
    expect(router.currentRoute().name).toBe('childIndex');
    expect(router.currentRoute().matched).toHaveLength(2);
  });

  it('普通子路由与父子参数', async () => {
    const router = mk([
      {
        path: '/p/:pid',
        component: { name: 'P' },
        children: [{ path: 'd/:cid', component: { name: 'D' }, name: 'd' }],
      },
    ]);
    await router.push('/p/1/d/2');
    expect(router.currentRoute().params).toEqual({ pid: '1', cid: '2' });
    expect(router.currentRoute().matched).toHaveLength(2);
  });
});

describe('初始导航（install）', () => {
  it('★ 走守卫链：初始重定向生效（此前完全绕过）', async () => {
    const router = mk(
      [
        { path: '/private', component: { name: 'Private' } },
        { path: '/login', component: { name: 'Login' } },
      ],
      '/private',
    );
    const seen: string[] = [];
    router.beforeEach((to) => {
      seen.push(to.path);
      return to.path === '/private' ? '/login' : true;
    });

    router.install({ config: { globalProperties: {} }, provide() {} } as never);
    await router.isReady();

    expect(seen).toContain('/private');
    expect(router.currentRoute().path).toBe('/login');
  });

  it('无守卫时保持同步首帧（不能为了修守卫让每个应用首帧空白）', () => {
    const router = mk([{ path: '/plain', component: { name: 'P' }, name: 'plain' }], '/plain');
    router.install({ config: { globalProperties: {} }, provide() {} } as never);
    // 同步断言：install 返回时路由已就绪
    expect(router.currentRoute().name).toBe('plain');
    expect(router.currentRoute().matched).toHaveLength(1);
  });
});

describe('query 语义', () => {
  it('`+` 解成空格，`%2B` 解成加号', () => {
    expect(parseQuery('q=a+b')).toEqual({ q: 'a b' });
    expect(parseQuery('q=a%2Bb')).toEqual({ q: 'a+b' });
  });

  it('重复 key / 无值 / 空值', () => {
    expect(parseQuery('a=1&a=2')).toEqual({ a: ['1', '2'] });
    expect(parseQuery('flag')).toEqual({ flag: null });
    expect(parseQuery('empty=')).toEqual({ empty: '' });
  });

  it('畸形转义不抛（保留原串）', () => {
    expect(parseQuery('q=%zz')).toEqual({ q: '%zz' });
  });

  it('★ 值里含 `=` 时不截断（?token=a=b）', () => {
    // 负控：`pair.split('=')` 会丢掉第二个 `=` 之后的内容
    expect(parseQuery('token=a=b')).toEqual({ token: 'a=b' });
    expect(parseQuery('a=1&next=x=y=z')).toEqual({ a: '1', next: 'x=y=z' });
    // 键为空 / 纯等号仍保持原语义
    expect(parseQuery('=v')).toEqual({ '': 'v' });
  });
});

describe('命名路由参数编码', () => {
  it('★ encode 后再 decode 往返不丢字符（/ 空格 中文 %）', async () => {
    const router = mk([
      { path: '/files/:name', component: { name: 'F' }, name: 'file' },
      { path: '/files/:name/detail', component: { name: 'FD' }, name: 'detail' },
    ]);

    for (const raw of ['a/b', 'a b', '中文 路径', '100%', '%2F']) {
      const resolved = router.resolve({ name: 'file', params: { name: raw } });

      // 编码方向：`/` 必须变成 %2F，否则会被当成新的路径段（逃逸到别的路由）
      expect(resolved.path).toBe(`/files/${encodeURIComponent(raw)}`);

      await router.push({ name: 'file', params: { name: raw } });

      // 解码方向：最终 params 必须还原成原文
      expect(router.currentRoute().name).toBe('file');
      expect(router.currentRoute().params.name).toBe(raw);
      expect(router.currentRoute().path).toBe(`/files/${encodeURIComponent(raw)}`);
    }
  });
});

describe('并发导航', () => {
  it('★ 守卫未完成时发起的第二次 push 不能被吞掉', async () => {
    const router = mk([
      { path: '/a', component: { name: 'A' }, name: 'a' },
      { path: '/b', component: { name: 'B' }, name: 'b' },
    ]);

    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let first = true;
    router.beforeEach(async () => {
      if (first) {
        first = false;
        await gate;
      }
      return true;
    });

    const firstNav = router.push('/a');
    const secondNav = router.push('/b');
    release();
    await Promise.all([firstNav, secondNav]);

    // 负控：旧实现直接返回第一次的 Promise ⇒ 最终停在 /a，/b 被静默丢弃
    expect(router.currentRoute().path).toBe('/b');
  });
});

describe('未匹配路径', () => {
  it('给出可操作的告警（此前完全静默）', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const router = mk([{ path: '/x', component: { name: 'X' } }]);
    await router.push('/x');
    const failure = await router.push('/typo');
    expect(warnSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('/typo');
    expect(failure?.type).toBe(1); // aborted
    expect(router.currentRoute().path).toBe('/x');
  });

  it('catch-all 路由可用（404 页面的前提）', async () => {
    const router = mk([
      { path: '/', component: { name: 'Home' } },
      { path: '/*', component: { name: 'NF' }, name: 'nf' },
    ]);
    await router.push('/a/b/c');
    expect(router.currentRoute().name).toBe('nf');
    expect(router.currentRoute().params['*']).toBe('a/b/c');
  });
});

describe('链接语义（useLink）', () => {
  it('★ 命名路由的 href（此前拼成当前页面）', async () => {
    const router = mk([
      { path: '/', component: { name: 'Home' } },
      { path: '/user/:id', component: { name: 'User' }, name: 'user' },
    ]);
    setCurrentRouter(router as never);
    await router.push('/');
    const link = useLink({ to: { name: 'user', params: { id: 7 } } });
    expect(link.href()).toBe('/user/7');
  });

  it('★ `/user` 链接在 `/username` 页面不高亮（此前按字符串前缀判 active）', async () => {
    const router = mk([
      { path: '/user', component: { name: 'U' } },
      { path: '/username', component: { name: 'UN' } },
    ]);
    setCurrentRouter(router as never);
    await router.push('/username');
    expect(useLink({ to: '/user' }).isActive()).toBe(false);
  });

  it('嵌套路由：父路由在子路由页面上高亮，isExactActive 只对完全相同为真', async () => {
    const router = mk([
      {
        path: '/admin',
        component: { name: 'Admin' },
        children: [{ path: 'users', component: { name: 'Users' }, name: 'adminUsers' }],
      },
    ]);
    setCurrentRouter(router as never);
    await router.push('/admin/users');
    expect(useLink({ to: '/admin' }).isActive()).toBe(true);
    expect(useLink({ to: '/admin' }).isExactActive()).toBe(false);
    expect(useLink({ to: '/admin/users' }).isExactActive()).toBe(true);
  });
});

describe('公开 API', () => {
  it('resolve：命名路由 + 未匹配也返回位置', () => {
    const router = mk([
      { path: '/u/:id', component: { name: 'U' }, name: 'u', meta: { auth: true } },
    ]);
    const resolved = router.resolve({ name: 'u', params: { id: '3' }, query: { q: 'x' } });
    expect(resolved.path).toBe('/u/3');
    expect(resolved.fullPath).toBe('/u/3?q=x');
    expect(resolved.params).toEqual({ id: '3' });
    expect(resolved.meta).toEqual({ auth: true });

    const miss = router.resolve('/nope');
    expect(miss.path).toBe('/nope');
    expect(miss.matched).toHaveLength(0);
  });

  it('getRoutes / hasRoute', () => {
    const router = mk([
      { path: '/a', component: { name: 'A' }, name: 'a' },
      { path: '/b', component: { name: 'B' }, name: 'b' },
    ]);
    expect(router.getRoutes()).toHaveLength(2);
    expect(router.hasRoute('a')).toBe(true);
    expect(router.hasRoute('nope')).toBe(false);
  });

  it('★ alias：按别名访问命中同一条记录', async () => {
    const router = mk([
      { path: '/main', component: { name: 'Main' }, name: 'main', alias: '/alias' },
    ]);
    await router.push('/alias');
    expect(router.currentRoute().name).toBe('main');
    expect(router.currentRoute().path).toBe('/alias');
    expect(router.currentRoute().matched).toHaveLength(1);
  });

  it('动态路由：addRoute 返回移除函数 / removeRoute / clearRoutes', async () => {
    const router = mk([{ path: '/', component: { name: 'Home' }, name: 'home' }]);
    const remove = router.addRoute({
      path: '/admin',
      component: { name: 'Admin' },
      name: 'admin',
    });
    expect(router.hasRoute('admin')).toBe(true);
    await router.push('/admin');
    expect(router.currentRoute().name).toBe('admin');

    remove();
    expect(router.hasRoute('admin')).toBe(false);
    expect(router.removeRoute('home')).toBe(true);
    router.clearRoutes();
    expect(router.getRoutes()).toHaveLength(0);
  });
});
