/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createStorage, createSessionStorage, isStorageAvailable, parseJSON } from '../src/index';

class MockStorage implements Storage {
  private store: Record<string, string> = {};
  length = 0;

  clear(): void {
    this.store = {};
    this.length = 0;
  }

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    delete this.store[key];
    this.length = Object.keys(this.store).length;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
    this.length = Object.keys(this.store).length;
  }
}

describe('@lytjs/common-storage', () => {
  describe('parseJSON', () => {
    it('should parse valid JSON', () => {
      expect(parseJSON('{"a":1}', { a: 0 })).toEqual({ a: 1 });
    });

    it('should parse valid JSON array', () => {
      expect(parseJSON('[1,2,3]', [])).toEqual([1, 2, 3]);
    });

    it('should parse valid JSON string', () => {
      expect(parseJSON('"hello"', '')).toBe('hello');
    });

    it('should parse valid JSON number', () => {
      expect(parseJSON('42', 0)).toBe(42);
    });

    it('should parse valid JSON boolean', () => {
      expect(parseJSON('true', false)).toBe(true);
    });

    it('should parse valid JSON null', () => {
      expect(parseJSON('null', 'fallback')).toBe(null);
    });

    it('should return fallback for invalid JSON', () => {
      expect(parseJSON('not json', 'fallback')).toBe('fallback');
    });

    it('should return fallback for empty string', () => {
      expect(parseJSON('', 'fallback')).toBe('fallback');
    });

    it('should return fallback for truncated JSON', () => {
      expect(parseJSON('{"a":', {})).toEqual({});
    });
  });

  describe('isStorageAvailable', () => {
    it('should return true for a working storage', () => {
      const storage = new MockStorage();
      expect(isStorageAvailable(storage)).toBe(true);
    });

    it('should return false for a storage that throws on setItem', () => {
      const badStorage = {
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
        removeItem: () => {},
        getItem: () => null,
        length: 0,
        clear: () => {},
        key: () => null,
      } as Storage;
      expect(isStorageAvailable(badStorage)).toBe(false);
    });
  });

  describe('createStorage', () => {
    it('should create a storage adapter', () => {
      const storage = new MockStorage();
      const adapter = createStorage<string>({
        key: 'test',
        storage,
      });
      expect(adapter).toHaveProperty('get');
      expect(adapter).toHaveProperty('set');
      expect(adapter).toHaveProperty('remove');
      expect(adapter).toHaveProperty('has');
      expect(adapter).toHaveProperty('onChange');
    });

    it('should set and get a value', () => {
      const storage = new MockStorage();
      const adapter = createStorage<string>({
        key: 'test',
        storage,
      });
      adapter.set('hello');
      expect(adapter.get()).toBe('hello');
    });

    it('should return default value when key does not exist', () => {
      const storage = new MockStorage();
      const adapter = createStorage<string>({
        key: 'test',
        storage,
        default: 'default',
      });
      expect(adapter.get()).toBe('default');
    });

    it('should return undefined when key does not exist and no default', () => {
      const storage = new MockStorage();
      const adapter = createStorage<string>({
        key: 'test',
        storage,
      });
      expect(adapter.get()).toBeUndefined();
    });

    it('should remove a value', () => {
      const storage = new MockStorage();
      const adapter = createStorage<string>({
        key: 'test',
        storage,
      });
      adapter.set('hello');
      expect(adapter.has()).toBe(true);
      adapter.remove();
      expect(adapter.has()).toBe(false);
    });

    it('should check if a value exists', () => {
      const storage = new MockStorage();
      const adapter = createStorage<string>({
        key: 'test',
        storage,
      });
      expect(adapter.has()).toBe(false);
      adapter.set('hello');
      expect(adapter.has()).toBe(true);
    });

    it('should work with objects', () => {
      const storage = new MockStorage();
      const adapter = createStorage<{ name: string }>({
        key: 'user',
        storage,
      });
      adapter.set({ name: 'test' });
      expect(adapter.get()).toEqual({ name: 'test' });
    });

    it('should work with arrays', () => {
      const storage = new MockStorage();
      const adapter = createStorage<number[]>({
        key: 'nums',
        storage,
        default: [],
      });
      adapter.set([1, 2, 3]);
      expect(adapter.get()).toEqual([1, 2, 3]);
    });

    it('should use custom serializer', () => {
      const storage = new MockStorage();
      const adapter = createStorage<string>({
        key: 'test',
        storage,
        serializer: (v) => btoa(v),
        deserializer: (v) => atob(v),
      });
      adapter.set('hello');
      expect(storage.getItem('test')).toBe(btoa('hello'));
      expect(adapter.get()).toBe('hello');
    });

    it('should handle corrupted data with default', () => {
      const storage = new MockStorage();
      storage.setItem('test', 'not-json');
      const adapter = createStorage<{ a: number }>({
        key: 'test',
        storage,
        default: { a: 0 },
      });
      expect(adapter.get()).toEqual({ a: 0 });
    });

    it('should return unsubscribe function from onChange', () => {
      const storage = new MockStorage();
      const adapter = createStorage<string>({
        key: 'test',
        storage,
      });
      const unsub = adapter.onChange(() => {});
      expect(typeof unsub).toBe('function');
      unsub();
    });

    it('should notify listeners on set', () => {
      const storage = new MockStorage();
      const adapter = createStorage<string>({
        key: 'test',
        storage,
      });
      const listener = vi.fn();
      adapter.onChange(listener);
      adapter.set('hello');
      expect(listener).toHaveBeenCalledWith('hello');
    });

    it('should notify listeners on remove', () => {
      const storage = new MockStorage();
      const adapter = createStorage<string>({
        key: 'test',
        storage,
      });
      const listener = vi.fn();
      adapter.onChange(listener);
      adapter.set('hello');
      adapter.remove();
      expect(listener).toHaveBeenCalledWith(null);
    });

    it('should stop notifying after unsubscribe', () => {
      const storage = new MockStorage();
      const adapter = createStorage<string>({
        key: 'test',
        storage,
      });
      const listener = vi.fn();
      const unsub = adapter.onChange(listener);
      unsub();
      adapter.set('hello');
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('createSessionStorage', () => {
    it('should create a storage adapter using sessionStorage', () => {
      const adapter = createSessionStorage<string>({
        key: 'session-test',
        default: 'default',
      });
      expect(adapter).toHaveProperty('get');
      expect(adapter).toHaveProperty('set');
      expect(adapter).toHaveProperty('remove');
      expect(adapter).toHaveProperty('has');
      expect(adapter).toHaveProperty('onChange');
    });

    it('should return default value when sessionStorage is not available', () => {
      const adapter = createSessionStorage<string>({
        key: 'session-test',
        default: 'default',
      });
      // In test environment, sessionStorage might not be available
      expect(adapter.get()).toBe('default');
    });
  });
});
