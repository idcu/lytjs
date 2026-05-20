/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AttributeReflector,
  StringConverter,
  NumberConverter,
  BooleanConverter,
  ObjectConverter,
  getConverterByType,
  camelToKebab,
  kebabToCamel,
  supportsWebComponents,
  createEnhancedElementClass,
} from '../src/web-components';

describe('Web Components Integration', () => {
  describe('Converters', () => {
    describe('StringConverter', () => {
      it('should convert value to attribute', () => {
        expect(StringConverter.toAttribute('hello')).toBe('hello');
        expect(StringConverter.toAttribute(null)).toBeNull();
        expect(StringConverter.toAttribute(undefined)).toBeNull();
        expect(StringConverter.toAttribute(123)).toBe('123');
      });

      it('should convert attribute to value', () => {
        expect(StringConverter.fromAttribute('hello')).toBe('hello');
        expect(StringConverter.fromAttribute(null)).toBe('');
      });
    });

    describe('NumberConverter', () => {
      it('should convert value to attribute', () => {
        expect(NumberConverter.toAttribute(42)).toBe('42');
        expect(NumberConverter.toAttribute(null)).toBeNull();
        expect(NumberConverter.toAttribute('')).toBeNull();
      });

      it('should convert attribute to value', () => {
        expect(NumberConverter.fromAttribute('42')).toBe(42);
        expect(NumberConverter.fromAttribute('3.14')).toBe(3.14);
        expect(NumberConverter.fromAttribute(null)).toBeNull();
        expect(NumberConverter.fromAttribute('invalid')).toBeNull();
      });
    });

    describe('BooleanConverter', () => {
      it('should convert value to attribute', () => {
        expect(BooleanConverter.toAttribute(true)).toBe('');
        expect(BooleanConverter.toAttribute(false)).toBeNull();
        expect(BooleanConverter.toAttribute(null)).toBeNull();
      });

      it('should convert attribute to value', () => {
        expect(BooleanConverter.fromAttribute('')).toBe(true);
        expect(BooleanConverter.fromAttribute('anything')).toBe(true);
        expect(BooleanConverter.fromAttribute(null)).toBe(false);
      });
    });

    describe('ObjectConverter', () => {
      it('should convert value to attribute', () => {
        expect(ObjectConverter.toAttribute({ a: 1 })).toBe('{"a":1}');
        expect(ObjectConverter.toAttribute(null)).toBeNull();
      });

      it('should convert attribute to value', () => {
        expect(ObjectConverter.fromAttribute('{"a":1}')).toEqual({ a: 1 });
        expect(ObjectConverter.fromAttribute(null)).toBeNull();
        expect(ObjectConverter.fromAttribute('invalid')).toBeNull();
      });
    });

    describe('getConverterByType', () => {
      it('should return correct converter for each type', () => {
        expect(getConverterByType('string')).toBe(StringConverter);
        expect(getConverterByType('number')).toBe(NumberConverter);
        expect(getConverterByType('boolean')).toBe(BooleanConverter);
        expect(getConverterByType('object')).toBe(ObjectConverter);
        expect(getConverterByType('array')).toBe(ObjectConverter);
      });

      it('should return StringConverter for undefined type', () => {
        expect(getConverterByType(undefined)).toBe(StringConverter);
      });
    });
  });

  describe('AttributeReflector', () => {
    let reflector: AttributeReflector;

    beforeEach(() => {
      reflector = new AttributeReflector();
    });

    it('should register config', () => {
      reflector.register({ prop: 'myProp', converter: StringConverter });
      expect(reflector.getObservedAttributes()).toContain('my-prop');
    });

    it('should register custom attribute name', () => {
      reflector.register({ prop: 'myProp', attr: 'custom-attr', converter: StringConverter });
      expect(reflector.getObservedAttributes()).toContain('custom-attr');
    });

    it('should register all configs', () => {
      reflector.registerAll([
        { prop: 'prop1', converter: StringConverter },
        { prop: 'prop2', converter: NumberConverter },
      ]);
      expect(reflector.getObservedAttributes()).toHaveLength(2);
    });

    it('should get property name from attribute', () => {
      reflector.register({ prop: 'myProp', converter: StringConverter });
      expect(reflector.getPropertyName('my-prop')).toBe('myProp');
    });
  });

  describe('Utility Functions', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(camelToKebab('myProperty')).toBe('my-property');
      // HTMLDivElement 这种连续大写的缩写通常作为整体处理
      expect(camelToKebab('HTMLDivElement')).toBe('htmldiv-element');
    });

    it('should convert kebab-case to camelCase', () => {
      expect(kebabToCamel('my-property')).toBe('myProperty');
      expect(kebabToCamel('data-value')).toBe('dataValue');
    });

    it('should detect Web Components support', () => {
      const result = supportsWebComponents();
      expect(typeof result).toBe('boolean');
    });
  });
});
