import { describe, it, expect, vi } from 'vitest'
import { LRUCache, memoize, ExpiringCache } from '../src/index'

describe('@lytjs/common-cache', () => {
  // LRUCache
  describe('LRUCache', () => {
    it('should create an instance with max size', () => {
      const cache = new LRUCache<string, number>(5)
      expect(cache.size).toBe(0)
    })

    it('should set and get values', () => {
      const cache = new LRUCache<string, number>(5)
      cache.set('a', 1)
      cache.set('b', 2)
      expect(cache.get('a')).toBe(1)
      expect(cache.get('b')).toBe(2)
    })

    it('should evict least recently used item when full', () => {
      const cache = new LRUCache<number, string>(3)
      cache.set(1, 'one')
      cache.set(2, 'two')
      cache.set(3, 'three')
      cache.set(4, 'four') // evicts key 1
      expect(cache.get(1)).toBeUndefined()
      expect(cache.get(2)).toBe('two')
      expect(cache.get(3)).toBe('three')
      expect(cache.get(4)).toBe('four')
    })

    it('should update LRU order on get', () => {
      const cache = new LRUCache<number, string>(3)
      cache.set(1, 'one')
      cache.set(2, 'two')
      cache.set(3, 'three')
      cache.get(1) // key 1 becomes most recently used
      cache.set(4, 'four') // evicts key 2
      expect(cache.get(1)).toBe('one')
      expect(cache.get(2)).toBeUndefined()
      expect(cache.get(4)).toBe('four')
    })

    it('should return undefined for non-existent key', () => {
      const cache = new LRUCache<string, number>(5)
      expect(cache.get('nonexistent')).toBeUndefined()
    })

    it('should support has method', () => {
      const cache = new LRUCache<string, number>(5)
      cache.set('a', 1)
      expect(cache.has('a')).toBe(true)
      expect(cache.has('b')).toBe(false)
    })

    it('should support delete method', () => {
      const cache = new LRUCache<string, number>(5)
      cache.set('a', 1)
      cache.delete('a')
      expect(cache.get('a')).toBeUndefined()
      expect(cache.size).toBe(0)
    })

    it('should support clear method', () => {
      const cache = new LRUCache<string, number>(5)
      cache.set('a', 1)
      cache.set('b', 2)
      cache.clear()
      expect(cache.size).toBe(0)
      expect(cache.get('a')).toBeUndefined()
    })

    it('should handle max size of 1', () => {
      const cache = new LRUCache<string, number>(1)
      cache.set('a', 1)
      cache.set('b', 2)
      expect(cache.get('a')).toBeUndefined()
      expect(cache.get('b')).toBe(2)
    })

    it('should support forEach iteration', () => {
      const cache = new LRUCache<string, number>(5)
      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)
      const entries: [string, number][] = []
      cache.forEach((value, key) => entries.push([key, value]))
      expect(entries.length).toBe(3)
    })
  })

  // memoize
  describe('memoize', () => {
    it('should cache function results', () => {
      let callCount = 0
      const fn = memoize((x: number) => {
        callCount++
        return x * 2
      })
      expect(fn(5)).toBe(10)
      expect(fn(5)).toBe(10)
      expect(callCount).toBe(1)
    })

    it('should cache different arguments separately', () => {
      let callCount = 0
      const fn = memoize((x: number) => {
        callCount++
        return x * 2
      })
      fn(5)
      fn(10)
      expect(callCount).toBe(2)
    })

    it('should support custom resolver', () => {
      let callCount = 0
      const fn = memoize(
        (obj: { a: number; b: number }) => {
          callCount++
          return obj.a + obj.b
        },
        (obj) => `${obj.a}-${obj.b}`
      )
      fn({ a: 1, b: 2 })
      fn({ a: 1, b: 2 })
      expect(callCount).toBe(1)
    })

    it('should support custom cache', () => {
      const cache = new Map<string, number>()
      const fn = memoize((x: number) => x * 2, undefined, cache)
      fn(5)
      expect(cache.has('5')).toBe(true)
    })

    it('should clear cache', () => {
      let callCount = 0
      const fn = memoize((x: number) => {
        callCount++
        return x * 2
      })
      fn(5)
      fn.clear()
      fn(5)
      expect(callCount).toBe(2)
    })
  })

  // ExpiringCache
  describe('ExpiringCache', () => {
    it('should create an instance with TTL', () => {
      const cache = new ExpiringCache<string, number>(1000)
      expect(cache.size).toBe(0)
    })

    it('should set and get values', () => {
      const cache = new ExpiringCache<string, number>(1000)
      cache.set('a', 1)
      expect(cache.get('a')).toBe(1)
    })

    it('should expire entries after TTL', async () => {
      const cache = new ExpiringCache<string, number>(50)
      cache.set('a', 1)
      expect(cache.get('a')).toBe(1)
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(cache.get('a')).toBeUndefined()
    })

    it('should support has method', () => {
      const cache = new ExpiringCache<string, number>(1000)
      cache.set('a', 1)
      expect(cache.has('a')).toBe(true)
    })

    it('should support delete method', () => {
      const cache = new ExpiringCache<string, number>(1000)
      cache.set('a', 1)
      cache.delete('a')
      expect(cache.get('a')).toBeUndefined()
    })

    it('should support clear method', () => {
      const cache = new ExpiringCache<string, number>(1000)
      cache.set('a', 1)
      cache.set('b', 2)
      cache.clear()
      expect(cache.size).toBe(0)
    })

    it('should support cleanup of expired entries', async () => {
      const cache = new ExpiringCache<string, number>(50)
      cache.set('a', 1)
      cache.set('b', 2)
      await new Promise((resolve) => setTimeout(resolve, 100))
      cache.cleanup()
      expect(cache.size).toBe(0)
    })
  })
})
