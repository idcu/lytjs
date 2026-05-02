import { describe, it, expect } from 'vitest';

// 验证所有子包的导出都可通过聚合包访问
describe('@lytjs/common (aggregate package)', () => {
  // env
  it('should re-export @lytjs/common-env', () => {
    const mod = require('@lytjs/common-env');
    expect(typeof mod.isBrowser).toBe('function');
    expect(typeof mod.isNode).toBe('function');
    expect(typeof mod.isSSR).toBe('function');
    expect(typeof mod.getEnvInfo).toBe('function');
  });

  // is
  it('should re-export @lytjs/common-is', () => {
    const mod = require('@lytjs/common-is');
    expect(typeof mod.isString).toBe('function');
    expect(typeof mod.isNumber).toBe('function');
    expect(typeof mod.isObject).toBe('function');
    expect(typeof mod.isArray).toBe('function');
    expect(typeof mod.isFunction).toBe('function');
    expect(typeof mod.NOOP).toBe('function');
    expect(typeof mod.EMPTY_OBJ).toBe('object');
  });

  // string
  it('should re-export @lytjs/common-string', () => {
    const mod = require('@lytjs/common-string');
    expect(typeof mod.capitalize).toBe('function');
    expect(typeof mod.kebabCase).toBe('function');
    expect(typeof mod.camelCase).toBe('function');
    expect(typeof mod.escapeHTML).toBe('function');
    expect(typeof mod.normalizeClass).toBe('function');
    expect(typeof mod.normalizeStyle).toBe('function');
  });

  // path
  it('should re-export @lytjs/common-path', () => {
    const mod = require('@lytjs/common-path');
    expect(typeof mod.normalizePath).toBe('function');
    expect(typeof mod.joinPath).toBe('function');
    expect(typeof mod.parsePath).toBe('function');
  });

  // events
  it('should re-export @lytjs/common-events', () => {
    const mod = require('@lytjs/common-events');
    expect(typeof mod.EventEmitter).toBe('function');
    expect(typeof mod.SubscriptionManager).toBe('function');
    expect(typeof mod.TopicSubscriptionManager).toBe('function');
  });

  // cache
  it('should re-export @lytjs/common-cache', () => {
    const mod = require('@lytjs/common-cache');
    expect(typeof mod.LRUCache).toBe('function');
    expect(typeof mod.memoize).toBe('function');
    expect(typeof mod.ExpiringCache).toBe('function');
  });

  // timing
  it('should re-export @lytjs/common-timing', () => {
    const mod = require('@lytjs/common-timing');
    expect(typeof mod.debounce).toBe('function');
    expect(typeof mod.throttle).toBe('function');
    expect(typeof mod.delay).toBe('function');
    expect(typeof mod.retry).toBe('function');
    expect(typeof mod.TaskQueue).toBe('function');
  });

  // algorithm
  it('should re-export @lytjs/common-algorithm', () => {
    const mod = require('@lytjs/common-algorithm');
    expect(typeof mod.getSequence).toBe('function');
  });

  // vnode
  it('should re-export @lytjs/common-vnode', () => {
    const mod = require('@lytjs/common-vnode');
    expect(typeof mod.Fragment).toBe('symbol');
    expect(typeof mod.Text).toBe('symbol');
    expect(typeof mod.Comment).toBe('symbol');
    expect(typeof mod.isVNode).toBe('function');
    expect(typeof mod.isSameVNodeType).toBe('function');
  });

  // error
  it('should re-export @lytjs/common-error', () => {
    const mod = require('@lytjs/common-error');
    expect(typeof mod.LytErrorCodes).toBe('object');
    expect(typeof mod.LytError).toBe('function');
    expect(typeof mod.warn).toBe('function');
    expect(typeof mod.error).toBe('function');
  });

  // object
  it('should re-export @lytjs/common-object', () => {
    const mod = require('@lytjs/common-object');
    expect(typeof mod.mergeObjects).toBe('function');
    expect(typeof mod.deepClone).toBe('function');
    expect(typeof mod.pick).toBe('function');
    expect(typeof mod.omit).toBe('function');
    expect(typeof mod.get).toBe('function');
    expect(typeof mod.set).toBe('function');
  });

  // scheduler
  it('should re-export @lytjs/common-scheduler', () => {
    const mod = require('@lytjs/common-scheduler');
    expect(typeof mod.queueJob).toBe('function');
    expect(typeof mod.nextTick).toBe('function');
    expect(typeof mod.flushJobs).toBe('function');
  });
});
