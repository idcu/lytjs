/**
 * @lytjs/cache - 统一缓存系统入口
 *
 * 提供多层缓存（Memory → Redis → HTTP）支持，
 * 包含缓存标签、TTL、统计等功能。
 */

/**
 * 缓存条目接口
 */
export interface CacheEntry<T = unknown> {
  /** 缓存值 */
  value: T;
  /** 创建时间戳 */
  createdAt: number;
  /** 过期时间戳 */
  expiresAt: number;
  /** 缓存标签 */
  tags: string[];
  /** 数据大小（字节） */
  size?: number;
}

/**
 * 缓存配置选项
 */
export interface CacheOptions {
  /** 生存时间（毫秒） */
  ttl?: number;
  /** 缓存标签 */
  tags?: string[];
  /** 重新验证时间（毫秒） */
  revalidate?: number;
  /** 最大大小（字节） */
  maxSize?: number;
}

/**
 * 统一缓存接口
 */
export interface Cache {
  /**
   * 获取缓存值
   */
  get<T>(key: string): Promise<T | undefined>;

  /**
   * 获取**完整条目**（含 `expiresAt` / `tags`）。
   *
   * ⚠️ 2026-11-03 新增。`MultiLayerCache.get()` 命中下层后要**回写上层**，
   *   而回写必须带上原来的 TTL 与 tags —— 否则：
   *   · TTL 被换成默认 1 小时 ⇒ 已过期的数据被"续命"
   *   · **tags 丢失 ⇒ `invalidateTag()` 清不掉上层那份副本** ⇒ 一直返回陈旧数据
   *     （实测见 `scripts/check-cache.mjs` 第 [4] 组）
   *
   * 可选实现：自定义层不实现时退化为 `get()` + 默认 TTL、无 tags。
   */
  getEntry?<T>(key: string): Promise<CacheEntry<T> | undefined>;

  /**
   * 设置缓存值
   */
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;

  /**
   * 删除缓存值
   */
  delete(key: string): Promise<boolean>;

  /**
   * 检查缓存是否存在
   */
  has(key: string): Promise<boolean>;

  /**
   * 清除所有缓存
   */
  clear(): Promise<void>;

  /**
   * 按标签无效化缓存
   */
  invalidateTag(tag: string): Promise<void>;

  /**
   * 批量按标签无效化缓存
   */
  invalidateTags(tags: string[]): Promise<void>;

  /**
   * 获取缓存统计信息
   */
  getStats(): Promise<CacheStats>;
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  /** 键的数量 */
  size: number;
  /** 总大小（字节） */
  totalSize: number;
  /** 命中次数 */
  hits: number;
  /** 未命中次数 */
  misses: number;
  /** 命中率 */
  hitRate: number;
}

/**
 * 多层缓存配置
 *
 * ## 2026-10-10 修复（P1-7）
 *
 * 此前这里声明了 `redis` 与 `http` 两层，但 `MultiLayerCache` 构造函数里
 * 对应分支是**空 if 块**（注释写着「这里我们预留接口」）⇒ 用户配了 `redis`
 * 却得到一个**只有内存层**的缓存，且**没有任何提示**。
 *
 * 现在：
 * - 删掉无法兑现的 `redis` / `http` 声明（本包不引入 Redis 客户端依赖）；
 * - 新增 {@link MultiLayerCacheConfig.extraLayers}：把「自定义远程层」变成
 *   **真正可用**的能力 —— 只要实现公开的 {@link Cache} 接口即可接入 Redis /
 *   文件 / 分布式缓存，多层读写与回写逻辑本来就是真的。
 */
export interface MultiLayerCacheConfig {
  /** 内存缓存配置（第一层，默认启用）。传 `false` 关闭 */
  memory?: CacheOptions | boolean;
  /**
   * 追加的自定义缓存层（按数组顺序排在 memory 之后）。
   *
   * 例：自己封装一个 Redis 层：
   * ```ts
   * class RedisCache implements Cache { /* 用你选定的 redis 客户端 *\/ }
   * new MultiLayerCache({ extraLayers: [new RedisCache(...)] });
   * ```
   */
  extraLayers?: Cache[];
}

/**
 * 数据预取上下文
 */
export interface PrefetchContext {
  /** 路径 */
  path?: string;
  /** 参数 */
  params?: Record<string, string>;
  /** 查询参数 */
  query?: Record<string, string>;
}

/**
 * 预取结果
 */
export interface PrefetchResult<T = unknown> {
  /** 预取的数据 */
  data: T;
  /** 过期时间戳 */
  expiresAt?: number;
  /** 缓存标签 */
  tags?: string[];
}

const DEFAULT_TTL = 3600000; // 1 小时
const MAX_SIZE = 100 * 1024 * 1024; // 100 MB

/**
 * 内存缓存实现
 */
export class MemoryCache implements Cache {
  private cache: Map<string, CacheEntry> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private stats: CacheStats = {
    size: 0,
    totalSize: 0,
    hits: 0,
    misses: 0,
    hitRate: 0,
  };
  private defaultTTL: number;
  private maxSize: number;

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl ?? DEFAULT_TTL;
    this.maxSize = options.maxSize ?? MAX_SIZE;
  }

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    const now = Date.now();
    if (entry.expiresAt < now) {
      this.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    this.stats.hits++;
    this.updateHitRate();
    return entry.value as T;
  }

  /**
   * 读取完整条目（含过期判定），供 `MultiLayerCache` 回写时保留 TTL / tags。
   * 注意：**不**计入 hits / misses —— 统计口径仍以 `get()` 为准。
   */
  async getEntry<T>(key: string): Promise<CacheEntry<T> | undefined> {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      await this.delete(key);
      return undefined;
    }
    return entry as CacheEntry<T>;
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const now = Date.now();
    const ttl = options.ttl ?? this.defaultTTL;
    const tags = options.tags ?? [];
    const size = this.calculateSize(value);

    // ★ 2026-11-03 修（P0）：**覆盖同一个 key 时先扣掉旧条目的 size**。
    //
    //   此前是 `this.stats.totalSize += size` 无条件累加，而 `this.cache.set(key, entry)`
    //   会覆盖旧条目 ⇒ 旧 size 永远留在统计里。实测：1KB 的值覆盖 10 次，
    //   totalSize 从 1002 涨到 11022（缓存里其实只有 1 条）。
    //
    //   后果不是"统计不准"这么轻：一旦 totalSize 被撑大，之后**每次 set 都会触发
    //   evictOldest()** ⇒ 刚写进去的条目立刻被淘汰 ⇒ 缓存**永久失效**，
    //   而调用方完全看不出来（get 一直 miss，只是变慢）。
    const existing = this.cache.get(key);
    if (existing) {
      if (existing.size) this.stats.totalSize -= existing.size;
      // 旧条目的 tag 索引由 delete 之外的路径维护，这里显式清理
      for (const tag of existing.tags) {
        const keys = this.tagIndex.get(tag);
        if (keys) {
          keys.delete(key);
          if (keys.size === 0) this.tagIndex.delete(tag);
        }
      }
    }

    // ★ 单条就超过总预算 ⇒ **不缓存**。
    //   否则它会把其它条目全部挤掉、自己又超限，等于把缓存变成"每次都 miss"。
    //   （实测：maxSize=100 时写入 1KB 的条目，totalSize 直接变成 1002。）
    if (size > this.maxSize) {
      if (existing) this.cache.delete(key);
      this.stats.size = this.cache.size;
      return;
    }

    // ★ 淘汰到装得下为止（此前只淘汰一条，装不下也照写）
    while (this.stats.totalSize + size > this.maxSize && this.cache.size > 0) {
      const before = this.stats.totalSize;
      this.evictOldest();
      // 防御：淘汰没有实际减少 totalSize 时退出，避免死循环
      if (this.stats.totalSize >= before) break;
    }

    const entry: CacheEntry = {
      value,
      createdAt: now,
      expiresAt: now + ttl,
      tags,
      size,
    };

    // 更新缓存
    this.cache.set(key, entry);

    // 更新标签索引
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    }

    // 更新统计
    this.stats.size = this.cache.size;
    this.stats.totalSize += size;
  }

  async delete(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // 从标签索引中删除
    for (const tag of entry.tags) {
      const tagKeys = this.tagIndex.get(tag);
      if (tagKeys) {
        tagKeys.delete(key);
        if (tagKeys.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }

    // 更新统计
    if (entry.size) {
      this.stats.totalSize -= entry.size;
    }
    this.stats.size = this.cache.size - 1;

    return this.cache.delete(key);
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }
    if (Date.now() > entry.expiresAt) {
      await this.delete(key);
      return false;
    }
    return true;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.tagIndex.clear();
    this.stats = {
      size: 0,
      totalSize: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
    };
  }

  async invalidateTag(tag: string): Promise<void> {
    const keys = this.tagIndex.get(tag);
    if (!keys) {
      return;
    }

    for (const key of keys) {
      await this.delete(key);
    }
  }

  async invalidateTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      await this.invalidateTag(tag);
    }
  }

  async getStats(): Promise<CacheStats> {
    return { ...this.stats };
  }

  /**
   * 计算值的大小（字节）
   */
  private calculateSize(value: unknown): number {
    try {
      const str = JSON.stringify(value);
      return new TextEncoder().encode(str).length;
    } catch {
      return 100; // 估算大小
    }
  }

  /**
   * 淘汰最旧的条目
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

/**
 * 多层缓存实现（Memory → Redis → HTTP）
 */
export class MultiLayerCache implements Cache {
  private layersInternal: Cache[];

  constructor(config: MultiLayerCacheConfig = {}) {
    this.layersInternal = [];

    // 内存缓存作为第一层
    if (config.memory !== false) {
      const memoryOptions = typeof config.memory === 'object' ? config.memory : undefined;
      this.layersInternal.push(new MemoryCache(memoryOptions));
    }

    // 调用方提供的自定义层（Redis / 文件 / 分布式缓存……）
    // FIX P1-7：此前这里是对 redis / http 的两个**空 if 块**，配了也不生效。
    if (config.extraLayers) {
      this.layersInternal.push(...config.extraLayers);
    }
  }

  /** 当前生效的缓存层（按查找顺序，第 0 层最快）。只读，便于观测与调试 */
  get layers(): readonly Cache[] {
    return this.layersInternal;
  }

  async get<T>(key: string): Promise<T | undefined> {
    for (let i = 0; i < this.layersInternal.length; i++) {
      const layer = this.layersInternal[i]!;

      // ★ 2026-11-03 修（P0）：优先取**完整条目**，回写时带上原来的 TTL 与 tags。
      //
      //   此前是 `layer.get(key)` 拿到值就直接 `set(key, value)` 回写 —— 两个后果：
      //   ① TTL 被换成默认值（1 小时）⇒ 下层即将过期的数据被"续命"
      //   ② **tags 丢失 ⇒ `invalidateTag()` 清不掉上层那份副本** ⇒ 一直返回陈旧数据
      //      实测：远端写入 `{ttl:50, tags:['t1']}`，回写到上层后
      //      `invalidateTag('t1')` 只清掉了远端，上层 `has('k')` 仍是 true。
      const entry = layer.getEntry ? await layer.getEntry<T>(key) : undefined;
      const value = entry ? entry.value : await layer.get<T>(key);
      if (value === undefined) continue;

      // 回写上层缓存（保留原条目的 TTL / tags）
      if (i > 0) {
        const options: CacheOptions = {};
        if (entry) {
          const remaining = entry.expiresAt - Date.now();
          // 已经过期的数据不往上写
          if (remaining <= 0) return value;
          options.ttl = remaining;
          options.tags = entry.tags;
        }
        for (let j = 0; j < i; j++) {
          await this.layersInternal[j]!.set(key, value, options);
        }
      }
      return value;
    }
    return undefined;
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    // 写入所有层
    for (const layer of this.layersInternal) {
      await layer.set(key, value, options);
    }
  }

  async delete(key: string): Promise<boolean> {
    let result = false;
    for (const layer of this.layersInternal) {
      const layerResult = await layer.delete(key);
      if (layerResult) {
        result = true;
      }
    }
    return result;
  }

  async has(key: string): Promise<boolean> {
    for (const layer of this.layersInternal) {
      if (await layer.has(key)) {
        return true;
      }
    }
    return false;
  }

  async clear(): Promise<void> {
    for (const layer of this.layersInternal) {
      await layer.clear();
    }
  }

  async invalidateTag(tag: string): Promise<void> {
    for (const layer of this.layersInternal) {
      await layer.invalidateTag(tag);
    }
  }

  async invalidateTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      await this.invalidateTag(tag);
    }
  }

  async getStats(): Promise<CacheStats> {
    // 合并所有层的统计信息
    const statsList = await Promise.all(this.layersInternal.map((layer) => layer.getStats()));
    const merged: CacheStats = {
      size: statsList.reduce((sum, stat) => sum + stat.size, 0),
      totalSize: statsList.reduce((sum, stat) => sum + stat.totalSize, 0),
      hits: statsList.reduce((sum, stat) => sum + stat.hits, 0),
      misses: statsList.reduce((sum, stat) => sum + stat.misses, 0),
      hitRate: 0,
    };
    const total = merged.hits + merged.misses;
    merged.hitRate = total > 0 ? merged.hits / total : 0;
    return merged;
  }
}

/**
 * 创建默认缓存实例
 */
export function createCache(options?: {
  type?: 'memory' | 'multi';
  config?: CacheOptions | MultiLayerCacheConfig;
}) {
  if (options?.type === 'multi') {
    return new MultiLayerCache(options.config as MultiLayerCacheConfig);
  }
  return new MemoryCache(options?.config as CacheOptions);
}

// 默认实例
let defaultCache: MemoryCache | null = null;

export function getDefaultCache() {
  if (!defaultCache) {
    defaultCache = new MemoryCache();
  }
  return defaultCache;
}
