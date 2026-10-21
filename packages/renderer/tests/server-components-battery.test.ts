// @vitest-environment node
/**
 * `renderer/src/server/server-components.ts` 行为电池。
 *
 * 该文件此前 **138/296 语句未覆盖（0%）**，一条判据都没有。它承担三件事：
 * 注册表、Server Action 分发、SSR 数据序列化 + 注入 —— 都属于「错了会在生产环境
 * 静默出问题」的类型（数据丢失 / 注入）。
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  registerServerComponent,
  registerServerFunction,
  getServerComponent,
  getServerFunction,
  handleServerAction,
  createServerActionHandler,
  serializeServerData,
  deserializeServerData,
  renderServerComponent,
  defineServerComponent,
} from '../src/server/server-components';

let seq = 0;
const uid = (p = 'c') => `${p}-${++seq}`;

afterEach(() => {
  vi.restoreAllMocks();
});

/** 极简 express 风格 res 桩 */
function makeRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
  };
  return res;
}

describe('注册表', () => {
  it('注册后能按 id 取回同一个组件定义', () => {
    const id = uid();
    const comp = { id, name: 'C', render: async () => '<div/>' };

    registerServerComponent(comp);

    expect(getServerComponent(id)).toBe(comp);
  });

  it('未注册的组件返回 undefined', () => {
    expect(getServerComponent('nope')).toBeUndefined();
  });

  it('同一组件可注册多个服务端函数，互不覆盖', () => {
    const id = uid();
    const a = async () => 'a';
    const b = async () => 'b';

    registerServerFunction(id, 'a', a);
    registerServerFunction(id, 'b', b);

    expect(getServerFunction(id, 'a')).toBe(a);
    expect(getServerFunction(id, 'b')).toBe(b);
  });

  it('组件或函数不存在时 getServerFunction 返回 undefined', () => {
    expect(getServerFunction('no-comp', 'f')).toBeUndefined();
    const id = uid();
    registerServerFunction(id, 'x', async () => 1);
    expect(getServerFunction(id, 'y')).toBeUndefined();
  });
});

describe('handleServerAction', () => {
  it('找到函数 ⇒ 透传参数并返回 success + data', async () => {
    const id = uid();
    registerServerFunction(id, 'add', async (a, b) => (a as number) + (b as number));

    const r = await handleServerAction({ componentName: id, functionName: 'add', args: [1, 2] });

    expect(r).toEqual({ success: true, data: 3 });
  });

  it('函数不存在 ⇒ success:false 且错误信息带组件名与函数名', async () => {
    const r = await handleServerAction({
      componentName: 'ghost',
      functionName: 'nope',
      args: [],
    });

    expect(r.success).toBe(false);
    expect(r.error).toBe('Server function not found: ghost.nope');
  });

  it('函数抛 Error ⇒ 捕获并返回 message', async () => {
    const id = uid();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    registerServerFunction(id, 'boom', async () => {
      throw new Error('kaboom');
    });

    const r = await handleServerAction({ componentName: id, functionName: 'boom', args: [] });

    expect(r).toEqual({ success: false, error: 'kaboom' });
  });

  it('函数抛非 Error ⇒ 用 String() 兜底', async () => {
    const id = uid();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    registerServerFunction(id, 'weird', async () => {
      throw 'plain-string';
    });

    const r = await handleServerAction({ componentName: id, functionName: 'weird', args: [] });

    expect(r).toEqual({ success: false, error: 'plain-string' });
  });
});

describe('createServerActionHandler', () => {
  it('缺少请求头 ⇒ 400 且带明确错误', async () => {
    const handler = createServerActionHandler();
    const res = makeRes();

    await handler({ headers: {} }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Missing server component or function headers' });
  });

  it('成功调用 ⇒ 直接把 data 写回响应', async () => {
    const id = uid();
    registerServerFunction(id, 'ping', async () => 'pong');
    const handler = createServerActionHandler();
    const res = makeRes();

    await handler(
      {
        headers: { 'x-server-component': id, 'x-server-function': 'ping' },
        body: { args: [] },
      },
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('pong');
  });

  it('body 没有 args 时按空参数调用', async () => {
    const id = uid();
    registerServerFunction(id, 'noargs', async (...args: unknown[]) => args.length);
    const handler = createServerActionHandler();
    const res = makeRes();

    await handler(
      { headers: { 'x-server-component': id, 'x-server-function': 'noargs' }, body: {} },
      res,
    );

    expect(res.body).toBe(0);
  });

  it('函数失败 ⇒ 500 且响应体带错误信息', async () => {
    const handler = createServerActionHandler();
    const res = makeRes();

    await handler(
      {
        headers: { 'x-server-component': 'ghost', 'x-server-function': 'nope' },
        body: { args: [] },
      },
      res,
    );

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Server function not found: ghost.nope' });
  });
});

describe('serializeServerData / deserializeServerData', () => {
  it('普通对象往返', () => {
    const data = { a: 1, b: 'x', c: [1, 2], d: { e: true } };

    expect(deserializeServerData(serializeServerData(data))).toEqual(data);
  });

  it('Map / Set / BigInt / undefined 往返', () => {
    const data = {
      m: new Map<string, number>([['k', 1]]),
      s: new Set([1, 2]),
      big: 9007199254740993n,
      u: undefined,
    };

    const out = deserializeServerData(serializeServerData(data)) as typeof data;

    expect(out.m).toBeInstanceOf(Map);
    expect(out.m.get('k')).toBe(1);
    expect(out.s).toBeInstanceOf(Set);
    expect(out.s.has(2)).toBe(true);
    expect(out.big).toBe(9007199254740993n);
    expect(out.u).toBeUndefined();
  });

  it('★ Date 往返后必须仍是 Date（不能退化成字符串）', () => {
    const d = new Date('2026-10-21T00:00:00.000Z');
    const json = serializeServerData({ d });

    // `JSON.stringify` 先调 `value.toJSON()` 再调 replacer ⇒ 若只用 `value instanceof Date`
    // 判断，这里拿到的已是 ISO 字符串，`__type: 'Date'` 永远不会出现。
    expect(json).toContain('__type');

    const out = deserializeServerData(json) as { d: unknown };

    expect(out.d).toBeInstanceOf(Date);
    expect((out.d as Date).toISOString()).toBe(d.toISOString());
  });

  it('未知 __type 原样保留（不吞数据）', () => {
    expect(deserializeServerData('{"x":{"__type":"Alien","value":1}}')).toEqual({
      x: { __type: 'Alien', value: 1 },
    });
  });

  it('循环引用会抛 TypeError（既有语义，记录在案）', () => {
    const a: Record<string, unknown> = {};
    a.self = a;

    expect(() => serializeServerData(a)).toThrow(TypeError);
  });

  it('非法 JSON 抛错', () => {
    expect(() => deserializeServerData('{')).toThrow();
  });
});

describe('renderServerComponent', () => {
  it('未注册 ⇒ 抛错并带组件 id', async () => {
    await expect(renderServerComponent('missing-id')).rejects.toThrow(
      /Server component not found: missing-id/,
    );
  });

  it('返回 render 的 HTML', async () => {
    const id = uid();
    registerServerComponent({ id, name: 'C', render: async () => '<p>hi</p>' });

    await expect(renderServerComponent(id)).resolves.toContain('<p>hi</p>');
  });

  it('fetchData 在 render 之前执行', async () => {
    const id = uid();
    const order: string[] = [];
    registerServerComponent({
      id,
      name: 'C',
      fetchData: async () => {
        order.push('fetch');
        return {};
      },
      render: async () => {
        order.push('render');
        return '<div/>';
      },
    });

    await renderServerComponent(id);

    expect(order).toEqual(['fetch', 'render']);
  });

  it('fetchData 抛错 ⇒ 渲染失败（不静默吞掉）', async () => {
    const id = uid();
    registerServerComponent({
      id,
      name: 'C',
      fetchData: async () => {
        throw new Error('db down');
      },
      render: async () => '<div/>',
    });

    await expect(renderServerComponent(id)).rejects.toThrow('db down');
  });

  it('serializeData 结果被注入到 window.__LYTJS_SERVER_DATA__', async () => {
    const id = uid();
    registerServerComponent({
      id,
      name: 'C',
      render: async () => '<div/>',
      serializeData: () => serializeServerData({ n: 1 }),
    });

    const html = await renderServerComponent(id);

    expect(html).toContain('window.__LYTJS_SERVER_DATA__={"n":1};');
  });

  it('★ 数据里出现 </script> 时不得提前闭合脚本标签（防注入）', async () => {
    const id = uid();
    const evil = '</script><img src=x onerror=alert(1)>';
    registerServerComponent({
      id,
      name: 'C',
      render: async () => '<div/>',
      serializeData: () => serializeServerData({ evil }),
    });

    const html = await renderServerComponent(id);

    // 只有一个 </script>（注入脚本自己的结尾）；出现第二个说明被数据闭合了
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    expect(html).not.toContain('<img src=x');

    // 数据本身必须仍可还原（转义不能破坏 JSON 语义）
    const payload = html.slice(html.indexOf('=') + 1, html.lastIndexOf(';'));
    expect(JSON.parse(payload)).toEqual({ evil });
  });

  it('没有 serializeData 时不注入脚本', async () => {
    const id = uid();
    registerServerComponent({ id, name: 'C', render: async () => '<div/>' });

    const html = await renderServerComponent(id);

    expect(html).toBe('<div/>');
  });
});

describe('defineServerComponent', () => {
  it('自动注册并原样返回定义', () => {
    const id = uid();
    const comp = defineServerComponent({ id, name: 'C', render: async () => '<i/>' });

    expect(getServerComponent(id)).toBe(comp);
    expect(comp.id).toBe(id);
  });

  it('未提供 serializeData 时默认序列化空对象', () => {
    const comp = defineServerComponent({ id: uid(), name: 'C', render: async () => '' });

    expect(comp.serializeData!()).toBe('{}');
  });

  it('显式 serializeData 优先于默认实现', () => {
    const comp = defineServerComponent({
      id: uid(),
      name: 'C',
      render: async () => '',
      serializeData: () => '{"custom":true}',
    });

    expect(comp.serializeData!()).toBe('{"custom":true}');
  });
});

describe('Server Function 运行时（编译器生成代码依赖的两个函数）', () => {
  it('createServerReference 打标记并原样返回函数', async () => {
    const { createServerReference } = await import('../src/server/server-components');
    const fn = async (x: unknown) => x;
    const returned = createServerReference('save', fn);

    expect(returned).toBe(fn);
    expect((fn as unknown as { __serverReferenceId: string }).__serverReferenceId).toBe('save');
    expect((fn as unknown as { __isServerReference: boolean }).__isServerReference).toBe(true);
  });

  it('createServerProxy 按约定 POST 并透传结果', async () => {
    const { createServerProxy } = await import('../src/client/server-components-client');
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: 1 }) }));
    vi.stubGlobal('fetch', fetchMock);

    const proxy = createServerProxy<(...a: unknown[]) => Promise<unknown>>('MyComp', 'save');
    const result = await proxy({ a: 1 }, 2);

    expect(result).toEqual({ ok: 1 });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/__lytjs_server_action');
    expect((init.headers as Record<string, string>)['X-Server-Component']).toBe('MyComp');
    expect((init.headers as Record<string, string>)['X-Server-Function']).toBe('save');
    expect(JSON.parse(init.body as string)).toEqual({ args: [{ a: 1 }, 2] });
  });

  it('createServerProxy 在非 2xx 时抛出带状态文本的错误', async () => {
    const { createServerProxy } = await import('../src/client/server-components-client');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, statusText: 'Bad Gateway' })),
    );

    const proxy = createServerProxy<() => Promise<unknown>>('C', 'boom');

    await expect(proxy()).rejects.toThrow(/Server function boom failed: Bad Gateway/);
  });

  it('★ 编译器生成代码用的子路径 @lytjs/renderer/server 与 /client 必须真实存在', async () => {
    // 这两条 import 是 `compiler/src/server-components` 生成代码里的**原文**；
    // 子路径不存在或名字对不上，生成的文件连 import 都过不去。
    //
    // ⚠️ 不能用 `import('@lytjs/renderer/server')` 验证：vitest 把 `@lytjs/renderer`
    //    **前缀**别名到了 `dist/index.mjs`，会把子路径拼成 `dist/index.mjs/server`。
    //    这里改为直接核对 `exports` 映射 + 映射目标文件是否存在（这才是消费方真正走的解析路径）。
    const { readFileSync, existsSync } = await import('node:fs');
    const pkgPath = new URL('../package.json', import.meta.url);
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
      exports: Record<string, { import?: string; require?: string; types?: string }>;
    };

    for (const sub of ['./server', './client']) {
      const entry = pkg.exports[sub];
      expect(entry, `缺少 exports["${sub}"]`).toBeDefined();
      for (const key of ['import', 'require', 'types'] as const) {
        const target = entry[key]!;
        expect(existsSync(new URL(`../${target}`, import.meta.url)), `缺少产物 ${target}`).toBe(
          true,
        );
      }
    }

    // 名字也要对得上：生成代码 import 的是这两个具名导出
    const srv = await import('../src/server/server-components');
    const cli = await import('../src/client/server-components-client');

    expect(typeof (srv as Record<string, unknown>).createServerReference).toBe('function');
    expect(typeof (cli as Record<string, unknown>).createServerProxy).toBe('function');
  });
});
