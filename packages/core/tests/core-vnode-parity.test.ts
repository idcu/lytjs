/**
 * S07 守卫：core 与 core-vnode 的同名运行时辅助只允许一份实现。
 *
 * 2026-11-07（ADR 0016）：权威实现在 `@lytjs/core-vnode`，core 只转发。
 */

import { describe, it, expect } from 'vitest';
import { h as coreH } from '../src/h';
import { withDirectives as coreWithDirectives, withMemo as coreWithMemo } from '../src/directives';
import {
  useSlots as coreUseSlots,
  useAttrs as coreUseAttrs,
  useModel as coreUseModel,
} from '../src/composition';
import { onMounted as coreOnMounted, onActivated as coreOnActivated } from '../src/lifecycle';
import { h as vnodeH } from '../../core-vnode/src/h';
import {
  withDirectives as vnodeWithDirectives,
  withMemo as vnodeWithMemo,
} from '../../core-vnode/src/directives';
import {
  useSlots as vnodeUseSlots,
  useAttrs as vnodeUseAttrs,
  useModel as vnodeUseModel,
} from '../../core-vnode/src/composition';
import {
  onMounted as vnodeOnMounted,
  onActivated as vnodeOnActivated,
} from '../../core-vnode/src/lifecycle';

describe('core / core-vnode 同名辅助函数身份一致', () => {
  it('h / createElement', () => {
    expect(coreH).toBe(vnodeH);
  });

  it('withDirectives / withMemo', () => {
    expect(coreWithDirectives).toBe(vnodeWithDirectives);
    expect(coreWithMemo).toBe(vnodeWithMemo);
  });

  it('useSlots / useAttrs / useModel', () => {
    expect(coreUseSlots).toBe(vnodeUseSlots);
    expect(coreUseAttrs).toBe(vnodeUseAttrs);
    expect(coreUseModel).toBe(vnodeUseModel);
  });

  it('生命周期钩子', () => {
    expect(coreOnMounted).toBe(vnodeOnMounted);
    expect(coreOnActivated).toBe(vnodeOnActivated);
  });
});

describe('行为快照（两入口共用同一实现）', () => {
  it('h(type, children) 的第二参按 children 处理', () => {
    const out = vnodeH('div', ['text']) as unknown as { children: unknown };
    expect(out.children).toEqual(['text']);
  });

  it('h 递归展平嵌套 children', () => {
    const out = vnodeH('div', null, [
      vnodeH('span', null, 'a'),
      [vnodeH('b', null, 'b')],
    ]) as unknown as {
      children: unknown[];
    };
    expect(out.children).toHaveLength(2);
  });

  it('deep 指令递归应用到子 VNode', () => {
    const child = vnodeH('span', null, 'x');
    const root = vnodeH('div', null, child);
    const directive = { deep: true, mounted: () => undefined };

    const result = vnodeWithDirectives(root, [
      [directive, undefined, undefined, {}],
    ]) as unknown as {
      _directives: unknown[];
      children: Array<{ _directives?: unknown[] }>;
    };

    expect(result._directives).toHaveLength(1);
    expect(result.children[0]!._directives).toHaveLength(1);
  });
});
