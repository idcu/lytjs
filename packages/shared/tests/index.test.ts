import { describe, it, expect, vi } from 'vitest';
import {
  // Type checks
  isString,
  isNumber,
  isBoolean,
  isFunction,
  isObject,
  isPlainObject,
  isArray,
  isNullish,
  isPromise,

  // String utils
  capitalize,
  camelToKebab,
  kebabToCamel,
  generateId,

  // Object utils
  hasOwn,
  hasChanged,
  shallowClone,
  deepClone,
  merge,
  pick,
  omit,

  // Array utils
  unique,
  chunk,
  flatten,
  groupBy,

  // Function utils
  NOOP,
  identity,
  constant,
  delay,
  debounce,
  throttle,
  once,
  memoize,

  // Error handling
  safeExec,
  safeJsonParse,

  // Constants
  EMPTY_OBJ,
  EMPTY_ARR,
  EMPTY_FN,
} from '../src/index';

describe('@lytjs/shared', () => {
  describe('Type Checks', () => {
    it('isString', () => {
      expect(isString('hello')).toBe(true);
      expect(isString(123)).toBe(false);
      expect(isString(null)).toBe(false);
    });

    it('isNumber', () => {
      expect(isNumber(42)).toBe(true);
      expect(isNumber(NaN)).toBe(false);
      expect(isNumber('42')).toBe(false);
    });

    it('isBoolean', () => {
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean(false)).toBe(true);
      expect(isBoolean(1)).toBe(false);
    });

    it('isFunction', () => {
      expect(isFunction(() => {})).toBe(true);
      expect(isFunction({})).toBe(false);
    });

    it('isObject', () => {
      expect(isObject({})).toBe(true);
      expect(isObject([])).toBe(true);
      expect(isObject(null)).toBe(false);
    });

    it('isPlainObject', () => {
      expect(isPlainObject({})).toBe(true);
      expect(isPlainObject([])).toBe(false);
      expect(isPlainObject(new Date())).toBe(false);
    });

    it('isArray', () => {
      expect(isArray([])).toBe(true);
      expect(isArray({})).toBe(false);
    });

    it('isNullish', () => {
      expect(isNullish(null)).toBe(true);
      expect(isNullish(undefined)).toBe(true);
      expect(isNullish(0)).toBe(false);
      expect(isNullish('')).toBe(false);
    });

    it('isPromise', () => {
      expect(isPromise(Promise.resolve())).toBe(true);
      expect(isPromise({ then: () => {} })).toBe(true);
      expect(isPromise(42)).toBe(false);
    });
  });

  describe('String Utils', () => {
    it('capitalize', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('')).toBe('');
    });

    it('camelToKebab', () => {
      expect(camelToKebab('myPropertyName')).toBe('my-property-name');
      expect(camelToKebab('URLParser')).toBe('u-r-l-parser');
    });

    it('kebabToCamel', () => {
      expect(kebabToCamel('my-property-name')).toBe('myPropertyName');
      expect(kebabToCamel('data-value')).toBe('dataValue');
    });

    it('generateId', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
      expect(id1.startsWith('lyt-')).toBe(true);
      expect(generateId('btn').startsWith('btn-')).toBe(true);
    });
  });

  describe('Object Utils', () => {
    it('hasOwn', () => {
      const obj = { a: 1 };
      expect(hasOwn(obj, 'a')).toBe(true);
      expect(hasOwn(obj, 'toString')).toBe(false);
    });

    it('hasChanged', () => {
      expect(hasChanged(1, 2)).toBe(true);
      expect(hasChanged(1, 1)).toBe(false);
      expect(hasChanged(NaN, NaN)).toBe(false);
    });

    it('shallowClone', () => {
      const obj = { a: 1, b: { c: 2 } };
      const clone = shallowClone(obj);
      expect(clone).toEqual(obj);
      expect(clone).not.toBe(obj);
      expect(clone.b).toBe(obj.b);
    });

    it('deepClone', () => {
      const obj = { a: 1, b: { c: [1, 2, 3] } };
      const clone = deepClone(obj);
      expect(clone).toEqual(obj);
      expect(clone).not.toBe(obj);
      expect(clone.b).not.toBe(obj.b);
      expect(clone.b.c).not.toBe(obj.b.c);
    });

    it('merge', () => {
      expect(merge({ a: 1, b: 2 }, { b: 3, c: 4 })).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('pick', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
    });

    it('omit', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(omit(obj, ['b'])).toEqual({ a: 1, c: 3 });
    });
  });

  describe('Array Utils', () => {
    it('unique', () => {
      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
    });

    it('chunk', () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
      expect(chunk([1, 2, 3], 5)).toEqual([[1, 2, 3]]);
    });

    it('flatten', () => {
      expect(flatten([[1, 2], [3, 4], [5]])).toEqual([1, 2, 3, 4, 5]);
    });

    it('groupBy', () => {
      const users = [
        { role: 'admin', name: 'Alice' },
        { role: 'user', name: 'Bob' },
        { role: 'admin', name: 'Charlie' },
      ];
      const grouped = groupBy(users, 'role');
      expect(grouped.admin).toHaveLength(2);
      expect(grouped.user).toHaveLength(1);
    });
  });

  describe('Function Utils', () => {
    it('NOOP', () => {
      expect(NOOP()).toBeUndefined();
    });

    it('identity', () => {
      expect(identity(42)).toBe(42);
      expect(identity({ a: 1 })).toEqual({ a: 1 });
    });

    it('constant', () => {
      const fn = constant(42);
      expect(fn()).toBe(42);
    });

    it('delay', async () => {
      const start = Date.now();
      await delay(50);
      expect(Date.now() - start).toBeGreaterThanOrEqual(45);
    });

    it('debounce', async () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 50);
      debounced();
      debounced();
      debounced();
      await delay(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('throttle', async () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 50);
      throttled();
      throttled();
      throttled();
      expect(fn).toHaveBeenCalledTimes(1);
      await delay(60);
      throttled();
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('once', () => {
      const fn = vi.fn(() => 'result');
      const onceFn = once(fn);
      expect(onceFn()).toBe('result');
      expect(onceFn()).toBeUndefined();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('memoize', () => {
      const fn = vi.fn((n: number) => n * 2);
      const memoized = memoize(fn);
      expect(memoized(5)).toBe(10);
      expect(memoized(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('safeExec', () => {
      expect(safeExec(() => 42, 0)).toBe(42);
      expect(safeExec(() => { throw new Error(); }, 'default')).toBe('default');
    });

    it('safeJsonParse', () => {
      expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 });
      expect(safeJsonParse('invalid', {})).toEqual({});
    });
  });

  describe('Constants', () => {
    it('EMPTY_OBJ', () => {
      expect(EMPTY_OBJ).toEqual({});
      expect(Object.isFrozen(EMPTY_OBJ)).toBe(true);
    });

    it('EMPTY_ARR', () => {
      expect(EMPTY_ARR).toEqual([]);
      expect(Object.isFrozen(EMPTY_ARR)).toBe(true);
    });

    it('EMPTY_FN', () => {
      expect(EMPTY_FN()).toBeUndefined();
    });
  });
});
