/**
 * `@lytjs/shared-types` 运行时类型守卫的单元测试。
 *
 * 这些守卫是包公开导出（`src/index.ts` 的 `export { isString, … }`），此前整个包被
 * `vitest.config.ts` 的 `packages/shared-types/**` 排除在覆盖率之外 ⇒ 运行时代码零统计。
 * 本文件覆盖全部分支：正例、反例与工厂守卫的边界。
 */
import { describe, it, expect } from 'vitest';
import {
  isString,
  isNumber,
  isBoolean,
  isObject,
  isArray,
  isFunction,
  isNull,
  isUndefined,
  isNullish,
  hasProperty,
  createArrayTypeGuard,
  createObjectTypeGuard,
} from '../src/type-utils';

describe('shared-types 运行时类型守卫', () => {
  it('isString / isBoolean', () => {
    expect(isString('a')).toBe(true);
    expect(isString('')).toBe(true);
    expect(isString(1)).toBe(false);
    expect(isBoolean(true)).toBe(true);
    expect(isBoolean(false)).toBe(true);
    expect(isBoolean(0)).toBe(false);
  });

  it('isNumber：NaN 不算数字', () => {
    expect(isNumber(0)).toBe(true);
    expect(isNumber(-1.5)).toBe(true);
    expect(isNumber(Number.NaN)).toBe(false);
    expect(isNumber('1')).toBe(false);
  });

  it('isObject：排除 null 与数组', () => {
    expect(isObject({})).toBe(true);
    expect(isObject(Object.create(null))).toBe(true);
    expect(isObject(null)).toBe(false);
    expect(isObject([])).toBe(false);
    expect(isObject('x')).toBe(false);
    expect(isObject(1)).toBe(false);
  });

  it('isArray / isFunction', () => {
    expect(isArray([])).toBe(true);
    expect(isArray({ length: 0 })).toBe(false);
    expect(isFunction(() => {})).toBe(true);
    expect(isFunction({})).toBe(false);
  });

  it('isNull / isUndefined / isNullish', () => {
    expect(isNull(null)).toBe(true);
    expect(isNull(undefined)).toBe(false);
    expect(isUndefined(undefined)).toBe(true);
    expect(isUndefined(null)).toBe(false);
    expect(isNullish(null)).toBe(true);
    expect(isNullish(undefined)).toBe(true);
    expect(isNullish(0)).toBe(false);
    expect(isNullish('')).toBe(false);
  });

  it('hasProperty', () => {
    expect(hasProperty({ a: 1 }, 'a')).toBe(true);
    expect(hasProperty({ a: undefined }, 'a')).toBe(true);
    expect(hasProperty({}, 'a')).toBe(false);
  });

  it('createArrayTypeGuard：元素全部通过才为 true', () => {
    const isStringArray = createArrayTypeGuard(isString);
    expect(isStringArray(['a', 'b'])).toBe(true);
    expect(isStringArray([])).toBe(true);
    expect(isStringArray(['a', 1])).toBe(false);
    expect(isStringArray('a')).toBe(false);
  });

  it('createObjectTypeGuard：非对象直接 false，字段逐个校验', () => {
    const isPoint = createObjectTypeGuard<{ x: unknown; y: unknown }>({
      x: isNumber,
      y: isNumber,
    });
    expect(isPoint({ x: 1, y: 2 })).toBe(true);
    expect(isPoint({ x: 1, y: '2' })).toBe(false);
    expect(isPoint(null)).toBe(false);
    expect(isPoint('x')).toBe(false);
  });
});
