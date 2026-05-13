/**
 * @lytjs/plugin-storage - 类型定义
 */

export type StorageType = 'local' | 'session';

export interface StorageItem<T = unknown> {
  /** 数据 */
  value: T;
  /** 过期时间戳 */
  expires?: number;
}

export interface StorageOptions {
  /** 默认存储类型 */
  defaultType?: StorageType;
  /** 命名空间前缀 */
  prefix?: string;
}

export interface StorageInstance {
  /** 设置值 */
  set: <T>(key: string, value: T, expires?: number) => void;
  /** 获取值 */
  get: <T>(key: string, defaultValue?: T) => T | null;
  /** 删除值 */
  remove: (key: string) => void;
  /** 清空所有值 */
  clear: () => void;
  /** 检查是否存在 */
  has: (key: string) => boolean;
  /** 获取所有 keys */
  keys: () => string[];
  /** 移除过期项 */
  clearExpired: () => void;
}
