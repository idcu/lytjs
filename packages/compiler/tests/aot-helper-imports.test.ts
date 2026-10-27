/**
 * AOT 产物的 helper import 必须完整（P1 回归）
 *
 * ## 为什么需要这条
 *
 * `transform()` 在函数**前段**就把 `context.helpers` 快照进了 `root.helpers`，
 * 之后再调 `context.helper(...)` 只会计数、**不会反映到产物**。而「根节点」的
 * codegenNode 恰恰是在那之后构建的：
 *
 * - 多根模板 → `createElementVNode(Fragment, ...)`，`Fragment` 从未被 import；
 * - 单插值根 → `toDisplayString(...)`，同样没有 import。
 *
 * 两者都让 AOT 产物一执行就 `ReferenceError`。既有测试只断言产物里「出现了这个词」，
 * 所以一直没被发现 —— 这里断言的是 **preamble 里有没有对应的 import**。
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';

const preambleOf = (tpl: string): string => compile(tpl).preamble ?? '';

describe('AOT helper import 完整性（P1 回归）', () => {
  it('多根模板必须 import Fragment', () => {
    const { code, preamble } = compile('<div/><span/>');
    expect(code).toContain('Fragment');
    expect(preamble).toContain('Fragment');
  });

  it('单插值根节点必须 import toDisplayString', () => {
    const { code, preamble } = compile('{{ msg }}');
    expect(code).toContain('toDisplayString');
    expect(preamble).toContain('toDisplayString');
  });

  it('普通元素模板的 import 不受影响', () => {
    const { preamble } = compile('<div>{{ msg }}</div>');
    expect(preamble).toContain('createBlock');
    expect(preamble).toContain('toDisplayString');
  });

  it('preamble 里不得出现重复符号', () => {
    const preamble = preambleOf('<div/><span/>');
    const names = preamble
      .replace(/^import\s*\{/, '')
      .replace(/\}.*$/, '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    expect(new Set(names).size).toBe(names.length);
  });
});
