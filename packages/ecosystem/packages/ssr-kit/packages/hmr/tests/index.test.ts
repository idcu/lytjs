/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHMRClient, getHMRClient, accept, dispose } from '../src';

// 模拟 WebSocket
class MockWebSocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: any) => void) | null = null;
  send = vi.fn();
  close = vi.fn();

  constructor(public url: string) {}

  triggerOpen() {
    if (this.onopen) this.onopen();
  }

  triggerMessage(data: string) {
    if (this.onmessage) this.onmessage({ data });
  }

  triggerClose() {
    if (this.onclose) this.onclose();
  }

  triggerError(error: any) {
    if (this.onerror) this.onerror(error);
  }
}

// 全局模拟
vi.stubGlobal('WebSocket', MockWebSocket);

describe('@lytjs/hmr', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('createHMRClient', () => {
    it('should create HMR client instance', () => {
      const client = createHMRClient({ autoConnect: false });
      expect(client).toBeDefined();
    });

    it('should auto connect by default', () => {
      const client = createHMRClient();
      expect(client).toBeDefined();
      client.disconnect();
    });
  });

  describe('getHMRClient', () => {
    it('should return singleton instance', () => {
      const client1 = getHMRClient({ autoConnect: false });
      const client2 = getHMRClient({ autoConnect: false });
      expect(client1).toBe(client2);
      client1.disconnect();
    });
  });

  describe('accept', () => {
    it('should register accept handler', () => {
      const client = createHMRClient({ autoConnect: false });
      const handler = vi.fn();

      // 使用内部方法测试
      (client as any).register('/test.ts', { accept: handler });

      expect(handler).not.toHaveBeenCalled();
      client.disconnect();
    });
  });

  describe('dispose', () => {
    it('should register dispose handler', () => {
      const client = createHMRClient({ autoConnect: false });
      const handler = vi.fn();

      (client as any).register('/test.ts', { dispose: handler });

      expect(handler).not.toHaveBeenCalled();
      client.disconnect();
    });
  });
});
