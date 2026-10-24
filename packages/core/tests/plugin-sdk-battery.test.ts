// @vitest-environment jsdom
/**
 * `core/src/plugin-sdk.ts`（335 行、103 条未覆盖 = 35%）。
 *
 * 它对外是「插件开发 SDK + 插件测试器」：`definePlugin` / `validatePluginConfig` /
 * `transformPluginConfig` / `mergePluginConfig` / `PluginTester` / `testPluginInstall`。
 * 此前只有 `definePlugin` 的主干被执行过，**测试器（PluginTester）整段 0 覆盖**。
 *
 * 判据重点：**异步 install 到底有没有被等到** —— 这是「测试器」最核心的语义，
 * 也是 `app.use()` 同步返回时最容易静默出错的地方。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  definePlugin,
  validatePluginConfig,
  transformPluginConfig,
  mergePluginConfig,
  PluginTester,
  createPluginTester,
  testPluginInstall,
} from '../src/plugin-sdk';
import type { EnhancedPlugin } from '../src/types';

/** 校验器要求的**嵌套**形态：`object.properties` */
const NESTED_SCHEMA = {
  type: 'object' as const,
  object: {
    properties: {
      theme: { type: 'string' as const, default: 'light' },
      count: { type: 'number' as const },
    },
  },
};

/** JSON-Schema 风格的**扁平**形态（SDK 早期文档就是这么写的） */
const FLAT_SCHEMA = {
  type: 'object' as const,
  properties: {
    theme: { type: 'string' as const, default: 'light' },
    count: { type: 'number' as const },
  },
};

/** 一个带 schema 的插件：theme 有默认值、count 必须是数字 */
function makeSchemaPlugin(install = vi.fn(), schema: unknown = NESTED_SCHEMA) {
  return definePlugin({
    name: 'demo',
    version: '1.0.0',
    description: 'demo plugin',
    author: 'tester',
    keywords: ['demo'],
    schema: schema as never,
    install,
  });
}

function makePlainPlugin(install = vi.fn()) {
  return definePlugin({ name: 'plain', install });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('definePlugin', () => {
  it('把 name / version / meta / schema 原样带上', () => {
    const p = makeSchemaPlugin();

    expect(p.name).toBe('demo');
    expect(p.version).toBe('1.0.0');
    expect(p.meta).toEqual({
      description: 'demo plugin',
      author: 'tester',
      keywords: ['demo'],
    });
    expect(p.configSchema).toBeDefined();
  });

  it('没有 schema 时把原始 options 透传给 install', async () => {
    const install = vi.fn();
    const p = makePlainPlugin(install);

    await p.install({} as never, { a: 1 });

    expect(install).toHaveBeenCalledWith({}, { a: 1 });
  });

  it('有 schema 时 install 收到**转换后**的配置（默认值已填充）', async () => {
    const install = vi.fn();
    const p = makeSchemaPlugin(install);

    await p.install({} as never, { count: 3 });

    expect(install).toHaveBeenCalledTimes(1);
    expect((install.mock.calls[0] as unknown[])[1]).toEqual({ theme: 'light', count: 3 });
  });

  it('★ 扁平 `properties` 写法（SDK 原文档示例）必须被归一化，否则校验会静默放行', async () => {
    const install = vi.fn();
    const p = makeSchemaPlugin(install, FLAT_SCHEMA);

    // 归一化后 `configSchema.object.properties` 才存在
    expect(
      (p.configSchema as unknown as { object?: { properties?: unknown } }).object?.properties,
    ).toBeDefined();

    // 合法配置：默认值被填充
    await p.install({} as never, { count: 1 });
    expect((install.mock.calls[0] as unknown[])[1]).toEqual({ theme: 'light', count: 1 });

    // 非法配置：必须抛错（修复前 `validateConfig` 恒 true、`transform` 也不填默认值）
    await expect(p.install({} as never, { count: 'bad' })).rejects.toThrow(
      /configuration validation failed/,
    );
  });

  it('配置非法时抛错，错误信息带插件名与字段路径', async () => {
    const install = vi.fn();
    const p = makeSchemaPlugin(install);

    await expect(p.install({} as never, { count: 'not-a-number' })).rejects.toThrow(
      /Plugin "demo" configuration validation failed: .*count/,
    );
    expect(install).not.toHaveBeenCalled();
  });

  it('★ configReport 反映最近一次安装的校验结果（此前从未被赋值）', async () => {
    const p = makeSchemaPlugin();

    await p.install({} as never, { count: 1 });
    expect(p.configReport?.valid).toBe(true);
    expect(p.configReport?.errorCount).toBe(0);

    await expect(p.install({} as never, { count: 'bad' })).rejects.toThrow();
    expect(p.configReport?.valid).toBe(false);
    expect(p.configReport?.errorCount).toBeGreaterThan(0);
  });
});

describe('配置工具函数', () => {
  it('无 schema：validate 恒通过 / transform 原样 / merge 浅合并', () => {
    const p = makePlainPlugin();

    expect(validatePluginConfig(p, { any: 1 })).toMatchObject({ valid: true, errorCount: 0 });
    expect(transformPluginConfig(p, { any: 1 })).toMatchObject({
      config: { any: 1 },
      success: true,
    });
    expect(mergePluginConfig(p, { a: 1, b: 2 }, { b: 3 })).toMatchObject({
      config: { a: 1, b: 3 },
      success: true,
    });
  });

  it('有 schema：三条路径都走真实校验/转换', () => {
    const p = makeSchemaPlugin();

    const valid = validatePluginConfig(p, { count: 1 });
    expect(valid.valid).toBe(true);

    const invalid = validatePluginConfig(p, { count: 'x' });
    expect(invalid.valid).toBe(false);
    expect(invalid.errorCount).toBeGreaterThan(0);

    const transformed = transformPluginConfig(p, { count: 2 });
    expect(transformed.success).toBe(true);
    expect(transformed.config).toMatchObject({ theme: 'light', count: 2 });

    const merged = mergePluginConfig(p, { theme: 'dark' } as never, { count: 5 } as never);
    expect(merged.success).toBe(true);
    expect(merged.config).toMatchObject({ theme: 'dark', count: 5 });
  });
});

describe('PluginTester · 基础', () => {
  it('构造时可省略全部选项（回调有默认值）', () => {
    expect(() => new PluginTester()).not.toThrow();
  });

  it('createApp 创建实例并可由 getApp 取到', async () => {
    const tester = new PluginTester();

    const app = await tester.createApp();

    expect(app).toBeTruthy();
    expect(tester.getApp()).toBe(app);

    tester.cleanup();
  });

  it('installPlugin 会自动先创建 App', async () => {
    const tester = new PluginTester();
    expect(tester.getApp()).toBeNull();

    await tester.installPlugin(makePlainPlugin());

    expect(tester.getApp()).not.toBeNull();
    tester.cleanup();
  });

  it('installPlugin 触发 before/after 钩子并记录插件名', async () => {
    const calls: string[] = [];
    const tester = new PluginTester({
      onBeforeInstall: () => calls.push('before'),
      onAfterInstall: () => calls.push('after'),
    });

    await tester.installPlugin(makePlainPlugin());

    expect(calls).toEqual(['before', 'after']);
    expect(tester.getInstalledPlugins()).toEqual(['plain']);
    tester.cleanup();
  });

  it('debug 模式打印安装/卸载日志', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const tester = new PluginTester({ debug: true });

    await tester.installPlugin(makePlainPlugin());
    tester.uninstallPlugin('plain');

    expect(log.mock.calls.map((c) => String(c[0])).join('\n')).toContain(
      'Installing plugin: plain',
    );
    tester.cleanup();
  });

  it('uninstallPlugin 从注册表与列表中移除；未安装时安全 no-op', async () => {
    const tester = new PluginTester();
    await tester.installPlugin(makePlainPlugin());

    tester.uninstallPlugin('plain');
    expect(tester.getInstalledPlugins()).toEqual([]);
    expect(tester.getApp()!._pluginRegistry.has('plain')).toBe(false);

    expect(() => tester.uninstallPlugin('never-installed')).not.toThrow();
    tester.cleanup();
  });

  it('cleanup 卸载 App、清空列表并调 onCleanup', async () => {
    const onCleanup = vi.fn();
    const tester = new PluginTester({ onCleanup });
    await tester.installPlugin(makePlainPlugin());
    const app = tester.getApp()!;

    tester.cleanup();

    expect(onCleanup).toHaveBeenCalledTimes(1);
    expect(tester.getApp()).toBeNull();
    expect(tester.getInstalledPlugins()).toEqual([]);
    // ⚠️ 不断言「已卸载的 app 不能再 mount」：这个 app **从未 mount 过**，
    //    `app.unmount()` 里 `if (!context.renderer || !context._vnode) return;`
    //    会直接返回（不会把 `_isUnmounted` 置真），所以再 mount 是允许的。
    expect(app).toBeTruthy();
  });

  it('createPluginTester 返回 PluginTester 实例', () => {
    expect(createPluginTester()).toBeInstanceOf(PluginTester);
  });
});

describe('PluginTester · 异步与校验', () => {
  it('★ 异步 install 必须被等到（此前 use 同步返回，install 还在跑就报「已安装」）', async () => {
    let finished = false;
    const plugin = definePlugin({
      name: 'async-plugin',
      install: async () => {
        await new Promise((r) => setTimeout(r, 20));
        finished = true;
      },
    });

    const tester = new PluginTester();
    await tester.installPlugin(plugin);

    // 修复前：`app.use()` 同步返回 ⇒ 这里 finished 仍是 false，
    // 且 `testPluginInstall` 的 finally 会**在安装完成前就 cleanup()**。
    expect(finished).toBe(true);
    tester.cleanup();
  });

  it('★ 异步 install 抛错必须冒泡到调用方（不能变成 unhandledRejection）', async () => {
    const plugin = definePlugin({
      name: 'boom-plugin',
      install: async () => {
        await new Promise((r) => setTimeout(r, 5));
        throw new Error('install failed');
      },
    });

    const tester = new PluginTester();

    await expect(tester.installPlugin(plugin)).rejects.toThrow(/install failed/);
    tester.cleanup();
  });

  it('★ 配置非法时调用 onValidationError，并且**不继续安装**', async () => {
    const install = vi.fn();
    const onValidationError = vi.fn();
    const tester = new PluginTester({ onValidationError });

    await expect(
      tester.installPlugin(makeSchemaPlugin(install) as EnhancedPlugin, { count: 'bad' }),
    ).rejects.toThrow(/configuration validation failed/);

    expect(onValidationError).toHaveBeenCalledTimes(1);
    expect(install).not.toHaveBeenCalled();
    tester.cleanup();
  });
});

describe('testPluginInstall', () => {
  it('成功时返回 success 与 app', async () => {
    const result = await testPluginInstall(makePlainPlugin());

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.app).toBeTruthy();
  });

  it('install 抛错时返回 success:false 与归一化的 Error', async () => {
    const plugin = definePlugin({
      name: 'throws',
      install: () => {
        throw new Error('boom');
      },
    });

    const result = await testPluginInstall(plugin);

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('boom');
  });

  it('抛出非 Error 时也归一化成 Error', async () => {
    const plugin = definePlugin({
      name: 'throws-string',
      install: () => {
        throw 'plain string';
      },
    });

    const result = await testPluginInstall(plugin);

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('plain string');
  });

  it('★ 配置非法时返回 success:false（此前会报成功）', async () => {
    const result = await testPluginInstall(makeSchemaPlugin() as EnhancedPlugin, { count: 'bad' });

    expect(result.success).toBe(false);
    expect(result.error?.message).toMatch(/configuration validation failed/);
  });

  it('无论成败都会 cleanup（app 不残留）', async () => {
    const onCleanup = vi.fn();
    await testPluginInstall(makePlainPlugin(), undefined, { onCleanup });

    expect(onCleanup).toHaveBeenCalledTimes(1);
  });
});

describe('PluginTester · appConfig', () => {
  it('★ appConfig.globalProperties 应作用到测试 App 上（此前完全被忽略）', async () => {
    const tester = new PluginTester({ appConfig: { globalProperties: { $api: 'X' } } });
    const app = await tester.createApp();

    expect(app.config.globalProperties.$api).toBe('X');
    tester.cleanup();
  });
});
