/**
 * `@lytjs/common-error` —— 开发期诊断通道（2026-11-04）
 *
 * 这三个 API（`warn` / `warnOnce` / `getDevMode`）此前**零测试覆盖**，
 * 于是它们静默腐化成了「产物里恒为 `return;`」也没人发现。
 *
 * 这里锁的是**行为**：调用之后 `console.warn` 到底有没有收到东西。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { warn, warnOnce, error, getDevMode, setDevMode } from '../src';

const setDev = (value: boolean | undefined): void => {
  // `setDevMode(undefined)` = 清掉运行时开关，回到默认判定
  setDevMode(value as boolean);
  if (value === undefined) delete (globalThis as Record<string, unknown>).__DEV__;
};

let warnSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  setDev(undefined);
});

afterEach(() => {
  warnSpy.mockRestore();
  errorSpy.mockRestore();
  setDev(undefined);
});

describe('warn', () => {
  it('开发模式下输出，且带 `[LytJS]: ` 前缀', () => {
    setDev(true);
    warn('测试警告');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith('[LytJS]: 测试警告');
  });

  it('关闭开发模式后静默', () => {
    setDev(false);
    warn('不该出现');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('每次调用都输出（不做去重）', () => {
    setDev(true);
    warn('同一条');
    warn('同一条');
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });
});

describe('warnOnce', () => {
  it('同一消息只输出一次', () => {
    setDev(true);
    warnOnce('只出现一次');
    warnOnce('只出现一次');
    warnOnce('只出现一次');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith('[LytJS]: 只出现一次');
  });

  it('不同消息各自输出', () => {
    setDev(true);
    warnOnce('A');
    warnOnce('B');
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });

  it('关闭开发模式时静默（也不占用「已警告」名额）', () => {
    setDev(false);
    warnOnce('静默期间的');
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('error', () => {
  it('始终输出（走 console.error，生产环境也不静音）', () => {
    setDev(false);
    error('出错了');
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(String(errorSpy.mock.calls[0]?.[0])).toContain('出错了');
  });
});

describe('getDevMode / setDevMode', () => {
  it('setDevMode 能真正改变 getDevMode 的结果（此前完全无效）', () => {
    setDev(true);
    expect(getDevMode()).toBe(true);
    setDev(false);
    expect(getDevMode()).toBe(false);
    setDev(true);
    expect(getDevMode()).toBe(true);
  });

  it('setDevMode 会同步写到 globalThis.__DEV__', () => {
    setDev(false);
    expect((globalThis as Record<string, unknown>).__DEV__).toBe(false);
    setDev(true);
    expect((globalThis as Record<string, unknown>).__DEV__).toBe(true);
  });

  it('宿主注入 globalThis.__DEV__ 也生效', () => {
    setDev(undefined);
    (globalThis as Record<string, unknown>).__DEV__ = false;
    expect(getDevMode()).toBe(false);
    (globalThis as Record<string, unknown>).__DEV__ = true;
    expect(getDevMode()).toBe(true);
  });
});
