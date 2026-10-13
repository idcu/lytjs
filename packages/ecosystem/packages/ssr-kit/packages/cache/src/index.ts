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

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const now = Date.now();
    const ttl = options.ttl ?? this.defaultTTL;
    const tags = options.tags ?? [];
    const size = this.calculateSize(value);

    // 检查是否超出最大大小
    if (this.stats.totalSize + size > this.maxSize) {
      this.evictOldest();
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
    for (const layer of this.layersInternal) {
      const value = await layer.get<T>(key);
      if (value !== undefined) {
        // 回写上层缓存
        for (let i = 0; i < this.layersInternal.indexOf(layer); i++) {
          await this.layersInternal[i]!.set(key, value);
        }
        return value;
      }
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
