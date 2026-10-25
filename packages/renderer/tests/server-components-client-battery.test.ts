// @vitest-environment node
/**
 * 行为级判据：`@lytjs/renderer/client` 的 Server Components 客户端运行时
 * （`src/client/server-components-client.ts`，269 行、9 个导出）
 *
 * ## 为什么要有这条
 *
 * 这个文件是**编译器生成的客户端桩唯一会 import 的运行时**
 * （桩原文：`import { createServerProxy } from '@lytjs/renderer/client'`），
 * 但既有测试只覆盖了「拼出 fetch 参数」和「非 2xx 抛错」两条，其余全是空档。
 * 空档里藏着三处**主路径**缺陷：
 *
 * 1. `createServerProxy()` 是 `callServer()` 的**第二份实现**（自己拼 fetch）⇒
 *    完全无视 `configureServerAction()`：自定义 `endpoint` 不生效、`headers` 丢失、
 *    `onError` 不触发。用户"配置了却不生效"，且发生在此模块的主用途上。
 * 2. `getServerData()` / `hasServerData()` 直接读 `window.__LYTJS_SERVER_DATA__` ——
 *    可文件末尾明明用 `typeof document !== 'undefined'` 判过环境（意味着"可非浏览器导入"），
 *    在 Node / 边缘运行时调用就是 `ReferenceError: window is not defined`。
 * 3. `autoHydrate()` 的跳过 / 失败 / 继续语义没有任何判据。
 *
 * ## 环境
 *
 * 用 `node` 而不是 jsdom：本模块的「无 window」分支只能在真无 `window` 的环境里验，
 * 而 `document` 需要时用 `vi.stubGlobal` 造一个最小替身（`autoHydrate` 只用到
 * `querySelectorAll`）。⚠️ 反过来（jsdom 里把 `window` 置 undefined）不可靠 ——
 * jsdom 的 `window` 是 global 上的访问器，stub 掉常常恢复不回来。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  configureServerAction,
  callServer,
  createServerFunction,
  createServerProxy,
  getServerData,
  hasServerData,
  isHydrated,
  markHydrated,
  getHydrationState,
  autoHydrate,
} from '../src/client/server-components-client';

const DEFAULT_ENDPOINT = '/__lytjs_server_action';

const okResponse = (payload: unknown = { ok: 1 }) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => payload,
});

const failResponse = (status: number, statusText: string) => ({
  ok: false,
  status,
  statusText,
  json: async () => ({}),
});

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async () => okResponse());
  vi.stubGlobal('fetch', fetchMock);
  // 每个用例都回到出厂配置（`configureServerAction` 是**合并**语义，会累积）
  configureServerAction({
    endpoint: DEFAULT_ENDPOINT,
    headers: {},
    onError: undefined,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ==================== callServer ====================

describe('callServer', () => {
  it('POST 到配置的端点，带上组件名 / 函数名 / 自定义 header 与序列化参数', async () => {
    configureServerAction({ headers: { 'X-Token': 't1' } });

    const result = await callServer('ProductList', 'fetchProducts', { c: 'e' }, 2);

    expect(result).toEqual({ ok: 1 });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(DEFAULT_ENDPOINT);
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['X-Server-Component']).toBe('ProductList');
    expect(headers['X-Server-Function']).toBe('fetchProducts');
    expect(headers['X-Token']).toBe('t1');
    expect(JSON.parse(init.body as string)).toEqual({ args: [{ c: 'e' }, 2] });
  });

  it('非 2xx ⇒ 抛错，且消息里同时有函数名与状态码', async () => {
    fetchMock.mockResolvedValueOnce(failResponse(500, 'Internal Server Error'));

    await expect(callServer('C', 'boom')).rejects.toThrow(
      /Server function boom failed: 500 Internal Server Error/,
    );
  });

  it('非 2xx ⇒ 先调 onError 再抛出（不是只记一笔就吞掉）', async () => {
    const onError = vi.fn();
    configureServerAction({ onError });
    fetchMock.mockResolvedValueOnce(failResponse(502, 'Bad Gateway'));

    await expect(callServer('C', 'x')).rejects.toThrow(/Bad Gateway/);
    expect(onError).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0]?.[0] as Error).message).toContain('Bad Gateway');
  });

  it('fetch 直接 reject 的非 Error 值也被包成 Error 再抛', async () => {
    fetchMock.mockRejectedValueOnce('network down');

    await expect(callServer('C', 'x')).rejects.toBeInstanceOf(Error);
  });

  it('未配置 onError 时不额外告警（默认实现只在内部记录）', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce(failResponse(500, 'Boom'));

    await expect(callServer('C', 'x')).rejects.toThrow();

    expect(errSpy).not.toHaveBeenCalled();
  });
});

// ==================== createServerFunction ====================

describe('createServerFunction', () => {
  it('返回的函数把参数原样转给 callServer', async () => {
    const fn = createServerFunction<unknown>('C', 'fn');

    await fn(1, 'a');

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ args: [1, 'a'] });
  });
});

// ==================== createServerProxy：必须与 callServer 同一条路径 ====================

describe('createServerProxy（编译器生成的桩走的就是它）', () => {
  it('★ 遵守 configureServerAction 的 endpoint —— 而不是硬编码默认地址', async () => {
    configureServerAction({ endpoint: '/api/actions' });

    await createServerProxy<() => Promise<unknown>>('C', 'fn')();

    const [url] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/actions');
  });

  it('★ 遵守 configureServerAction 的 headers', async () => {
    configureServerAction({ headers: { 'X-Tenant': 'acme' } });

    await createServerProxy<() => Promise<unknown>>('C', 'fn')();

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)['X-Tenant']).toBe('acme');
  });

  it('★ 失败时触发 onError（此前被完全绕过）', async () => {
    const onError = vi.fn();
    configureServerAction({ onError });
    fetchMock.mockResolvedValueOnce(failResponse(500, 'Boom'));

    await expect(createServerProxy<() => Promise<unknown>>('C', 'fn')()).rejects.toThrow();

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('错误消息带函数名与状态码', async () => {
    fetchMock.mockResolvedValueOnce(failResponse(503, 'Service Unavailable'));

    await expect(createServerProxy<() => Promise<unknown>>('C', 'load')()).rejects.toThrow(
      /Server function load failed: 503 Service Unavailable/,
    );
  });

  it('参数与返回值原样透传', async () => {
    fetchMock.mockResolvedValueOnce(okResponse([1, 2, 3]));

    const result = await createServerProxy<(...a: unknown[]) => Promise<unknown>>(
      'C',
      'fn',
    )({
      a: 1,
    });

    expect(result).toEqual([1, 2, 3]);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ args: [{ a: 1 }] });
  });
});

// ==================== 服务端注入数据 ====================

describe('getServerData / hasServerData', () => {
  it('★ 没有 window 时返回 undefined，而不是 ReferenceError', () => {
    expect(typeof window).toBe('undefined');

    expect(() => getServerData()).not.toThrow();
    expect(getServerData()).toBeUndefined();
    expect(getServerData('user')).toBeUndefined();
    expect(hasServerData()).toBe(false);
  });

  it('有 window 注入时按 key 取，不传 key 取整份', () => {
    vi.stubGlobal('window', { __LYTJS_SERVER_DATA__: { user: { id: 1 }, flag: true } });

    expect(getServerData()).toEqual({ user: { id: 1 }, flag: true });
    expect(getServerData<{ id: number }>('user')).toEqual({ id: 1 });
    expect(getServerData('missing')).toBeUndefined();
    expect(hasServerData()).toBe(true);
  });

  it('注入值不是对象时视为没有数据（不能让 hasServerData 说 true）', () => {
    vi.stubGlobal('window', { __LYTJS_SERVER_DATA__: 'nope' });

    expect(hasServerData()).toBe(false);
    expect(getServerData()).toBeUndefined();
  });
});

// ==================== hydration 状态机 ====================

describe('hydration 状态', () => {
  it('未知组件默认「未 hydrated / 非 pending / 无错误」', () => {
    expect(isHydrated('unknown-a')).toBe(false);
    expect(getHydrationState('unknown-a')).toEqual({
      hydrated: false,
      pending: false,
      error: null,
    });
  });

  it('markHydrated 后 isHydrated 为真，且清掉 pending', () => {
    markHydrated('comp-b');

    expect(isHydrated('comp-b')).toBe(true);
    expect(getHydrationState('comp-b')).toEqual({
      hydrated: true,
      pending: false,
      error: null,
    });
  });

  it('getHydrationState 返回的是快照（外部改写不影响内部状态）', () => {
    markHydrated('comp-c');
    const snap = getHydrationState('comp-c');
    snap.hydrated = false;

    expect(isHydrated('comp-c')).toBe(true);
  });
});

// ==================== autoHydrate ====================

/** 造一个最小 `document`：只需要 `querySelectorAll` 与 `addEventListener` */
function stubDocument(elements: Array<{ id: string | null }>) {
  const doc = {
    querySelectorAll: () => elements.map((e) => ({ getAttribute: () => e.id })),
    addEventListener: () => {},
    readyState: 'complete',
  };
  vi.stubGlobal('document', doc);
  return doc;
}

describe('autoHydrate', () => {
  it('没有 [data-server-component] 元素时什么都不做', async () => {
    stubDocument([]);

    await expect(autoHydrate()).resolves.toBeUndefined();
  });

  it('属性为空的元素被跳过（不会去 import `/components/null.client.js`）', async () => {
    stubDocument([{ id: null }]);

    await autoHydrate();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('★ 已 hydrated 的组件被跳过，不重复导入', async () => {
    markHydrated('done-1');
    stubDocument([{ id: 'done-1' }]);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await autoHydrate();

    // 跳过的判据：状态没被改回 pending，且没有走失败路径
    expect(getHydrationState('done-1').pending).toBe(false);
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('导入失败 ⇒ 记录 error 状态并继续处理后续元素（不中断整轮）', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    stubDocument([{ id: 'missing-1' }, { id: 'missing-2' }]);

    await autoHydrate();

    for (const id of ['missing-1', 'missing-2']) {
      const state = getHydrationState(id);
      expect(state.hydrated).toBe(false);
      expect(state.pending).toBe(false);
      expect(state.error).toBeInstanceOf(Error);
    }
    // 两个元素各失败一次 ⇒ 两条错误日志（说明循环没有在第一个失败处停下）
    expect(errSpy).toHaveBeenCalledTimes(2);
  });
});
