/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
import { describe, it, expect } from 'vitest';
import {
  mergeObjects,
  deepMerge,
  createSnapshot,
  diffObjects,
  pick,
  omit,
  deepClone,
  shallowEqual,
  deepEqual,
  get,
  set,
} from '../src/index';

describe('@lytjs/common-object', () => {
  // mergeObjects
  describe('mergeObjects', () => {
    it('should merge two objects', () => {
      const result = mergeObjects({ a: 1 }, { b: 2 });
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should overwrite later properties', () => {
      const result = mergeObjects({ a: 1 }, { a: 2 });
      expect(result).toEqual({ a: 2 });
    });

    it('should merge multiple objects', () => {
      const result = mergeObjects({ a: 1 }, { b: 2 }, { c: 3 });
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('should not mutate source objects', () => {
      const a = { x: 1 };
      const b = { y: 2 };
      const result = mergeObjects(a, b);
      expect(a).toEqual({ x: 1 });
      expect(b).toEqual({ y: 2 });
      expect(result).not.toBe(a);
      expect(result).not.toBe(b);
    });

    it('should handle empty objects', () => {
      expect(mergeObjects({}, { a: 1 })).toEqual({ a: 1 });
      expect(mergeObjects({ a: 1 }, {})).toEqual({ a: 1 });
    });
  });

  // deepMerge
  describe('deepMerge', () => {
    it('should deep merge nested objects', () => {
      const result = deepMerge({ a: { x: 1 } }, { a: { y: 2 } });
      expect(result).toEqual({ a: { x: 1, y: 2 } });
    });

    it('should overwrite primitives', () => {
      const result = deepMerge({ a: 1 }, { a: 2 });
      expect(result).toEqual({ a: 2 });
    });

    it('should handle arrays by replacement', () => {
      const result = deepMerge({ a: [1, 2] }, { a: [3, 4] });
      expect(result).toEqual({ a: [3, 4] });
    });

    it('should not mutate source objects', () => {
      const a = { nested: { x: 1 } };
      const b = { nested: { y: 2 } };
      deepMerge(a, b);
      expect(a).toEqual({ nested: { x: 1 } });
    });
  });

  // createSnapshot
  describe('createSnapshot', () => {
    it('should create a shallow copy', () => {
      const original = { a: 1, b: 2 };
      const snapshot = createSnapshot(original);
      expect(snapshot).toEqual(original);
      expect(snapshot).not.toBe(original);
    });

    it('should not deep clone nested objects', () => {
      const nested = { x: 1 };
      const original = { a: nested };
      const snapshot = createSnapshot(original);
      expect(snapshot.a).toBe(nested);
    });
  });

  // diffObjects
  describe('diffObjects', () => {
    it('should return added keys', () => {
      const diff = diffObjects({ a: 1 }, { a: 1, b: 2 });
      expect(diff.added).toEqual({ b: 2 });
    });

    it('should return removed keys', () => {
      const diff = diffObjects({ a: 1, b: 2 }, { a: 1 });
      expect(diff.removed).toEqual({ b: 2 });
    });

    it('should return changed keys', () => {
      const diff = diffObjects({ a: 1 }, { a: 2 });
      expect(diff.changed).toEqual({ a: { from: 1, to: 2 } });
    });

    it('should return empty diff for identical objects', () => {
      const diff = diffObjects({ a: 1 }, { a: 1 });
      expect(diff.added).toEqual({});
      expect(diff.removed).toEqual({});
      expect(diff.changed).toEqual({});
    });
  });

  // pick
  describe('pick', () => {
    it('should pick specified keys', () => {
      expect(pick({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 });
    });

    it('should handle non-existent keys', () => {
      expect(pick({ a: 1 }, ['a', 'b'])).toEqual({ a: 1 });
    });

    it('should handle empty keys array', () => {
      expect(pick({ a: 1 }, [])).toEqual({});
    });

    it('should not mutate source object', () => {
      const obj = { a: 1, b: 2 };
      pick(obj, ['a']);
      expect(obj).toEqual({ a: 1, b: 2 });
    });
  });

  // omit
  describe('omit', () => {
    it('should omit specified keys', () => {
      expect(omit({ a: 1, b: 2, c: 3 }, ['b'])).toEqual({ a: 1, c: 3 });
    });

    it('should handle non-existent keys', () => {
      expect(omit({ a: 1 }, ['b'])).toEqual({ a: 1 });
    });

    it('should handle empty keys array', () => {
      expect(omit({ a: 1 }, [])).toEqual({ a: 1 });
    });

    it('should not mutate source object', () => {
      const obj = { a: 1, b: 2 };
      omit(obj, ['b']);
      expect(obj).toEqual({ a: 1, b: 2 });
    });
  });

  // deepClone
  describe('deepClone', () => {
    it('should deep clone an object', () => {
      const original = { a: 1, nested: { b: 2 } };
      const cloned = deepClone(original);
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.nested).not.toBe(original.nested);
    });

    it('should clone arrays', () => {
      const original = [1, [2, 3]];
      const cloned = deepClone(original);
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned[1]).not.toBe(original[1]);
    });

    it('should handle primitives', () => {
      expect(deepClone(42)).toBe(42);
      expect(deepClone('hello')).toBe('hello');
      expect(deepClone(null)).toBe(null);
      expect(deepClone(undefined)).toBe(undefined);
    });

    it('should handle Date objects', () => {
      const date = new Date('2024-01-01');
      const cloned = deepClone(date);
      expect(cloned).toEqual(date);
      expect(cloned).not.toBe(date);
    });

    it('should clone objects with Symbol keys', () => {
      const sym = Symbol('key');
      const original = { [sym]: 'symbol-value', regular: 'regular-value' };
      const cloned = deepClone(original);
      expect(cloned[sym]).toBe('symbol-value');
      expect(cloned.regular).toBe('regular-value');
      expect(cloned).not.toBe(original);
    });

    it('should deep clone Symbol key values that are objects', () => {
      const sym = Symbol('nested');
      const nested = { x: 1 };
      const original = { [sym]: nested };
      const cloned = deepClone(original);
      expect(cloned[sym]).toEqual({ x: 1 });
      expect(cloned[sym]).not.toBe(nested);
    });
  });

  // shallowEqual
  describe('shallowEqual', () => {
    it('should return true for equal objects', () => {
      expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    });

    it('should return false for different values', () => {
      expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
    });

    it('should return false for different keys', () => {
      expect(shallowEqual({ a: 1 }, { b: 1 })).toBe(false);
    });

    it('should compare by reference for nested objects', () => {
      const nested = { x: 1 };
      expect(shallowEqual({ a: nested }, { a: nested })).toBe(true);
      expect(shallowEqual({ a: { x: 1 } }, { a: { x: 1 } })).toBe(false);
    });

    it('should handle empty objects', () => {
      expect(shallowEqual({}, {})).toBe(true);
    });
  });

  // deepEqual
  describe('deepEqual', () => {
    it('should return true for deeply equal objects', () => {
      expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
    });

    it('should return false for deeply different objects', () => {
      expect(deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
    });

    it('should compare arrays deeply', () => {
      expect(deepEqual([1, [2, 3]], [1, [2, 3]])).toBe(true);
      expect(deepEqual([1, [2, 3]], [1, [2, 4]])).toBe(false);
    });

    it('should handle primitives', () => {
      expect(deepEqual(1, 1)).toBe(true);
      expect(deepEqual('a', 'a')).toBe(true);
      expect(deepEqual(null, null)).toBe(true);
    });
  });

  // get
  describe('get', () => {
    it('should get value by path', () => {
      expect(get({ a: { b: { c: 1 } } }, 'a.b.c')).toBe(1);
    });

    it('should return undefined for non-existent path', () => {
      expect(get({ a: 1 }, 'b.c')).toBeUndefined();
    });

    it('should return default value', () => {
      expect(get({ a: 1 }, 'b.c', 'default')).toBe('default');
    });

    it('should handle array index', () => {
      expect(get({ arr: [10, 20, 30] }, 'arr.1')).toBe(20);
    });

    it('should handle empty path', () => {
      const obj = { a: 1 };
      expect(get(obj, '')).toBe(obj);
    });
  });

  // set
  describe('set', () => {
    it('should set value by path', () => {
      const obj: any = {};
      const result = set(obj, 'a.b.c', 42);
      expect(result.a.b.c).toBe(42);
    });

    it('should overwrite existing value', () => {
      const obj: any = { a: { b: 1 } };
      const result = set(obj, 'a.b', 2);
      expect(result.a.b).toBe(2);
    });

    it('should not mutate original object', () => {
      const original = { a: 1 };
      const result = set(original, 'b', 2);
      expect(original).toEqual({ a: 1 });
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should handle array index', () => {
      const obj: any = { arr: [] };
      const result = set(obj, 'arr.0', 'first');
      expect(result.arr[0]).toBe('first');
    });
  });
});
