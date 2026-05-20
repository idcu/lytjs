/**
 * @lytjs/plugin-storage
 *
 * LytJS official storage plugin with localStorage and sessionStorage support, plus JSON serialization.
 *
 * @packageDocumentation
 */

import { definePlugin } from '@lytjs/core';
import type { StorageType, StorageItem, StorageOptions, StorageInstance } from './types';

function createStorage(options: StorageOptions = {}): StorageInstance {
  const { defaultType = 'local', prefix = 'lyt_' } = options;

  function getStorage(type: StorageType): Storage | null {
    if (typeof window === 'undefined') return null;
    try {
      return type === 'local' ? window.localStorage : window.sessionStorage;
    } catch {
      return null;
    }
  }

  function getKey(key: string): string {
    return `${prefix}${key}`;
  }

  function set<T>(key: string, value: T, expires?: number) {
    const storage = getStorage(defaultType);
    if (!storage) return;

    const item: StorageItem<T> = {
      value,
      expires: expires ? Date.now() + expires : undefined,
    };

    try {
      storage.setItem(getKey(key), JSON.stringify(item));
    } catch {}
  }

  function get<T>(key: string, defaultValue?: T): T | null {
    const storage = getStorage(defaultType);
    if (!storage) return defaultValue ?? null;

    try {
      const raw = storage.getItem(getKey(key));
      if (!raw) return defaultValue ?? null;

      const item: StorageItem<T> = JSON.parse(raw);

      if (item.expires && Date.now() > item.expires) {
        remove(key);
        return defaultValue ?? null;
      }

      return item.value;
    } catch {
      return defaultValue ?? null;
    }
  }

  function remove(key: string) {
    const storage = getStorage(defaultType);
    if (!storage) return;

    try {
      storage.removeItem(getKey(key));
    } catch {}
  }

  function clear() {
    const storage = getStorage(defaultType);
    if (!storage) return;

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => storage.removeItem(k));
    } catch {}
  }

  function has(key: string): boolean {
    return get(key) !== null;
  }

  function keys(): string[] {
    const storage = getStorage(defaultType);
    if (!storage) return [];

    const result: string[] = [];
    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(prefix)) {
          result.push(key.slice(prefix.length));
        }
      }
    } catch {}
    return result;
  }

  function clearExpired() {
    const storage = getStorage(defaultType);
    if (!storage) return;

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const fullKey = storage.key(i);
        if (!fullKey || !fullKey.startsWith(prefix)) continue;

        try {
          const raw = storage.getItem(fullKey);
          if (!raw) continue;

          const item: StorageItem = JSON.parse(raw);
          if (item.expires && Date.now() > item.expires) {
            keysToRemove.push(fullKey);
          }
        } catch {}
      }
      keysToRemove.forEach((k) => storage.removeItem(k));
    } catch {}
  }

  return {
    set,
    get,
    remove,
    clear,
    has,
    keys,
    clearExpired,
  };
}

const pluginStorage = definePlugin({
  name: 'storage',
  version: '6.0.0',
  description:
    'LytJS official storage plugin with localStorage and sessionStorage support, plus JSON serialization',
  author: 'LytJS Team',
  keywords: ['lytjs', 'storage', 'localStorage', 'sessionStorage', 'persistence'],
  schema: {
    type: 'object',
    object: {
      properties: {
        defaultType: { type: 'string', default: 'local' },
        prefix: { type: 'string', default: 'lyt_' },
      },
    },
  },
  install(app, options) {
    const storage = createStorage(options as StorageOptions);

    app.config.globalProperties.$storage = storage;

    app.provide('lyt-storage', storage);
  },
});

export default pluginStorage;
export type { StorageType, StorageItem, StorageOptions, StorageInstance };
export { createStorage };
