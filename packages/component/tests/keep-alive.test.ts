// tests/keep-alive.test.ts
// Cache instance, restore cached, activated/deactivated, include/exclude, max limit, multiple cached, preserve state, key changes, not cache onUnmount, work with transition

import { describe, it, expect, vi } from 'vitest';
import {
  createKeepAliveInstance,
  cacheInstance,
  getCachedInstance,
  removeCachedInstance,
  activateInstance,
  deactivateInstance,
  matchesPattern,
  getCacheKey,
  KeepAlive,
  defineComponent,
  createComponentInstance,
  setupComponent,
} from '../src/index';
import type { ComponentInternalInstance, ComponentOptions } from '../src/types';
import type { VNode } from '@lytjs/common-vnode';

function createSimpleInstance(
  name: string,
  parent: ComponentInternalInstance | null = null,
): ComponentInternalInstance {
  const options = defineComponent({ name });
  const vnode = { type: options, props: {}, children: null };
  const instance = createComponentInstance(vnode, parent);
  setupComponent(instance);
  return instance;
}

describe('KeepAlive', () => {
  it('should cache a component instance', () => {
    const ka = createKeepAliveInstance();
    const comp = createSimpleInstance('CachedComp');

    cacheInstance(ka, 'cached-key', comp);

    const cached = getCachedInstance(ka, 'cached-key');
    expect(cached).toBe(comp);
  });

  it('should restore a cached instance', () => {
    const ka = createKeepAliveInstance();
    const comp = createSimpleInstance('RestoreComp');

    cacheInstance(ka, 'restore-key', comp);
    const restored = getCachedInstance(ka, 'restore-key');

    expect(restored).toBe(comp);
    expect(restored?.type.name).toBe('RestoreComp');
  });

  it('should call activated/deactivated hooks', () => {
    const activated = vi.fn();
    const deactivated = vi.fn();

    const options = defineComponent({
      name: 'LifecycleComp',
      activated,
      deactivated,
    });

    const vnode = { type: options, props: {}, children: null };
    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    deactivateInstance(instance);
    expect(deactivated).toHaveBeenCalledTimes(1);
    expect(instance.isDeactivated).toBe(true);

    activateInstance(instance);
    expect(activated).toHaveBeenCalledTimes(1);
    expect(instance.isDeactivated).toBe(false);
  });

  it('should respect include pattern', () => {
    const ka = createKeepAliveInstance({ include: 'IncludedComp' });
    const comp = createSimpleInstance('IncludedComp');

    const shouldInclude = matchesPattern('IncludedComp', 'IncludedComp');
    expect(shouldInclude).toBe(true);

    const shouldExclude = matchesPattern('ExcludedComp', 'IncludedComp');
    expect(shouldExclude).toBe(false);
  });

  it('should respect exclude pattern', () => {
    const ka = createKeepAliveInstance({ exclude: 'ExcludedComp' });

    // 'IncludedComp' does NOT match the exclude pattern => should be included
    const isIncluded = !matchesPattern('IncludedComp', 'ExcludedComp');
    expect(isIncluded).toBe(true);

    // 'ExcludedComp' DOES match the exclude pattern => should be excluded
    const isExcluded = matchesPattern('ExcludedComp', 'ExcludedComp');
    expect(isExcluded).toBe(true);
  });

  it('should enforce max cache limit', () => {
    const ka = createKeepAliveInstance({ max: 2 });
    const comp1 = createSimpleInstance('Comp1');
    const comp2 = createSimpleInstance('Comp2');
    const comp3 = createSimpleInstance('Comp3');

    cacheInstance(ka, 'key1', comp1);
    cacheInstance(ka, 'key2', comp2);
    cacheInstance(ka, 'key3', comp3);

    // Comp1 should be evicted (oldest)
    expect(getCachedInstance(ka, 'key1')).toBeUndefined();
    expect(getCachedInstance(ka, 'key2')).toBe(comp2);
    expect(getCachedInstance(ka, 'key3')).toBe(comp3);
  });

  it('should cache multiple instances', () => {
    const ka = createKeepAliveInstance();
    const comp1 = createSimpleInstance('MultiComp1');
    const comp2 = createSimpleInstance('MultiComp2');
    const comp3 = createSimpleInstance('MultiComp3');

    cacheInstance(ka, 'multi1', comp1);
    cacheInstance(ka, 'multi2', comp2);
    cacheInstance(ka, 'multi3', comp3);

    expect(getCachedInstance(ka, 'multi1')).toBe(comp1);
    expect(getCachedInstance(ka, 'multi2')).toBe(comp2);
    expect(getCachedInstance(ka, 'multi3')).toBe(comp3);
  });

  it('should preserve state of cached instances', () => {
    const ka = createKeepAliveInstance();
    const options = defineComponent({
      name: 'StateComp',
      data() {
        return { count: 0 };
      },
    });

    const vnode = { type: options, props: {}, children: null };
    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    // Modify state
    instance.data.count = 42;

    // Cache and retrieve
    cacheInstance(ka, 'state-key', instance);
    const restored = getCachedInstance(ka, 'state-key');

    expect(restored?.data.count).toBe(42);
  });

  it('should handle key changes (update cache entry)', () => {
    const ka = createKeepAliveInstance();
    const comp1 = createSimpleInstance('KeyComp1');
    const comp2 = createSimpleInstance('KeyComp2');

    cacheInstance(ka, 'same-key', comp1);
    expect(getCachedInstance(ka, 'same-key')).toBe(comp1);

    // Overwrite with new instance
    cacheInstance(ka, 'same-key', comp2);
    expect(getCachedInstance(ka, 'same-key')).toBe(comp2);
  });

  it('should remove cached instance on unmount', () => {
    const ka = createKeepAliveInstance();
    const comp = createSimpleInstance('UnmountCacheComp');

    cacheInstance(ka, 'unmount-key', comp);
    expect(getCachedInstance(ka, 'unmount-key')).toBe(comp);

    removeCachedInstance(ka, 'unmount-key');
    expect(getCachedInstance(ka, 'unmount-key')).toBeUndefined();
  });

  it('should work with regex include/exclude patterns', () => {
    const includePattern = /^Comp\d+$/;

    expect(matchesPattern('Comp1', includePattern)).toBe(true);
    expect(matchesPattern('Comp123', includePattern)).toBe(true);
    expect(matchesPattern('Other', includePattern)).toBe(false);
  });

  it('should evict oldest when max is reached', () => {
    const instance = createKeepAliveInstance({ max: 2 });
    cacheInstance(instance, 'a', { type: {} } as any);
    cacheInstance(instance, 'b', { type: {} } as any);
    cacheInstance(instance, 'c', { type: {} } as any);
    expect(getCachedInstance(instance, 'a')).toBeUndefined();
    expect(getCachedInstance(instance, 'b')).toBeDefined();
    expect(getCachedInstance(instance, 'c')).toBeDefined();
  });

  it('should handle max=1 correctly', () => {
    const instance = createKeepAliveInstance({ max: 1 });
    cacheInstance(instance, 'a', { type: {} } as any);
    cacheInstance(instance, 'b', { type: {} } as any);
    expect(getCachedInstance(instance, 'a')).toBeUndefined();
    expect(getCachedInstance(instance, 'b')).toBeDefined();
  });
});

describe('KeepAlive onCacheKey', () => {
  it('should use onCacheKey function to generate cache key', () => {
    const customKeyFn = vi.fn((vnode: VNode) => `custom:${(vnode.type as any).name}`);
    const ka = createKeepAliveInstance({ onCacheKey: customKeyFn });

    const comp = createSimpleInstance('CustomKeyComp');
    const vnode = { type: comp.type, props: {} } as unknown as VNode;

    const key = getCacheKey(ka, vnode);

    expect(customKeyFn).toHaveBeenCalledWith(vnode);
    expect(key).toBe('custom:CustomKeyComp');
  });

  it('should use default key (component name) when onCacheKey is not provided', () => {
    const ka = createKeepAliveInstance();

    const comp = createSimpleInstance('DefaultKeyComp');
    const vnode = { type: comp.type, props: {} } as unknown as VNode;

    const key = getCacheKey(ka, vnode);

    expect(key).toBe('DefaultKeyComp');
  });

  it('should use vnode.type as string when type is a string', () => {
    const ka = createKeepAliveInstance();
    const vnode = { type: 'div', props: {} } as unknown as VNode;

    const key = getCacheKey(ka, vnode);

    expect(key).toBe('div');
  });

  it('should handle onCacheKey returning a number', () => {
    const ka = createKeepAliveInstance({
      onCacheKey: (_vnode: VNode) => 42,
    });

    const comp = createSimpleInstance('NumberKeyComp');
    const vnode = { type: comp.type, props: {} } as unknown as VNode;

    const key = getCacheKey(ka, vnode);

    expect(key).toBe('42');
  });

  it('should work with cacheInstance using onCacheKey', () => {
    const ka = createKeepAliveInstance({
      onCacheKey: (vnode: VNode) => `key:${(vnode.type as any).name}`,
    });

    const comp = createSimpleInstance('CachedWithCustomKey');
    const vnode = { type: comp.type, props: {} } as unknown as VNode;

    const key = getCacheKey(ka, vnode);
    cacheInstance(ka, key, comp);

    expect(getCachedInstance(ka, 'key:CachedWithCustomKey')).toBe(comp);
  });

  it('should generate different keys for different components with onCacheKey', () => {
    const ka = createKeepAliveInstance({
      onCacheKey: (vnode: VNode) => `key:${(vnode.type as any).name}`,
    });

    const comp1 = createSimpleInstance('CompA');
    const comp2 = createSimpleInstance('CompB');
    const vnode1 = { type: comp1.type, props: {} } as unknown as VNode;
    const vnode2 = { type: comp2.type, props: {} } as unknown as VNode;

    const key1 = getCacheKey(ka, vnode1);
    const key2 = getCacheKey(ka, vnode2);

    expect(key1).toBe('key:CompA');
    expect(key2).toBe('key:CompB');
    expect(key1).not.toBe(key2);
  });
});
