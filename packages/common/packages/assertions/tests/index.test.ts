import { describe, it, expect } from 'vitest';
import {
  unsafeCast,
  assertType,
  safeCast,
  hasProperty,
  hasProperties,
  hasTypedProperty,
  isInstanceOf,
  isArrayOf,
  safeGetString,
  safeGetFunction,
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
});
