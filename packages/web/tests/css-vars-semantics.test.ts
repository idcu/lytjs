/**
 * @vitest-environment jsdom
 *
 * CSS 变量与主题的语义回归（2026-11-04）
 *
 * 与门禁 `scripts/check-web-cssvars.mjs` 的分工：门禁跑 dist，本文件跑 src。
 * 这些缺陷的共同点：**不抛异常**（主题残留、订阅收不到）或**抛得莫名其妙**
 * （`Cannot use 'in' operator ...`）。
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  setCSSVar,
  getCSSVar,
  hasCSSVar,
  removeCSSVar,
  toggleCSSVar,
  normalizeVarName,
  ThemeManager,
  CSSVarObserver,
} from '../src/css-vars';

const root = () => document.documentElement;

afterEach(() => {
  root().removeAttribute('style');
  root().removeAttribute('data-theme');
  vi.restoreAllMocks();
});

describe('写入形态', () => {
  it('★ 简写 setCSSVar("name", value)（与 getCSSVar 对称）', () => {
    setCSSVar('primary', 'red');
    expect(root().style.getPropertyValue('--primary')).toBe('red');
    expect(getCSSVar('primary')).toBe('red');
  });

  it('对象形式（全局 / 元素 + 单位）', () => {
    setCSSVar({ name: 'a', value: '1' });
    expect(getCSSVar('a')).toBe('1');

    const el = document.createElement('div');
    setCSSVar({ element: el, name: 'b', value: 12, options: { unit: 'px' } });
    expect(el.style.getPropertyValue('--b')).toBe('12px');
  });

  it('位置参数形式仍可用（文档标注 deprecated）', () => {
    const el = document.createElement('div');
    setCSSVar(el, 'c', '3');
    expect(el.style.getPropertyValue('--c')).toBe('3');
  });

  it('非法形态给出可操作的错误（不是 `in` 的 TypeError）', () => {
    expect(() => setCSSVar(123 as never)).toThrowError(/setCSSVar/);
  });

  it('变量名自动补 -- 前缀', () => {
    setCSSVar({ name: 'x', value: '1' });
    expect(root().style.getPropertyValue('--x')).toBe('1');
    expect(normalizeVarName('x')).toBe('--x');
  });
});

describe('读取与删除', () => {
  it('不存在的变量返回 fallback / null', () => {
    expect(getCSSVar('nope', 'fb')).toBe('fb');
    expect(getCSSVar('nope')).toBeNull();
    expect(hasCSSVar('nope')).toBe(false);
  });

  it('removeCSSVar 之后读不到', () => {
    setCSSVar({ name: 'a', value: '1' });
    removeCSSVar('a');
    expect(getCSSVar('a')).toBeNull();
  });

  it('toggleCSSVar 在两个值之间切换', () => {
    setCSSVar({ name: 'flag', value: 'on' });
    expect(toggleCSSVar('flag', 'on', 'off')).toBe('off');
    expect(toggleCSSVar('flag', 'on', 'off')).toBe('on');
  });
});

describe('ThemeManager', () => {
  it('★ 切换主题时清理旧主题独有的变量（此前残留）', () => {
    const tm = new ThemeManager();
    tm.register('light', { bg: 'white', border: 'gray' });
    tm.register('dark', { bg: 'black' });

    expect(tm.apply('light')).toBe(true);
    expect(root().style.getPropertyValue('--border')).toBe('gray');

    tm.apply('dark');
    expect(root().style.getPropertyValue('--border')).toBe('');
    expect(getCSSVar('border')).toBeNull();
    expect(getCSSVar('bg')).toBe('black');
    expect(root().getAttribute('data-theme')).toBe('dark');
  });

  it('未注册的主题返回 false 并告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tm = new ThemeManager();
    expect(tm.apply('nope')).toBe(false);
    expect(warn).toHaveBeenCalled();
  });
});

describe('CSSVarObserver', () => {
  it('订阅 + 观察能收到变化，disconnect 后不再收到', async () => {
    const seen: string[] = [];
    const obs = new CSSVarObserver();
    obs.subscribe('primary', (next, _prev, name) => seen.push(`${name}:${String(next)}`));
    obs.observe(['primary']);

    setCSSVar({ name: 'primary', value: 'blue' });
    await new Promise((r) => setTimeout(r, 20));
    expect(seen).toEqual(['--primary:blue']);

    obs.disconnect();
    setCSSVar({ name: 'primary', value: 'green' });
    await new Promise((r) => setTimeout(r, 20));
    expect(seen).toHaveLength(1);
  });

  it('★ observe(names) 之后 subscribe 的新名字也能收到（此前永远收不到）', async () => {
    const seen: string[] = [];
    const obs = new CSSVarObserver();
    obs.observe(['onlyThis']);
    obs.subscribe('other', (_next, _prev, name) => seen.push(name));

    setCSSVar({ name: 'other', value: '2' });
    await new Promise((r) => setTimeout(r, 20));
    obs.disconnect();
    expect(seen).toEqual(['--other']);
  });
});
