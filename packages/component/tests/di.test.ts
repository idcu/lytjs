// tests/di.test.ts
// @lytjs/component - DI 适配层集成测试（依赖 @lytjs/di 纯内核）

import { describe, it, expect } from 'vitest';
import {
  InjectionToken,
  isInjectionToken,
  provideSingleton,
  provideScoped,
  provideTransient,
  provideAll,
  withProviderScope,
  enterProviderScope,
  exitProviderScope,
  getProviderRoot,
  getCurrentProviderNode,
  InjectionError,
} from '../src/index';
import { injectValue, resetProviderScope } from '@lytjs/di';

describe('DI 适配层', () => {
  beforeEach(() => {
    resetProviderScope();
  });

  it('应重导出 InjectionToken 与判断函数', () => {
    const TOKEN = new InjectionToken<string>('comp-token');
    expect(isInjectionToken(TOKEN)).toBe(true);
    expect(isInjectionToken('str')).toBe(false);
    expect(TOKEN.toString()).toBe('InjectionToken(comp-token)');
  });

  it('应以 effectScope 作为默认作用域工厂', () => {
    // 不显式设置时，适配层已注入响应式作用域
    withProviderScope(() => {
      expect(getCurrentProviderNode()).not.toBeNull();
      expect(getProviderRoot()).toBeTruthy();
    });
  });

  it('provideSingleton 应写入当前作用域并可被注入', () => {
    const TOKEN = new InjectionToken<number>('answer');
    const answer = withProviderScope(() => {
      provideSingleton(TOKEN, () => 42);
      return injectValue(TOKEN);
    });
    expect(answer).toBe(42);
  });

  it('provideScoped / provideTransient 应支持注入', () => {
    const A = new InjectionToken<string>('a');
    const B = new InjectionToken<string>('b');
    const scopeValue = withProviderScope(() => {
      provideScoped(A, () => 'scoped');
      provideTransient(B, () => 'transient');
      return [injectValue(A), injectValue(B)];
    });
    expect(scopeValue).toEqual(['scoped', 'transient']);
  });

  it('provideAll 应批量注册并可注入', () => {
    const K1 = new InjectionToken<string>('k1');
    const K2 = new InjectionToken<string>('k2');
    const value = withProviderScope(() => {
      provideAll([
        { provide: K1, useValue: 'v1' },
        { provide: K2, useFactory: () => 'v2' },
      ]);
      return [injectValue(K1), injectValue(K2)];
    });
    expect(value).toEqual(['v1', 'v2']);
  });

  it('子作用域可覆盖父作用域的值', () => {
    const KEY = new InjectionToken<string>('theme');
    const result = withProviderScope(() => {
      provideSingleton(KEY, () => 'light');
      return withProviderScope(() => {
        provideSingleton(KEY, () => 'dark');
        return injectValue(KEY);
      });
    });
    expect(result).toBe('dark');
  });

  it('未找到且非可选时注入应抛出 InjectionError', () => {
    expect(() => injectValue('missing-everything')).toThrow(InjectionError);
  });

  it('enterProviderScope / exitProviderScope 应维护节点链', () => {
    const root = getProviderRoot();
    const child = enterProviderScope();
    expect(child.parent).toBe(root);
    exitProviderScope();
    expect(getCurrentProviderNode()).toBe(root);
  });
});