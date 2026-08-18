import { describe, it, expect, beforeEach } from 'vitest';
import {
  InjectionToken,
  isInjectionToken,
  InjectionError,
  provideValue,
  injectValue,
  withProviderScope,
  enterProviderScope,
  exitProviderScope,
  getProviderRoot,
  getCurrentProviderNode,
  resetProviderScope,
  createProviderNode,
  provideToNode,
  injectFromNode,
} from '../src';

describe('InjectionToken', () => {
  it('应创建独立令牌', () => {
    const token = new InjectionToken<string>('api');
    expect(token.description).toBe('api');
    expect(isInjectionToken(token)).toBe(true);
    expect(token.toString()).toBe('InjectionToken(api)');
  });

  it('令牌唯一标识应为 Symbol', () => {
    const a = new InjectionToken<string>('x');
    const b = new InjectionToken<string>('x');
    expect(a.__token).not.toBe(b.__token);
  });

  it('应支持工厂与生命周期配置', () => {
    const token = new InjectionToken<number>('n', {
      factory: () => 42,
      lifecycle: 'singleton',
    });
    expect(token.factory?.()).toBe(42);
    expect(token.lifecycle).toBe('singleton');
  });

  it('非令牌对象应判定为 false', () => {
    expect(isInjectionToken('api')).toBe(false);
    expect(isInjectionToken({})).toBe(false);
  });
});

describe('Provider 树生命周期', () => {
  beforeEach(() => {
    resetProviderScope();
  });

  it('应创建并获取全局根节点', () => {
    const root = getProviderRoot();
    expect(root).toBeTruthy();
    expect(root.parent).toBeNull();
  });

  it('enterProviderScope 应建立父子链', () => {
    const root = getProviderRoot();
    const child = enterProviderScope();
    expect(child.parent).toBe(root);
    expect(root.children.has(child)).toBe(true);

    const grand = enterProviderScope();
    expect(grand.parent).toBe(child);
    expect(getCurrentProviderNode()).toBe(grand);

    exitProviderScope();
    expect(getCurrentProviderNode()).toBe(child);
    exitProviderScope();
    expect(getCurrentProviderNode()).toBe(root);
  });
});

describe('provideValue / injectValue', () => {
  beforeEach(() => {
    resetProviderScope();
  });

  it('应提供并注入简单值', () => {
    provideValue('api-url', 'https://api.example.com');
    expect(injectValue<string>('api-url')).toBe('https://api.example.com');
  });

  it('应支持 InjectionToken 注入', () => {
    const TOKEN = new InjectionToken<string>('db-host');
    provideValue(TOKEN, 'localhost');
    expect(injectValue(TOKEN)).toBe('localhost');
  });

  it('should not inject on anonymous string token', () => {
    const TOKEN = new InjectionToken<string>('db-host');
    provideValue(TOKEN, 'localhost');
    // 字符串 key 与 token 符号不同，不应命中
    expect(injectValue<string>('db-host', { optional: true })).toBeUndefined();
  });

  it('应支持子节点覆盖父节点', () => {
    const KEY = 'key';
    withProviderScope(() => {
      provideValue(KEY, 'root');
      const childValue = withProviderScope(() => {
        provideValue(KEY, 'child');
        return injectValue(KEY);
      });
      expect(childValue).toBe('child');
    });
  });

  it('子作用域应能解析父作用域的值', () => {
    const KEY = 'k';
    provideValue(KEY, 'parent-val');
    withProviderScope(() => {
      provideValue('other', 'x');
      expect(injectValue(KEY)).toBe('parent-val');
    });
  });

  it('应支持 useFactory 配置', () => {
    const KEY = 'factory-key';
    provideValue(KEY, {
      useFactory: () => 42,
      lifecycle: 'singleton',
    });
    expect(injectValue<number>(KEY)).toBe(42);
  });

  it('应支持 transient 生命周期按需解析', () => {
    const KEY = 'transient-key';
    // 直接提供一个 transient 函数值
    provideValue(KEY, {} as never);
    const node = getCurrentProviderNode() || getProviderRoot();
    node.providers.set(
      KEY,
      {
        value: () => Math.random(),
        lifecycle: 'transient',
      },
    );
    const a = injectValue<number>(KEY as never);
    const b = injectValue<number>(KEY as never);
    expect(typeof a).toBe('number');
    expect(a).not.toBe(b);
  });

  it('应支持可选注入', () => {
    resetProviderScope();
    expect(injectValue('missing', { optional: true })).toBeUndefined();
  });

  it('应支持默认值注入', () => {
    expect(injectValue('missing', { default: 123 })).toBe(123);
  });

  it('默认值函数应被调用', () => {
    expect(injectValue('missing', { default: () => 'computed' })).toBe('computed');
  });

  it('未找到且非可选时应抛出 InjectionError', () => {
    expect(() => injectValue('missing')).toThrow(InjectionError);
    expect(() => injectValue('missing')).toThrow('Injection error for token "missing"');
  });

  it('应使用令牌默认工厂', () => {
    const TOKEN = new InjectionToken<string>('factory-token', {
      factory: () => 'from-factory',
    });
    expect(injectValue(TOKEN)).toBe('from-factory');
  });

  it('应支持 ProviderConfig 缺失时的抛错', () => {
    expect(() => provideValue('bad', { lifecycle: 'singleton' } as never)).toThrow(
      InjectionError,
    );
  });

  it('应支持 from 覆盖查找 key', () => {
    provideValue('alias-target', 'resolved');
    const TOKEN = new InjectionToken<string>('token-a');
    expect(injectValue(TOKEN, { from: 'alias-target' } as never)).toBe('resolved');
  });
});

describe('provideToNode / injectFromNode', () => {
  beforeEach(() => {
    resetProviderScope();
  });

  it('应能直接在指定节点提供与解析', () => {
    const A = createProviderNode();
    const B = createProviderNode(A);
    provideToNode(B, 'name', 'bob');
    expect(injectFromNode(B, 'name')).toBe('bob');
    // 父链向上命中
    provideToNode(A, 'type', 'root');
    expect(injectFromNode(B, 'type')).toBe('root');
  });
});

describe('withProviderScope', () => {
  beforeEach(() => {
    resetProviderScope();
  });

  it('应在 scope 结束时退出回父节点', () => {
    const child = withProviderScope(() => getCurrentProviderNode());
    expect(getCurrentProviderNode()).toBe(child?.parent);
    // 退出后 current 不再是 scope 子节点
    expect(getCurrentProviderNode()).not.toBe(child);
  });

  it('应支持嵌套 withProviderScope', () => {
    const outer = withProviderScope(() => {
      const inner = withProviderScope(() => getCurrentProviderNode());
      // 内层退出后回到外层节点
      expect(getCurrentProviderNode()).toBe(inner?.parent);
      return getCurrentProviderNode();
    });
    expect(getCurrentProviderNode()).toBe(outer?.parent);
  });
});