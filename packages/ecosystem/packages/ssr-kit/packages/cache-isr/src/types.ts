export interface ISRCacheConfig {
  maxAge?: number;
  revalidate?: number;
  staleWhileRevalidate?: number;
}

export interface ISRCacheEntry<T = unknown> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number;
  revalidateAt?: number;
}
