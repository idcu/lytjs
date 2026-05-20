/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
import { describe, it, expect } from 'vitest';
import { parseQueryString, stringifyQueryString, parseURL, buildURL } from '../src/index';

describe('@lytjs/common-query', () => {
  // parseQueryString
  describe('parseQueryString', () => {
    it('should parse standard query string with leading ?', () => {
      const result = parseQueryString('?key=value&key2=value2');
      expect(result).toEqual({ key: 'value', key2: 'value2' });
    });

    it('should parse query string without leading ?', () => {
      const result = parseQueryString('key=value&key2=value2');
      expect(result).toEqual({ key: 'value', key2: 'value2' });
    });

    it('should decode URI components', () => {
      const result = parseQueryString('?name=hello%20world&city=%E5%8C%97%E4%BA%AC');
      expect(result).toEqual({ name: 'hello world', city: '北京' });
    });

    it('should take the last value for duplicate keys (by default)', () => {
      const result = parseQueryString('?a=1&a=2&a=3');
      expect(result).toEqual({ a: '3' });
    });

    it('should return empty object for empty string', () => {
      expect(parseQueryString('')).toEqual({});
    });

    it('should return empty object for just "?"', () => {
      expect(parseQueryString('?')).toEqual({});
    });

    it('should handle key without value', () => {
      const result = parseQueryString('?flag&name=test');
      expect(result).toEqual({ flag: '', name: 'test' });
    });

    it('should handle key with empty value', () => {
      const result = parseQueryString('?key=');
      expect(result).toEqual({ key: '' });
    });

    it('should handle special characters', () => {
      const result = parseQueryString('?url=http%3A%2F%2Fexample.com');
      expect(result).toEqual({ url: 'http://example.com' });
    });

    it('should handle malformed percent encoding gracefully', () => {
      // decodeURIComponent would throw for invalid encoding like %E0%A4%A
      // but we catch the error and keep the value as-is
      const result = parseQueryString('?key=%E0%A4%A');
      // The value should remain as-is since decode fails
      expect(result.key).toBe('%E0%A4%A');
    });

    it('should handle single pair', () => {
      const result = parseQueryString('?foo=bar');
      expect(result).toEqual({ foo: 'bar' });
    });

    it('should handle multiple ampersands', () => {
      const result = parseQueryString('?a=1&&b=2');
      expect(result).toEqual({ a: '1', b: '2' });
    });
  });

  // parseQueryString with array support
  describe('parseQueryString with arrays', () => {
    it('should parse duplicate keys as array with supportArrays option', () => {
      const result = parseQueryString('?a=1&a=2&a=3', { supportArrays: true });
      expect(result).toEqual({ a: ['1', '2', '3'] });
    });

    it('should parse duplicate keys as array using parseQueryStringWithArrays', () => {
      const result = parseQueryStringWithArrays('?tag=javascript&tag=typescript&tag=react');
      expect(result).toEqual({ tag: ['javascript', 'typescript', 'react'] });
    });

    it('should mix single values and arrays', () => {
      const result = parseQueryStringWithArrays('?page=1&limit=10&tag=a&tag=b');
      expect(result).toEqual({ page: '1', limit: '10', tag: ['a', 'b'] });
    });

    it('should handle single value correctly with arrays support', () => {
      const result = parseQueryStringWithArrays('?a=1');
      expect(result).toEqual({ a: '1' });
    });
  });

  // stringifyQueryString
  describe('stringifyQueryString', () => {
    it('should stringify simple object', () => {
      const result = stringifyQueryString({ a: '1', b: '2' });
      expect(result).toBe('a=1&b=2');
    });

    it('should encode URI components', () => {
      const result = stringifyQueryString({ name: 'hello world', url: 'http://example.com' });
      expect(result).toBe('name=hello%20world&url=http%3A%2F%2Fexample.com');
    });

    it('should not include leading ?', () => {
      const result = stringifyQueryString({ a: '1' });
      expect(result.startsWith('?')).toBe(false);
    });

    it('should return empty string for empty object', () => {
      expect(stringifyQueryString({})).toBe('');
    });

    it('should handle number values', () => {
      const result = stringifyQueryString({ page: 1, limit: 10 });
      expect(result).toBe('page=1&limit=10');
    });

    it('should handle boolean values', () => {
      const result = stringifyQueryString({ active: true, debug: false });
      expect(result).toBe('active=true&debug=false');
    });

    it('should handle empty string value', () => {
      const result = stringifyQueryString({ key: '' });
      expect(result).toBe('key=');
    });

    it('should handle special characters in keys', () => {
      const result = stringifyQueryString({ 'a b': 'c' });
      expect(result).toBe('a%20b=c');
    });

    it('should stringify array values', () => {
      const result = stringifyQueryString({ tags: ['javascript', 'typescript', 'react'] });
      expect(result).toBe('tags=javascript&tags=typescript&tags=react');
    });

    it('should mix single and array values', () => {
      const result = stringifyQueryString({ page: 1, limit: 10, tags: ['a', 'b'] });
      expect(result).toBe('page=1&limit=10&tags=a&tags=b');
    });
  });

  // parseURL
  describe('parseURL', () => {
    it('should parse a full absolute URL', () => {
      const result = parseURL('https://example.com:8080/path/to/page?name=test&age=20#section');
      expect(result.protocol).toBe('https://');
      expect(result.host).toBe('example.com:8080');
      expect(result.hostname).toBe('example.com');
      expect(result.port).toBe('8080');
      expect(result.pathname).toBe('/path/to/page');
      expect(result.search).toBe('?name=test&age=20');
      expect(result.hash).toBe('#section');
      expect(result.searchParams).toEqual({ name: 'test', age: '20' });
      expect(result.origin).toBe('https://example.com:8080');
      expect(result.href).toBe('https://example.com:8080/path/to/page?name=test&age=20#section');
    });

    it('should parse URL without port', () => {
      const result = parseURL('https://example.com/path');
      expect(result.protocol).toBe('https://');
      expect(result.host).toBe('example.com');
      expect(result.hostname).toBe('example.com');
      expect(result.port).toBe('');
      expect(result.pathname).toBe('/path');
    });

    it('should parse URL without search and hash', () => {
      const result = parseURL('https://example.com/path');
      expect(result.search).toBe('');
      expect(result.hash).toBe('');
      expect(result.searchParams).toEqual({});
    });

    it('should parse relative URL', () => {
      const result = parseURL('/path/to/page?name=test#section');
      expect(result.protocol).toBe('');
      expect(result.host).toBe('');
      expect(result.hostname).toBe('');
      expect(result.port).toBe('');
      expect(result.pathname).toBe('/path/to/page');
      expect(result.search).toBe('?name=test');
      expect(result.hash).toBe('#section');
      expect(result.searchParams).toEqual({ name: 'test' });
      expect(result.origin).toBe('');
    });

    it('should parse relative URL with only pathname', () => {
      const result = parseURL('/path/to/page');
      expect(result.protocol).toBe('');
      expect(result.pathname).toBe('/path/to/page');
      expect(result.search).toBe('');
      expect(result.hash).toBe('');
      expect(result.searchParams).toEqual({});
    });

    it('should parse URL with only hash', () => {
      const result = parseURL('https://example.com#section');
      expect(result.protocol).toBe('https://');
      expect(result.host).toBe('example.com');
      expect(result.pathname).toBe('');
      expect(result.hash).toBe('#section');
    });

    it('should parse URL with only search', () => {
      const result = parseURL('https://example.com?a=1');
      expect(result.protocol).toBe('https://');
      expect(result.host).toBe('example.com');
      expect(result.pathname).toBe('');
      expect(result.search).toBe('?a=1');
      expect(result.searchParams).toEqual({ a: '1' });
    });

    it('should parse URL with protocol and host only', () => {
      const result = parseURL('https://example.com');
      expect(result.protocol).toBe('https://');
      expect(result.host).toBe('example.com');
      expect(result.hostname).toBe('example.com');
      expect(result.pathname).toBe('');
      expect(result.search).toBe('');
      expect(result.hash).toBe('');
    });

    it('should parse URL with encoded search params', () => {
      const result = parseURL('https://example.com?name=hello%20world');
      expect(result.searchParams).toEqual({ name: 'hello world' });
    });

    it('should preserve href as original input', () => {
      const url = 'https://example.com/path?a=1#top';
      expect(parseURL(url).href).toBe(url);
    });

    it('should parse relative URL with search only', () => {
      const result = parseURL('?a=1&b=2');
      expect(result.protocol).toBe('');
      expect(result.pathname).toBe('');
      expect(result.search).toBe('?a=1&b=2');
      expect(result.searchParams).toEqual({ a: '1', b: '2' });
    });
  });

  // buildURL
  describe('buildURL', () => {
    it('should return base when no params and no hash', () => {
      expect(buildURL('https://example.com/path')).toBe('https://example.com/path');
    });

    it('should append query params to base without existing params', () => {
      const result = buildURL('https://example.com/path', { a: '1', b: '2' });
      expect(result).toBe('https://example.com/path?a=1&b=2');
    });

    it('should append hash to base', () => {
      const result = buildURL('https://example.com/path', undefined, 'section');
      expect(result).toBe('https://example.com/path#section');
    });

    it('should append both params and hash', () => {
      const result = buildURL('https://example.com/path', { a: '1' }, 'top');
      expect(result).toBe('https://example.com/path?a=1#top');
    });

    it('should merge with existing query params in base', () => {
      const result = buildURL('https://example.com/path?existing=1', { new: '2' });
      expect(result).toBe('https://example.com/path?existing=1&new=2');
    });

    it('should override existing param when same key', () => {
      const result = buildURL('https://example.com/path?a=1', { a: '2' });
      expect(result).toBe('https://example.com/path?a=2');
    });

    it('should handle base with hash and existing params', () => {
      const result = buildURL('https://example.com/path?a=1#old', { b: '2' }, 'new');
      expect(result).toBe('https://example.com/path?a=1&b=2#new');
    });

    it('should handle empty params object', () => {
      const result = buildURL('https://example.com/path', {});
      expect(result).toBe('https://example.com/path');
    });

    it('should handle number and boolean params', () => {
      const result = buildURL('/api', { page: 1, active: true });
      expect(result).toBe('/api?page=1&active=true');
    });

    it('should handle relative URL with existing params', () => {
      const result = buildURL('/path?x=1', { y: '2' });
      expect(result).toBe('/path?x=1&y=2');
    });

    it('should encode params properly', () => {
      const result = buildURL('/path', { name: 'hello world' });
      expect(result).toBe('/path?name=hello%20world');
    });

    it('should handle base with only hash and add params', () => {
      const result = buildURL('/path#section', { a: '1' });
      expect(result).toBe('/path?a=1#section');
    });
  });
});
