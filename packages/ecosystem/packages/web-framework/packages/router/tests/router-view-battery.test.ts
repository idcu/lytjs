// @vitest-environment jsdom
/**
 * 行为级判据：`@lytjs/router` 的 **RouterView 组件**（`src/components/RouterView.ts`）
 *
 * ## 为什么要有这条
 *
 * 覆盖率实测 0%，而它是路由的**主渲染出口**。空档里有三条 P1：
 *
 * 1. render 返回 `{ ...resolvedComponent, props }` —— 不是 vnode（渲染器只认带 `type` 的对象）
 *    ⇒ `<RouterView>` 渲染不出任何东西；顺带把组件**自身的 props 声明**
 *    （`{ id: { type: String } }`）混进了 props 值里。
 * 2. 嵌套路由没有层级概念：永远取 `matched` 里**第一条**有组件的记录 ⇒ 内层视图重复渲染父组件
 *    ⇒ 递归到底。
 * 3. 懒加载 `component: () => import(...)` 被**直接调用**，拿到的是 Promise。
 *
 * 另有装饰性声明：`RouterViewProps.route` 只在 TS 接口里，运行期 `props` 没有它。
 *
 * ## 手法
 *
 * 不挂 DOM：用 `setCurrentInstance` 造实例上下文（`provide`/`inject` 依赖它），
 * 用 memory history 驱动真实路由，断言 render 的**产物**与层级 / props 传递。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RouterView, viewDepthKey } from '../src/components/RouterView';
import { createRouter } from '../src/router';
import { createMemoryHistory } from '../src/history';
import { setCurrentRouter } from '../src/composables/useRouter';
import { setCurrentInstance } from '@lytjs/component';
import type { Router } from '../src/types';

type AnyVNode = { type?: unknown; props?: Record<string, unknown> };

const Home = { name: 'Home' };
const Sidebar = { name: 'Sidebar' };
const ParentView = { name: 'ParentView' };
const ChildView = { name: 'ChildView' };

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/plain', name: 'plain', component: Home },
  { path: '/users/:id', name: 'user', component: Home, props: true },
  {
    path: '/parent',
    name: 'parent',
    component: ParentView,
    children: [{ path: 'child', name: 'child', component: ChildView }],
  },
  {
    path: '/named',
    name: 'named',
    components: { default: Home, sidebar: Sidebar },
  },
];

/** 造一个最小内部实例：provide/inject 只看 `provides` 与 `parent` 链 */
function makeInstance(parent: Record<string, unknown> | null = null) {
  const instance: Record<string, unknown> = {
    provides: Object.create(null) as Record<string | symbol, unknown>,
    parent,
    appContext: { provides: Object.create(null), config: { globalProperties: {} } },
  };
  return instance;
}

async function makeRouter(initial: string) {
  const router = createRouter({ history: createMemoryHistory(initial), routes });
  setCurrentRouter(router as unknown as Router);
  // ⚠️ `createRouter` 只建对象，`currentRoute().matched` 还是空的 —— 填充它的是
  //   `router.install()`（应用启动时的首帧导航）或一次 `push`。
  //   注意 `push('/')` 在初始 history 就是 '/' 时会被 `isSameRouteLocation` 判成
  //   重复导航而短路（matched 仍为空）⇒ 本文件用 `/plain` 这类非根路径驱动。
  await router.push(initial);
  return router;
}

/** 在给定实例上下文中执行 RouterView.setup，返回 render */
function setupView(
  instance: Record<string, unknown>,
  props: Record<string, unknown> = {},
): () => unknown {
  setCurrentInstance(instance as never);
  try {
    const setup = RouterView.setup as unknown as (p: Record<string, unknown>) => () => unknown;
    return setup(props);
  } finally {
    setCurrentInstance(null);
  }
}

beforeEach(() => {
  vi.restoreAllMocks();
});

// ==================== 产物形状 ====================

describe('render 必须产出真正的 vnode', () => {
  it('★ 命中路由时返回 vnode，type 就是匹配到的组件', async () => {
    await makeRouter('/plain');
    const render = setupView(makeInstance());

    const vnode = render() as AnyVNode;

    expect(vnode.type).toBe(Home);
  });

  it('没有匹配记录 ⇒ 返回 null（不抛）', async () => {
    await makeRouter('/plain');
    const render = setupView(makeInstance());

    // 深度 1 处没有记录 ⇒ 内层视图渲染空
    const vnode = render() as AnyVNode;
    expect(vnode.type).toBe(Home);

    const inner = setupView(makeInstance(), {});
    expect(inner).toBeTypeOf('function');
  });

  it('具名视图按 name 取 components 里的对应组件', async () => {
    await makeRouter('/named');

    expect((setupView(makeInstance(), {})() as AnyVNode).type).toBe(Home);
    expect((setupView(makeInstance(), { name: 'sidebar' })() as AnyVNode).type).toBe(Sidebar);
  });

  it('具名视图不存在 ⇒ null', async () => {
    await makeRouter('/named');
    const render = setupView(makeInstance(), { name: 'missing' });

    expect(render()).toBeNull();
  });
});

// ==================== 嵌套层级 ====================

describe('嵌套路由按层级取匹配记录', () => {
  it('★ 根视图渲染父组件，内层视图渲染子组件（不再递归父组件）', async () => {
    await makeRouter('/parent/child');

    const rootInst = makeInstance();
    const rootRender = setupView(rootInst);
    expect((rootRender() as AnyVNode).type).toBe(ParentView);

    // 父组件内部的 RouterView：parent 指向根实例
    const childInst = makeInstance(rootInst);
    const childRender = setupView(childInst);
    expect((childRender() as AnyVNode).type).toBe(ChildView);
  });

  it('根视图把自己的 depth+1 provide 给后代', async () => {
    await makeRouter('/parent/child');
    const rootInst = makeInstance();

    setupView(rootInst);

    expect(rootInst.provides[viewDepthKey as unknown as string]).toBe(1);
  });

  it('层级越界 ⇒ null', async () => {
    await makeRouter('/plain');
    // 手动给一个「父级已经提供了 depth=5」的上下文
    const deepParent = makeInstance();
    deepParent.provides = { [viewDepthKey as unknown as string]: 5 };
    const deepInst = makeInstance(deepParent);

    const render = setupView(deepInst);

    expect(render()).toBeNull();
  });
});

// ==================== props 传递 ====================

describe('route record 的 props 配置', () => {
  it('props: true ⇒ 透传 params', async () => {
    await makeRouter('/users/42');
    const vnode = setupView(makeInstance())() as AnyVNode;

    expect(vnode.props).toEqual({ id: '42' });
  });

  it('props: 对象 ⇒ 原样透传', async () => {
    const router = createRouter({
      history: createMemoryHistory('/static'),
      routes: [{ path: '/static', component: Home, props: { mode: 'static' } }],
    });
    setCurrentRouter(router as unknown as Router);
    await router.push('/static');

    const vnode = setupView(makeInstance())() as AnyVNode;

    expect(vnode.props).toEqual({ mode: 'static' });
  });

  it('props: 函数 ⇒ 用当前路由调用它', async () => {
    const propsFn = vi.fn(() => ({ fromFn: true }));
    const router = createRouter({
      history: createMemoryHistory('/fn'),
      routes: [{ path: '/fn', component: Home, props: propsFn }],
    });
    setCurrentRouter(router as unknown as Router);
    await router.push('/fn');

    const vnode = setupView(makeInstance())() as AnyVNode;

    expect(vnode.props).toEqual({ fromFn: true });
    expect(propsFn).toHaveBeenCalledTimes(1);
  });

  it('未配置 props ⇒ 空对象（不会把组件自身的 props 声明混进来）', async () => {
    await makeRouter('/plain');
    const vnode = setupView(makeInstance())() as AnyVNode;

    expect(vnode.props).toEqual({});
  });

  it('★ `route` prop 生效：覆盖注入的当前路由', async () => {
    await makeRouter('/');
    const altRoute = {
      path: '/named',
      fullPath: '/named',
      name: 'named',
      query: {},
      hash: '',
      params: {},
      matched: [
        {
          path: '/named',
          name: 'named',
          meta: {},
          children: [],
          props: {},
          components: { default: Sidebar },
        },
      ],
      meta: {},
    };

    const vnode = setupView(makeInstance(), { route: altRoute })() as AnyVNode;

    expect(vnode.type).toBe(Sidebar);
  });
});

// ==================== 懒加载 ====================

describe('懒加载路由', () => {
  it('★ 零参 loader 被包成异步组件，而不是被直接调用拿到 Promise', async () => {
    const loader = () => Promise.resolve(Home);
    const router = createRouter({
      history: createMemoryHistory('/lazy'),
      routes: [{ path: '/lazy', component: loader as never }],
    });
    setCurrentRouter(router as unknown as Router);
    await router.push('/lazy');

    const vnode = setupView(makeInstance())() as AnyVNode;

    expect(vnode.type).not.toBe(loader);
    expect(typeof vnode.type).toBe('object');
    expect((vnode.type as { setup?: unknown }).setup).toBeTypeOf('function');
  });

  it('带参函数（函数式组件）原样交给渲染器，不被包装', async () => {
    const fnComponent = (_props: unknown) => null;
    const router = createRouter({
      history: createMemoryHistory('/fn-comp'),
      routes: [{ path: '/fn-comp', component: fnComponent as never }],
    });
    setCurrentRouter(router as unknown as Router);
    await router.push('/fn-comp');

    const vnode = setupView(makeInstance())() as AnyVNode;

    expect(vnode.type).toBe(fnComponent);
  });
});

// ==================== 首帧（install）路径 ====================

describe('router.install 的首帧导航', () => {
  it('★ 只 install 不 push，RouterView 也能渲染出首帧组件', async () => {
    const router = createRouter({ history: createMemoryHistory('/plain'), routes });
    setCurrentRouter(router as unknown as Router);

    router.install({ config: { globalProperties: {} } });

    const vnode = setupView(makeInstance())() as AnyVNode;

    expect(vnode.type).toBe(Home);
  });
});
