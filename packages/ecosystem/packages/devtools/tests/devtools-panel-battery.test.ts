// @vitest-environment jsdom
/**
 * 行为级判据：`@lytjs/devtools` 的**面板 UI**（`src/devtools.ts`，854 行）
 *
 * ## 为什么要有这条
 *
 * 实测该文件 **218/266 语句未覆盖（18%）** —— 未覆盖区间是 `createPanel` 的事件绑定、
 * `renderTab` 的六个分支、六个 `render*Tab`、`open` / `close` / `toggle` / `refresh`。
 * 既有 `tests/index.test.ts` 只碰到 `installDevTools` / `getDevTools` 的皮毛。
 *
 * ## 本文件盯的核心问题
 *
 * `refresh()` 靠 `document.querySelector('.lytjs-devtools-tab.active')` 找「当前标签」，
 * 但标签点击处理器只改**内联样式**、从不加 `active` 类 ⇒ 查询恒为 null ⇒ 刷新是空操作。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { installDevTools, getDevTools, uninstallDevTools } from '../src/devtools';
import { registerStore, clearStoreRegistry } from '../src/storeInspector';
import { registerSignal, clearSignalRegistry } from '../src/signalsInspector';

let warns: string[];

beforeEach(() => {
  uninstallDevTools();
  clearStoreRegistry();
  clearSignalRegistry();
  document.body.innerHTML = '';
  warns = [];
  vi.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => {
    warns.push(a.join(' '));
  });
});

afterEach(() => {
  uninstallDevTools();
  vi.restoreAllMocks();
});

const panel = (): HTMLElement | null => document.getElementById('lytjs-devtools');
const content = (): HTMLElement | null => document.getElementById('lytjs-devtools-content');

/** 点击某个标签（按 data-tab 找按钮） */
const clickTab = (name: string): void => {
  const btn = panel()!.querySelector(`.lytjs-devtools-tab[data-tab="${name}"]`) as HTMLElement;
  btn.click();
};

// ==================== 安装 / 卸载 ====================

describe('installDevTools / uninstallDevTools', () => {
  it('安装后面板挂到 body，且 getDevTools 返回同一实例（单例）', () => {
    const api = installDevTools();

    expect(panel()).not.toBeNull();
    expect(getDevTools()).toBe(api);
    expect(installDevTools()).toBe(api);
  });

  it('enabled: false ⇒ 不创建面板', () => {
    installDevTools({ enabled: false });

    expect(panel()).toBeNull();
  });

  it('卸载后面板被移除、getDevTools 归 null', () => {
    installDevTools();
    uninstallDevTools();

    expect(panel()).toBeNull();
    expect(getDevTools()).toBeNull();
  });

  it('重复安装不会产生第二个面板', () => {
    installDevTools();
    installDevTools();

    expect(document.querySelectorAll('#lytjs-devtools')).toHaveLength(1);
  });
});

// ==================== 开合 ====================

describe('open / close / toggle', () => {
  it('open 把面板滑入（right=0），close 滑出', () => {
    const api = installDevTools();

    api.open();
    expect(panel()!.style.right).toBe('0px');

    api.close();
    expect(panel()!.style.right).toBe('-300px');
  });

  it('size 选项影响滑出距离', () => {
    const api = installDevTools({ size: 420 });

    api.close();
    expect(panel()!.style.right).toBe('-420px');
  });

  it('toggle 按当前状态来回切换', () => {
    const api = installDevTools();

    api.toggle();
    expect(panel()!.style.right).toBe('0px');

    api.toggle();
    expect(panel()!.style.right).toBe('-300px');
  });

  it('Ctrl/Cmd+Shift+D 快捷键可切换面板', () => {
    installDevTools();

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'D', ctrlKey: true, shiftKey: true, cancelable: true }),
    );
    expect(panel()!.style.right).toBe('0px');
  });
});

// ==================== 标签页 ====================

describe('标签页渲染', () => {
  it('默认渲染「组件」标签，空态给出指引文案', () => {
    installDevTools();

    expect(content()!.innerHTML).toContain('No components found');
  });

  it('点击 store 标签 ⇒ 切换到 store 内容（空态）', () => {
    installDevTools();

    clickTab('store');

    expect(content()!.innerHTML).toContain('No stores registered');
  });

  it('点击 signals 标签 ⇒ 显示 Signals 计数', () => {
    registerSignal({ id: 's1' } as never);
    installDevTools();

    clickTab('signals');

    expect(content()!.innerHTML).toContain('Signals (1)');
  });

  it('六个标签都能切换且不抛错', () => {
    installDevTools();

    for (const tab of ['components', 'store', 'router', 'signals', 'vdom', 'performance']) {
      expect(() => clickTab(tab)).not.toThrow();
    }
  });
});

// ==================== 刷新 ====================

describe('refresh', () => {
  it('★ refresh 必须重新渲染**当前标签**（切到 store 后新注册的 store 要出现）', () => {
    const api = installDevTools();
    api.open();

    clickTab('store');
    expect(content()!.innerHTML).toContain('No stores registered');

    // 面板打开期间数据变了
    registerStore('myStore', { n: 1 } as never);

    api.refresh();

    // 修复前：`refresh()` 查 `.lytjs-devtools-tab.active` 恒为 null ⇒ 什么都不做
    expect(content()!.innerHTML).toContain('myStore');
  });

  it('★ 关闭再打开也应反映最新数据（open 内部会 refresh）', () => {
    const api = installDevTools();

    clickTab('store');
    api.close();
    registerStore('laterStore', { n: 2 } as never);

    api.open();

    expect(content()!.innerHTML).toContain('laterStore');
  });

  it('refresh 在面板不存在时不抛错', () => {
    const api = installDevTools();
    uninstallDevTools();

    expect(() => api.refresh()).not.toThrow();
  });
});
