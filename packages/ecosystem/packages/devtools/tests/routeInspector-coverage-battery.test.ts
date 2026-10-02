/**
 * devtools/routeInspector 覆盖率电池（Task C）：补齐未注册路由器、
 * 路由对象字段缺省（`||` 回退）、afterEach 监听开关与导航封装分支。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerRouter,
  unregisterRouter,
  getCurrentRoute,
  getRouteHistory,
  watchRouteChanges,
  unwatchRouteChanges,
  navigateTo,
  navigateToName,
  goBack,
  serializeRouteInfo,
  getRoutes,
  isRouterRegistered,
  clearRouteHistory,
} from '../src/routeInspector';

let afterEachCb: ((to: unknown) => void) | null = null;

function makeRouter(overrides: Record<string, unknown> = {}) {
  return {
    currentRoute: () => ({}),
    afterEach: (cb: (to: unknown) => void) => {
      afterEachCb = cb;
      return () => {};
    },
    push: () => Promise.resolve(),
    back: () => Promise.resolve(),
    getRoutes: () => [{}],
    ...overrides,
  } as never;
}

describe('routeInspector battery', () => {
  beforeEach(() => {
    unregisterRouter();
    clearRouteHistory();
    afterEachCb = null;
  });

  it('returns null / empty when no router is registered', () => {
    expect(isRouterRegistered()).toBe(false);
    expect(getCurrentRoute()).toBeNull();
    expect(getRoutes()).toEqual([]);
    expect(watchRouteChanges()).toBe(false);
    expect(serializeRouteInfo(null)).toBe('No route information available');
  });

  it('covers the currentRoute() undefined branch', () => {
    registerRouter(makeRouter({ currentRoute: () => undefined }));
    expect(isRouterRegistered()).toBe(true);
    expect(getCurrentRoute()).toBeNull();
  });

  it('fills defaults for a sparse current route', () => {
    registerRouter(makeRouter({ currentRoute: () => ({ matched: [{}] }) }));
    expect(getCurrentRoute()).toEqual({
      path: '/',
      name: null,
      params: {},
      query: {},
      matched: [{ path: '', name: null }],
    });
  });

  it('requires an afterEach function to watch', () => {
    registerRouter(makeRouter({ afterEach: undefined }));
    expect(watchRouteChanges()).toBe(false);
  });

  it('watches, records history, re-watches (unwatch first) and unwatches', () => {
    registerRouter(makeRouter());
    expect(watchRouteChanges()).toBe(true);
    expect(afterEachCb).toBeTypeOf('function');

    // 稀疏 location → 覆盖 `||` 回退
    afterEachCb!({} as never);
    // 完整 location
    afterEachCb!({
      path: '/a',
      name: 'a',
      params: { id: '1' },
      query: { q: 'x' },
      matched: [{ path: '/a', name: 'a' }],
    });
    expect(getRouteHistory().length).toBe(2);

    // 二次 watch → afterEachHandler !== null 分支
    expect(watchRouteChanges()).toBe(true);
    unwatchRouteChanges();
    unwatchRouteChanges(); // afterEachHandler 已为 null
  });

  it('navigates through a registered router', async () => {
    registerRouter(makeRouter());
    await expect(navigateTo('/x')).resolves.toBeUndefined();
    await expect(navigateToName('home', { a: '1' })).resolves.toBeUndefined();
    await expect(navigateToName('home')).resolves.toBeUndefined();
    await expect(goBack()).resolves.toBeUndefined();
    expect(getRoutes()).toEqual([{ path: '', name: null }]);
  });

  it('rejects navigation when no router is registered', async () => {
    await expect(navigateTo('/x')).rejects.toThrow(/not registered/);
    await expect(navigateToName('home')).rejects.toThrow(/not registered/);
    await expect(goBack()).rejects.toThrow(/not registered/);
  });

  it('falls back to resolved promises when push/back are missing', async () => {
    registerRouter(makeRouter({ push: undefined, back: undefined }));
    await expect(navigateTo('/x')).resolves.toBeUndefined();
    await expect(goBack()).resolves.toBeUndefined();
  });

  it('serializes route info with and without matched entries', () => {
    const empty = serializeRouteInfo({
      path: '/p',
      name: null,
      params: {},
      query: {},
      matched: [],
    } as never);
    expect(empty).toContain('(none)');

    const withMatched = serializeRouteInfo({
      path: '/p',
      name: 'p',
      params: { id: '1' },
      query: {},
      matched: [
        { path: '/p', name: 'p' },
        { path: '/p/child', name: null },
      ],
    } as never);
    expect(withMatched).toContain('(p)');
  });

  it('getRoutes() falls back to [] when the router lacks getRoutes', () => {
    registerRouter(makeRouter({ getRoutes: undefined }));
    expect(getRoutes()).toEqual([]);
  });
});
