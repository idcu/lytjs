// @vitest-environment jsdom
/**
 * 行为级判据：`@lytjs/renderer` 的**懒加载门面**（`src/index.ts` 的 16 个 `async function`）
 *
 * ## 为什么要有这条
 *
 * `src/index.ts` 是 `@lytjs/renderer` 的**公开入口**，其中大部分导出是
 * 「`async function` 内部 `await import('./xxx')` 再委托」的**懒加载门面**
 * （为了把 SSR / Vapor / Island 等重模块从首屏剥掉）。
 *
 * 这类门面本身没有逻辑，但有一个**真实风险**：委托目标被改名/挪走后，
 * 门面会变成运行时才炸的 `undefined is not a function`——而单元测试通常直接 import 真实模块，
 * 正好绕过门面。本文件就是**逐个把门面调一遍**，确认委托链没断。
 *
 * 与 `tests/plugin-system-battery.test.ts` 互补：那边测插件系统的**逻辑**，这边测**委托**。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createVNode } from '@lytjs/vdom';
import {
  getEnhancedHydrationFunctions,
  renderToString,
  renderToStream,
  createOptimizedStream,
  renderDocumentToStream,
  hydrateIsland,
  registerIslandComponent,
  createIslandSSRContent,
  createSignalRenderer,
  createVaporRenderer,
  defineVaporComponent,
  createVaporApp,
  getVaporHMRFunctions,
  renderVaporToString,
  renderVaporToStream,
  hydrateVaporComponent,
} from '../src/index';

let container: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '';
  container = document.createElement('div');
  document.body.appendChild(container);
});

// ⚠️ 必须用 `createVNode()` 造 vnode：SSR 渲染器按 `shapeFlag` 分派，裸对象会被渲染成空串。
//    注意 `@lytjs/vdom` **不导出 `h`**（`h` 在 `@lytjs/core` 里）。
const vnode = createVNode('div', null, 'hello');
const comp = { template: '<div>hi</div>' } as never;

// ==================== 聚合器 ====================

describe('聚合器门面', () => {
  it('getEnhancedHydrationFunctions 的 5 个成员都是函数', async () => {
    const api = await getEnhancedHydrationFunctions();

    for (const k of [
      'hydrateApp',
      'hydrateVisible',
      'queueHydration',
      'safeHydrate',
      'createHydrationErrorHandler',
    ] as const) {
      expect(typeof api[k], k).toBe('function');
    }
  });

  it('getVaporHMRFunctions 的 9 个成员都是函数', async () => {
    const api = await getVaporHMRFunctions();

    for (const k of [
      'generateComponentId',
      'registerComponent',
      'unregisterComponent',
      'handleComponentUpdate',
      'createVaporHMRHandler',
      'isHMRAvailable',
      'forceRerender',
      'clearHMRState',
      'onHMRUpdate',
    ] as const) {
      expect(typeof api[k], k).toBe('function');
    }
  });
});

// ==================== SSR 门面 ====================

describe('SSR 门面', () => {
  it('renderToString 委托到 ssr-renderer 并返回字符串', async () => {
    const html = await renderToString({ vnode });

    expect(typeof html).toBe('string');
    expect(html).toContain('hello');
  });

  it('renderToString 支持 hydrateMarkers 选项（不抛错）', async () => {
    await expect(renderToString({ vnode, hydrateMarkers: true })).resolves.toBeTypeOf('string');
  });

  it('renderToStream 返回可读流', async () => {
    const stream = await renderToStream({ vnode });

    expect(stream).toBeInstanceOf(ReadableStream);
  });

  it('createOptimizedStream / renderDocumentToStream 返回可读流', async () => {
    expect(await createOptimizedStream(vnode)).toBeInstanceOf(ReadableStream);
    expect(await renderDocumentToStream(vnode)).toBeInstanceOf(ReadableStream);
  });
});

// ==================== Island 门面 ====================

describe('Island 门面', () => {
  it('registerIslandComponent + createIslandSSRContent 往返', async () => {
    await registerIslandComponent('Counter', comp);

    const html = await createIslandSSRContent('Counter', { start: 1 });

    expect(typeof html).toBe('string');
  });

  it('hydrateIsland 能在元素上执行（不抛错）', async () => {
    const el = document.createElement('div');
    container.appendChild(el);

    await expect(hydrateIsland(el, comp)).resolves.toBeUndefined();
  });
});

// ==================== Vapor / Signal 门面 ====================

describe('Vapor / Signal 门面', () => {
  it('createSignalRenderer 返回带 render 的渲染器', async () => {
    const r = (await createSignalRenderer('<div>{{ a }}</div>', { a: 1 })) as {
      render: unknown;
    };

    expect(r).toBeTruthy();
    expect(typeof r.render).toBe('function');
  });

  it('createVaporRenderer 是 createSignalRenderer 的别名（同样可用）', async () => {
    const r = (await createVaporRenderer('<div>x</div>', {})) as { render: unknown };

    expect(typeof r.render).toBe('function');
  });

  it('defineVaporComponent 返回组件定义', async () => {
    const def = await defineVaporComponent({ template: '<div/>' });

    expect(def).toBeTruthy();
  });

  it('createVaporApp 返回带 mount 的应用对象', async () => {
    const app = (await createVaporApp(comp)) as { mount?: unknown; unmount?: unknown };

    expect(app).toBeTruthy();
    expect(typeof app.mount).toBe('function');
  });

  it('renderVaporToString 返回结果对象（含 html）', async () => {
    // 返回的是 `VaporSSRResult`（`{ html, prefetchData?, scripts?, styles? }`），不是裸字符串
    const result = (await renderVaporToString(comp)) as { html: string };

    expect(typeof result.html).toBe('string');
  });

  it('renderVaporToStream 返回结果对象（含 stream 与 prefetchData）', async () => {
    // 返回的是 `VaporSSRStreamResult`（`{ stream, prefetchData }`）
    const result = (await renderVaporToStream(comp)) as {
      stream: ReadableStream;
      prefetchData: Promise<unknown>;
    };

    expect(result.stream).toBeInstanceOf(ReadableStream);
    expect(typeof result.prefetchData?.then).toBe('function');
  });

  it('hydrateVaporComponent 在容器上执行（不抛错）', async () => {
    await expect(hydrateVaporComponent(container, comp)).resolves.toBeUndefined();
  });
});
