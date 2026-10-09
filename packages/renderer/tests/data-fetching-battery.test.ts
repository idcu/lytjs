// @vitest-environment jsdom
/**
 * renderer/data/data-fetching.ts 覆盖率电池（2026-10-09 stmts 深挖第一批）
 * 此前 0 覆盖（296/296 语句未执行）。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from '@lytjs/reactivity';
import {
  serializeData,
  deserializeData,
  createPrefetchManager,
  useFetch,
  useAsyncData,
  injectPrefetchData,
  getPrefetchData,
} from '../src/data/data-fetching';

beforeEach(() => {
  createPrefetchManager().clear();
  delete (window as unknown as Record<string, unknown>).__LYTJS_PREFETCH_DATA__;
  vi.restoreAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('data-fetching · serializeData / deserializeData', () => {
  it('特殊类型往返：Map / Set / BigInt / Error / RegExp（Date 缺陷见下）', () => {
    const src = {
      map: new Map([['a', 1]]),
      set: new Set([1, 2]),
      big: BigInt('12345678901234567890'),
      err: new TypeError('boom'),
      re: /ab+c/gi,
    };
    const out = deserializeData(serializeData(src)) as Record<string, unknown>;
    expect(out.map).toBeInstanceOf(Map);
    expect((out.map as Map<string, number>).get('a')).toBe(1);
    expect(out.set).toBeInstanceOf(Set);
    expect([...(out.set as Set<number>)]).toEqual([1, 2]);
    expect(out.big).toBe(BigInt('12345678901234567890'));
    expect(out.err).toBeInstanceOf(Error);
    expect((out.err as Error).name).toBe('TypeError');
    expect((out.err as Error).message).toBe('boom');
    expect(out.re).toBeInstanceOf(RegExp);
    expect((out.re as RegExp).flags).toBe('gi');
    expect((out.re as RegExp).test('abbbC')).toBe(true);
  });

  it('⚠️ 缺陷登记：Date 被序列化为裸字符串（toJSON 抢先于 replacer）', () => {
    // JSON.stringify 规范：先调 value.toJSON() 再进 replacer ⇒ replacer 收到的是
    // ISO 字符串，`value instanceof Date` 永不命中 ⇒ Date 分支是死代码，
    // 反序列化得到 string 而非 Date（2026-10-09 实测）。修复需预遍历替换，
    // 属产品行为变更，走单独决策；此处按真实行为断言防漂移。
    const out = deserializeData(serializeData({ d: new Date(0) })) as Record<string, unknown>;
    expect(out.d).toBe('1970-01-01T00:00:00.000Z');
    expect(out.d).not.toBeInstanceOf(Date);
  });

  it('普通 JSON 与嵌套结构原样往返', () => {
    const src = { list: [1, 'x', { deep: true }], n: null };
    expect(deserializeData(serializeData(src))).toEqual(src);
  });

  it('反序列化：非法 RegExp 字符串走回退构造', () => {
    const out = deserializeData('{"re":{"__type":"RegExp","__value":"abc"}}') as Record<
      string,
      unknown
    >;
    expect(out.re).toBeInstanceOf(RegExp);
    expect((out.re as RegExp).source).toBe('abc');
  });

  it('未知 __type 原样返回普通对象', () => {
    const out = deserializeData('{"x":{"__type":"Alien","v":1}}') as Record<string, unknown>;
    expect((out.x as Record<string, unknown>).__type).toBe('Alien');
  });
});

describe('data-fetching · createPrefetchManager', () => {
  it('prefetch：取数并写入缓存；命中缓存不再取数', async () => {
    const mgr = createPrefetchManager();
    const fetcher = vi.fn().mockResolvedValue({ n: 1 });
    await expect(mgr.prefetch('k', fetcher)).resolves.toEqual({ n: 1 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    await expect(mgr.prefetch('k', fetcher)).resolves.toEqual({ n: 1 });
    expect(fetcher).toHaveBeenCalledTimes(1); // 第二次走缓存
    expect(mgr.getPrefetchedData<{ n: number }>('k')).toEqual({ n: 1 });
  });

  it('prefetch：同一 key 并发时共享同一个进行中的 Promise', async () => {
    const mgr = createPrefetchManager();
    let release!: (v: number) => void;
    const gate = new Promise<number>((r) => (release = r));
    const fetcher = vi.fn().mockReturnValue(gate);
    const p1 = mgr.prefetch('k', fetcher);
    const p2 = mgr.prefetch('k', fetcher);
    release(7);
    await expect(p1).resolves.toBe(7);
    await expect(p2).resolves.toBe(7);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('过期缓存不再命中（getPrefetchedData 返回 undefined）', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const mgr = createPrefetchManager();
    await mgr.prefetch('k', async () => 1);
    expect(mgr.getPrefetchedData('k')).toBe(1);
    vi.advanceTimersByTime(5 * 60 * 1000 + 1); // 越过 5 分钟过期线
    expect(mgr.getPrefetchedData('k')).toBeUndefined();
  });

  it('serialize / deserialize 往返；非数组输入安全忽略', async () => {
    const mgr = createPrefetchManager();
    await mgr.prefetch('k', async () => 42);
    const snapshot = mgr.serialize();
    mgr.clear();
    expect(mgr.getPrefetchedData('k')).toBeUndefined();
    mgr.deserialize(snapshot);
    expect(mgr.getPrefetchedData<number>('k')).toBe(42);

    mgr.deserialize('"just-a-string"'); // isArray 守卫 → no-op
    mgr.deserialize('{}'); // 同上
  });

  it('prefetch 失败时清理 pending（下次可重试）', async () => {
    const mgr = createPrefetchManager();
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('net')).mockResolvedValue(5);
    await expect(mgr.prefetch('k', fetcher)).rejects.toThrow('net');
    await expect(mgr.prefetch('k', fetcher)).resolves.toBe(5); // pending 已清理
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe('data-fetching · useFetch', () => {
  const okResponse = (body: unknown) =>
    ({ ok: true, status: 200, json: async () => body }) as unknown as Response;

  it('成功路径：transform / onSuccess / 缓存写入 / timestamp', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ n: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    const onSuccess = vi.fn();
    const { data, loading, error, refetch } = useFetch<{ n: number }>('/api/x', {
      transform: (r) => r as { n: number },
      onSuccess,
      cacheKey: 'cache-x',
    });
    await vi.waitFor(() => expect(loading.value).toBe(false));
    expect(data.value).toEqual({ n: 1 });
    expect(error.value).toBeNull();
    expect(onSuccess).toHaveBeenCalledWith({ n: 1 });
    expect(fetchMock).toHaveBeenCalledWith('/api/x');

    // 命中缓存：refetch 不再发请求
    await refetch();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(data.value).toEqual({ n: 1 });
  });

  it('HTTP 非 2xx：error 记录 + onError 回调', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 500, json: async () => ({}) } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);
    const onError = vi.fn();
    const { error, loading, refetch } = useFetch('/api/y', { onError, immediate: false });
    await refetch();
    expect(error.value).toBeInstanceOf(Error);
    expect((error.value as Error).message).toContain('500');
    expect(onError).toHaveBeenCalledTimes(1);
    // 注：ref() 会把 Error 包成 reactive 代理 ⇒ error.value 与 onError 收到的原始对象
    // 引用不等，此处按 message 对齐（同一错误的两个视图）
    expect((onError.mock.calls[0]![0] as Error).message).toBe((error.value as Error).message);
    expect(loading.value).toBe(false);
  });

  it('fetch 抛非 Error 值：包装为 Error；retry 后成功', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce('boom-string')
      .mockResolvedValue(okResponse('ok!'));
    vi.stubGlobal('fetch', fetchMock);
    const { data, error, refetch } = useFetch<string>('/api/z', {
      immediate: false,
      retry: 1,
      retryDelay: 5,
    });
    await refetch();
    await vi.waitFor(() => expect(data.value).toBe('ok!'));
    expect(error.value).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('重试次数用尽：error 保留最后一次', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('always down'));
    vi.stubGlobal('fetch', fetchMock);
    const { error, refetch } = useFetch('/api/q', { immediate: false, retry: 1, retryDelay: 2 });
    await refetch();
    // 重试经 setTimeout 异步进行 ⇒ 等 fetch 达到 2 次后再断言
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect((error.value as Error)?.message).toBe('always down');
  });

  it('服务端预取数据：直接采用并从 window 消费掉', async () => {
    (window as unknown as Record<string, unknown>).__LYTJS_PREFETCH_DATA__ = {
      'ssr-k': { hello: 'ssr' },
    };
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { data } = useFetch<{ hello: string }>('/api/s', { cacheKey: 'ssr-k' });
    await vi.waitFor(() => expect(data.value).toEqual({ hello: 'ssr' }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      (window as unknown as Record<string, Record<string, unknown>>).__LYTJS_PREFETCH_DATA__[
        'ssr-k'
      ],
    ).toBeUndefined(); // 已消费
  });

  it('url / cacheKey 支持函数形式；watch 依赖变化触发重新获取', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(1));
    vi.stubGlobal('fetch', fetchMock);
    const dep = ref('a');
    let urlCalls = 0;
    const { data } = useFetch<string>(
      () => {
        urlCalls++;
        return `/api/${dep.value}`;
      },
      {
        cacheKey: () => `k-${dep.value}`,
        watch: [dep],
      },
    );
    await vi.waitFor(() => expect(data.value).toBe(1));
    expect(urlCalls).toBeGreaterThan(0);
    dep.value = 'b';
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/b'));
  });

  it('immediate: false 时不自动请求', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    useFetch('/api/idle', { immediate: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('data-fetching · useAsyncData', () => {
  it('成功路径：pending 状态 / transform / 缓存写入', async () => {
    const fetcher = vi.fn().mockResolvedValue({ v: 1 });
    const onSuccess = vi.fn();
    const { data, pending, error, refresh } = useAsyncData<{ v: number }>('ad-k', fetcher, {
      immediate: false,
      transform: (r) => r as { v: number },
      onSuccess,
    });
    expect(pending.value).toBe(false);
    await refresh();
    expect(data.value).toEqual({ v: 1 });
    expect(pending.value).toBe(false);
    expect(onSuccess).toHaveBeenCalledWith({ v: 1 });
    expect(error.value).toBeNull();

    fetcher.mockClear();
    await refresh();
    expect(fetcher).not.toHaveBeenCalled(); // 命中缓存
  });

  it('失败路径：error 记录 + onError', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('async boom'));
    const onError = vi.fn();
    const { data, error, refresh } = useAsyncData('ad-err', fetcher, { immediate: false, onError });
    await refresh();
    expect((error.value as Error).message).toBe('async boom');
    expect(data.value).toBeUndefined();
    expect(onError).toHaveBeenCalled();
  });

  it('服务端预取数据命中', async () => {
    (window as unknown as Record<string, unknown>).__LYTJS_PREFETCH_DATA__ = { 'ad-ssr': 9 };
    const fetcher = vi.fn();
    const { data, refresh } = useAsyncData<number>('ad-ssr', fetcher, { immediate: false });
    await refresh();
    expect(data.value).toBe(9);
    expect(fetcher).not.toHaveBeenCalled();
    expect(
      (window as unknown as Record<string, Record<string, unknown>>).__LYTJS_PREFETCH_DATA__[
        'ad-ssr'
      ],
    ).toBeUndefined();
  });
});

describe('data-fetching · injectPrefetchData / getPrefetchData', () => {
  it('空缓存返回空串', () => {
    expect(injectPrefetchData()).toBe('');
  });

  it('有缓存时产出可被 getPrefetchData 消费的注入脚本', async () => {
    const mgr = createPrefetchManager();
    await mgr.prefetch('pk', async () => ({ a: 1 }));
    const html = injectPrefetchData();
    expect(html).toContain('<script>window.__LYTJS_PREFETCH_DATA__=');
    expect(html).toContain('"a":1');

    // 模拟客户端：清掉内存缓存后把注入的数据挂到 window（getPrefetchData 先查内存）
    mgr.clear();
    const json = html
      .replace('<script>window.__LYTJS_PREFETCH_DATA__=', '')
      .replace(/;<\/script>$/, '');
    (window as unknown as Record<string, unknown>).__LYTJS_PREFETCH_DATA__ = deserializeData(
      json,
    ) as Record<string, unknown>;
    expect(getPrefetchData<{ a: number }>('pk')).toEqual({ a: 1 }); // 来自 window 注入
    expect(getPrefetchData('pk')).toBeUndefined(); // 消费后删除
  });

  it('getPrefetchData：无任何数据返回 undefined', () => {
    expect(getPrefetchData('nope')).toBeUndefined();
  });
});
