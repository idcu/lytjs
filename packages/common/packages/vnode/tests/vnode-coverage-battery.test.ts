/**
 * common/vnode 覆盖率电池（Task C）：补齐 describePatchFlag 全量标志名与
 * hasPatchFlag 的 HOISTED/BAIL 短路分支。
 */
import { describe, it, expect } from 'vitest';
import {
  PatchFlags,
  hasPatchFlag,
  describePatchFlag,
  createBaseVNode,
  isVNode,
  isFragment,
  isTextVNode,
  isCommentVNode,
  isSameVNodeType,
  Fragment,
  Text,
  Comment,
} from '../src/index';

describe('vnode battery: describePatchFlag', () => {
  it('covers every flag name and the NO_FLAGS fallback', () => {
    expect(describePatchFlag(PatchFlags.HOISTED)).toBe('HOISTED');
    expect(describePatchFlag(PatchFlags.BAIL)).toBe('BAIL');
    expect(describePatchFlag(0)).toBe('NO_FLAGS');

    const single: Array<[number, string]> = [
      [PatchFlags.TEXT, 'TEXT'],
      [PatchFlags.CLASS, 'CLASS'],
      [PatchFlags.STYLE, 'STYLE'],
      [PatchFlags.PROPS, 'PROPS'],
      [PatchFlags.FULL_PROPS, 'FULL_PROPS'],
      [PatchFlags.HYDRATE_EVENTS, 'HYDRATE_EVENTS'],
      [PatchFlags.STABLE_FRAGMENT, 'STABLE_FRAGMENT'],
      [PatchFlags.KEYED_FRAGMENT, 'KEYED_FRAGMENT'],
      [PatchFlags.UNKEYED_FRAGMENT, 'UNKEYED_FRAGMENT'],
      [PatchFlags.NEED_PATCH, 'NEED_PATCH'],
      [PatchFlags.DYNAMIC_SLOTS, 'DYNAMIC_SLOTS'],
    ];
    for (const [flag, name] of single) {
      expect(describePatchFlag(flag)).toBe(name);
    }

    // 组合标志
    expect(describePatchFlag(PatchFlags.TEXT | PatchFlags.CLASS)).toBe('TEXT | CLASS');
  });
});

describe('vnode battery: hasPatchFlag', () => {
  it('returns true for HOISTED / BAIL and otherwise bit-tests', () => {
    const hoisted = createBaseVNode({ patchFlag: PatchFlags.HOISTED });
    const bail = createBaseVNode({ patchFlag: PatchFlags.BAIL });
    const text = createBaseVNode({ patchFlag: PatchFlags.TEXT });

    expect(hasPatchFlag(hoisted, PatchFlags.TEXT)).toBe(true);
    expect(hasPatchFlag(bail, PatchFlags.TEXT)).toBe(true);
    expect(hasPatchFlag(text, PatchFlags.TEXT)).toBe(true);
    expect(hasPatchFlag(text, PatchFlags.CLASS)).toBe(false);
  });
});

describe('vnode battery: type predicates', () => {
  it('identifies vnode shapes', () => {
    const frag = createBaseVNode({ type: Fragment });
    const text = createBaseVNode({ type: Text, children: 'x' });
    const comment = createBaseVNode({ type: Comment });
    const div = createBaseVNode({ type: 'div' });

    expect(isVNode(frag)).toBe(true);
    expect(isVNode(null)).toBe(false);
    expect(isFragment(frag)).toBe(true);
    expect(isFragment(div)).toBe(false);
    expect(isTextVNode(text)).toBe(true);
    expect(isTextVNode(div)).toBe(false);
    expect(isCommentVNode(comment)).toBe(true);
    expect(isCommentVNode(div)).toBe(false);

    expect(isSameVNodeType(div, createBaseVNode({ type: 'div' }))).toBe(true);
    expect(isSameVNodeType(div, { ...div, key: 'k' } as never)).toBe(false);
  });
});
