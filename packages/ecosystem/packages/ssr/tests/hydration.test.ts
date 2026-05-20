 
 
/**
 * @lytjs/ssr - 水合提示测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createHydrationMarkers,
  getHydrationStrategy,
  serializeHydrationState,
  createDehydratedState,
  resetComponentIdCounter,
} from '../src/hydration';
// import type { HydrationStrategy } from '../src/hydration';

/** 创建测试用 VNode */
function createTestVNode(
  type: string,
  props: Record<string, unknown> | null,
  children?: unknown,
): any {
  return { type, props: props || {}, children: children ?? null };
}

beforeEach(() => {
  // 每个测试前重置计数器
  resetComponentIdCounter();
});

describe('createHydrationMarkers', () => {
  it('应该为元素节点添加 data-hydrate 属性', () => {
    const vnode = createTestVNode('div', null, 'Hello');
    const marked = createHydrationMarkers(vnode);

    expect(marked.props['data-hydrate']).toBeDefined();
    expect(marked.props['data-hydrate']).toMatch(/^lyt-hydrate-\d+$/);
  });

  it('应该为每个元素生成唯一的 ID', () => {
    const vnode = createTestVNode('div', null, [
      createTestVNode('span', null, 'A'),
      createTestVNode('span', null, 'B'),
    ]);
    const marked = createHydrationMarkers(vnode);

    const parentId = marked.props['data-hydrate'];
    const childAId = marked.children[0].props['data-hydrate'];
    const childBId = marked.children[1].props['data-hydrate'];

    expect(parentId).not.toBe(childAId);
    expect(parentId).not.toBe(childBId);
    expect(childAId).not.toBe(childBId);
  });

  it('应该保留原始属性', () => {
    const vnode = createTestVNode('div', { class: 'container', id: 'main' }, 'text');
    const marked = createHydrationMarkers(vnode);

    expect(marked.props['class']).toBe('container');
    expect(marked.props['id']).toBe('main');
  });

  it('应该在有 hydrateStrategy 时添加 data-hydrate-strategy 属性', () => {
    const vnode = createTestVNode('div', { hydrateStrategy: 'lazy' }, 'text');
    const marked = createHydrationMarkers(vnode);

    expect(marked.props['data-hydrate-strategy']).toBe('lazy');
  });

  it('应该递归处理嵌套子节点', () => {
    const vnode = createTestVNode(
      'div',
      null,
      createTestVNode('section', null, createTestVNode('p', null, 'deep')),
    );
    const marked = createHydrationMarkers(vnode);

    // 所有层级都应有水合标记
    expect(marked.props['data-hydrate']).toBeDefined();
    const section = marked.children;
    expect(section.props['data-hydrate']).toBeDefined();
    const p = section.children;
    expect(p.props['data-hydrate']).toBeDefined();
  });

  it('应该处理数组子节点', () => {
    const vnode = createTestVNode('ul', null, [
      createTestVNode('li', null, '1'),
      createTestVNode('li', null, '2'),
    ]);
    const marked = createHydrationMarkers(vnode);

    expect(marked.children[0].props['data-hydrate']).toBeDefined();
    expect(marked.children[1].props['data-hydrate']).toBeDefined();
  });

  it('应该忽略无效的水合策略', () => {
    const vnode = createTestVNode('div', { hydrateStrategy: 'invalid' }, 'text');
    const marked = createHydrationMarkers(vnode);

    expect(marked.props['data-hydrate-strategy']).toBeUndefined();
  });

  it('应该返回新的 VNode 而不是修改原始 VNode', () => {
    const vnode = createTestVNode('div', null, 'text');
    const originalProps = { ...vnode.props };
    const marked = createHydrationMarkers(vnode);

    expect(vnode.props).toEqual(originalProps);
    expect(marked.props).not.toEqual(originalProps);
  });
});

describe('getHydrationStrategy', () => {
  it('应该在未设置策略时返回 eager', () => {
    const vnode = createTestVNode('div', null, 'text');
    expect(getHydrationStrategy(vnode)).toBe('eager');
  });

  it('应该返回 lazy 策略', () => {
    const vnode = createTestVNode('div', { hydrateStrategy: 'lazy' }, 'text');
    expect(getHydrationStrategy(vnode)).toBe('lazy');
  });

  it('应该返回 idle 策略', () => {
    const vnode = createTestVNode('div', { hydrateStrategy: 'idle' }, 'text');
    expect(getHydrationStrategy(vnode)).toBe('idle');
  });

  it('应该返回 eager 策略', () => {
    const vnode = createTestVNode('div', { hydrateStrategy: 'eager' }, 'text');
    expect(getHydrationStrategy(vnode)).toBe('eager');
  });

  it('应该在策略无效时返回 eager', () => {
    const vnode = createTestVNode('div', { hydrateStrategy: 'unknown' }, 'text');
    expect(getHydrationStrategy(vnode)).toBe('eager');
  });

  it('应该在 VNode 为 null 时返回 eager', () => {
    expect(getHydrationStrategy(null as any)).toBe('eager');
  });
});

describe('serializeHydrationState', () => {
  it('应该序列化简单对象', () => {
    const result = serializeHydrationState({ name: 'Alice', age: 30 });
    expect(result).toBe('{"name":"Alice","age":30}');
  });

  it('应该序列化嵌套对象', () => {
    const result = serializeHydrationState({
      user: { name: 'Bob', address: { city: 'Shanghai' } },
    });
    const parsed = JSON.parse(result);
    expect(parsed.user.name).toBe('Bob');
    expect(parsed.user.address.city).toBe('Shanghai');
  });

  it('应该序列化数组', () => {
    const result = serializeHydrationState([1, 2, 3]);
    expect(result).toBe('[1,2,3]');
  });

  it('应该将 null/undefined 序列化为空对象', () => {
    expect(serializeHydrationState(null)).toBe('{}');
    expect(serializeHydrationState(undefined)).toBe('{}');
  });

  it('应该过滤掉 undefined 值', () => {
    const result = serializeHydrationState({ a: 1, b: undefined });
    const parsed = JSON.parse(result);
    expect(parsed.a).toBe(1);
    expect(parsed.b).toBeNull();
  });

  it('应该过滤掉函数值', () => {
    const result = serializeHydrationState({
      name: 'test',
      handler: () => {},
    });
    const parsed = JSON.parse(result);
    expect(parsed.name).toBe('test');
    expect(parsed.handler).toBeNull();
  });

  it('应该过滤掉 Symbol 值', () => {
    const result = serializeHydrationState({
      name: 'test',
      sym: Symbol('test'),
    });
    const parsed = JSON.parse(result);
    expect(parsed.name).toBe('test');
    expect(parsed.sym).toBeNull();
  });
});

describe('createDehydratedState', () => {
  it('应该生成包含 script 标签的字符串', () => {
    const vnode = createTestVNode('div', null, 'Hello');
    const result = createDehydratedState(vnode);

    expect(result).toContain('<script');
    expect(result).toContain('__LYT_DEHYDRATED_STATE__');
    expect(result).toContain('type="application/json"');
    expect(result).toContain('</script>');
  });

  it('应该包含水合提示信息', () => {
    const vnode = createTestVNode('div', null, 'Hello');
    const result = createDehydratedState(vnode);

    // 提取 JSON 内容
    const match = result.match(/<script[^>]*>(.*?)<\/script>/s);
    expect(match).not.toBeNull();

    const json = match![1]
      .replace(/\\u003c/g, '<')
      .replace(/\\u003e/g, '>')
      .replace(/\\\//g, '/');
    const parsed = JSON.parse(json);

    expect(parsed.hints).toBeDefined();
    expect(parsed.hints.length).toBeGreaterThan(0);
  });

  it('应该包含组件 ID', () => {
    const vnode = createTestVNode('div', null, 'Hello');
    const result = createDehydratedState(vnode);

    const match = result.match(/<script[^>]*>(.*?)<\/script>/s);
    const json = match![1]
      .replace(/\\u003c/g, '<')
      .replace(/\\u003e/g, '>')
      .replace(/\\\//g, '/');
    const parsed = JSON.parse(json);

    expect(parsed.hints[0].componentId).toMatch(/^lyt-hydrate-\d+$/);
  });

  it('应该包含水合策略', () => {
    const vnode = createTestVNode('div', null, 'Hello');
    const result = createDehydratedState(vnode);

    const match = result.match(/<script[^>]*>(.*?)<\/script>/s);
    const json = match![1]
      .replace(/\\u003c/g, '<')
      .replace(/\\u003e/g, '>')
      .replace(/\\\//g, '/');
    const parsed = JSON.parse(json);

    expect(parsed.hints[0].strategy).toBe('eager');
  });

  it('应该包含初始状态', () => {
    const vnode = createTestVNode('div', null, 'Hello');
    const result = createDehydratedState(vnode, { user: 'Alice' });

    const match = result.match(/<script[^>]*>(.*?)<\/script>/s);
    const json = match![1]
      .replace(/\\u003c/g, '<')
      .replace(/\\u003e/g, '>')
      .replace(/\\\//g, '/');
    const parsed = JSON.parse(json);

    expect(parsed.initialState).toEqual({ user: 'Alice' });
  });

  it('应该正确处理嵌套组件的水合提示', () => {
    const vnode = createTestVNode('div', null, [
      createTestVNode('span', null, 'A'),
      createTestVNode('span', null, 'B'),
    ]);
    const result = createDehydratedState(vnode);

    const match = result.match(/<script[^>]*>(.*?)<\/script>/s);
    const json = match![1]
      .replace(/\\u003c/g, '<')
      .replace(/\\u003e/g, '>')
      .replace(/\\\//g, '/');
    const parsed = JSON.parse(json);

    // 应该有 3 个提示：div + 2 个 span
    expect(parsed.hints.length).toBe(3);
  });

  it('应该转义 script 标签防止注入', () => {
    const vnode = createTestVNode('div', null, 'Hello');
    const result = createDehydratedState(vnode);

    // 确保不会出现未转义的 </script
    const scriptCloseCount = (result.match(/<\/script>/g) || []).length;
    expect(scriptCloseCount).toBe(1);
  });
});

describe('resetComponentIdCounter', () => {
  it('应该重置 ID 计数器', () => {
    const vnode1 = createTestVNode('div', null, 'A');
    const marked1 = createHydrationMarkers(vnode1);
    const id1 = marked1.props['data-hydrate'];

    resetComponentIdCounter();

    const vnode2 = createTestVNode('div', null, 'B');
    const marked2 = createHydrationMarkers(vnode2);
    const id2 = marked2.props['data-hydrate'];

    // 重置后 ID 应该重新从 1 开始
    expect(id1).toBe(id2);
  });
});
