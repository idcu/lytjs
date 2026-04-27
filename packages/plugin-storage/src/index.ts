// Lyt.js 本地存储持久化插件
//
// 用法：
//   import { createStorage } from '@lytjs/plugin-storage'
//   const storage = createStorage({
//     prefix: 'lyt_',
//     storage: localStorage,
//   })
//   app.use(storage)
//   // 使用：storage.set('user', { name: 'lyt' })
//   //        storage.get('user')
//   //        storage.watch(state, 'key')  // 自动保存响应式状态
//
// ======================== 类型定义 ========================

/** 存储类型 */
type StorageType = 'local' | 'session'

/** 存储配置选项 */
interface StorageOptions {
  /** key 前缀，默认 'lyt_' */
  prefix?: string
  /** 使用的存储对象，默认 localStorage */
  storage?: Storage
  /** 过期时间（毫秒），默认无过期 */
  expire?: number
  /** 是否开启调试模式 */
  debug?: boolean
  /** 数据序列化函数，默认 JSON.stringify */
  serialize?: (value: any) => string
  /** 数据反序列化函数，默认 JSON.parse */
  deserialize?: (value: string) => any
}

/** 存储的值包装对象 */
interface StorageItem {
  /** 实际值 */
  value: any
  /** 过期时间戳 */
  expire?: number
  /** 创建时间戳 */
  timestamp: number
}

/** 存储插件实例 */
interface StoragePlugin {
  /** 安装到 Lyt 应用 */
  install: (app: any, options?: any) => void
  /** 设置值 */
  set<T = any>(key: string, value: T, expire?: number): void
  /** 获取值 */
  get<T = any>(key: string, defaultValue?: T): T | null
  /** 删除值 */
  remove(key: string): void
  /** 清空所有（仅当前前缀的） */
  clear(): void
  /** 检查 key 是否存在 */
  has(key: string): boolean
  /** 获取所有 key（仅当前前缀的） */
  keys(): string[]
  /** 获取存储使用情况 */
  size(): number
  /** 监听响应式对象变化，自动保存 */
  watch(target: any, key: string, options?: WatchOptions): () => void
  /** 从存储恢复响应式对象 */
  restore<T = any>(target: any, key: string, defaultValue?: T): T
  /** 原始存储对象 */
  readonly storage: Storage
}

/** watch 配置选项 */
interface WatchOptions {
  /** 是否立即执行一次保存 */
  immediate?: boolean
  /** 深度监听 */
  deep?: boolean
  /** 防抖延迟（毫秒） */
  debounce?: number
}

// ======================== 工具函数 ========================

/**
 * 创建内存 Storage 实现
 *
 * 当 localStorage 不可用时（如 Node.js 环境、SSR 等），
 * 使用此函数创建一个符合 Storage 接口的内存存储对象。
 */
function createMemoryStorage(): Storage {
  const store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value) },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { Object.keys(store).forEach(k => delete store[k]) },
    get length() { return Object.keys(store).length },
    key: (index: number) => Object.keys(store)[index] ?? null,
  }
}

/**
 * 获取带前缀的 key
 */
function getPrefixedKey(key: string, prefix: string): string {
  return `${prefix}${key}`
}

/**
 * 获取原始 key（去掉前缀）
 */
function getOriginalKey(prefixedKey: string, prefix: string): string {
  return prefixedKey.startsWith(prefix) ? prefixedKey.slice(prefix.length) : prefixedKey
}

/**
 * 防抖函数
 */
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return function (this: any, ...args: Parameters<T>) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

// ======================== 核心实现 ========================

/**
 * 创建本地存储持久化插件实例
 * @param options 存储配置
 * @returns StoragePlugin 插件实例
 */
function createStorage(options: StorageOptions = {}): StoragePlugin {
  const {
    prefix = 'lyt_',
    storage = typeof localStorage !== 'undefined' ? localStorage : createMemoryStorage(),
    expire,
    debug = false,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  } = options

  // 日志函数
  const log = (...args: any[]) => {
    if (debug) {
      console.log('[Storage]', ...args)
    }
  }

  /**
   * 设置值到存储
   */
  function set<T = any>(key: string, value: T, customExpire?: number): void {
    try {
      const item: StorageItem = {
        value,
        timestamp: Date.now(),
      }

      const expireTime = customExpire ?? expire
      if (expireTime) {
        item.expire = Date.now() + expireTime
      }

      const prefixedKey = getPrefixedKey(key, prefix)
      storage.setItem(prefixedKey, serialize(item))
      log(`set ${key}`, value)
    } catch (error) {
      console.error('[Storage] set error:', error)
    }
  }

  /**
   * 从存储获取值
   */
  function get<T = any>(key: string, defaultValue?: T): T | null {
    try {
      const prefixedKey = getPrefixedKey(key, prefix)
      const data = storage.getItem(prefixedKey)

      if (!data) {
        return defaultValue ?? null
      }

      const item: StorageItem = deserialize(data)

      // 检查是否过期
      if (item.expire && Date.now() > item.expire) {
        log(`${key} expired, removing`)
        remove(key)
        return defaultValue ?? null
      }

      log(`get ${key}`, item.value)
      return item.value
    } catch (error) {
      console.error('[Storage] get error:', error)
      return defaultValue ?? null
    }
  }

  /**
   * 从存储删除值
   */
  function remove(key: string): void {
    try {
      const prefixedKey = getPrefixedKey(key, prefix)
      storage.removeItem(prefixedKey)
      log(`removed ${key}`)
    } catch (error) {
      console.error('[Storage] remove error:', error)
    }
  }

  /**
   * 清空所有当前前缀的存储项
   */
  function clear(): void {
    try {
      const allKeys = keys()
      for (const key of allKeys) {
        remove(key)
      }
      log('cleared all')
    } catch (error) {
      console.error('[Storage] clear error:', error)
    }
  }

  /**
   * 检查 key 是否存在且未过期
   */
  function has(key: string): boolean {
    return get(key) !== null
  }

  /**
   * 获取所有当前前缀的 key
   */
  function keys(): string[] {
    try {
      const result: string[] = []
      for (let i = 0; i < storage.length; i++) {
        const prefixedKey = storage.key(i)
        if (prefixedKey && prefixedKey.startsWith(prefix)) {
          result.push(getOriginalKey(prefixedKey, prefix))
        }
      }
      return result
    } catch (error) {
      console.error('[Storage] keys error:', error)
      return []
    }
  }

  /**
   * 获取当前前缀的存储项数量
   */
  function size(): number {
    return keys().length
  }

  /**
   * 监听响应式对象，自动保存
   * 返回一个停止监听的函数
   */
  function watch(
    target: any,
    key: string,
    watchOptions: WatchOptions = {}
  ): () => void {
    const { immediate = true, deep = true, debounce: debounceDelay = 100 } = watchOptions

    // 如果有 watch 函数，使用它
    if (typeof target.$watch === 'function') {
      const unwatch = target.$watch(
        key,
        debounceDelay > 0
          ? debounce((newVal: any) => {
              set(key, newVal)
            }, debounceDelay)
          : (newVal: any) => {
              set(key, newVal)
            },
        { immediate, deep }
      )
      return unwatch
    }

    // 如果有 reactive/watch 包，尝试使用
    if (typeof (globalThis as any).watch === 'function') {
      const watchFn = (globalThis as any).watch
      const stop = watchFn(
        () => target[key],
        debounceDelay > 0
          ? debounce((newVal: any) => {
              set(key, newVal)
            }, debounceDelay)
          : (newVal: any) => {
              set(key, newVal)
            },
        { immediate, deep }
      )
      return stop
    }

    // 降级到简单的轮询方案
    // TODO: 考虑使用 storage event 或 MutationObserver 替代轮询以提升性能
    // 当前轮询间隔 200ms 作为最后降级手段，适用于不支持 watch API 的环境
    let currentValue = target[key]
    const interval = setInterval(() => {
      const newValue = target[key]
      if (newValue !== currentValue) {
        currentValue = newValue
        set(key, newValue)
      }
    }, 200)

    if (immediate) {
      set(key, currentValue)
    }

    return () => clearInterval(interval)
  }

  /**
   * 从存储恢复响应式对象
   */
  function restore<T = any>(target: any, key: string, defaultValue?: T): T {
    const savedValue = get<T>(key, defaultValue)
    if (savedValue !== null) {
      target[key] = savedValue
      log(`restored ${key}`, savedValue)
    }
    return target[key]
  }

  // 构造插件实例
  const storagePlugin: StoragePlugin = {
    /**
     * 安装插件到 Lyt 应用
     * 向 app 注入 $storage 对象
     */
    install(app: any, _options?: any): void {
      // 注入全局属性 $storage
      app.config = app.config || {}
      app.config.globalProperties = app.config.globalProperties || {}

      app.config.globalProperties.$storage = storagePlugin

      // 如果 app 提供 provide 方法，也通过 provide 注入
      if (typeof app.provide === 'function') {
        app.provide('storage', storagePlugin)
      }
    },

    set,
    get,
    remove,
    clear,
    has,
    keys,
    size,
    watch,
    restore,

    get storage() {
      return storage
    },
  }

  return storagePlugin
}

export { createStorage }
export type { StorageOptions, StoragePlugin, WatchOptions, StorageType }
