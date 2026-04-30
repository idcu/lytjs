import { describe, it, expect } from 'vitest'
import {
  isString,
  isNumber,
  isBoolean,
  isSymbol,
  isBigInt,
  isObject,
  isPlainObject,
  isArray,
  isFunction,
  isPromise,
  isNullish,
  isEmpty,
  isStringOrNumber,
  hasOwn,
  hasChanged,
  NOOP,
  EMPTY_OBJ,
  toTypeString,
  isMap,
  isSet,
  isWeakMap,
  isWeakSet,
  isDate,
  isRegExp,
} from '../src/index'

describe('@lytjs/common-is', () => {
  // isString
  describe('isString', () => {
    it('should return true for strings', () => {
      expect(isString('')).toBe(true)
      expect(isString('hello')).toBe(true)
      expect(isString(String(123))).toBe(true)
    })

    it('should return false for non-strings', () => {
      expect(isString(123)).toBe(false)
      expect(isString(null)).toBe(false)
      expect(isString(undefined)).toBe(false)
      expect(isString({})).toBe(false)
      expect(isString([])).toBe(false)
    })
  })

  // isNumber
  describe('isNumber', () => {
    it('should return true for numbers', () => {
      expect(isNumber(0)).toBe(true)
      expect(isNumber(-1)).toBe(true)
      expect(isNumber(3.14)).toBe(true)
      expect(isNumber(Infinity)).toBe(true)
      expect(isNumber(-Infinity)).toBe(true)
    })

    it('should return false for NaN', () => {
      expect(isNumber(NaN)).toBe(false)
    })

    it('should return false for non-numbers', () => {
      expect(isNumber('123')).toBe(false)
      expect(isNumber(null)).toBe(false)
      expect(isNumber(undefined)).toBe(false)
    })
  })

  // isBoolean
  describe('isBoolean', () => {
    it('should return true for booleans', () => {
      expect(isBoolean(true)).toBe(true)
      expect(isBoolean(false)).toBe(true)
    })

    it('should return false for non-booleans', () => {
      expect(isBoolean(1)).toBe(false)
      expect(isBoolean(0)).toBe(false)
      expect(isBoolean('true')).toBe(false)
      expect(isBoolean(null)).toBe(false)
    })
  })

  // isSymbol
  describe('isSymbol', () => {
    it('should return true for symbols', () => {
      expect(isSymbol(Symbol())).toBe(true)
      expect(isSymbol(Symbol('foo'))).toBe(true)
    })

    it('should return false for non-symbols', () => {
      expect(isSymbol('symbol')).toBe(false)
      expect(isSymbol(123)).toBe(false)
    })
  })

  // isBigInt
  describe('isBigInt', () => {
    it('should return true for BigInt', () => {
      expect(isBigInt(BigInt(0))).toBe(true)
      expect(isBigInt(BigInt(9007199254740991))).toBe(true)
      expect(isBigInt(1n)).toBe(true)
    })

    it('should return false for non-BigInt', () => {
      expect(isBigInt(123)).toBe(false)
      expect(isBigInt('123')).toBe(false)
    })
  })

  // isObject
  describe('isObject', () => {
    it('should return true for objects', () => {
      expect(isObject({})).toBe(true)
      expect(isObject([])).toBe(true)
      expect(isObject(new Date())).toBe(true)
      expect(isObject(/regex/)).toBe(true)
      expect(isObject(() => {})).toBe(true)
    })

    it('should return false for primitives', () => {
      expect(isObject(null)).toBe(false)
      expect(isObject(undefined)).toBe(false)
      expect(isObject(123)).toBe(false)
      expect(isObject('string')).toBe(false)
      expect(isObject(true)).toBe(false)
    })
  })

  // isPlainObject
  describe('isPlainObject', () => {
    it('should return true for plain objects', () => {
      expect(isPlainObject({})).toBe(true)
      expect(isPlainObject({ a: 1 })).toBe(true)
      expect(isPlainObject(Object.create(null))).toBe(true)
    })

    it('should return false for non-plain objects', () => {
      expect(isPlainObject([])).toBe(false)
      expect(isPlainObject(new Date())).toBe(false)
      expect(isPlainObject(/regex/)).toBe(false)
      expect(isPlainObject(() => {})).toBe(false)
      expect(isPlainObject(null)).toBe(false)
    })
  })

  // isArray
  describe('isArray', () => {
    it('should return true for arrays', () => {
      expect(isArray([])).toBe(true)
      expect(isArray([1, 2, 3])).toBe(true)
      expect(isArray(new Array())).toBe(true)
    })

    it('should return false for non-arrays', () => {
      expect(isArray({})).toBe(false)
      expect(isArray('array')).toBe(false)
      expect(isArray(null)).toBe(false)
    })
  })

  // isFunction
  describe('isFunction', () => {
    it('should return true for functions', () => {
      expect(isFunction(() => {})).toBe(true)
      expect(isFunction(function () {})).toBe(true)
      expect(isFunction(async function () {})).toBe(true)
      expect(isFunction(function* () {})).toBe(true)
    })

    it('should return false for non-functions', () => {
      expect(isFunction({})).toBe(false)
      expect(isFunction(null)).toBe(false)
      expect(isFunction(undefined)).toBe(false)
      expect(isFunction(123)).toBe(false)
    })
  })

  // isPromise
  describe('isPromise', () => {
    it('should return true for promises', () => {
      expect(isPromise(Promise.resolve())).toBe(true)
      expect(isPromise(new Promise(() => {}))).toBe(true)
      expect(isPromise(Promise.reject(new Error('test')).catch(() => {}))).toBe(true)
    })

    it('should return false for non-promises', () => {
      expect(isPromise({ then: () => {} })).toBe(false)
      expect(isPromise(null)).toBe(false)
      expect(isPromise(undefined)).toBe(false)
      expect(isPromise({})).toBe(false)
    })
  })

  // isNullish
  describe('isNullish', () => {
    it('should return true for null and undefined', () => {
      expect(isNullish(null)).toBe(true)
      expect(isNullish(undefined)).toBe(true)
    })

    it('should return false for other values', () => {
      expect(isNullish(0)).toBe(false)
      expect(isNullish('')).toBe(false)
      expect(isNullish(false)).toBe(false)
      expect(isNullish(NaN)).toBe(false)
    })
  })

  // isEmpty
  describe('isEmpty', () => {
    it('should return true for empty values', () => {
      expect(isEmpty(null)).toBe(true)
      expect(isEmpty(undefined)).toBe(true)
      expect(isEmpty('')).toBe(true)
      expect(isEmpty([])).toBe(true)
      expect(isEmpty({})).toBe(true)
    })

    it('should return false for non-empty values', () => {
      expect(isEmpty('hello')).toBe(false)
      expect(isEmpty([1])).toBe(false)
      expect(isEmpty({ a: 1 })).toBe(false)
      expect(isEmpty(0)).toBe(false)
      expect(isEmpty(false)).toBe(false)
    })
  })

  // isStringOrNumber
  describe('isStringOrNumber', () => {
    it('should return true for strings and numbers', () => {
      expect(isStringOrNumber('hello')).toBe(true)
      expect(isStringOrNumber(123)).toBe(true)
      expect(isStringOrNumber(3.14)).toBe(true)
    })

    it('should return false for other types', () => {
      expect(isStringOrNumber(null)).toBe(false)
      expect(isStringOrNumber(undefined)).toBe(false)
      expect(isStringOrNumber(true)).toBe(false)
      expect(isStringOrNumber({})).toBe(false)
    })
  })

  // hasOwn
  describe('hasOwn', () => {
    it('should return true for own properties', () => {
      expect(hasOwn({ a: 1 }, 'a')).toBe(true)
      expect(hasOwn({ a: 1, b: 2 }, 'b')).toBe(true)
    })

    it('should return false for inherited properties', () => {
      const proto = { inherited: true }
      const obj = Object.create(proto)
      expect(hasOwn(obj, 'inherited')).toBe(false)
    })

    it('should return false for non-existent properties', () => {
      expect(hasOwn({ a: 1 }, 'b')).toBe(false)
      expect(hasOwn({}, 'a')).toBe(false)
    })
  })

  // hasChanged
  describe('hasChanged', () => {
    it('should return true when value has changed', () => {
      expect(hasChanged(1, 2)).toBe(true)
      expect(hasChanged('a', 'b')).toBe(true)
      expect(hasChanged(null, undefined)).toBe(true)
    })

    it('should return false when value has not changed', () => {
      expect(hasChanged(1, 1)).toBe(false)
      expect(hasChanged('a', 'a')).toBe(false)
      expect(hasChanged(null, null)).toBe(false)
      expect(hasChanged(NaN, NaN)).toBe(false)
    })

    it('should use Object.is for comparison', () => {
      expect(hasChanged(0, -0)).toBe(true)
      expect(hasChanged(-0, 0)).toBe(true)
    })
  })

  // NOOP
  describe('NOOP', () => {
    it('should be a function', () => {
      expect(typeof NOOP).toBe('function')
    })

    it('should return undefined', () => {
      expect(NOOP()).toBe(undefined)
    })
  })

  // EMPTY_OBJ
  describe('EMPTY_OBJ', () => {
    it('should be a frozen empty object', () => {
      expect(Object.isFrozen(EMPTY_OBJ)).toBe(true)
      expect(Object.keys(EMPTY_OBJ)).toHaveLength(0)
    })
  })

  // toTypeString
  describe("toTypeString", () => {
    it("should return [object Object] for plain objects", () => {
      expect(toTypeString({})).toBe("[object Object]");
    });
    it("should return [object Array] for arrays", () => {
      expect(toTypeString([])).toBe("[object Array]");
    });
  });

  // isMap
  describe("isMap", () => {
    it("should return true for Map instances", () => {
      expect(isMap(new Map())).toBe(true);
    });
    it("should return false for non-Map values", () => {
      expect(isMap({})).toBe(false);
      expect(isMap(new WeakMap())).toBe(false);
    });
  });

  // isSet
  describe("isSet", () => {
    it("should return true for Set instances", () => {
      expect(isSet(new Set())).toBe(true);
    });
    it("should return false for non-Set values", () => {
      expect(isSet({})).toBe(false);
      expect(isSet(new WeakSet())).toBe(false);
    });
  });

  // isWeakMap
  describe("isWeakMap", () => {
    it("should return true for WeakMap instances", () => {
      expect(isWeakMap(new WeakMap())).toBe(true);
    });
    it("should return false for non-WeakMap values", () => {
      expect(isWeakMap(new Map())).toBe(false);
    });
  });

  // isWeakSet
  describe("isWeakSet", () => {
    it("should return true for WeakSet instances", () => {
      expect(isWeakSet(new WeakSet())).toBe(true);
    });
    it("should return false for non-WeakSet values", () => {
      expect(isWeakSet(new Set())).toBe(false);
    });
  });

  // isDate
  describe("isDate", () => {
    it("should return true for Date instances", () => {
      expect(isDate(new Date())).toBe(true);
    });
    it("should return false for non-Date values", () => {
      expect(isDate({})).toBe(false);
      expect(isDate("2024-01-01")).toBe(false);
    });
  });

  // isRegExp
  describe("isRegExp", () => {
    it("should return true for RegExp instances", () => {
      expect(isRegExp(/test/)).toBe(true);
      expect(isRegExp(new RegExp("test"))).toBe(true);
    });
    it("should return false for non-RegExp values", () => {
      expect(isRegExp({})).toBe(false);
      expect(isRegExp("/test/")).toBe(false);
    });
  });
})
