// @vitest-environment jsdom
/**
 * @lytjs/hmr 测试
 *
 * 2026-11-03：原用例几乎都是「注册了 handler」这种形状断言（`toBeDefined()` /
 * `not.toHaveBeenCalled()`），恰好让 5 个缺陷存活：
 * 断开后仍重连、重复 connect 产生多条重连链、dispose 从不执行、
 * accept 覆盖 dispose、路径全等匹配导致每次都整页刷新。
 *
 * 这里改用**假 WebSocket + 假定时器**驱动状态机，断言的是行为而不是形状。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHMRClient, getHMRClient, normalizeModulePath } from '../src';

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;
  sent: string[] = [];
  closed = false;

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.onclose?.();
  }

  // ── 测试驱动 ──
  open(): void {
    this.onopen?.();
  }

  message(payload: unknown): void {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }

  serverClose(): void {
    this.onclose?.();
  }
}

const last = () => MockWebSocket.instances[MockWebSocket.instances.length - 1]!;

describe('@lytjs/hmr', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('连接状态机', () => {
    it('autoConnect 会建立一个连接，open 后 connected 为 true', () => {
      const client = createHMRClient({ url: 'ws://x' });
      expect(MockWebSocket.instances).toHaveLength(1);
      expect(client.connected).toBe(false);

      last().open();
      expect(client.connected).toBe(true);
      client.disconnect();
    });

    it('已连接时重复 connect 不会新建 socket', () => {
      const client = createHMRClient({ url: 'ws://x' });
      last().open();
      client.connect();
      client.connect();

      expect(MockWebSocket.instances).toHaveLength(1);
      client.disconnect();
    });

    it('disconnect 之后不再自动重连（此前 2s 后又连回来）', () => {
      const client = createHMRClient({ url: 'ws://x', reconnectDelay: 10 });
      last().open();
      client.disconnect();

      vi.advanceTimersByTime(200);
      expect(MockWebSocket.instances).toHaveLength(1);
      expect(client.connected).toBe(false);
    });

    it('服务端断开后按退避间隔重连', () => {
      const client = createHMRClient({ url: 'ws://x', reconnectDelay: 10 });
      last().open();
      last().serverClose();

      vi.advanceTimersByTime(15);
      expect(MockWebSocket.instances).toHaveLength(2);
      client.disconnect();
    });

    it('重复断开不会产生多条重连链', () => {
      const client = createHMRClient({ url: 'ws://x', reconnectDelay: 10 });
      last().open();
      last().serverClose();
      vi.advanceTimersByTime(15);

      last().serverClose();
      vi.advanceTimersByTime(20);
      const count = MockWebSocket.instances.length;
      last().serverClose();
      vi.advanceTimersByTime(40);

      expect(MockWebSocket.instances.length).toBe(count + 1);
      client.disconnect();
    });
  });

  describe('模块更新', () => {
    it('dispose 在 accept 之前执行', () => {
      const client = createHMRClient({ url: 'ws://x', autoConnect: false });
      const order: string[] = [];
      client.register('/src/App.vue', {
        dispose: () => order.push('dispose'),
        accept: () => order.push('accept'),
      });

      client.connect();
      last().open();
      last().message({ type: 'update', data: { path: '/src/App.vue', timestamp: 1 } });

      expect(order).toEqual(['dispose', 'accept']);
      client.disconnect();
    });

    it('每次更新都执行一次 dispose', () => {
      const client = createHMRClient({ url: 'ws://x', autoConnect: false });
      const dispose = vi.fn();
      client.register('/src/App.vue', { dispose, accept: () => {} });

      client.connect();
      last().open();
      for (let i = 0; i < 3; i++) {
        last().message({ type: 'update', data: { path: '/src/App.vue', timestamp: i } });
      }

      expect(dispose).toHaveBeenCalledTimes(3);
      client.disconnect();
    });

    it('dispose 抛错不阻断 accept，并交给 handler.error', () => {
      const client = createHMRClient({ url: 'ws://x', autoConnect: false });
      const accept = vi.fn();
      const onError = vi.fn();
      client.register('/src/B.vue', {
        dispose: () => {
          throw new Error('cleanup boom');
        },
        accept,
        error: onError,
      });

      client.connect();
      last().open();
      last().message({ type: 'update', data: { path: '/src/B.vue', timestamp: 1 } });

      expect(accept).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledTimes(1);
      expect((onError.mock.calls[0]![0] as Error).message).toBe('cleanup boom');
      client.disconnect();
    });

    it('没有 handler 时整页刷新', () => {
      const client = createHMRClient({ url: 'ws://x', autoConnect: false });
      const reload = vi.fn();
      vi.spyOn(window, 'location', 'get').mockReturnValue({
        ...window.location,
        reload,
      } as unknown as Location);

      client.connect();
      last().open();
      last().message({ type: 'update', data: { path: '/src/Unknown.vue', timestamp: 1 } });

      expect(reload).toHaveBeenCalledTimes(1);
      client.disconnect();
    });

    it('路径归一化后命中 handler，不退化成整页刷新', () => {
      const client = createHMRClient({ url: 'ws://x', autoConnect: false });
      const accepted: string[] = [];
      const reload = vi.fn();
      vi.spyOn(window, 'location', 'get').mockReturnValue({
        ...window.location,
        reload,
      } as unknown as Location);

      client.register('/src/App.vue', { accept: (u) => accepted.push(u.path) });
      client.connect();
      last().open();
      last().message({ type: 'update', data: { path: './src/App.vue?t=1699', timestamp: 1 } });

      expect(accepted).toEqual(['./src/App.vue?t=1699']);
      expect(reload).not.toHaveBeenCalled();
      client.disconnect();
    });
  });

  describe('注册合并', () => {
    it('accept 与 dispose 先后注册互不覆盖', () => {
      const client = createHMRClient({ autoConnect: false });

      client.register('/a.vue', { accept: () => {} });
      client.register('/a.vue', { dispose: () => {} });
      expect(typeof client.getHandler('/a.vue')?.accept).toBe('function');
      expect(typeof client.getHandler('/a.vue')?.dispose).toBe('function');

      client.register('/b.vue', { dispose: () => {} });
      client.register('/b.vue', { accept: () => {} });
      expect(typeof client.getHandler('/b.vue')?.dispose).toBe('function');
      expect(typeof client.getHandler('/b.vue')?.accept).toBe('function');

      client.disconnect();
    });

    it('unregister 后不再命中', () => {
      const client = createHMRClient({ autoConnect: false });
      client.register('/a.vue', { accept: () => {} });
      client.unregister('/a.vue');

      expect(client.getHandler('/a.vue')).toBeUndefined();
      client.disconnect();
    });
  });

  describe('normalizeModulePath', () => {
    it('去掉 ./ 前缀、缓存戳，并统一反斜杠', () => {
      expect(normalizeModulePath('./src/App.vue')).toBe('src/App.vue');
      expect(normalizeModulePath('/src/App.vue?t=1699')).toBe('src/App.vue');
      expect(normalizeModulePath('src\\App.vue')).toBe('src/App.vue');
    });
  });

  describe('消息与事件', () => {
    it('custom 消息派发到 window', () => {
      const client = createHMRClient({ url: 'ws://x', autoConnect: false });
      const received: unknown[] = [];
      const listener = (event: Event) => received.push((event as CustomEvent).detail);
      window.addEventListener('lytjs:hmr', listener);

      client.connect();
      last().open();
      last().message({ type: 'custom', data: { hello: 1 } });

      expect(received).toContainEqual({ type: 'custom', data: { hello: 1 } });
      window.removeEventListener('lytjs:hmr', listener);
      client.disconnect();
    });

    it('已连接时 send 真的发出，断开后静默丢弃', () => {
      const client = createHMRClient({ url: 'ws://x', autoConnect: false });
      client.connect();
      last().open();

      client.send({ type: 'custom', data: 1 });
      expect(last().sent).toHaveLength(1);

      client.disconnect();
      client.send({ type: 'custom', data: 2 });
      expect(last().sent).toHaveLength(1);
    });
  });

  describe('全局单例', () => {
    it('getHMRClient 返回同一实例', () => {
      const a = getHMRClient({ autoConnect: false });
      const b = getHMRClient({ autoConnect: false });
      expect(a).toBe(b);
      a.disconnect();
    });
  });
});
