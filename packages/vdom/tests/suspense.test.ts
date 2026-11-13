// @vitest-environment jsdom
// tests/suspense.test.ts
// Suspense pendingBranch/activeBranch switching, fallback slot, state transitions

import { describe, it, expect, beforeEach } from 'vitest';
import { createRenderer, createVNode } from '../src/index';
import { WebRendererHost } from '@lytjs/adapter-web';
import { ShapeFlags } from '@lytjs/common-vnode';
import type { VNode } from '@lytjs/common-vnode';
import type { SuspenseBoundary } from '../src/types';

function createTestRenderer() {
  const host = new WebRendererHost();
  return createRenderer(host);
}

// Shared Suspense component type to ensure isSameVNodeType returns true
const SUSPENSE_TYPE = { name: 'Suspense', __v_isComponent: true } as any;

/**
 * Create a Suspense vnode with default and optional fallback children.
 * Uses slot object format: { default: VNode[], fallback?: VNode[] }
 */
function createSuspenseVNode(
  options: {
    defaultChildren?: VNode[];
    fallbackChildren?: VNode[];
  } = {},
): VNode {
  const { defaultChildren = [], fallbackChildren = [] } = options;

  let children: VNode['children'];
  if (fallbackChildren.length > 0) {
    children = {
      default: defaultChildren,
      fallback: fallbackChildren,
    };
  } else {
    children = defaultChildren;
  }

  // Use createBaseVNode-like approach: create a vnode and override shapeFlag
  const vnode = createVNode(SUSPENSE_TYPE, null, children);
  // Set Suspense shapeFlag
  vnode.shapeFlag = ShapeFlags.SUSPENSE | ShapeFlags.STATEFUL_COMPONENT;
  return vnode;
}

/**
 * Create a simple element vnode for testing.
 */
function createElementVNode(tag: string, text: string): VNode {
  return createVNode(tag, null, text);
}

/**
 * Create an async placeholder vnode (simulates an async component).
 */
function createAsyncVNode(tag: string): VNode {
  const vnode = createVNode({ name: tag, __v_isComponent: true } as any, null, null);
  vnode.isAsyncPlaceholder = true;
  return vnode;
}

/**
 * 多根 Suspense：default / fallback 都以 **slot 对象 + 数组** 传入。
 *
 * 注意不能用 `createSuspenseVNode` 的数组形态 —— 它把 `children[0]` 当 default、
 * `children[1]` 当 fallback，多根会因此被误读。
 */
function createMultiRootSuspenseVNode(defaultChildren: VNode[], fallbackChildren?: VNode[]): VNode {
  const children = fallbackChildren
    ? { default: defaultChildren, fallback: fallbackChildren }
    : { default: defaultChildren };
  const vnode = createVNode(SUSPENSE_TYPE, null, children);
  vnode.shapeFlag = ShapeFlags.SUSPENSE | ShapeFlags.STATEFUL_COMPONENT;
  return vnode;
}

describe('Suspense pendingBranch/activeBranch', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  describe('mountSuspense', () => {
    it('should mount default content as activeBranch for sync components', () => {
      const { mount } = createTestRenderer();
      const defaultContent = createElementVNode('div', 'Hello');
      const suspenseVNode = createSuspenseVNode({ defaultChildren: [defaultContent] });

      mount(suspenseVNode, container);

      expect(container.textContent).toContain('Hello');

      const boundary = suspenseVNode.suspense as SuspenseBoundary;
      expect(boundary).toBeDefined();
      expect(boundary.activeBranch).toBe(defaultContent);
      expect(boundary.pendingBranch).toBeNull();
      expect(boundary.isInFallback).toBe(false);
    });

    it('should mount fallback content when default is async', () => {
      const { mount } = createTestRenderer();
      const asyncContent = createAsyncVNode('async-comp');
      const fallbackContent = createElementVNode('div', 'Loading...');
      const suspenseVNode = createSuspenseVNode({
        defaultChildren: [asyncContent],
        fallbackChildren: [fallbackContent],
      });

      mount(suspenseVNode, container);

      expect(container.textContent).toContain('Loading...');

      const boundary = suspenseVNode.suspense as SuspenseBoundary;
      expect(boundary).toBeDefined();
      expect(boundary.activeBranch).toBeNull();
      expect(boundary.pendingBranch).toBe(asyncContent);
      expect(boundary.isInFallback).toBe(true);
    });

    it('should mount default content when async but no fallback provided', () => {
      const { mount } = createTestRenderer();
      const asyncContent = createAsyncVNode('async-comp');
      const suspenseVNode = createSuspenseVNode({ defaultChildren: [asyncContent] });

      mount(suspenseVNode, container);

      // Without fallback, the async content is still mounted as activeBranch
      const boundary = suspenseVNode.suspense as SuspenseBoundary;
      expect(boundary.activeBranch).toBe(asyncContent);
      expect(boundary.isInFallback).toBe(false);
    });

    it('should handle slot object children format', () => {
      const { mount } = createTestRenderer();
      const defaultContent = createElementVNode('span', 'Default');
      const fallbackContent = createElementVNode('span', 'Fallback');
      const suspenseVNode = createSuspenseVNode({
        defaultChildren: [defaultContent],
        fallbackChildren: [fallbackContent],
      });

      mount(suspenseVNode, container);

      // Sync content: default should be shown
      expect(container.textContent).toContain('Default');

      const boundary = suspenseVNode.suspense as SuspenseBoundary;
      expect(boundary.activeBranch).toBe(defaultContent);
      expect(boundary.isInFallback).toBe(false);
    });
  });

  describe('多根分支', () => {
    it('★ 多根 default 全部挂载，而不是只取第一根', () => {
      const { mount } = createTestRenderer();
      const a = createElementVNode('div', 'A');
      const b = createElementVNode('div', 'B');
      const suspenseVNode = createMultiRootSuspenseVNode([a, b]);

      mount(suspenseVNode, container);

      // 负控：旧实现 resolveSuspenseChildren 用 first(slot) 只取 [0] ⇒ 只渲染 A。
      expect(container.textContent).toBe('AB');
      expect(container.querySelectorAll('div').length).toBe(2);

      const boundary = suspenseVNode.suspense as SuspenseBoundary;
      expect(boundary.activeBranch).toBe(a);
      expect(boundary.isInFallback).toBe(false);
    });

    it('★ 显示 fallback 时多根 default 全部移除，fallback 多根全部挂载', () => {
      const { mount } = createTestRenderer();
      const a = createElementVNode('div', 'A');
      const asyncContent = createAsyncVNode('async-comp');
      const fb1 = createElementVNode('div', 'L1');
      const fb2 = createElementVNode('div', 'L2');
      const suspenseVNode = createMultiRootSuspenseVNode([a, asyncContent], [fb1, fb2]);

      mount(suspenseVNode, container);

      // 负控：旧实现只把第一根当 default ⇒ 看不到第二根里的异步占位，
      // 不会切 fallback，容器里留着 "A"。
      expect(container.textContent).toContain('L1');
      expect(container.textContent).toContain('L2');
      expect(container.textContent).not.toContain('A');
      expect(container.querySelectorAll('div').length).toBe(2);

      const boundary = suspenseVNode.suspense as SuspenseBoundary;
      expect(boundary.isInFallback).toBe(true);
      expect(boundary.activeBranch).toBeNull();
      expect(boundary.fallbackBranch).toBe(fb1);
    });
  });

  describe('patchSuspense', () => {
    it('should transition from pending to resolved (fallback -> active)', () => {
      const { mount, patch } = createTestRenderer();

      // Mount with async content (shows fallback)
      const asyncContent = createAsyncVNode('async-comp');
      const fallbackContent = createElementVNode('div', 'Loading...');
      const suspenseVNode = createSuspenseVNode({
        defaultChildren: [asyncContent],
        fallbackChildren: [fallbackContent],
      });

      mount(suspenseVNode, container);
      expect(container.textContent).toContain('Loading...');

      const boundary = suspenseVNode.suspense as SuspenseBoundary;
      expect(boundary.isInFallback).toBe(true);

      // Patch with resolved content (no longer async)
      const resolvedContent = createElementVNode('div', 'Resolved!');
      const newSuspenseVNode = createSuspenseVNode({
        defaultChildren: [resolvedContent],
        fallbackChildren: [fallbackContent],
      });

      // Reuse the boundary from the old vnode
      newSuspenseVNode.suspense = boundary;
      patch(suspenseVNode, newSuspenseVNode, container);

      expect(container.textContent).toContain('Resolved!');
      expect(boundary.isInFallback).toBe(false);
      expect(boundary.activeBranch).toBe(resolvedContent);
      expect(boundary.pendingBranch).toBeNull();
    });

    it('should transition from resolved to pending (active -> fallback)', () => {
      const { mount, patch } = createTestRenderer();

      // Mount with sync content
      const syncContent = createElementVNode('div', 'Content');
      const fallbackContent = createElementVNode('div', 'Loading...');
      const suspenseVNode = createSuspenseVNode({
        defaultChildren: [syncContent],
        fallbackChildren: [fallbackContent],
      });

      mount(suspenseVNode, container);
      expect(container.textContent).toContain('Content');

      const boundary = suspenseVNode.suspense as SuspenseBoundary;
      expect(boundary.isInFallback).toBe(false);

      // Patch with async content (should show fallback)
      const asyncContent = createAsyncVNode('async-comp');
      const newSuspenseVNode = createSuspenseVNode({
        defaultChildren: [asyncContent],
        fallbackChildren: [fallbackContent],
      });

      newSuspenseVNode.suspense = boundary;
      patch(suspenseVNode, newSuspenseVNode, container);

      expect(container.textContent).toContain('Loading...');
      expect(boundary.isInFallback).toBe(true);
      expect(boundary.pendingBranch).toBe(asyncContent);
      expect(boundary.activeBranch).toBeNull();
    });

    it('should patch active branch when no state transition', () => {
      const { mount, patch } = createTestRenderer();

      const content1 = createElementVNode('div', 'v1');
      const suspenseVNode = createSuspenseVNode({ defaultChildren: [content1] });

      mount(suspenseVNode, container);
      expect(container.textContent).toContain('v1');

      const boundary = suspenseVNode.suspense as SuspenseBoundary;

      // Patch with new sync content (same state)
      const content2 = createElementVNode('div', 'v2');
      const newSuspenseVNode = createSuspenseVNode({ defaultChildren: [content2] });

      newSuspenseVNode.suspense = boundary;
      patch(suspenseVNode, newSuspenseVNode, container);

      expect(container.textContent).toContain('v2');
      expect(boundary.isInFallback).toBe(false);
    });
  });

  describe('unmountSuspense', () => {
    it('should unmount active branch on unmount', () => {
      const { mount, unmount } = createTestRenderer();

      const content = createElementVNode('div', 'Content');
      const suspenseVNode = createSuspenseVNode({ defaultChildren: [content] });

      mount(suspenseVNode, container);
      expect(container.textContent).toContain('Content');

      unmount(suspenseVNode);
      expect(container.textContent).toBe('');

      const boundary = suspenseVNode.suspense as SuspenseBoundary;
      expect(boundary.activeBranch).toBeNull();
      expect(boundary.pendingBranch).toBeNull();
    });

    it('should clean up pending branch on unmount', () => {
      const { mount, unmount } = createTestRenderer();

      const asyncContent = createAsyncVNode('async-comp');
      const fallbackContent = createElementVNode('div', 'Loading...');
      const suspenseVNode = createSuspenseVNode({
        defaultChildren: [asyncContent],
        fallbackChildren: [fallbackContent],
      });

      mount(suspenseVNode, container);
      expect(container.textContent).toContain('Loading...');

      unmount(suspenseVNode);

      const boundary = suspenseVNode.suspense as SuspenseBoundary;
      expect(boundary.activeBranch).toBeNull();
      expect(boundary.pendingBranch).toBeNull();
      expect(boundary.effects).toEqual([]);
    });
  });

  describe('SuspenseBoundary', () => {
    it('should store correct container and anchor references', () => {
      const { mount } = createTestRenderer();
      const content = createElementVNode('div', 'test');
      const suspenseVNode = createSuspenseVNode({ defaultChildren: [content] });

      mount(suspenseVNode, container);

      const boundary = suspenseVNode.suspense as SuspenseBoundary;
      expect(boundary.container).toBe(container);
      expect(boundary.vnode).toBe(suspenseVNode);
    });
  });
});
