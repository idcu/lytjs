// @vitest-environment jsdom
/**
 * `setProperty('innerHTML', …)` 必须走 sanitize（安全 P1 回归）
 *
 * 此前 `setProperty` 对 `innerHTML` 走的是「直接赋属性」那条路，**完全绕过 sanitizeHTML**；
 * 而 `setHTML` 是会过滤的。同一个能力两条路径、一条安全一条不安全 = 没有防护：
 * 调用方只要写 `setProperty(el, 'innerHTML', 用户输入)` 就能注入 `<script>` / `on*`。
 */

import { describe, it, expect } from 'vitest';
import { setProperty, setHTML } from '../src/index';

describe('setProperty 的 innerHTML（安全回归）', () => {
  it('危险标签必须被剥离（标签本身不能留在 DOM 里）', () => {
    const el = document.createElement('div');

    setProperty(el, 'innerHTML', '<b>ok</b><script>alert(1)</script>');

    expect(el.innerHTML).toContain('<b>ok</b>');
    expect(el.innerHTML).not.toContain('<script');
    // 注：sanitizeHTML 的既定契约是「剥离危险标签、保留无害文本」——
    // `alert(1)` 会作为纯文本留下（`dom-runtime-coverage-battery.test.ts:154`
    // 明确锁定了这一行为，且 security / string / dom-runtime 三包一致）。
    // 本用例**不**主张改变该契约，只锁「标签必须消失」。
    expect(el.innerHTML).not.toContain('<script');
  });

  it('事件属性必须被过滤', () => {
    const el = document.createElement('div');

    setProperty(el, 'innerHTML', '<img src="x" onerror="alert(1)">');

    expect(el.innerHTML).not.toContain('onerror');
  });

  it('结果与 setHTML 完全一致（两条路径不能有分歧）', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    const payload = '<p>hi</p><iframe src="https://evil"></iframe><a onclick="x()">c</a>';

    setProperty(a, 'innerHTML', payload);
    setHTML(b, payload);

    expect(a.innerHTML).toBe(b.innerHTML);
  });

  it('普通属性不受影响（value / checked 仍走属性赋值）', () => {
    const input = document.createElement('input');
    setProperty(input, 'value', 'abc');
    expect(input.value).toBe('abc');

    const box = document.createElement('input');
    box.type = 'checkbox';
    setProperty(box, 'checked', true);
    expect(box.checked).toBe(true);
  });
});
