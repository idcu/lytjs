import type { ISRCache } from './cache';

export class ISRRevaluator {
  constructor(private cache: ISRCache) {}

  async revalidate<T>(
    key: string,
    generator: () => Promise<T>,
  ): Promise<T> {
    const value = await generator();
    this.cache.set(key, value);
    return value;
  }

  async revalidateIfStale<T>(
    key: string,
    generator: () => Promise<T>,
  ): Promise<T | null> {
    if (!this.cache.has(key)) {
      const value = await generator();
      this.cache.set(key, value);
      return value;
    }

    if (this.cache.isStale(key)) {
      const value = await generator();
      this.cache.set(key, value);
      return value;
    }

    return this.cache.get<T>(key);
  }
}
