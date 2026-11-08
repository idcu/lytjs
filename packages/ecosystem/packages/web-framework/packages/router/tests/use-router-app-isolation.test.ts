/**
 * S24 模块级可变状态隔离：useRouter 的 currentRouter
 *
 * ## 修复前实测
 *
 * `useRouter` 只读模块级 `currentRouter`（`src/composables/useRouter.ts:7`）。
 * `router.install(app)` 会把 `router` 同时写进 `app.provide('__lytjs_router__')`
 * 和 `currentRouter`，但 `useRouter` 从不看当前组件所属 app 的 provides。
 *
 * 两个 app 同时安装各自 router 时，后安装的会覆盖全局；先安装那个 app 的组件
 * 调 `useRouter()` 拿到的是**另一个 app 的 router**。
 *
 * ## 判据
 *
 * 同时保留两个 app 上下文（provides 里各挂自己的 router），分别把当前组件实例
 * 切到 app A / app B，断言 `useRouter()` 返回各自 app 的 router。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createAppContext, setCurrentInstance } from '@lytjs/component';
import { createRouter } from '../src/router';
import { createMemoryHistory } from '../src/history';
import { useRouter } from '../src/composables/useRouter';

function makeAppWithRouter(path: string) {
  const router = createRouter({
    history: createMemoryHistory(path),
    routes: [{ path: '/', name: 'home' }],
  });
  const context = createAppContext();
  const app = {
    config: { globalProperties: {} as Record<string, unknown> },
    provide(key: string, value: unknown) {
      (context.provides as Record<string, unknown>)[key] = value;
    },
  };
  router.install(app);
  const instance = {
    parent: null,
    provides: Object.create(null) as Record<string, unknown>,
    appContext: context,
  };
  return { router, instance };
}

afterEach(() => {
  setCurrentInstance(null);
});

describe('S24 useRouter 按 app 隔离', () => {
  it('两个 app 同时安装 router，useRouter 返回各自 app 的实例', () => {
    const a = makeAppWithRouter('/a');
    const b = makeAppWithRouter('/b');

    // 修复前：currentRouter 已被 b 覆盖，切到 A 也拿到 b.router —— 第一条断言红
    setCurrentInstance(a.instance as never);
    expect(useRouter()).toBe(a.router);

    setCurrentInstance(b.instance as never);
    expect(useRouter()).toBe(b.router);
  });
});
