// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// mock @lytjs/component 的 getCurrentInstance 和 @lytjs/common-error 的 warn
// 使用 vi.hoisted 避免 vi.mock 提升导致的变量引用问题
const { mockGetCurrentInstance, mockWarn } = vi.hoisted(() => ({
  mockGetCurrentInstance: vi.fn(),
  mockWarn: vi.fn(),
}));

vi.mock('@lytjs/component', () => ({
  getCurrentInstance: mockGetCurrentInstance,
}));

vi.mock('@lytjs/common-error', () => ({
  warn: mockWarn,
}));

import {
  resolveComponent,
  resolveDirective,
  resolveDynamicComponent,
} from '../src/resolve';
import type { Component, Directive } from '../src/types';

describe('resolveComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentInstance.mockReturnValue(null);
  });

  it('无组件实例时应返回 undefined', () => {
    const result = resolveComponent('MyComp');
    expect(result).toBeUndefined();
  });

  it('无组件实例时应在开发模式下发出警告', () => {
    const result = resolveComponent('MyComp');
    expect(result).toBeUndefined();
    expect(mockWarn).toHaveBeenCalled();
    expect(mockWarn.mock.calls[0][0]).toContain('resolveComponent("MyComp")');
    expect(mockWarn.mock.calls[0][0]).toContain('outside of a component setup function');
  });

  it('有组件实例时应从 components 选项中查找', () => {
    const mockComponent: Component = { render: () => null } as any;
    const instance = {
      type: {
        components: {
          MyComp: mockComponent,
        },
      },
      appContext: {
        components: {},
      },
    };
    mockGetCurrentInstance.mockReturnValue(instance);

    const result = resolveComponent('MyComp');
    expect(result).toBe(mockComponent);
  });

  it('有组件实例但 components 选项中没有时应从全局注册中查找', () => {
    const mockComponent: Component = { render: () => null } as any;
    const instance = {
      type: {},
      appContext: {
        components: {
          GlobalComp: mockComponent,
        },
      },
    };
    mockGetCurrentInstance.mockReturnValue(instance);

    const result = resolveComponent('GlobalComp');
    expect(result).toBe(mockComponent);
  });

  it('局部组件优先于全局组件', () => {
    const localComp: Component = { render: () => null } as any;
    const globalComp: Component = { render: () => null } as any;
    const instance = {
      type: {
        components: {
          Shared: localComp,
        },
      },
      appContext: {
        components: {
          Shared: globalComp,
        },
      },
    };
    mockGetCurrentInstance.mockReturnValue(instance);

    const result = resolveComponent('Shared');
    expect(result).toBe(localComp);
  });

  it('找不到组件且不是 HTML 元素时应发出警告', () => {
    const instance = {
      type: {},
      appContext: {
        components: {},
      },
    };
    mockGetCurrentInstance.mockReturnValue(instance);

    const result = resolveComponent('UnknownComp');
    expect(result).toBeUndefined();
    expect(mockWarn).toHaveBeenCalled();
    expect(mockWarn.mock.calls[0][0]).toContain('Failed to resolve component "UnknownComp"');
  });

  it('找不到组件但是 HTML 元素时不应发出解析失败警告', () => {
    const instance = {
      type: {},
      appContext: {
        components: {},
      },
    };
    mockGetCurrentInstance.mockReturnValue(instance);

    const result = resolveComponent('div');
    expect(result).toBeUndefined();
    // div 是 HTML 元素，不应有 "Failed to resolve" 警告
    const warnCalls = mockWarn.mock.calls.map((c: any[]) => c[0]);
    const hasFailedResolve = warnCalls.some((msg: string) =>
      msg.includes('Failed to resolve component "div"'),
    );
    expect(hasFailedResolve).toBe(false);
  });

  it('有组件实例但无 components 选项和全局注册时应返回 undefined', () => {
    const instance = {
      type: {},
      appContext: {},
    };
    mockGetCurrentInstance.mockReturnValue(instance);

    const result = resolveComponent('SomeComp');
    expect(result).toBeUndefined();
  });
});

describe('resolveDirective', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentInstance.mockReturnValue(null);
  });

  it('无组件实例时应返回 undefined', () => {
    const result = resolveDirective('vFocus');
    expect(result).toBeUndefined();
  });

  it('无组件实例时应在开发模式下发出警告', () => {
    const result = resolveDirective('vFocus');
    expect(result).toBeUndefined();
    expect(mockWarn).toHaveBeenCalled();
    expect(mockWarn.mock.calls[0][0]).toContain('resolveDirective("vFocus")');
    expect(mockWarn.mock.calls[0][0]).toContain('outside of a component setup function');
  });

  it('有组件实例时应从 directives 选项中查找', () => {
    const mockDirective: Directive = {
      mounted: vi.fn(),
    } as any;
    const instance = {
      type: {
        directives: {
          focus: mockDirective,
        },
      },
      appContext: {
        directives: {},
      },
    };
    mockGetCurrentInstance.mockReturnValue(instance);

    const result = resolveDirective('focus');
    expect(result).toBe(mockDirective);
  });

  it('有组件实例但 directives 选项中没有时应从全局注册中查找', () => {
    const mockDirective: Directive = {
      mounted: vi.fn(),
    } as any;
    const instance = {
      type: {},
      appContext: {
        directives: {
          globalDir: mockDirective,
        },
      },
    };
    mockGetCurrentInstance.mockReturnValue(instance);

    const result = resolveDirective('globalDir');
    expect(result).toBe(mockDirective);
  });

  it('局部指令优先于全局指令', () => {
    const localDir: Directive = { mounted: vi.fn() } as any;
    const globalDir: Directive = { mounted: vi.fn() } as any;
    const instance = {
      type: {
        directives: {
          shared: localDir,
        },
      },
      appContext: {
        directives: {
          shared: globalDir,
        },
      },
    };
    mockGetCurrentInstance.mockReturnValue(instance);

    const result = resolveDirective('shared');
    expect(result).toBe(localDir);
  });

  it('找不到指令时应发出警告', () => {
    const instance = {
      type: {},
      appContext: {
        directives: {},
      },
    };
    mockGetCurrentInstance.mockReturnValue(instance);

    const result = resolveDirective('unknownDir');
    expect(result).toBeUndefined();
    expect(mockWarn).toHaveBeenCalled();
    expect(mockWarn.mock.calls[0][0]).toContain('Failed to resolve directive "unknownDir"');
  });
});

describe('resolveDynamicComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentInstance.mockReturnValue(null);
  });

  it('对字符串 tag 在无组件实例时应返回原始字符串', () => {
    const result = resolveDynamicComponent('div');
    expect(result).toBe('div');
  });

  it('对字符串 tag 在找不到组件时应返回原始字符串', () => {
    const result = resolveDynamicComponent('my-custom-element');
    expect(result).toBe('my-custom-element');
  });

  it('对组件对象应直接返回', () => {
    const mockComponent: Component = { render: () => null } as any;
    const result = resolveDynamicComponent(mockComponent);
    expect(result).toBe(mockComponent);
  });

  it('对字符串 tag 在找到已注册组件时应返回组件对象', () => {
    const mockComponent: Component = { render: () => null } as any;
    const instance = {
      type: {
        components: {
          MyComp: mockComponent,
        },
      },
      appContext: {
        components: {},
      },
    };
    mockGetCurrentInstance.mockReturnValue(instance);

    const result = resolveDynamicComponent('MyComp');
    expect(result).toBe(mockComponent);
  });

  it('对空字符串应返回空字符串', () => {
    const result = resolveDynamicComponent('');
    expect(result).toBe('');
  });

  it('对函数类型的组件对象应直接返回', () => {
    const funcComponent: Component = () => null as any;
    const result = resolveDynamicComponent(funcComponent);
    expect(result).toBe(funcComponent);
  });
});
