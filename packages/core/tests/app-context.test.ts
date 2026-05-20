 
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// mock @lytjs/component 的 createAppContext
// 使用 vi.hoisted 避免 vi.mock 提升导致的变量引用问题
const { mockBaseAppContext } = vi.hoisted(() => ({
  mockBaseAppContext: vi.fn(() => ({
    config: {},
    mixins: [],
    components: {},
    directives: {},
    provides: Object.create(null),
    options: {},
  })),
}));

vi.mock('@lytjs/component', () => ({
  createAppContext: mockBaseAppContext,
}));

import { createAppContext, createContextConfig } from '../src/app-context';
import type { AppContext } from '../src/app-context';

describe('createAppContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该创建一个上下文对象', () => {
    const ctx = createAppContext();
    expect(ctx).toBeDefined();
    expect(ctx).not.toBeNull();
  });

  it('创建的上下文 renderer 应为 null', () => {
    const ctx = createAppContext();
    expect(ctx.renderer).toBeNull();
  });

  it('创建的上下文 _vnode 应为 null', () => {
    const ctx = createAppContext();
    expect(ctx._vnode).toBeNull();
  });

  it('创建的上下文 _container 应为 null', () => {
    const ctx = createAppContext();
    expect(ctx._container).toBeNull();
  });

  it('创建的上下文 _instance 应为 null', () => {
    const ctx = createAppContext();
    expect(ctx._instance).toBeNull();
  });

  it('config.performance 默认应为 false', () => {
    const ctx = createAppContext();
    expect(ctx.config.performance).toBe(false);
  });

  it('config.globalProperties 默认应为空对象', () => {
    const ctx = createAppContext();
    expect(ctx.config.globalProperties).toEqual({});
  });

  it('应该调用 @lytjs/component 的 createAppContext', () => {
    createAppContext();
    expect(mockBaseAppContext).toHaveBeenCalledTimes(1);
  });

  it('应该合并基础上下文的属性', () => {
    const ctx = createAppContext();
    // 基础上下文包含 mixins, components, directives, provides, options
    expect('mixins' in ctx).toBe(true);
    expect('components' in ctx).toBe(true);
    expect('directives' in ctx).toBe(true);
  });

  it('多次调用应返回独立的上下文对象', () => {
    const ctx1 = createAppContext();
    const ctx2 = createAppContext();
    expect(ctx1).not.toBe(ctx2);
  });

  it('一个上下文的 config 修改不应影响另一个', () => {
    const ctx1 = createAppContext();
    const ctx2 = createAppContext();
    ctx1.config.performance = true;
    expect(ctx2.config.performance).toBe(false);
  });
});

describe('createContextConfig', () => {
  let context: AppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    context = createAppContext();
  });

  it('应该返回一个 Proxy 对象', () => {
    const proxy = createContextConfig(context);
    // Proxy 对象在 JS 中无法直接检测类型，但可以通过行为验证
    expect(proxy).toBeDefined();
    expect(typeof proxy).toBe('object');
  });

  it('Proxy get 应正确读取 context.config 的值', () => {
    const proxy = createContextConfig(context);
    expect(proxy.performance).toBe(false);
  });

  it('Proxy get 应正确读取新增的 config 属性', () => {
    (context.config as Record<string, unknown>).customKey = 'customValue';
    const proxy = createContextConfig(context);
    expect(proxy.customKey).toBe('customValue');
  });

  it('Proxy set 应正确设置 context.config 的值', () => {
    const proxy = createContextConfig(context);
    proxy.performance = true;
    expect(context.config.performance).toBe(true);
  });

  it('Proxy set 应正确设置新的 config 属性', () => {
    const proxy = createContextConfig(context);
    (proxy as Record<string, unknown>).newProp = 'newValue';
    expect((context.config as Record<string, unknown>).newProp).toBe('newValue');
  });

  it('Proxy set 应返回 true 表示设置成功', () => {
    const proxy = createContextConfig(context);
    // 通过行为验证：设置后能读取到值
    proxy.performance = true;
    expect(proxy.performance).toBe(true);
  });

  it('Proxy ownKeys 应返回 context.config 的键', () => {
    const proxy = createContextConfig(context);
    const keys = Object.keys(proxy);
    expect(keys).toContain('performance');
    expect(keys).toContain('globalProperties');
  });

  it('Proxy ownKeys 应包含动态新增的键', () => {
    (context.config as Record<string, unknown>).dynamicKey = 'value';
    const proxy = createContextConfig(context);
    const keys = Object.keys(proxy);
    expect(keys).toContain('dynamicKey');
  });

  it('Proxy has 应正确判断存在的属性', () => {
    const proxy = createContextConfig(context);
    expect('performance' in proxy).toBe(true);
    expect('globalProperties' in proxy).toBe(true);
  });

  it('Proxy has 应正确判断不存在的属性', () => {
    const proxy = createContextConfig(context);
    expect('nonExistent' in proxy).toBe(false);
  });

  it('globalProperties 应特殊处理 - 读取', () => {
    const proxy = createContextConfig(context);
    expect(proxy.globalProperties).toBe(context.config.globalProperties);
  });

  it('globalProperties 应特殊处理 - 设置', () => {
    const proxy = createContextConfig(context);
    const newGlobalProps = { $foo: 'bar' };
    proxy.globalProperties = newGlobalProps;
    expect(context.config.globalProperties).toBe(newGlobalProps);
  });

  it('Proxy getOwnPropertyDescriptor 应正确返回属性描述符', () => {
    const proxy = createContextConfig(context);
    const desc = Object.getOwnPropertyDescriptor(proxy, 'performance');
    expect(desc).toBeDefined();
    expect(desc?.value).toBe(false);
    expect(desc?.writable).toBe(true);
    expect(desc?.enumerable).toBe(true);
    expect(desc?.configurable).toBe(true);
  });

  it('多次创建的 Proxy 应独立工作', () => {
    const proxy1 = createContextConfig(context);
    const proxy2 = createContextConfig(context);
    proxy1.performance = true;
    expect(proxy2.performance).toBe(true); // 共享同一个 context
  });

  it('不同 context 的 Proxy 不应互相影响', () => {
    const ctx1 = createAppContext();
    const ctx2 = createAppContext();
    const proxy1 = createContextConfig(ctx1);
    const proxy2 = createContextConfig(ctx2);
    proxy1.performance = true;
    expect(ctx2.config.performance).toBe(false);
    expect(proxy2.performance).toBe(false);
  });
});
