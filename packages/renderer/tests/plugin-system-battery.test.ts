// @vitest-environment jsdom
/**
 * 行为级判据：`@lytjs/renderer` 的**插件系统与生命周期钩子**（`src/index.ts`，536 行）
 *
 * ## 为什么要有这条
 *
 * 实测该文件 **223/238 语句未覆盖（6.3%）**。原因是它大部分是**懒加载门面**
 * （`async function` 内部 `await import(...)` 再委托），而测试都直接 import 真实模块。
 * 但其中 **106-191 是真正的逻辑**：`use` / `removePlugin` / `executeHooks`，
 * 操作的是**模块级可变状态**（`installedPlugins` + `hooks`）—— 这类全局状态一旦装/卸不对称，
 * 会跨 app、跨测试互相污染，且不会报错。
 *
 * 另外顺带守两个**聚合器**（`getEnhancedHydrationFunctions` / `getVaporHMRFunctions`）：
 * 它们按名字取模块成员，一旦上游改名就会静默变成 `undefined`。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  use,
  getInstalledPlugins,
  isPluginInstalled,
  removePlugin,
  executeHooks,
  getEnhancedHydrationFunctions,
  getVaporHMRFunctions,
} from '../src/index';
import type { RendererPlugin } from '../src/index';

let warns: string[];

beforeEach(() => {
  // 清空模块级插件状态，避免用例间互相污染
  for (const p of [...getInstalledPlugins()]) {
    removePlugin(p.name);
  }
  warns = [];
  vi.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => {
    warns.push(a.join(' '));
  });
  vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => {
    warns.push(a.join(' '));
  });
});

const makePlugin = (name: string, extra: Partial<RendererPlugin> = {}): RendererPlugin => ({
  name,
  install: vi.fn(),
  ...extra,
});

// ==================== 安装 ====================

describe('use', () => {
  it('安装后出现在已安装列表，且 install 被调用一次', () => {
    const plugin = makePlugin('p1');

    use(plugin);

    expect(plugin.install).toHaveBeenCalledTimes(1);
    expect(getInstalledPlugins().map((p) => p.name)).toEqual(['p1']);
    expect(isPluginInstalled('p1')).toBe(true);
  });

  it('install 收到的 context 提供 on / off', () => {
    let ctx: { on?: unknown; off?: unknown } = {};
    const plugin = makePlugin('ctx', {
      install: (c) => {
        ctx = c as { on?: unknown; off?: unknown };
      },
    });

    use(plugin);

    expect(typeof ctx.on).toBe('function');
    expect(typeof ctx.off).toBe('function');
  });

  it('★ 重复安装同一插件 ⇒ 只装一次，且给出警告', () => {
    const plugin = makePlugin('dup');

    use(plugin);
    use(plugin);

    expect(plugin.install).toHaveBeenCalledTimes(1);
    expect(getInstalledPlugins()).toHaveLength(1);
    expect(warns.join('\n')).toContain('already been installed');
  });

  it('★ 同名但不同对象的插件视为两个（按对象身份去重）', () => {
    use(makePlugin('same'));
    use(makePlugin('same'));

    expect(getInstalledPlugins()).toHaveLength(2);
  });
});

// ==================== 查询 ====================

describe('getInstalledPlugins / isPluginInstalled', () => {
  it('★ 返回的是**副本**：改它不得影响内部状态', () => {
    use(makePlugin('a'));

    const list = getInstalledPlugins() as RendererPlugin[];
    list.push(makePlugin('injected'));

    expect(getInstalledPlugins()).toHaveLength(1);
  });

  it('isPluginInstalled 按名称判定', () => {
    use(makePlugin('known'));

    expect(isPluginInstalled('known')).toBe(true);
    expect(isPluginInstalled('unknown')).toBe(false);
  });
});

// ==================== 移除 ====================

describe('removePlugin', () => {
  it('按名称移除并返回 true；不存在时返回 false', () => {
    use(makePlugin('gone'));

    expect(removePlugin('gone')).toBe(true);
    expect(getInstalledPlugins()).toHaveLength(0);
    expect(removePlugin('gone')).toBe(false);
  });

  it('★ 移除后不再触发该插件注册的钩子', () => {
    const beforeMount = vi.fn();
    use(makePlugin('withHook', { beforeMount }));

    executeHooks('beforeMount', { type: 'div' });
    expect(beforeMount).toHaveBeenCalledTimes(1);

    removePlugin('withHook');

    executeHooks('beforeMount', { type: 'div' });
    expect(beforeMount).toHaveBeenCalledTimes(1); // 没有第二次
  });

  it('★ 移除也应清掉插件在 install 里通过 context.on 注册的钩子', () => {
    // `use()` 有**两条**注册通道：插件对象上的 beforeMount 等属性，以及 install(context) 里的
    // `context.on(event, handler)`。移除时若只清前者，后者会**永久留在全局钩子表里**：
    // 插件已经"卸载"了，它的回调还在跑（跨 app 污染 + 内存泄漏）。
    const viaContext = vi.fn();
    use({
      name: 'viaCtx',
      install: (ctx) => {
        ctx.on('beforeMount', viaContext);
      },
    });

    executeHooks('beforeMount', {});
    expect(viaContext).toHaveBeenCalledTimes(1);

    removePlugin('viaCtx');

    executeHooks('beforeMount', {});
    expect(viaContext).toHaveBeenCalledTimes(1); // 不应再被调用
  });
});

// ==================== 钩子执行 ====================

describe('executeHooks', () => {
  it('多个插件的同名钩子按注册顺序执行', () => {
    const order: string[] = [];
    use(makePlugin('a', { beforeMount: () => order.push('a') }));
    use(makePlugin('b', { beforeMount: () => order.push('b') }));

    executeHooks('beforeMount', {});

    expect(order).toEqual(['a', 'b']);
  });

  it('钩子收到传入的参数', () => {
    const handler = vi.fn();
    use(makePlugin('args', { afterPatch: handler }));
    const vnode = { type: 'div' };

    executeHooks('afterPatch', vnode, 'extra');

    expect(handler).toHaveBeenCalledWith(vnode, 'extra');
  });

  it('★ 某个钩子抛错不影响其余钩子（错误被隔离并记录）', () => {
    const after = vi.fn();
    use(
      makePlugin('boom', {
        beforePatch: () => {
          throw new Error('hook-boom');
        },
      }),
    );
    use(makePlugin('ok', { beforePatch: after }));

    expect(() => executeHooks('beforePatch', {})).not.toThrow();
    expect(after).toHaveBeenCalledTimes(1);
    expect(warns.join('\n')).toContain('hook-boom');
  });

  it('没有注册任何钩子时执行不抛错', () => {
    expect(() => executeHooks('afterUnmount', {})).not.toThrow();
  });
});

// ==================== 聚合器（防「导出被改名」） ====================

describe('懒加载聚合器', () => {
  it('★ getEnhancedHydrationFunctions 的五个成员都是函数', async () => {
    const api = await getEnhancedHydrationFunctions();

    for (const key of [
      'hydrateApp',
      'hydrateVisible',
      'queueHydration',
      'safeHydrate',
      'createHydrationErrorHandler',
    ] as const) {
      expect(typeof api[key], key).toBe('function');
    }
  });

  it('★ getVaporHMRFunctions 的九个成员都是函数', async () => {
    const api = await getVaporHMRFunctions();

    for (const key of [
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
      expect(typeof api[key], key).toBe('function');
    }
  });
});
