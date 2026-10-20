// @vitest-environment jsdom
/**
 * 行为级判据：`@lytjs/router` 的**三种 history 实现**（`src/history.ts`，424 行）
 *
 * ## 为什么要有这条
 *
 * 实测该文件 **194/305 语句未覆盖（36.4%）** —— `createWebHistory` 与 `createWebHashHistory`
 * **几乎整段未测**（只有 `createMemoryHistory` 被顺带覆盖）。
 * 这三者是路由的**底座**：URL 读写、popstate/hashchange 监听、监听器分发。出错时页面照样能跑，
 * 只是"地址栏和视图对不上"或"一次跳转发两次事件"——都很难定位。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createWebHistory, createWebHashHistory, createMemoryHistory } from '../src/history';

const resetUrl = (url = '/'): void => {
  window.history.replaceState(null, '', url);
};

beforeEach(() => {
  resetUrl('/');
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** 让 jsdom 派发异步的 hashchange */
const nextTask = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

// ==================== createWebHistory ====================

describe('createWebHistory', () => {
  it('初始 location 取自浏览器地址栏', () => {
    resetUrl('/user/42?tab=a#top');
    const h = createWebHistory();

    expect(h.location.path).toBe('/user/42');
    expect(h.location.query).toEqual({ tab: 'a' });
    // `parseFullPath` 约定：hash **不带**前导 `#`
    expect(h.location.hash).toBe('top');
    expect(h.location.fullPath).toBe('/user/42?tab=a#top');

    h.destroy();
  });

  it('base 归一化：不带前导斜杠会补上', () => {
    const h = createWebHistory('app');

    expect(h.base).toBe('/app');

    h.destroy();
  });

  it('base 前缀会从 pathname 上剥掉', () => {
    resetUrl('/app/dashboard');
    const h = createWebHistory('/app');

    expect(h.location.path).toBe('/dashboard');

    h.destroy();
  });

  it('push 更新地址栏与 location，并通知监听器（type=push）', async () => {
    const h = createWebHistory();
    const seen: Array<{ path: string; type: string }> = [];
    h.listen((to, _from, info) => seen.push({ path: to.path, type: info.type }));

    await h.push('/about?x=1');

    expect(window.location.pathname).toBe('/about');
    expect(h.location.path).toBe('/about');
    expect(h.location.query).toEqual({ x: '1' });
    expect(seen).toEqual([{ path: '/about', type: 'push' }]);

    h.destroy();
  });

  it('replace 更新地址栏并通知（type=replace）', async () => {
    const h = createWebHistory();
    const seen: string[] = [];
    h.listen((_to, _from, info) => seen.push(info.type));

    await h.replace('/login');

    expect(window.location.pathname).toBe('/login');
    expect(seen).toEqual(['replace']);

    h.destroy();
  });

  it('对象入参的 hash 也会归一成不带 `#`（与 parseFullPath 一致）', async () => {
    const h = createWebHistory();

    await h.push({ path: '/obj', hash: '#sec' } as never);

    expect(h.location.hash).toBe('sec');
    expect(window.location.hash).toBe('#sec');

    h.destroy();
  });

  it('listen 返回的函数能注销该监听器', async () => {
    const h = createWebHistory();
    const spy = vi.fn();
    const off = h.listen(spy);
    off();

    await h.push('/x');

    expect(spy).not.toHaveBeenCalled();

    h.destroy();
  });

  it('go 委托给 window.history.go', () => {
    const h = createWebHistory();
    const goSpy = vi.spyOn(window.history, 'go').mockImplementation(() => {});

    h.go(-1);

    expect(goSpy).toHaveBeenCalledWith(-1);

    h.destroy();
  });

  it('popstate 触发通知（type=pop）', () => {
    const h = createWebHistory();
    const seen: string[] = [];
    h.listen((_to, _from, info) => seen.push(info.type));

    resetUrl('/popped');
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));

    expect(seen).toEqual(['pop']);

    h.destroy();
  });

  it('destroy 之后不再监听 popstate', () => {
    const h = createWebHistory();
    const spy = vi.fn();
    h.listen(spy);

    h.destroy();
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));

    expect(spy).not.toHaveBeenCalled();
  });

  it('★ base 带尾斜杠时不应拼出双斜杠', async () => {
    resetUrl('/app/');
    const h = createWebHistory('/app/');

    await h.push('/user');

    // 原实现 `normalizedBase` 原样保留尾斜杠 ⇒ 拼成 `/app//user`
    expect(window.location.pathname).toBe('/app/user');

    h.destroy();
  });
});

// ==================== createWebHashHistory ====================

describe('createWebHashHistory', () => {
  it('初始 location 取自 hash', () => {
    resetUrl('/#/settings?tab=1');
    const h = createWebHashHistory();

    expect(h.location.path).toBe('/settings');
    expect(h.location.query).toEqual({ tab: '1' });

    h.destroy();
  });

  it('没有 hash 时退化为 /', () => {
    const h = createWebHashHistory();

    expect(h.location.path).toBe('/');

    h.destroy();
  });

  it('base 前缀会从 hash 上剥掉', () => {
    resetUrl('/#/app/inner');
    const h = createWebHashHistory('/app');

    expect(h.location.path).toBe('/inner');

    h.destroy();
  });

  it('push 写入 hash 并更新 location', async () => {
    const h = createWebHashHistory();

    await h.push('/a/b');

    expect(window.location.hash).toBe('#/a/b');
    expect(h.location.path).toBe('/a/b');

    h.destroy();
  });

  it('★ push 只应通知**一次**（不能既直接触发又被 hashchange 回声再触发一次）', async () => {
    const h = createWebHashHistory();
    const seen: string[] = [];
    h.listen((to) => seen.push(to.path));

    await h.push('/once');
    await nextTask(); // 等 hashchange 派发

    // 原实现：push 里 `triggerListeners` + 设置 location.hash 触发 hashchange ⇒ 两次
    expect(seen).toEqual(['/once']);

    h.destroy();
  });

  it('replace 写入 hash 且同样只通知一次', async () => {
    const h = createWebHashHistory();
    const seen: string[] = [];
    h.listen((to) => seen.push(to.path));

    await h.replace('/replaced');
    await nextTask();

    expect(window.location.hash).toBe('#/replaced');
    expect(seen).toEqual(['/replaced']);

    h.destroy();
  });

  it('用户手动改 hash（hashchange）会通知一次', async () => {
    const h = createWebHashHistory();
    const seen: string[] = [];
    h.listen((to) => seen.push(to.path));

    window.location.hash = '#/manual';
    await nextTask();

    expect(seen).toEqual(['/manual']);

    h.destroy();
  });

  it('state 恒为 null（hash 模式不存历史状态）', () => {
    const h = createWebHashHistory();

    expect(h.state).toBeNull();

    h.destroy();
  });

  it('destroy 之后不再监听 hashchange', async () => {
    const h = createWebHashHistory();
    const spy = vi.fn();
    h.listen(spy);

    h.destroy();
    window.location.hash = '#/after-destroy';
    await nextTask();

    expect(spy).not.toHaveBeenCalled();
  });
});

// ==================== createMemoryHistory ====================

describe('createMemoryHistory', () => {
  it('初始路径与 push / replace', async () => {
    const h = createMemoryHistory('/start');

    expect(h.location.path).toBe('/start');

    await h.push('/next');
    expect(h.location.path).toBe('/next');

    await h.replace('/final');
    expect(h.location.path).toBe('/final');
  });

  it('监听器收到 push 与 replace 的类型', async () => {
    const h = createMemoryHistory();
    const types: string[] = [];
    h.listen((_to, _from, info) => types.push(info.type));

    await h.push('/a');
    await h.replace('/b');

    expect(types).toEqual(['push', 'replace']);
  });

  it('go 在内存历史里也能用（不抛错）', () => {
    const h = createMemoryHistory();

    expect(() => h.go(-1)).not.toThrow();
  });
});
