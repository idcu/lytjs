/**
 * 行为级判据：`@lytjs/events` 的**事件总线与订阅管理**（`src/index.ts`，373 行、覆盖率 66%）
 *
 * ## 为什么要有这条
 *
 * 事件总线是**跨层**的：一个 handler 泄漏就是一次内存泄漏，一次重复触发就是一次重复请求。
 * 这里只测 `EventEmitter` / `SubscriptionManager` / `TopicSubscriptionManager` 三个类
 * （纯内存，不需要渲染器）。
 *
 * ## 空档里的缺陷
 *
 * `once()` 把回调包进 `wrapper` 再注册，而 `off(event, handler)` 拿**原始函数**去 `Set.delete`
 * ⇒ 删不掉。调用方于是无法取消一个一次性监听（只能等它被触发），组件卸载后仍持有闭包。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter, SubscriptionManager, TopicSubscriptionManager } from '../src/index';

beforeEach(() => {
  vi.restoreAllMocks();
});

// ==================== EventEmitter ====================

describe('EventEmitter', () => {
  it('on + emit：参数原样传递，多个 handler 都收到', () => {
    const bus = new EventEmitter();
    const a = vi.fn();
    const b = vi.fn();

    bus.on('x', a).on('x', b);
    bus.emit('x', 1, 'two');

    expect(a).toHaveBeenCalledWith(1, 'two');
    expect(b).toHaveBeenCalledWith(1, 'two');
  });

  it('emit 无监听者返回 false，有则 true', () => {
    const bus = new EventEmitter();

    expect(bus.emit('none')).toBe(false);
    bus.on('none', () => {});
    expect(bus.emit('none')).toBe(true);
  });

  it('handler 抛错不影响其它 handler，也不向外冒泡', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const bus = new EventEmitter();
    const ok = vi.fn();

    bus.on('x', () => {
      throw new Error('boom');
    });
    bus.on('x', ok);

    expect(() => bus.emit('x')).not.toThrow();
    expect(ok).toHaveBeenCalledTimes(1);
    expect(errSpy).toHaveBeenCalled();
  });

  it('off 只摘掉指定 handler', () => {
    const bus = new EventEmitter();
    const a = vi.fn();
    const b = vi.fn();

    bus.on('x', a).on('x', b).off('x', a);
    bus.emit('x');

    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('off 未知事件 / 未知 handler 是 no-op', () => {
    const bus = new EventEmitter();
    const a = vi.fn();
    bus.on('x', a);

    expect(() => bus.off('nope', a)).not.toThrow();
    expect(() => bus.off('x', () => {})).not.toThrow();
    expect(bus.listenerCount('x')).toBe(1);
  });

  it('once 只触发一次', () => {
    const bus = new EventEmitter();
    const fn = vi.fn();

    bus.once('x', fn);
    bus.emit('x');
    bus.emit('x');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('once 在回调里再次 emit 同一事件不会重复触发自己', () => {
    const bus = new EventEmitter();
    let calls = 0;

    bus.once('x', () => {
      calls++;
      bus.emit('x');
    });
    bus.emit('x');

    expect(calls).toBe(1);
  });

  it('★ once 注册的监听必须能用**原始函数** off 掉（否则无法取消，组件卸载后泄漏）', () => {
    const bus = new EventEmitter();
    const fn = vi.fn();

    bus.once('x', fn);
    bus.off('x', fn);

    expect(bus.listenerCount('x')).toBe(0);
    bus.emit('x');
    expect(fn).not.toHaveBeenCalled();
  });

  it('removeAllListeners(event) 只清该事件；不传参清全部', () => {
    const bus = new EventEmitter();
    bus.on('a', () => {}).on('b', () => {});

    bus.removeAllListeners('a');
    expect(bus.listenerCount('a')).toBe(0);
    expect(bus.listenerCount('b')).toBe(1);

    bus.removeAllListeners();
    expect(bus.listenerCount('b')).toBe(0);
  });

  it('emit 期间 off 自己 ⇒ 不会重复触发，也不报错', () => {
    const bus = new EventEmitter();
    const fn = vi.fn();

    const h = () => {
      fn();
      bus.off('x', h);
    };
    bus.on('x', h);
    bus.emit('x');
    bus.emit('x');

    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ==================== SubscriptionManager ====================

describe('SubscriptionManager', () => {
  it('add 计入 count，unsubscribeAll 逐个调用并清零', () => {
    const mgr = new SubscriptionManager();
    const a = vi.fn();
    const b = vi.fn();

    // add() 返回的是「移除该订阅」的函数，不是 this（链式写法在这里不成立）
    mgr.add(a);
    mgr.add(b);
    expect(mgr.count).toBe(2);

    mgr.unsubscribeAll();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(mgr.count).toBe(0);
  });

  it('add 返回的移除函数会把该订阅移出管理（count 减少）', () => {
    const mgr = new SubscriptionManager();
    const remove = mgr.add(vi.fn());

    remove();

    expect(mgr.count).toBe(0);
  });

  it('某个 unsubscribe 抛错不影响其它订阅被取消', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mgr = new SubscriptionManager();
    const ok = vi.fn();

    mgr.add(() => {
      throw new Error('boom');
    });
    mgr.add(ok);

    expect(() => mgr.unsubscribeAll()).not.toThrow();
    expect(ok).toHaveBeenCalledTimes(1);
    expect(errSpy).toHaveBeenCalled();
  });
});

// ==================== TopicSubscriptionManager ====================

describe('TopicSubscriptionManager', () => {
  it('subscribe 返回的取消函数能摘掉订阅', () => {
    const mgr = new TopicSubscriptionManager();
    const fn = vi.fn();

    const off = mgr.subscribe('t', fn);
    off();
    mgr.publish('t');

    expect(fn).not.toHaveBeenCalled();
    expect(mgr.subscriberCount('t')).toBe(0);
  });

  it('publish 无订阅者返回 false', () => {
    const mgr = new TopicSubscriptionManager();
    expect(mgr.publish('t')).toBe(false);
  });

  it('不同主题互不串台', () => {
    const mgr = new TopicSubscriptionManager();
    const a = vi.fn();
    const b = vi.fn();

    mgr.subscribe('a', a);
    mgr.subscribe('b', b);
    mgr.publish('a', 1);

    expect(a).toHaveBeenCalledWith(1);
    expect(b).not.toHaveBeenCalled();
  });

  it('unsubscribeAll(topic) 只清该主题', () => {
    const mgr = new TopicSubscriptionManager();
    mgr.subscribe('a', () => {});
    mgr.subscribe('b', () => {});

    mgr.unsubscribeAll('a');

    expect(mgr.subscriberCount('a')).toBe(0);
    expect(mgr.subscriberCount('b')).toBe(1);
  });

  it('发布期间取消订阅不会打乱本轮快照', () => {
    const mgr = new TopicSubscriptionManager();
    const second = vi.fn();
    const holder: { off?: () => void } = {};
    mgr.subscribe('t', () => holder.off?.());
    holder.off = mgr.subscribe('t', second);

    mgr.publish('t');

    // 快照语义：本轮仍然通知到 second（它是在取消之前进入快照的）
    expect(second).toHaveBeenCalledTimes(1);
  });
});
