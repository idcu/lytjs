import { describe, it, expect } from 'vitest';
import {
  unsafeCast,
  nullishCoalesce,
  assertType,
  safeCast,
  hasProperty,
  hasProperties,
  hasTypedProperty,
  isInstanceOf,
  isArrayOf,
  safeGetString,
  safeGetFunction,
  isRendererHost,
  safeGetProperty,
  asRecord,
  safeGetNested,
  isFiniteNumber,
  isNonEmptyString,
  isNonEmptyArray,
  isNonEmptyObject,
  invariant,
  warning,
} from '../src/index';
import { isString, isNumber } from '@lytjs/common-is';

describe('@lytjs/common-assertions', () => {
  describe('unsafeCast', () => {
    it('should cast any value to specified type', () => {
      const value = 'hello';
      const result = unsafeCast<string>(value);
      expect(result).toBe('hello');
    });
  });

  describe('assertType', () => {
    it('should not throw for valid values', () => {
      expect(() => {
        assertType('hello');
      }).not.toThrow();
    });

    it('should throw for invalid values with validator in dev mode', () => {
      // 在测试环境下 __DEV__ 是 true，所以应该抛出错误
      expect(() => {
        assertType(123, isString);
      }).toThrow();
    });
  });

  describe('safeCast', () => {
    it('should return value if type guard passes', () => {
      const value = 'hello';
      const result = safeCast(value, isString);
      expect(result).toBe('hello');
    });

    it('should return undefined if type guard fails', () => {
      const value = 123;
      const result = safeCast(value, isString);
      expect(result).toBeUndefined();
    });

    it('should return default value if provided and type guard fails', () => {
      const value = 123;
      const result = safeCast(value, isString, 'default');
      expect(result).toBe('default');
    });
  });

  describe('hasProperty', () => {
    it('should return true for objects with specified property', () => {
      const obj = { key: 'value' };
      expect(hasProperty(obj, 'key')).toBe(true);
    });

    it('should return false for objects without specified property', () => {
      const obj = { key: 'value' };
      expect(hasProperty(obj, 'other')).toBe(false);
    });

    it('should return false for non-objects', () => {
      expect(hasProperty('not an object', 'key')).toBe(false);
      expect(hasProperty(null, 'key')).toBe(false);
    });
  });

  describe('hasProperties', () => {
    it('should return true for objects with all specified properties', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(hasProperties(obj, ['a', 'b'])).toBe(true);
    });

    it('should return false for objects missing any property', () => {
      const obj = { a: 1, b: 2 };
      expect(hasProperties(obj, ['a', 'c'])).toBe(false);
    });
  });

  describe('hasTypedProperty', () => {
    it('should return true for objects with property of specified type', () => {
      const obj = { key: 'value' };
      expect(hasTypedProperty(obj, 'key', isString)).toBe(true);
    });

    it('should return false for objects with property of wrong type', () => {
      const obj = { key: 123 };
      expect(hasTypedProperty(obj, 'key', isString)).toBe(false);
    });
  });

  describe('isInstanceOf', () => {
    it('should return true for instances of specified class', () => {
      const arr = [1, 2, 3];
      expect(isInstanceOf(arr, Array)).toBe(true);
    });

    it('should return false for non-instances', () => {
      expect(isInstanceOf('not an array', Array)).toBe(false);
    });
  });

  describe('isArrayOf', () => {
    it('should return true for arrays with elements of specified type', () => {
      const arr = ['a', 'b', 'c'];
      expect(isArrayOf(arr, isString)).toBe(true);
    });

    it('should return false for arrays with elements of wrong type', () => {
      const arr = ['a', 1, 'c'];
      expect(isArrayOf(arr, isString)).toBe(false);
    });

    it('should return false for non-arrays', () => {
      expect(isArrayOf('not an array', isString)).toBe(false);
    });
  });

  describe('safeGetString', () => {
    it('should return string value if present', () => {
      const obj = { key: 'value' };
      expect(safeGetString(obj, 'key')).toBe('value');
    });

    it('should return undefined if property not present', () => {
      const obj = { key: 'value' };
      expect(safeGetString(obj, 'other')).toBeUndefined();
    });

    it('should return undefined if value is not a string', () => {
      const obj = { key: 123 };
      expect(safeGetString(obj, 'key')).toBeUndefined();
    });
  });

  describe('safeGetFunction', () => {
    it('should return function value if present', () => {
      const obj = { fn: () => 'test' };
      expect(safeGetFunction(obj, 'fn')).toBeTypeOf('function');
    });

    it('should return undefined if property not present', () => {
      const obj = { fn: () => 'test' };
      expect(safeGetFunction(obj, 'other')).toBeUndefined();
    });

    it('should return undefined if value is not a function', () => {
      const obj = { fn: 'not a function' };
      expect(safeGetFunction(obj, 'fn')).toBeUndefined();
    });
  });

  // ==================== 新增函数测试 ====================

  describe('nullishCoalesce', () => {
    it('should return original value when not nullish', () => {
      expect(nullishCoalesce('hello', 'default')).toBe('hello');
      expect(nullishCoalesce(0, 100)).toBe(0);
      expect(nullishCoalesce(false, true)).toBe(false);
    });

    it('should return default value when nullish', () => {
      expect(nullishCoalesce(null, 'default')).toBe('default');
      expect(nullishCoalesce(undefined, 'default')).toBe('default');
    });
  });

  describe('isRendererHost', () => {
    it('should return true for renderer host objects', () => {
      const host = { __isRendererHost: true, el: {} };
      expect(isRendererHost(host)).toBe(true);
    });

    it('should return false for non-host objects', () => {
      expect(isRendererHost({})).toBe(false);
      expect(isRendererHost({ __isRendererHost: false })).toBe(false);
      expect(isRendererHost('string')).toBe(false);
      expect(isRendererHost(null)).toBe(false);
    });
  });

  describe('safeGetProperty', () => {
    it('should return property value if present', () => {
      const obj = { key: 'value', num: 42 };
      expect(safeGetProperty(obj, 'key')).toBe('value');
      expect(safeGetProperty(obj, 'num')).toBe(42);
    });

    it('should return undefined if property not present', () => {
      const obj = { key: 'value' };
      expect(safeGetProperty(obj, 'other')).toBeUndefined();
    });

    it('should return undefined for non-objects', () => {
      expect(safeGetProperty('string', 'key')).toBeUndefined();
      expect(safeGetProperty(null, 'key')).toBeUndefined();
    });
  });

  describe('asRecord', () => {
    it('should convert object to Record', () => {
      const obj = { a: 1, b: 'two' };
      const record = asRecord(obj);
      expect(record).toEqual({ a: 1, b: 'two' });
    });

    it('should return undefined for non-objects', () => {
      expect(asRecord('string')).toBeUndefined();
      expect(asRecord(null)).toBeUndefined();
      expect(asRecord(123)).toBeUndefined();
    });
  });

  describe('safeGetNested', () => {
    it('should get nested property value', () => {
      const obj = { a: { b: { c: 'deep' } } };
      expect(safeGetNested(obj, 'a.b.c')).toBe('deep');
    });

    it('should return undefined for missing path', () => {
      const obj = { a: { b: {} } };
      expect(safeGetNested(obj, 'a.b.c')).toBeUndefined();
    });

    it('should return undefined for non-object root', () => {
      expect(safeGetNested('string', 'a.b')).toBeUndefined();
    });
  });

  describe('isFiniteNumber', () => {
    it('should return true for finite numbers', () => {
      expect(isFiniteNumber(42)).toBe(true);
      expect(isFiniteNumber(0)).toBe(true);
      expect(isFiniteNumber(-1)).toBe(true);
      expect(isFiniteNumber(3.14)).toBe(true);
    });

    it('should return false for non-finite or non-numbers', () => {
      expect(isFiniteNumber(Infinity)).toBe(false);
      expect(isFiniteNumber(NaN)).toBe(false);
      expect(isFiniteNumber('42')).toBe(false);
      expect(isFiniteNumber(null)).toBe(false);
    });
  });

  describe('isNonEmptyString', () => {
    it('should return true for non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true);
      expect(isNonEmptyString(' ')).toBe(true);
    });

    it('should return false for empty or non-strings', () => {
      expect(isNonEmptyString('')).toBe(false);
      expect(isNonEmptyString(123)).toBe(false);
      expect(isNonEmptyString(null)).toBe(false);
    });
  });

  describe('isNonEmptyArray', () => {
    it('should return true for non-empty arrays', () => {
      expect(isNonEmptyArray([1])).toBe(true);
      expect(isNonEmptyArray(['a', 'b'])).toBe(true);
    });

    it('should return false for empty or non-arrays', () => {
      expect(isNonEmptyArray([])).toBe(false);
      expect(isNonEmptyArray('string')).toBe(false);
      expect(isNonEmptyArray(null)).toBe(false);
    });
  });

  describe('isNonEmptyObject', () => {
    it('should return true for non-empty objects', () => {
      expect(isNonEmptyObject({ a: 1 })).toBe(true);
      expect(isNonEmptyObject({ key: 'value' })).toBe(true);
    });

    it('should return false for empty or non-objects', () => {
      expect(isNonEmptyObject({})).toBe(false);
      expect(isNonEmptyObject([])).toBe(false);
      expect(isNonEmptyObject(null)).toBe(false);
    });
  });

  describe('invariant', () => {
    it('should not throw for true condition', () => {
      expect(() => invariant(true)).not.toThrow();
    });

    it('should throw for false condition in dev mode', () => {
      expect(() => invariant(false, 'Test error')).toThrow('Test error');
    });
  });

  describe('warning', () => {
    it('should not warn for false condition', () => {
      const spy = vi.spyOn(console, 'warn');
      warning(false, 'Should not warn');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should warn for true condition in dev mode', () => {
      const spy = vi.spyOn(console, 'warn');
      warning(true, 'Test warning');
      expect(spy).toHaveBeenCalledWith('[LytJS Warning] Test warning');
      spy.mockRestore();
    });
  });
});
