// @vitest-environment jsdom
/**
 * 两个入口的分工（P1-N 回归）
 *
 * ## 背景
 *
 * `@lytjs/core` 的 `createApp` 支持 `options.template`，为此必须静态依赖
 * `@lytjs/compiler`（~98 KB raw）。此前这份依赖是**无条件**的 —— 任何
 * `import { createApp } from '@lytjs/core'` 的应用都被迫付这份体积。
 *
 * 现在拆成两个入口：
 *   · `@lytjs/core`         → 带编译器，`template` 可用
 *   · `@lytjs/core/runtime` → 不含编译器，靠 AOT 预编译 / 手写 render
 *
 * 本文件锁住三件事：
 *   ① 两个入口的导出面差异**只有**编译器相关那几个；
 *   ② `runtime` 的 `createApp` 确实不注入编译器（`template` 不生效 + 有 DEV 告警）；
 *   ③ 主入口的 `createApp` 确实注入（`template` 生效）。
 *
 * ⚠️ `setTemplateCompiler` 是**全局**注入点，所以每个用例都先 `null` 重置 ——
 *   否则用例顺序会决定结论（这正是 component-init-battery 踩过的坑）。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setTemplateCompiler } from '@lytjs/component';

import * as mainEntry from '../src/index';
import * as runtimeEntry from '../src/runtime';
import { createApp as createAppWithCompiler } from '../src/create-app-with-compiler';
import { createApp as createAppRuntime } from '../src/create-app';

const tick = (ms = 20): Promise<void> => new Promise((r) => setTimeout(r, ms));

function makeHost(): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  return host;
}

describe('@lytjs/core 的两个入口（P1-N 回归）', () => {
  beforeEach(() => {
    setTemplateCompiler(null as never);
  });

  afterEach(() => {
    setTemplateCompiler(null as never);
  });

  it('runtime 入口不导出编译器相关 API', () => {
    expect((runtimeEntry as Record<string, unknown>).compile).toBeUndefined();
    expect((runtimeEntry as Record<string, unknown>).compileTemplateToRender).toBeUndefined();
    expect((runtimeEntry as Record<string, unknown>).clearTemplateRenderCache).toBeUndefined();
  });

  it('主入口导出编译器相关 API', () => {
    expect(typeof (mainEntry as Record<string, unknown>).compile).toBe('function');
    expect(typeof (mainEntry as Record<string, unknown>).compileTemplateToRender).toBe('function');
  });

  it('SSR 入口只在主入口转出（runtime 必须保持「不含编译器」）', () => {
    // ⚠️ 2026-10-28 新增：`renderToString` 需要一个模板编译器才能渲染 `template` 组件，
    //   所以它**只能**出现在主入口。若哪天有人图方便把它加进 `./runtime`，
    //   `./template-compiler` 会被静态拉进 runtime 的图 ⇒ 该入口立刻失去存在意义
    //   （实测两者差 52 KB）。这条断言就是那个「不许」。
    expect(typeof (mainEntry as Record<string, unknown>).renderToString).toBe('function');
    expect(typeof (mainEntry as Record<string, unknown>).renderToStream).toBe('function');

    expect((runtimeEntry as Record<string, unknown>).renderToString).toBeUndefined();
    expect((runtimeEntry as Record<string, unknown>).renderToStream).toBeUndefined();
  });

  it('两个入口的 createApp 是不同函数（一个注入编译器、一个不注入）', () => {
    expect(createAppWithCompiler).not.toBe(createAppRuntime);
    // 主入口的 createApp 必须来自 with-compiler 版本
    expect(mainEntry.createApp).toBe(createAppWithCompiler);
    expect(runtimeEntry.createApp).toBe(createAppRuntime);
  });

  it('主入口的 createApp 使 template 生效', async () => {
    const app = createAppWithCompiler({ template: '<div class="ok">hi</div>' } as never);
    const host = makeHost();
    await app.mount(host);
    await tick();

    expect(host.querySelector('.ok')).not.toBeNull();
    expect(host.textContent).toContain('hi');
  });

  it('runtime 的 createApp 不注入编译器 ⇒ template 不生效且有 DEV 告警', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const app = createAppRuntime({ template: '<div class="nope">hi</div>' } as never);
    const host = makeHost();
    await app.mount(host);
    await tick();

    // 模板没被编译 ⇒ 那个 class 不会出现
    expect(host.querySelector('.nope')).toBeNull();
    // 但**不能静默** —— 必须有一条能指导用户的告警
    const warned = warnSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(warned).toContain('template');
    expect(warned).toContain('@lytjs/core/runtime');

    warnSpy.mockRestore();
  });

  it('runtime 的 createApp 对「手写 render」完全正常', async () => {
    const app = createAppRuntime({
      render: () => null,
      setup: () => ({}),
    } as never);
    const host = makeHost();
    await expect(app.mount(host)).resolves.not.toThrow?.();
  });
});
