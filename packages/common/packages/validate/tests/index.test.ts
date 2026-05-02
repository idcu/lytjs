import { describe, it, expect } from 'vitest';
import {
  validate,
  createValidator,
  required,
  minLength,
  maxLength,
  pattern,
  email,
  url,
  number,
  min,
  max,
  oneOf,
  custom,
  builtInRules,
} from '../src/index';

describe('@lytjs/common-validate', () => {
  describe('validate', () => {
    it('should return valid: true when all rules pass', () => {
      const result = validate('hello', [required, minLength(3)]);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid: false with errors when rules fail', () => {
      const result = validate('', [required]);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should collect all errors', () => {
      const result = validate('ab', [minLength(5), maxLength(1)]);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it('should handle empty rules array', () => {
      const result = validate('anything', []);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('createValidator', () => {
    it('should create a reusable validator function', () => {
      const validator = createValidator([required, minLength(3)]);
      expect(typeof validator).toBe('function');
    });

    it('should validate multiple values', () => {
      const validator = createValidator([required, minLength(3)]);
      expect(validator('hello').valid).toBe(true);
      expect(validator('ab').valid).toBe(false);
      expect(validator('').valid).toBe(false);
    });
  });

  describe('required', () => {
    it('should pass for non-empty string', () => {
      expect(required.validate('hello')).toBe(true);
    });

    it('should fail for empty string', () => {
      expect(required.validate('')).toBe(false);
    });

    it('should fail for whitespace-only string', () => {
      expect(required.validate('   ')).toBe(false);
    });

    it('should fail for null', () => {
      expect(required.validate(null)).toBe(false);
    });

    it('should fail for undefined', () => {
      expect(required.validate(undefined)).toBe(false);
    });

    it('should pass for number 0', () => {
      expect(required.validate(0)).toBe(true);
    });

    it('should pass for boolean false', () => {
      expect(required.validate(false)).toBe(true);
    });

    it('should have a default message', () => {
      expect(required.message).toBe('This field is required');
    });
  });

  describe('minLength', () => {
    it('should pass when string length meets minimum', () => {
      const rule = minLength(3);
      expect(rule.validate('hello')).toBe(true);
    });

    it('should pass when string length equals minimum', () => {
      const rule = minLength(3);
      expect(rule.validate('abc')).toBe(true);
    });

    it('should fail when string is too short', () => {
      const rule = minLength(5);
      expect(rule.validate('abc')).toBe(false);
    });

    it('should skip non-string values', () => {
      const rule = minLength(3);
      expect(rule.validate(123)).toBe(true);
    });

    it('should have a descriptive message', () => {
      const rule = minLength(5);
      expect(rule.message).toContain('5');
    });
  });

  describe('maxLength', () => {
    it('should pass when string length is within limit', () => {
      const rule = maxLength(10);
      expect(rule.validate('hello')).toBe(true);
    });

    it('should pass when string length equals maximum', () => {
      const rule = maxLength(3);
      expect(rule.validate('abc')).toBe(true);
    });

    it('should fail when string is too long', () => {
      const rule = maxLength(3);
      expect(rule.validate('abcd')).toBe(false);
    });

    it('should skip non-string values', () => {
      const rule = maxLength(3);
      expect(rule.validate(12345)).toBe(true);
    });

    it('should have a descriptive message', () => {
      const rule = maxLength(5);
      expect(rule.message).toContain('5');
    });
  });

  describe('pattern', () => {
    it('should pass when value matches pattern', () => {
      const rule = pattern(/^[a-z]+$/);
      expect(rule.validate('hello')).toBe(true);
    });

    it('should fail when value does not match pattern', () => {
      const rule = pattern(/^[a-z]+$/);
      expect(rule.validate('Hello')).toBe(false);
    });

    it('should skip non-string values', () => {
      const rule = pattern(/^[a-z]+$/);
      expect(rule.validate(123)).toBe(true);
    });

    it('should use custom message when provided', () => {
      const rule = pattern(/^[0-9]+$/, 'Only digits allowed');
      expect(rule.message).toBe('Only digits allowed');
    });

    it('should use default message when not provided', () => {
      const rule = pattern(/^[0-9]+$/);
      expect(rule.message).toContain('pattern');
    });
  });

  describe('email', () => {
    it('should pass for valid email', () => {
      expect(email.validate('test@example.com')).toBe(true);
    });

    it('should pass for valid email with subdomain', () => {
      expect(email.validate('user@mail.example.com')).toBe(true);
    });

    it('should fail for email without @', () => {
      expect(email.validate('testexample.com')).toBe(false);
    });

    it('should fail for email without domain', () => {
      expect(email.validate('test@')).toBe(false);
    });

    it('should fail for email without TLD', () => {
      expect(email.validate('test@example')).toBe(false);
    });

    it('should skip empty strings', () => {
      expect(email.validate('')).toBe(true);
    });

    it('should skip non-string values', () => {
      expect(email.validate(123)).toBe(true);
    });
  });

  describe('url', () => {
    it('should pass for valid http URL', () => {
      expect(url.validate('http://example.com')).toBe(true);
    });

    it('should pass for valid https URL', () => {
      expect(url.validate('https://example.com')).toBe(true);
    });

    it('should pass for URL with path', () => {
      expect(url.validate('https://example.com/path')).toBe(true);
    });

    it('should fail for invalid URL', () => {
      expect(url.validate('not-a-url')).toBe(false);
    });

    it('should fail for URL without protocol', () => {
      expect(url.validate('example.com')).toBe(false);
    });

    it('should skip empty strings', () => {
      expect(url.validate('')).toBe(true);
    });

    it('should skip non-string values', () => {
      expect(url.validate(123)).toBe(true);
    });
  });

  describe('number', () => {
    it('should pass for number type', () => {
      expect(number.validate(42)).toBe(true);
    });

    it('should pass for numeric string', () => {
      expect(number.validate('42')).toBe(true);
    });

    it('should pass for float string', () => {
      expect(number.validate('3.14')).toBe(true);
    });

    it('should fail for non-numeric string', () => {
      expect(number.validate('abc')).toBe(false);
    });

    it('should skip null', () => {
      expect(number.validate(null)).toBe(true);
    });

    it('should skip undefined', () => {
      expect(number.validate(undefined)).toBe(true);
    });

    it('should skip empty string', () => {
      expect(number.validate('')).toBe(true);
    });
  });

  describe('min', () => {
    it('should pass when value is above minimum', () => {
      const rule = min(5);
      expect(rule.validate(10)).toBe(true);
    });

    it('should pass when value equals minimum', () => {
      const rule = min(5);
      expect(rule.validate(5)).toBe(true);
    });

    it('should fail when value is below minimum', () => {
      const rule = min(5);
      expect(rule.validate(3)).toBe(false);
    });

    it('should skip non-number values', () => {
      const rule = min(5);
      expect(rule.validate('abc')).toBe(true);
    });

    it('should have a descriptive message', () => {
      const rule = min(10);
      expect(rule.message).toContain('10');
    });
  });

  describe('max', () => {
    it('should pass when value is below maximum', () => {
      const rule = max(10);
      expect(rule.validate(5)).toBe(true);
    });

    it('should pass when value equals maximum', () => {
      const rule = max(10);
      expect(rule.validate(10)).toBe(true);
    });

    it('should fail when value is above maximum', () => {
      const rule = max(10);
      expect(rule.validate(15)).toBe(false);
    });

    it('should skip non-number values', () => {
      const rule = max(10);
      expect(rule.validate('abc')).toBe(true);
    });

    it('should have a descriptive message', () => {
      const rule = max(10);
      expect(rule.message).toContain('10');
    });
  });

  describe('oneOf', () => {
    it('should pass when value is in the list', () => {
      const rule = oneOf(['a', 'b', 'c']);
      expect(rule.validate('a')).toBe(true);
      expect(rule.validate('b')).toBe(true);
    });

    it('should fail when value is not in the list', () => {
      const rule = oneOf(['a', 'b', 'c']);
      expect(rule.validate('d')).toBe(false);
    });

    it('should work with numbers', () => {
      const rule = oneOf([1, 2, 3]);
      expect(rule.validate(2)).toBe(true);
      expect(rule.validate(4)).toBe(false);
    });

    it('should have a descriptive message', () => {
      const rule = oneOf(['a', 'b']);
      expect(rule.message).toContain('a');
      expect(rule.message).toContain('b');
    });
  });

  describe('custom', () => {
    it('should pass when custom function returns true', () => {
      const rule = custom((v) => typeof v === 'string' && v.startsWith('http'), 'Must start with http');
      expect(rule.validate('https://example.com')).toBe(true);
    });

    it('should fail when custom function returns false', () => {
      const rule = custom((v) => typeof v === 'string' && v.startsWith('http'), 'Must start with http');
      expect(rule.validate('ftp://example.com')).toBe(false);
    });

    it('should use the provided message', () => {
      const rule = custom(() => false, 'Custom error message');
      expect(rule.message).toBe('Custom error message');
    });
  });

  describe('builtInRules', () => {
    it('should export all built-in rules', () => {
      expect(builtInRules).toHaveProperty('required');
      expect(builtInRules).toHaveProperty('minLength');
      expect(builtInRules).toHaveProperty('maxLength');
      expect(builtInRules).toHaveProperty('pattern');
      expect(builtInRules).toHaveProperty('email');
      expect(builtInRules).toHaveProperty('url');
      expect(builtInRules).toHaveProperty('number');
      expect(builtInRules).toHaveProperty('min');
      expect(builtInRules).toHaveProperty('max');
      expect(builtInRules).toHaveProperty('oneOf');
      expect(builtInRules).toHaveProperty('custom');
    });
  });

  describe('integration tests', () => {
    it('should validate a username with multiple rules', () => {
      const result = validate('john', [
        required,
        minLength(3),
        maxLength(20),
        pattern(/^[a-zA-Z0-9_]+$/, 'Only alphanumeric characters and underscores'),
      ]);
      expect(result.valid).toBe(true);
    });

    it('should fail validation for invalid username', () => {
      const result = validate('a', [
        required,
        minLength(3),
      ]);
      expect(result.valid).toBe(false);
    });

    it('should validate an age', () => {
      const result = validate(25, [number, min(0), max(150)]);
      expect(result.valid).toBe(true);
    });

    it('should fail for invalid age', () => {
      const result = validate(-5, [number, min(0), max(150)]);
      expect(result.valid).toBe(false);
    });

    it('should validate an email with required', () => {
      const result = validate('test@example.com', [required, email]);
      expect(result.valid).toBe(true);
    });

    it('should fail for empty email', () => {
      const result = validate('', [required, email]);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1); // Only required fails, email skips empty
    });
  });
});
