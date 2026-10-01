// @vitest-environment jsdom
/**
 * dom-runtime 覆盖率电池（Task C）：补齐 DOM 操作函数的未覆盖分支
 *   - 每个 set* 的「增量更新：相同值跳过」分支（同一值调用两次触发）
 *   - setProperty 的 PROPERTY_KEYS / 普通属性 / 自有无值 三分支
 *   - setProperty 普通属性在 null/undefined/false 时的 removeAttribute 分支与不存在时跳过
 *   - setStyle 的 string / 对象（数值补 px、非数值 String）/ 其他
 *   - removeAttribute 存在 / 不存在
 *   - normalizeClass / normalizeStyle / sanitizeHTML 各输入形态
 */
import { describe, it, expect } from 'vitest';
import {
  setAttribute,
  removeAttribute,
  setProperty,
  setStyle,
  setClass,
  toggleClass,
  normalizeClass,
  normalizeStyle,
  sanitizeHTML,
} from '../src/index';

describe('dom-runtime battery: normalizeClass', () => {
  it('covers all value shapes', () => {
    expect(normalizeClass(null)).toBe('');
    expect(normalizeClass(undefined)).toBe('');
    expect(normalizeClass(false)).toBe('');
    expect(normalizeClass('a b')).toBe('a b');
    expect(normalizeClass(5)).toBe('5');
    expect(normalizeClass(['a', 'b'])).toBe('a b');
    expect(normalizeClass(['a', null, 'b'])).toBe('a b');
    expect(normalizeClass({ a: true, b: false })).toBe('a');
    expect(normalizeClass(['x', { y: 1 }])).toBe('x y');
  });
});

describe('dom-runtime battery: normalizeStyle', () => {
  it('covers string / object / numeric / falsy', () => {
    expect(normalizeStyle(null)).toBe('');
    expect(normalizeStyle(false)).toBe('');
    expect(normalizeStyle('color:red')).toBe('color:red');
    expect(normalizeStyle(123)).toBe('123');
    expect(normalizeStyle({ color: 'red' })).toBe('color:red');
    expect(normalizeStyle({ width: 100 })).toBe('width:100px');
    expect(normalizeStyle({ fontSize: '12px' })).toBe('font-size:12px');
    expect(normalizeStyle({ lineHeight: 2, color: 'blue' })).toBe('line-height:2px;color:blue');
  });
});

describe('dom-runtime battery: setAttribute / removeAttribute', () => {
  it('sets, skips same, and removes', () => {
    const el = document.createElement('div');
    setAttribute(el, 'data-x', 'v');
    expect(el.getAttribute('data-x')).toBe('v');
    setAttribute(el, 'data-x', 'v'); // 相同值 → 跳过分支
    setAttribute(el, 'data-x', 'w'); // 不同值 → 设置分支
    expect(el.getAttribute('data-x')).toBe('w');
    setAttribute(el, 'data-n', 5);
    expect(el.getAttribute('data-n')).toBe('5');

    removeAttribute(el, 'data-x'); // 存在 → 移除
    expect(el.hasAttribute('data-x')).toBe(false);
    removeAttribute(el, 'data-x'); // 不存在 → 跳过分支
  });
});

describe('dom-runtime battery: setProperty', () => {
  it('handles PROPERTY_KEYS (value/checked/disabled)', () => {
    const input = document.createElement('input');
    setProperty(input, 'value', 'a');
    expect(input.value).toBe('a');
    setProperty(input, 'value', 'a'); // 相同 → 跳过
    setProperty(input, 'value', 'b');
    expect(input.value).toBe('b');
    setProperty(input, 'checked', true);
    expect(input.checked).toBe(true);
    setProperty(input, 'disabled', true);
    expect(input.disabled).toBe(true);
  });

  it('handles plain attributes: set / skip / null-removes / absent-skip', () => {
    const el = document.createElement('div');
    setProperty(el, 'data-k', 'v');
    expect(el.getAttribute('data-k')).toBe('v');
    setProperty(el, 'data-k', 'v'); // skip
    setProperty(el, 'data-k', 7);
    expect(el.getAttribute('data-k')).toBe('7');
    setProperty(el, 'data-k', null); // 普通属性 + null → removeAttribute
    expect(el.hasAttribute('data-k')).toBe(false);
    setProperty(el, 'data-k', null); // 不存在 → 跳过
    setProperty(el, 'data-k', false); // false → removeAttribute 路径
    setProperty(el, 'data-k', undefined); // undefined → removeAttribute 路径
  });
});

describe('dom-runtime battery: setStyle', () => {
  it('handles string cssText with skip', () => {
    const el = document.createElement('div');
    setStyle(el, 'color: red');
    setStyle(el, 'color: red'); // 相同 → 跳过
    setStyle(el, 'color: blue');
    expect(el.style.color).toBe('blue');
  });

  it('handles object style with numeric px and skip', () => {
    const el = document.createElement('div');
    setStyle(el, { width: 100, fontSize: '14px' });
    setStyle(el, { width: 100, fontSize: '14px' }); // 相同 → 逐项跳过
    setStyle(el, { width: 200 });
    expect(el.style.width).toBe('200px');
    expect(el.style.fontSize).toBe('14px');
  });

  it('ignores null / non-object', () => {
    const el = document.createElement('div');
    setStyle(el, null);
    setStyle(el, undefined);
    setStyle(el, 42);
    expect(el.style.cssText).toBe('');
  });
});

describe('dom-runtime battery: setClass / toggleClass', () => {
  it('sets class with normalization and skip', () => {
    const el = document.createElement('div');
    setClass(el, ['a', 'b']);
    expect(el.getAttribute('class')).toBe('a b');
    setClass(el, ['a', 'b']); // 相同 → 跳过
    setClass(el, { c: true });
    expect(el.getAttribute('class')).toBe('c');
  });

  it('toggles class with and without force', () => {
    const el = document.createElement('div');
    toggleClass(el, 'x');
    expect(el.classList.contains('x')).toBe(true);
    toggleClass(el, 'x', true);
    expect(el.classList.contains('x')).toBe(true);
    toggleClass(el, 'x', false);
    expect(el.classList.contains('x')).toBe(false);
  });
});

describe('dom-runtime battery: sanitizeHTML', () => {
  it('handles already-safe html (loop converges immediately)', () => {
    expect(sanitizeHTML('<div>safe</div>')).toBe('<div>safe</div>');
    expect(sanitizeHTML('plain text')).toBe('plain text');
  });

  it('strips dangerous tags and attributes', () => {
    expect(sanitizeHTML('<script>alert(1)</script>')).toBe('');
    expect(sanitizeHTML('<style>body{}</style>')).toBe('');
    expect(sanitizeHTML('<base href="/">')).toBe('');
    expect(sanitizeHTML('<div onclick="evil()">x</div>')).not.toContain('onclick');
    expect(sanitizeHTML('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript:');
    expect(sanitizeHTML('<a href="data:text/html,x">y</a>')).not.toContain('data:');
    expect(sanitizeHTML('<div srcdoc="x">y</div>')).not.toContain('srcdoc');
    expect(sanitizeHTML('<foreignObject><img/></foreignObject>')).not.toContain('foreignObject');
    // 触发多轮清理（嵌套绕过 → 循环迭代）
    expect(sanitizeHTML('<div><scr<script>ipt>x</script></div>')).not.toContain('<script');
  });
});
