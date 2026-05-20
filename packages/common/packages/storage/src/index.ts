/**
 * @lytjs/common-storage
 * 轻量级类型安全的存储工具
 */

declare const __DEV__: boolean;

export interface StorageOptions<T> {
  key: string;
  storage?: Storage;
  serializer?: (value: T) => string;
  deserializer?: (value: string) => T;
  default?: T;
}

export interface StorageAdapter<T> {
  get(): T;
  set(value: T): void;
  remove(): void;
  has(): boolean;
  onChange(callback: (value: T | null) => void): () => void;
}

/**
 * 安全的 JSON 解析，解析失败返回 fallback
 */
export function parseJSON<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/**
 * 检查存储是否可用（处理隐私模式等场景）
 */
export function isStorageAvailable(storage?: Storage): boolean {
  if (!storage) {
    try {
      storage = window.localStorage;
    } catch {
      return false;
    }
  }

  try {
    const testKey = '__lytjs_storage_test__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * 创建类型安全的存储适配器
 *
 * @param options - 存储配置
 * @returns StorageAdapter 实例
 */
export function createStorage<T>(options: StorageOptions<T>): StorageAdapter<T> {
  const {
    key,
    storage,
    serializer = JSON.stringify,
    deserializer = (v: string) => parseJSON<T>(v, options.default as T),
    default: defaultValue,
  } = options;

  const listeners = new Set<(value: T | null) => void>();

  const getStorage = (): Storage | undefined => {
    if (storage) return storage;
    if (typeof window !== 'undefined') {
      return window.localStorage;
    }
    return undefined;
  };

  const notifyListeners = (value: T | null) => {
    for (const listener of listeners) {
      try {
        listener(value);
      } catch {
        // Ignore listener errors
      }
    }
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === key) {
      const newValue = event.newValue ? deserializer(event.newValue) : null;
      notifyListeners(newValue);
    }
  };

  const adapter: StorageAdapter<T> = {
    get(): T {
      const s = getStorage();
      if (!s) return defaultValue as T;
      try {
        const raw = s.getItem(key);
        if (raw === null) return defaultValue as T;
        return deserializer(raw);
      } catch {
        return defaultValue as T;
      }
    },

    set(value: T): void {
      const s = getStorage();
      if (!s) return;
      try {
        s.setItem(key, serializer(value));
        notifyListeners(value);
      } catch {
        if (__DEV__) {
          console.warn(`[storage] Failed to set item "${key}"`);
        }
      }
    },

    remove(): void {
      const s = getStorage();
      if (!s) return;
      try {
        s.removeItem(key);
        notifyListeners(null);
      } catch {
        // Ignore
      }
    },

    has(): boolean {
      const s = getStorage();
      if (!s) return false;
      try {
        return s.getItem(key) !== null;
      } catch {
        return false;
      }
    },

    onChange(callback: (value: T | null) => void): () => void {
      listeners.add(callback);
      if (typeof window !== 'undefined' && listeners.size === 1) {
        window.addEventListener('storage', handleStorageEvent);
      }
      return () => {
        listeners.delete(callback);
        if (typeof window !== 'undefined' && listeners.size === 0) {
          window.removeEventListener('storage', handleStorageEvent);
        }
      };
    },
  };

  return adapter;
}

/**
 * 使用 sessionStorage 的快捷方式
 *
 * @param options - 存储配置（不含 storage 字段）
 * @returns StorageAdapter 实例
 */
export function createSessionStorage<T>(
  options: Omit<StorageOptions<T>, 'storage'>,
): StorageAdapter<T> {
  const getSessionStorage = (): Storage | undefined => {
    if (typeof window !== 'undefined') {
      return window.sessionStorage;
    }
    return undefined;
  };

  return createStorage<T>({
    ...options,
    storage: getSessionStorage(),
  });
}
