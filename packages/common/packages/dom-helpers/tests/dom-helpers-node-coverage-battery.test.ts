// @vitest-environment node
/**
 * common/dom-helpers 覆盖率电池（node 环境版，Task C）
 *
 * 这些 helper 的既有测试都在 jsdom 下运行 ⇒ `if (!isBrowser) {...}` 的真分支
 * 永远不会被执行。本文件显式跑在 node 环境，一次性覆盖 10 处环境守卫分支。
 */
import { describe, it, expect } from 'vitest';
import {
  createElement,
  insertBefore,
  removeChild,
  nextSibling,
  createTextNode,
  createComment,
  setStyle,
  hasClass,
  addClass,
  removeClass,
} from '../src/index';

const dummyNode = {} as Node;
const dummyEl = {} as Element;

describe('dom-helpers battery (node env): environment guards', () => {
  it('throws for element/text/comment creation and insertBefore', () => {
    expect(() => createElement('div')).toThrow(/browser/);
    expect(() => insertBefore(dummyNode, dummyNode, null)).toThrow(/browser/);
    expect(() => createTextNode('t')).toThrow(/browser/);
    expect(() => createComment('c')).toThrow(/browser/);
    expect(() => setStyle(dummyEl, { color: 'red' })).toThrow(/browser/);
  });

  it('degrades gracefully for the non-throwing helpers', () => {
    expect(removeChild(dummyNode, dummyNode)).toBe(false);
    expect(nextSibling(dummyNode)).toBeNull();
    expect(nextSibling(dummyNode, true)).toBeNull();
    expect(hasClass(dummyEl, 'a')).toBe(false);
    expect(() => addClass(dummyEl, 'a')).not.toThrow();
    expect(() => removeClass(dummyEl, 'a')).not.toThrow();
  });
});
