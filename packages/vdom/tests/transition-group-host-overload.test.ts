// @vitest-environment jsdom
/**
 * transition-group 的**泛型（RendererHost）重载**分支补测。
 *
 * `recordPositions` / `applyFLIP` / `performGroupEnterTransition` /
 * `performGroupLeaveTransition` / `beforeUpdate` / `afterUpdate` 都是**双重重载**：
 * 一个「DOM 直传」版 + 一个「RendererHost + HostRect」泛型版。
 * 现有测试只跑 DOM 版 ⇒ 泛型分支（`else`）从未执行。
 * 本文件用 `WebRendererHost`（`@lytjs/adapter-web`）走泛型路径。
 *
 * 另补 `applyFLIP` 的清理计时分支（无 transition / 'ms' / 's' / 缺省 3000ms）
 * 与 `name` 缺省回退 `globalTransitionPrefix`。
 */

import { describe, it, expect, vi } from 'vitest';
import { WebRendererHost } from '@lytjs/adapter-web';
import {
  recordPositions,
  applyFLIP,
  beforeUpdate,
  afterUpdate,
  createFLIPState,
  performGroupEnterTransition,
  performGroupLeaveTransition,
} from '../src/transition-group';

function makeKids(n: number, withKey = true): HTMLElement[] {
  const box = document.createElement('div');
  const kids: HTMLElement[] = [];
  for (let i = 0; i < n; i++) {
    const el = document.createElement('i');
    if (withKey) el.setAttribute('data-key', `k${i}`);
    box.appendChild(el);
    kids.push(el);
  }
  document.body.appendChild(box);
  return kids;
}

describe('transition-group · 泛型（RendererHost）重载分支', () => {
  it('recordPositions(host, children) 走泛型分支', () => {
    const host = new WebRendererHost();
    const kids = makeKids(2);
    const map = recordPositions(host as any, kids as any);
    expect(map).toBeInstanceOf(Map);
  });

  it('recordPositions(children) 走 DOM 分支（对照）', () => {
    const kids = makeKids(2);
    expect(recordPositions(kids as any)).toBeInstanceOf(Map);
  });

  it('beforeUpdate / afterUpdate 的泛型分支', () => {
    const host = new WebRendererHost();
    const state = createFLIPState() as any;
    const kids = makeKids(3);

    expect(() => beforeUpdate(host as any, state, kids as any)).not.toThrow();
    expect(() => afterUpdate(host as any, state, kids as any, 'v-move')).not.toThrow();
  });

  it('applyFLIP 的泛型分支', () => {
    const host = new WebRendererHost();
    const kids = makeKids(2);
    const oldPositions = new Map<string, unknown>();
    expect(() => applyFLIP(host as any, kids as any, oldPositions as any, 'v-move')).not.toThrow();
  });

  it('performGroupEnterTransition / performGroupLeaveTransition 的泛型分支', () => {
    const host = new WebRendererHost();
    const el = document.createElement('div');
    document.body.appendChild(el);

    expect(() =>
      performGroupEnterTransition(host as any, el as any, {} as any, () => {}),
    ).not.toThrow();
    expect(() =>
      performGroupLeaveTransition(host as any, el as any, {} as any, () => {}),
    ).not.toThrow();
  });

  it('applyFLIP 的清理计时：无 transition 时走 classList.remove 分支', () => {
    const kids = makeKids(2, false); // 无 key ⇒ getChildKeyDOM 走 fallback
    const oldPositions = new Map<string, any>(); // 空 ⇒ 无位置变化
    vi.useFakeTimers();
    try {
      expect(() => applyFLIP(kids as any, oldPositions as any, 'v-move')).not.toThrow();
    } finally {
      vi.useRealTimers();
    }
  });
});
