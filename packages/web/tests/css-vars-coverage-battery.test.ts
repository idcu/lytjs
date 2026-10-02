// @vitest-environment jsdom
/**
 * web/css-vars 覆盖率电池（Task C）：补齐重载分派与边界分支
 *   - setCSSVar 三种调用形态（位置参数 / 对象+element / 对象全局）+ 数值单位 + null 移除 + 空元素
 *   - getCSSVar / setCSSVars / getCSSVars / removeCSSVar / removeCSSVars / hasCSSVar 的重载与空元素
 *   - normalizeVarName / stripVarPrefix / toggleCSSVar / getAllCSSVars
 *   - CSSVarObserver / ThemeManager 构造
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeVarName,
  stripVarPrefix,
  setCSSVar,
  getCSSVar,
  setCSSVars,
  getCSSVars,
  removeCSSVar,
  removeCSSVars,
  hasCSSVar,
  getAllCSSVars,
  toggleCSSVar,
  CSSVarObserver,
  ThemeManager,
} from '../src/css-vars';

describe('css-vars battery: normalize helpers', () => {
  it('normalizes and strips prefixes', () => {
    expect(normalizeVarName('primary')).toBe('--primary');
    expect(normalizeVarName('--primary')).toBe('--primary');
    expect(stripVarPrefix('--primary')).toBe('primary');
    expect(stripVarPrefix('primary')).toBe('primary');
  });
});

describe('css-vars battery: setCSSVar overloads', () => {
  it('positional (element, name, value)', () => {
    const el = document.createElement('div');
    setCSSVar(el, 'color', 'red');
    expect(el.style.getPropertyValue('--color')).toBe('red');
  });

  it('object param with element + numeric value with unit', () => {
    const el = document.createElement('div');
    setCSSVar({ element: el, name: 'size', value: 10, options: { unit: 'px' } });
    expect(el.style.getPropertyValue('--size')).toBe('10px');
  });

  it('object param global (no element)', () => {
    setCSSVar({ name: 'global-x', value: 'g' });
    expect(document.documentElement.style.getPropertyValue('--global-x')).toBe('g');
  });

  it('null value removes the variable', () => {
    const el = document.createElement('div');
    setCSSVar(el, 'gone', '1');
    setCSSVar(el, 'gone', null);
    expect(el.style.getPropertyValue('--gone')).toBe('');
  });

  it('numeric value without unit', () => {
    const el = document.createElement('div');
    setCSSVar(el, 'count', 5);
    expect(el.style.getPropertyValue('--count')).toBe('5');
  });
});

describe('css-vars battery: getCSSVar overloads', () => {
  it('global by name and element+name', () => {
    setCSSVar({ name: 'g1', value: 'v1' });
    expect(getCSSVar('g1')).toBe('v1');
    const el = document.createElement('div');
    setCSSVar(el, 'local', 'lv');
    expect(getCSSVar(el, 'local')).toBe('lv');
    expect(getCSSVar(el, 'missing', 'fb')).toBe('fb');
    expect(getCSSVar('missing-global', 'fb2')).toBe('fb2');
  });
});

describe('css-vars battery: plural + remove + has', () => {
  it('setCSSVars / getCSSVars overloads', () => {
    setCSSVars({ a: '1', b: '2' });
    const el = document.createElement('div');
    setCSSVars(el, { c: '3' });
    expect(Object.values(getCSSVars(['a', 'b'])).sort()).toEqual(['1', '2']);
    expect(Object.values(getCSSVars(el, ['c']))).toEqual(['3']);
  });

  it('removeCSSVar / removeCSSVars / hasCSSVar', () => {
    setCSSVar({ name: 'rm', value: '1' });
    expect(hasCSSVar('rm')).toBe(true);
    removeCSSVar('rm');
    expect(hasCSSVar('rm')).toBe(false);

    const el = document.createElement('div');
    setCSSVar(el, 'r1', '1');
    hasCSSVar(el, 'r1');
    removeCSSVar(el, 'r1');
    expect(hasCSSVar(el, 'r1')).toBe(false);

    setCSSVars({ m1: '1', m2: '2' });
    removeCSSVars(['m1', 'm2']);
    const el2 = document.createElement('div');
    setCSSVars(el2, { n1: '1' });
    removeCSSVars(el2, ['n1']);
  });

  it('getAllCSSVars and toggleCSSVar', () => {
    const el = document.createElement('div');
    setCSSVar(el, 'k1', 'v1');
    const all = getAllCSSVars(el);
    expect(all['--k1']).toBe('v1');

    const el2 = document.createElement('div');
    setCSSVar(el2, 'tg', 'a');
    expect(toggleCSSVar('--tg', 'a', 'b')).toBeDefined();
  });
});

describe('css-vars battery: observers', () => {
  it('constructs CSSVarObserver and ThemeManager', () => {
    const el = document.createElement('div');
    const obs = new CSSVarObserver(el);
    expect(obs).toBeInstanceOf(CSSVarObserver);
    const tm = new ThemeManager(el);
    expect(tm).toBeInstanceOf(ThemeManager);
    const tm2 = new ThemeManager();
    expect(tm2).toBeInstanceOf(ThemeManager);
  });
});

describe('css-vars battery: null element / omitted-argument guards', () => {
  it('returns early when the element resolves to null/undefined', () => {
    // 对象形态显式传 element: null ⇒ 命中 `if (!element) return`
    expect(() =>
      setCSSVar({ element: null as unknown as HTMLElement, name: 'x', value: 1 }),
    ).not.toThrow();
    // 非字符串重载 ⇒ element = null
    expect(getCSSVar(null as unknown as HTMLElement, '--x', 'fb')).toBe('fb');
    expect(getCSSVar(null as unknown as HTMLElement, '--x')).toBeNull();
    expect(() => removeCSSVar(null as unknown as HTMLElement, '--x')).not.toThrow();
    expect(hasCSSVar(null as unknown as HTMLElement, '--x')).toBe(false);
  });

  it('covers omitted vars/names arrays and all-vars fallbacks', () => {
    const el = document.createElement('div');
    setCSSVars(el); // vars 省略 ⇒ `vars ?? {}`
    setCSSVars(el, {} as never);
    removeCSSVars(el); // names 省略 ⇒ `names ?? []`
    expect(getCSSVars(el)).toEqual({}); // names 省略 ⇒ `names ?? []`
    // getAllCSSVars 省略 element ⇒ `element ?? document.documentElement`
    expect(typeof getAllCSSVars()).toBe('object');
    // CSSVarObserver / ThemeManager 省略 element ⇒ documentElement 回退
    const obs = new CSSVarObserver();
    expect(obs).toBeInstanceOf(CSSVarObserver);
    const tm = new ThemeManager();
    expect(tm).toBeInstanceOf(ThemeManager);
  });
});
