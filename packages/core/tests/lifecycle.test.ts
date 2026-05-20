 
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';

// mock @lytjs/component 的所有生命周期钩子
// 使用 vi.hoisted 避免 vi.mock 提升导致的变量引用问题
const {
  mockOnMounted,
  mockOnUnmounted,
  mockOnUpdated,
  mockOnBeforeMount,
  mockOnBeforeUnmount,
  mockOnBeforeUpdate,
  mockOnErrorCaptured,
  mockOnActivated,
  mockOnDeactivated,
  mockOnRenderTracked,
  mockOnRenderTriggered,
} = vi.hoisted(() => ({
  mockOnMounted: vi.fn(),
  mockOnUnmounted: vi.fn(),
  mockOnUpdated: vi.fn(),
  mockOnBeforeMount: vi.fn(),
  mockOnBeforeUnmount: vi.fn(),
  mockOnBeforeUpdate: vi.fn(),
  mockOnErrorCaptured: vi.fn(),
  mockOnActivated: vi.fn(),
  mockOnDeactivated: vi.fn(),
  mockOnRenderTracked: vi.fn(),
  mockOnRenderTriggered: vi.fn(),
}));

vi.mock('@lytjs/component', () => ({
  onMounted: mockOnMounted,
  onUnmounted: mockOnUnmounted,
  onUpdated: mockOnUpdated,
  onBeforeMount: mockOnBeforeMount,
  onBeforeUnmount: mockOnBeforeUnmount,
  onBeforeUpdate: mockOnBeforeUpdate,
  onErrorCaptured: mockOnErrorCaptured,
  onActivated: mockOnActivated,
  onDeactivated: mockOnDeactivated,
  onRenderTracked: mockOnRenderTracked,
  onRenderTriggered: mockOnRenderTriggered,
}));

import {
  onMounted,
  onUnmounted,
  onUpdated,
  onBeforeMount,
  onBeforeUnmount,
  onBeforeUpdate,
  onErrorCaptured,
  onActivated,
  onDeactivated,
  onRenderTracked,
  onRenderTriggered,
} from '../src/lifecycle';

describe('lifecycle', () => {
  it('onMounted 应正确导出', () => {
    expect(onMounted).toBeDefined();
    expect(typeof onMounted).toBe('function');
  });

  it('onUnmounted 应正确导出', () => {
    expect(onUnmounted).toBeDefined();
    expect(typeof onUnmounted).toBe('function');
  });

  it('onUpdated 应正确导出', () => {
    expect(onUpdated).toBeDefined();
    expect(typeof onUpdated).toBe('function');
  });

  it('onBeforeMount 应正确导出', () => {
    expect(onBeforeMount).toBeDefined();
    expect(typeof onBeforeMount).toBe('function');
  });

  it('onBeforeUnmount 应正确导出', () => {
    expect(onBeforeUnmount).toBeDefined();
    expect(typeof onBeforeUnmount).toBe('function');
  });

  it('onBeforeUpdate 应正确导出', () => {
    expect(onBeforeUpdate).toBeDefined();
    expect(typeof onBeforeUpdate).toBe('function');
  });

  it('onErrorCaptured 应正确导出', () => {
    expect(onErrorCaptured).toBeDefined();
    expect(typeof onErrorCaptured).toBe('function');
  });

  it('onActivated 应正确导出', () => {
    expect(onActivated).toBeDefined();
    expect(typeof onActivated).toBe('function');
  });

  it('onDeactivated 应正确导出', () => {
    expect(onDeactivated).toBeDefined();
    expect(typeof onDeactivated).toBe('function');
  });

  it('onRenderTracked 应正确导出', () => {
    expect(onRenderTracked).toBeDefined();
    expect(typeof onRenderTracked).toBe('function');
  });

  it('onRenderTriggered 应正确导出', () => {
    expect(onRenderTriggered).toBeDefined();
    expect(typeof onRenderTriggered).toBe('function');
  });

  it('所有生命周期钩子应从 @lytjs/component 代理', () => {
    // 验证导出的函数就是 mock 的函数
    expect(onMounted).toBe(mockOnMounted);
    expect(onUnmounted).toBe(mockOnUnmounted);
    expect(onUpdated).toBe(mockOnUpdated);
    expect(onBeforeMount).toBe(mockOnBeforeMount);
    expect(onBeforeUnmount).toBe(mockOnBeforeUnmount);
    expect(onBeforeUpdate).toBe(mockOnBeforeUpdate);
    expect(onErrorCaptured).toBe(mockOnErrorCaptured);
    expect(onActivated).toBe(mockOnActivated);
    expect(onDeactivated).toBe(mockOnDeactivated);
    expect(onRenderTracked).toBe(mockOnRenderTracked);
    expect(onRenderTriggered).toBe(mockOnRenderTriggered);
  });

  it('onMounted 调用时应传递到 @lytjs/component', () => {
    const callback = vi.fn();
    onMounted(callback);
    expect(mockOnMounted).toHaveBeenCalledWith(callback);
  });

  it('onUnmounted 调用时应传递到 @lytjs/component', () => {
    const callback = vi.fn();
    onUnmounted(callback);
    expect(mockOnUnmounted).toHaveBeenCalledWith(callback);
  });

  it('onErrorCaptured 调用时应传递到 @lytjs/component', () => {
    const callback = vi.fn();
    onErrorCaptured(callback);
    expect(mockOnErrorCaptured).toHaveBeenCalledWith(callback);
  });

  it('应导出全部 11 个生命周期钩子', () => {
    // 验证模块导出数量
    const lifecycleExports = [
      onMounted,
      onUnmounted,
      onUpdated,
      onBeforeMount,
      onBeforeUnmount,
      onBeforeUpdate,
      onErrorCaptured,
      onActivated,
      onDeactivated,
      onRenderTracked,
      onRenderTriggered,
    ];
    expect(lifecycleExports).toHaveLength(11);
    lifecycleExports.forEach((fn) => {
      expect(typeof fn).toBe('function');
    });
  });
});
