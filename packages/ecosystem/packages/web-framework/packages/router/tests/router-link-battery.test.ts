// @vitest-environment jsdom
/**
 * 行为级判据：`@lytjs/router` 的 **RouterLink 组件**（`src/components/RouterLink.ts`，125 行）
 *
 * ## 为什么要有这条
 *
 * 覆盖率实测 **0%**（83 条语句一条没跑）。`tests/index.test.ts` 里那段「RouterLink Tests」
 * 实际测的是 `useLink`，组件本身**从未被执行过一次**。
 *
 * 空档里有一条 P1：**render 返回的不是 vnode**，而是一个描述对象
 * `{ tag: 'a', props, children }` —— 渲染器只认带 `type` 的 vnode，
 * 于是 `<RouterLink>` 渲染不出任何东西（或直接崩）。
 * 另有 active 判定用裸 `startsWith`：`to="/"` 在任何路由下都算激活，
 * `to="/user"` 在 `/users/1` 下也误判为激活。
 *
 * ## 手法
 *
 * 不挂 DOM：直接 `setup()` 拿到 render，再用真实 router（memory history）驱动
 * 路由态，断言 render 的**产物**与 `handleClick` 的**副作用**。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RouterLink } from '../src/components/RouterLink';
import { createRouter } from '../src/router';
import { createMemoryHistory } from '../src/history';
import { setCurrentRouter } from '../src/composables/useRouter';
import type { Router } from '../src/types';

type AnyVNode = { type?: unknown; props?: Record<string, unknown>; children?: unknown };

const routes = [
  { path: '/', name: 'home' },
  { path: '/users', name: 'users' },
  { path: '/users/:id', name: 'user-detail' },
];

async function makeRouter(initial = '/') {
  const router = createRouter({ history: createMemoryHistory(initial), routes });
  setCurrentRouter(router as unknown as Router);
  if (initial !== '/') {
    await router.push(initial);
  }
  return router;
}

/** 挂载 RouterLink（不经过渲染器）：返回 render 与 router */
async function setupLink(
  to: string,
  opts: { initial?: string; replace?: boolean; slots?: Record<string, unknown> } = {},
) {
  const router = await makeRouter(opts.initial ?? '/');
  const props = {
    to,
    replace: opts.replace ?? false,
    activeClass: 'router-link-active',
    exactActiveClass: 'router-link-exact-active',
    ariaCurrentValue: 'page',
  };
  const slots = opts.slots ?? { default: () => ['link'] };
  const setup = RouterLink.setup as unknown as (
    p: Record<string, unknown>,
    ctx: { slots: Record<string, unknown> },
  ) => () => unknown;

  const render = setup(props, { slots });
  return { router, render: () => render() as AnyVNode };
}

const classesOf = (vnode: AnyVNode) => String(vnode.props?.class ?? '');

beforeEach(() => {
  vi.restoreAllMocks();
});

// ==================== 产物形状 ====================

describe('render 必须产出真正的 vnode', () => {
  it('★ 返回带 type="a" 的 vnode（而不是 { tag, props, children } 描述对象）', async () => {
    const { render } = await setupLink('/users');
    const vnode = render();

    expect(vnode.type).toBe('a');
  });

  it('href 反映目标路径', async () => {
    const { render } = await setupLink('/users');
    const vnode = render();

    expect(vnode.props?.href).toBe('/users');
  });

  it('query 与 hash 拼进 href', async () => {
    const { render } = await setupLink('/users?page=1#top');
    const vnode = render();

    const href = String(vnode.props?.href);
    expect(href).toContain('/users');
    expect(href).toContain('page=1');
    expect(href).toContain('#top');
  });

  it('默认插槽的内容成为 children', async () => {
    const { render } = await setupLink('/users');
    const vnode = render();

    expect(vnode.children).toEqual(['link']);
  });

  it('没有默认插槽时 children 为空（不崩）', async () => {
    const { render } = await setupLink('/users', { slots: {} });
    const vnode = render();

    expect(vnode.type).toBe('a');
    expect(vnode.children == null || vnode.children === '').toBe(true);
  });
});

// ==================== active 判定 ====================

describe('active / exact-active', () => {
  it('当前就是目标路由 ⇒ 两个 class 都有，aria-current 生效', async () => {
    const { render } = await setupLink('/users', { initial: '/users' });
    const vnode = render();
    const cls = classesOf(vnode);

    expect(cls).toContain('router-link-active');
    expect(cls).toContain('router-link-exact-active');
    expect(vnode.props?.['aria-current']).toBe('page');
  });

  it('子路由下 ⇒ active 有、exact-active 无、aria-current 缺省', async () => {
    const { render } = await setupLink('/users', { initial: '/users/1' });
    const vnode = render();
    const cls = classesOf(vnode);

    expect(cls).toContain('router-link-active');
    expect(cls).not.toContain('router-link-exact-active');
    expect(vnode.props?.['aria-current']).toBeUndefined();
  });

  it('★ 段边界：to="/user" 在 /users/1 下**不得**判为激活', async () => {
    const { render } = await setupLink('/user', { initial: '/users/1' });
    const vnode = render();

    expect(classesOf(vnode)).not.toContain('router-link-active');
  });

  it('★ to="/" 只在首页激活（裸 startsWith 会让它在任何路由下都激活）', async () => {
    const { render } = await setupLink('/', { initial: '/users' });
    const vnode = render();

    expect(classesOf(vnode)).not.toContain('router-link-active');
  });

  it('to="/" 且当前就是 "/" ⇒ 激活', async () => {
    const { render } = await setupLink('/', { initial: '/' });
    const vnode = render();

    expect(classesOf(vnode)).toContain('router-link-exact-active');
  });
});

// ==================== 点击行为 ====================

describe('handleClick', () => {
  const makeEvent = (over: Record<string, unknown> = {}) =>
    ({
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      defaultPrevented: false,
      button: 0,
      preventDefault: vi.fn(),
      ...over,
    }) as unknown as MouseEvent;

  it('普通左键 ⇒ 拦截默认行为并 push', async () => {
    const { render, router } = await setupLink('/users');
    const push = vi.spyOn(router, 'push');
    const ev = makeEvent();

    (render().props?.onClick as (e: MouseEvent) => void)(ev);

    expect(ev.preventDefault).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/users');
  });

  it('replace=true ⇒ 走 replace', async () => {
    const { render, router } = await setupLink('/users', { replace: true });
    const replace = vi.spyOn(router, 'replace');

    (render().props?.onClick as (e: MouseEvent) => void)(makeEvent());

    expect(replace).toHaveBeenCalledWith('/users');
  });

  it('带修饰键 ⇒ 不拦截（让浏览器开新标签页）', async () => {
    const { render } = await setupLink('/users');
    const onClick = render().props?.onClick as (e: MouseEvent) => void;

    for (const key of ['ctrlKey', 'metaKey', 'altKey', 'shiftKey']) {
      const ev = makeEvent({ [key]: true });
      onClick(ev);
      expect(ev.preventDefault).not.toHaveBeenCalled();
    }
  });

  it('已被 preventDefault ⇒ 不重复处理', async () => {
    const { render } = await setupLink('/users');
    const ev = makeEvent({ defaultPrevented: true });

    (render().props?.onClick as (e: MouseEvent) => void)(ev);

    expect(ev.preventDefault).not.toHaveBeenCalled();
  });

  it('非左键（中键 / 右键）⇒ 不拦截', async () => {
    const { render } = await setupLink('/users');
    const onClick = render().props?.onClick as (e: MouseEvent) => void;

    for (const button of [1, 2]) {
      const ev = makeEvent({ button });
      onClick(ev);
      expect(ev.preventDefault).not.toHaveBeenCalled();
    }
  });
});

// ==================== 插槽作用域 ====================

describe('默认插槽拿到 isActive / isExactActive', () => {
  it('当前路由匹配时两个标志都为真', async () => {
    const seen: unknown[] = [];
    const { render } = await setupLink('/users', {
      initial: '/users',
      slots: {
        default: (p?: unknown) => {
          seen.push(p);
          return ['x'];
        },
      },
    });

    render();

    expect(seen[0]).toEqual({ isActive: true, isExactActive: true });
  });
});
