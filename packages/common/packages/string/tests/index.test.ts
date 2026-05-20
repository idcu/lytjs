/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
import { describe, it, expect } from 'vitest';
import {
  capitalize,
  kebabCase,
  camelCase,
  pascalCase,
  camelToKebab,
  kebabToCamel,
  escapeRegExp,
  escapeHTML,
  unescapeHTML,
  trim,
  trimChars,
  repeat,
  padStart,
  padEnd,
  startsWith,
  endsWith,
  includes,
  split,
  words,
  substring,
  truncate,
  template,
  normalizeClass,
  normalizeStyle,
  sanitizeHTML,
  isSafeAttribute,
  escapeAttrValue,
  normalizeStyleObject,
  isBooleanAttr,
  VOID_ELEMENTS,
  BOOLEAN_ATTRS,
  DANGEROUS_EVENT_ATTRS,
} from '../src/index';

describe('@lytjs/common-string', () => {
  // capitalize
  describe('capitalize', () => {
    it('should capitalize the first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('world')).toBe('World');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });

    it('should handle single character', () => {
      expect(capitalize('a')).toBe('A');
    });

    it('should not modify already capitalized string', () => {
      expect(capitalize('Hello')).toBe('Hello');
    });
  });

  // kebabCase
  describe('kebabCase', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(kebabCase('helloWorld')).toBe('hello-world');
      expect(kebabCase('myComponent')).toBe('my-component');
    });

    it('should handle pascalCase', () => {
      expect(kebabCase('MyComponent')).toBe('my-component');
    });

    it('should handle already kebab-case', () => {
      expect(kebabCase('hello-world')).toBe('hello-world');
    });

    it('should handle single word', () => {
      expect(kebabCase('hello')).toBe('hello');
    });

    it('should handle empty string', () => {
      expect(kebabCase('')).toBe('');
    });

    it('should handle consecutive uppercase', () => {
      expect(kebabCase('XMLParser')).toBe('xml-parser');
    });
  });

  // camelCase
  describe('camelCase', () => {
    it('should convert kebab-case to camelCase', () => {
      expect(camelCase('hello-world')).toBe('helloWorld');
      expect(camelCase('my-component')).toBe('myComponent');
    });

    it('should handle snake_case', () => {
      expect(camelCase('hello_world')).toBe('helloWorld');
    });

    it('should handle space separated', () => {
      expect(camelCase('hello world')).toBe('helloWorld');
    });

    it('should handle empty string', () => {
      expect(camelCase('')).toBe('');
    });

    it('should handle single word', () => {
      expect(camelCase('hello')).toBe('hello');
    });
  });

  // pascalCase
  describe('pascalCase', () => {
    it('should convert kebab-case to PascalCase', () => {
      expect(pascalCase('hello-world')).toBe('HelloWorld');
    });

    it('should convert camelCase to PascalCase', () => {
      expect(pascalCase('helloWorld')).toBe('HelloWorld');
    });

    it('should handle single word', () => {
      expect(pascalCase('hello')).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(pascalCase('')).toBe('');
    });
  });

  // camelToKebab
  describe('camelToKebab', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(camelToKebab('helloWorld')).toBe('hello-world');
      expect(camelToKebab('backgroundColor')).toBe('background-color');
    });

    it('should handle empty string', () => {
      expect(camelToKebab('')).toBe('');
    });
  });

  // kebabToCamel
  describe('kebabToCamel', () => {
    it('should convert kebab-case to camelCase', () => {
      expect(kebabToCamel('hello-world')).toBe('helloWorld');
      expect(kebabToCamel('background-color')).toBe('backgroundColor');
    });

    it('should handle empty string', () => {
      expect(kebabToCamel('')).toBe('');
    });
  });

  // escapeRegExp
  describe('escapeRegExp', () => {
    it('should escape special regex characters', () => {
      expect(escapeRegExp('[hello]')).toBe('\\[hello\\]');
      expect(escapeRegExp('(world)')).toBe('\\(world\\)');
      expect(escapeRegExp('a.b*c?')).toBe('a\\.b\\*c\\?');
    });

    it('should not escape normal characters', () => {
      expect(escapeRegExp('hello')).toBe('hello');
      expect(escapeRegExp('abc123')).toBe('abc123');
    });

    it('should handle empty string', () => {
      expect(escapeRegExp('')).toBe('');
    });
  });

  // escapeHTML
  describe('escapeHTML', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHTML('<div>')).toBe('&lt;div&gt;');
      expect(escapeHTML('&')).toBe('&amp;');
      expect(escapeHTML('"hello"')).toBe('&quot;hello&quot;');
      expect(escapeHTML("it's")).toBe('it&#39;s');
    });

    it('should handle multiple special characters', () => {
      expect(escapeHTML('<div class="test">&</div>')).toBe(
        '&lt;div class=&quot;test&quot;&gt;&amp;&lt;/div&gt;',
      );
    });

    it('should not modify normal text', () => {
      expect(escapeHTML('hello world')).toBe('hello world');
    });

    it('should handle empty string', () => {
      expect(escapeHTML('')).toBe('');
    });
  });

  // unescapeHTML
  describe('unescapeHTML', () => {
    it('should unescape HTML entities', () => {
      expect(unescapeHTML('&lt;div&gt;')).toBe('<div>');
      expect(unescapeHTML('&amp;')).toBe('&');
      expect(unescapeHTML('&quot;hello&quot;')).toBe('"hello"');
      expect(unescapeHTML('it&#39;s')).toBe("it's");
    });

    it('should be the inverse of escapeHTML', () => {
      const original = '<div class="test">&</div>';
      expect(unescapeHTML(escapeHTML(original))).toBe(original);
    });
  });

  // trim
  describe('trim', () => {
    it('should trim whitespace from both ends', () => {
      expect(trim('  hello  ')).toBe('hello');
      expect(trim('\t\nhello\n\t')).toBe('hello');
    });

    it('should handle empty string', () => {
      expect(trim('')).toBe('');
    });

    it('should handle string with no whitespace', () => {
      expect(trim('hello')).toBe('hello');
    });
  });

  // trimChars
  describe('trimChars', () => {
    it('should trim specified characters from both ends', () => {
      expect(trimChars('___hello___', '_')).toBe('hello');
      expect(trimChars('***hello***', '*')).toBe('hello');
    });

    it('should handle multiple trim characters', () => {
      expect(trimChars('_*hello*_', '_*')).toBe('hello');
    });

    it('should handle empty string', () => {
      expect(trimChars('', '_')).toBe('');
    });

    it('should not trim characters not in the set', () => {
      expect(trimChars('hello', '_')).toBe('hello');
    });
  });

  // repeat
  describe('repeat', () => {
    it('should repeat string n times', () => {
      expect(repeat('ab', 3)).toBe('ababab');
      expect(repeat('a', 5)).toBe('aaaaa');
    });

    it('should return empty string for 0 count', () => {
      expect(repeat('ab', 0)).toBe('');
    });

    it('should return empty string for negative count', () => {
      expect(repeat('ab', -1)).toBe('');
    });
  });

  // padStart
  describe('padStart', () => {
    it('should pad string at the start', () => {
      expect(padStart('5', 3, '0')).toBe('005');
      expect(padStart('10', 5, 'x')).toBe('xxx10');
    });

    it('should not pad if string is long enough', () => {
      expect(padStart('hello', 3, 'x')).toBe('hello');
    });

    it('should handle empty string', () => {
      expect(padStart('', 3, 'x')).toBe('xxx');
    });
  });

  // padEnd
  describe('padEnd', () => {
    it('should pad string at the end', () => {
      expect(padEnd('5', 3, '0')).toBe('500');
      expect(padEnd('10', 5, 'x')).toBe('10xxx');
    });

    it('should not pad if string is long enough', () => {
      expect(padEnd('hello', 3, 'x')).toBe('hello');
    });
  });

  // startsWith
  describe('startsWith', () => {
    it('should check if string starts with prefix', () => {
      expect(startsWith('hello world', 'hello')).toBe(true);
      expect(startsWith('hello world', 'world')).toBe(false);
    });

    it('should handle position parameter', () => {
      expect(startsWith('hello world', 'world', 6)).toBe(true);
    });

    it('should handle empty string', () => {
      expect(startsWith('', '')).toBe(true);
      expect(startsWith('hello', '')).toBe(true);
    });
  });

  // endsWith
  describe('endsWith', () => {
    it('should check if string ends with suffix', () => {
      expect(endsWith('hello world', 'world')).toBe(true);
      expect(endsWith('hello world', 'hello')).toBe(false);
    });

    it('should handle empty string', () => {
      expect(endsWith('', '')).toBe(true);
      expect(endsWith('hello', '')).toBe(true);
    });
  });

  // includes
  describe('includes', () => {
    it('should check if string contains substring', () => {
      expect(includes('hello world', 'world')).toBe(true);
      expect(includes('hello world', 'foo')).toBe(false);
    });

    it('should be case sensitive', () => {
      expect(includes('Hello', 'hello')).toBe(false);
    });

    it('should handle empty string', () => {
      expect(includes('hello', '')).toBe(true);
    });
  });

  // split
  describe('split', () => {
    it('should split string by separator', () => {
      expect(split('a,b,c', ',')).toEqual(['a', 'b', 'c']);
      expect(split('hello world', ' ')).toEqual(['hello', 'world']);
    });

    it('should handle empty separator', () => {
      expect(split('abc', '')).toEqual(['a', 'b', 'c']);
    });

    it('should handle separator not found', () => {
      expect(split('hello', ',')).toEqual(['hello']);
    });
  });

  // words
  describe('words', () => {
    it('should split string into words', () => {
      expect(words('hello world')).toEqual(['hello', 'world']);
      expect(words('hello-world_foo')).toEqual(['hello', 'world', 'foo']);
    });

    it('should handle camelCase', () => {
      expect(words('helloWorld')).toEqual(['hello', 'World']);
    });

    it('should handle empty string', () => {
      expect(words('')).toEqual([]);
    });
  });

  // substring
  describe('substring', () => {
    it('should extract substring', () => {
      expect(substring('hello world', 0, 5)).toBe('hello');
      expect(substring('hello world', 6)).toBe('world');
    });

    it('should handle negative start', () => {
      expect(substring('hello', -3)).toBe('llo');
    });

    it('should handle out of bounds', () => {
      expect(substring('hello', 100)).toBe('');
    });
  });

  // truncate
  describe('truncate', () => {
    it('should truncate string with ellipsis', () => {
      expect(truncate('hello world', 5)).toBe('he...');
    });

    it('should not truncate if string is short enough', () => {
      expect(truncate('hello', 10)).toBe('hello');
    });

    it('should use custom omission', () => {
      expect(truncate('hello world', 8, '...')).toBe('hello...');
    });

    it('should handle empty string', () => {
      expect(truncate('', 10)).toBe('');
    });
  });

  // template
  describe('template', () => {
    it('should replace placeholders with values', () => {
      expect(template('Hello, {name}!', { name: 'World' })).toBe('Hello, World!');
    });

    it('should handle multiple placeholders', () => {
      expect(template('{a} + {b} = {c}', { a: '1', b: '2', c: '3' })).toBe('1 + 2 = 3');
    });

    it('should leave unreplaced placeholders', () => {
      expect(template('Hello, {name}!', {})).toBe('Hello, {name}!');
    });

    it('should handle empty template', () => {
      expect(template('', {})).toBe('');
    });
  });

  // normalizeClass
  describe('normalizeClass', () => {
    it('should normalize string class', () => {
      expect(normalizeClass('foo')).toBe('foo');
    });

    it('should normalize array of classes', () => {
      expect(normalizeClass(['foo', 'bar'])).toBe('foo bar');
    });

    it('should normalize object of classes', () => {
      expect(normalizeClass({ foo: true, bar: false, baz: true })).toBe('foo baz');
    });

    it('should normalize mixed classes', () => {
      expect(normalizeClass(['foo', { bar: true, baz: false }, 'qux'])).toBe('foo bar qux');
    });

    it('should filter out empty values', () => {
      expect(normalizeClass(['', 'foo', null, undefined, false, 0, 'bar'])).toBe('foo bar');
    });
  });

  // normalizeStyle
  describe('normalizeStyle', () => {
    it('should pass through string styles', () => {
      expect(normalizeStyle('color: red')).toBe('color: red');
    });

    it('should normalize object styles', () => {
      const result = normalizeStyle({ color: 'red', fontSize: '16px' });
      expect(result).toBe('color: red; font-size: 16px');
    });

    it('should handle camelCase to kebab-case conversion', () => {
      const result = normalizeStyle({ backgroundColor: 'blue', marginTop: '10px' });
      expect(result).toBe('background-color: blue; margin-top: 10px');
    });

    it('should handle empty object', () => {
      expect(normalizeStyle({})).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(normalizeStyle(null as any)).toBe('');
      expect(normalizeStyle(undefined as any)).toBe('');
    });

    it('should handle array of styles', () => {
      const result = normalizeStyle(['color: red', { fontSize: '16px' }]);
      expect(result).toBe('color: red; font-size: 16px');
    });
  });

  // ============================================================
  // 安全关键函数测试
  // ============================================================

  // sanitizeHTML
  describe('sanitizeHTML', () => {
    it('should remove dangerous <script> tags', () => {
      const input = '<script>alert("xss")</script>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });

    it('should remove <iframe> tags', () => {
      const input = '<iframe src="https://evil.com"></iframe>';
      expect(sanitizeHTML(input)).not.toContain('iframe');
    });

    it('should remove <object> and <embed> tags', () => {
      const input = '<object data="evil.swf"></object><embed src="evil.swf">';
      expect(sanitizeHTML(input)).not.toContain('object');
      expect(sanitizeHTML(input)).not.toContain('embed');
    });

    it('should remove <form> tags', () => {
      const input = '<form action="evil.com"><input type="text"></form>';
      expect(sanitizeHTML(input)).not.toContain('form');
    });

    it('should remove event handler attributes (onclick, onerror, etc.)', () => {
      const input = '<div onclick="alert(1)">click</div>';
      expect(sanitizeHTML(input)).not.toContain('onclick');
      expect(sanitizeHTML(input)).toContain('click');

      const input2 = '<img src="x" onerror="alert(1)">';
      expect(sanitizeHTML(input2)).not.toContain('onerror');
    });

    it('should neutralize javascript: URI protocol', () => {
      const input = '<a href="javascript:alert(1)">click</a>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('javascript:');
      expect(result).toContain('href=""');
    });

    it('should neutralize vbscript: URI protocol', () => {
      const input = '<a href="vbscript:MsgBox(1)">click</a>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('vbscript:');
    });

    it('should neutralize data: URI protocol', () => {
      const input = '<a href="data:text/html,<script>alert(1)</script>">click</a>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('data:text/html');
    });

    it('should handle HTML entity encoded bypass attempts', () => {
      const input = '&lt;script&gt;alert("xss")&lt;/script&gt;';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('<script>');
    });

    it('should handle double-encoded bypass attempts', () => {
      const input = '&amp;lt;script&amp;gt;alert("xss")&amp;lt;/script&amp;gt;';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('<script>');
    });

    it('should remove CSS expression() from style attributes', () => {
      const input = '<div style="width: expression(alert(1))">test</div>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('expression(');
    });

    it('should preserve safe HTML content', () => {
      const input = '<div class="safe"><p>Hello <strong>world</strong></p></div>';
      expect(sanitizeHTML(input)).toBe(input);
    });

    it('should preserve safe href links', () => {
      const input = '<a href="https://example.com">link</a>';
      expect(sanitizeHTML(input)).toBe(input);
    });

    it('should intercept data:image/svg+xml URIs', () => {
      const input = '<img src="data:image/svg+xml,<svg onload=alert(1)>">';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('data:image/svg+xml');
    });

    it('should handle mixed safe and dangerous content', () => {
      const input = '<p>Hello</p><script>alert(1)</script><div>World</div>';
      const result = sanitizeHTML(input);
      expect(result).toContain('<p>Hello</p>');
      expect(result).toContain('<div>World</div>');
      expect(result).not.toContain('script');
    });
  });

  // isSafeAttribute
  describe('isSafeAttribute', () => {
    it('should block event handler attributes (onclick)', () => {
      expect(isSafeAttribute('onclick', 'alert(1)')).toBe(false);
    });

    it('should block event handler attributes (onerror)', () => {
      expect(isSafeAttribute('onerror', 'alert(1)')).toBe(false);
    });

    it('should block event handler attributes case-insensitively', () => {
      expect(isSafeAttribute('OnClick', 'alert(1)')).toBe(false);
      expect(isSafeAttribute('ONLOAD', 'alert(1)')).toBe(false);
    });

    it('should allow safe URL protocols (http:)', () => {
      expect(isSafeAttribute('href', 'https://example.com')).toBe(true);
    });

    it('should allow safe URL protocols (https:)', () => {
      expect(isSafeAttribute('href', 'https://example.com')).toBe(true);
    });

    it('should allow safe URL protocols (mailto:)', () => {
      expect(isSafeAttribute('href', 'mailto:test@example.com')).toBe(true);
    });

    it('should allow safe URL protocols (tel:)', () => {
      expect(isSafeAttribute('href', 'tel:+1234567890')).toBe(true);
    });

    it('should allow anchor links (#)', () => {
      expect(isSafeAttribute('href', '#section')).toBe(true);
    });

    it('should block javascript: protocol in URL attributes', () => {
      expect(isSafeAttribute('href', 'javascript:alert(1)')).toBe(false);
    });

    it('should block vbscript: protocol in URL attributes', () => {
      expect(isSafeAttribute('href', 'vbscript:MsgBox(1)')).toBe(false);
    });

    it('should block data: protocol in URL attributes', () => {
      expect(isSafeAttribute('src', 'data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    it('should allow normal non-URL attributes', () => {
      expect(isSafeAttribute('class', 'container')).toBe(true);
      expect(isSafeAttribute('id', 'main')).toBe(true);
      expect(isSafeAttribute('title', 'tooltip')).toBe(true);
    });
  });

  // escapeAttrValue
  describe('escapeAttrValue', () => {
    it('should escape HTML special characters', () => {
      expect(escapeAttrValue('<div>')).toBe('&lt;div&gt;');
      expect(escapeAttrValue('&')).toBe('&amp;');
      expect(escapeAttrValue('"hello"')).toBe('&quot;hello&quot;');
      expect(escapeAttrValue("it's")).toBe('it&#39;s');
    });

    it('should additionally escape = character', () => {
      expect(escapeAttrValue('a=b')).toBe('a&#61;b');
      expect(escapeAttrValue('key=value&foo=bar')).toBe('key&#61;value&amp;foo&#61;bar');
    });

    it('should handle empty string', () => {
      expect(escapeAttrValue('')).toBe('');
    });

    it('should not modify normal text without special characters', () => {
      expect(escapeAttrValue('hello')).toBe('hello');
    });
  });

  // normalizeStyleObject
  describe('normalizeStyleObject', () => {
    it('should parse string input into object', () => {
      const result = normalizeStyleObject('color: red; font-size: 16px');
      expect(result).toEqual({ color: 'red', fontSize: '16px' });
    });

    it('should pass through object input', () => {
      const input = { color: 'blue', margin: '10px' };
      expect(normalizeStyleObject(input)).toBe(input);
    });

    it('should merge array of objects', () => {
      const result = normalizeStyleObject([{ color: 'red' }, { fontSize: '16px' }]);
      expect(result).toEqual({ color: 'red', fontSize: '16px' });
    });

    it('should let later array items override earlier ones', () => {
      const result = normalizeStyleObject([{ color: 'red' }, { color: 'blue' }]);
      expect(result).toEqual({ color: 'blue' });
    });

    it('should return empty object for null input', () => {
      expect(normalizeStyleObject(null)).toEqual({});
    });

    it('should return empty object for undefined input', () => {
      expect(normalizeStyleObject(undefined)).toEqual({});
    });

    it('should return empty object for empty string', () => {
      expect(normalizeStyleObject('')).toEqual({});
    });
  });

  // isBooleanAttr
  describe('isBooleanAttr', () => {
    it('should return true for known boolean attributes', () => {
      expect(isBooleanAttr('disabled')).toBe(true);
      expect(isBooleanAttr('checked')).toBe(true);
      expect(isBooleanAttr('readonly')).toBe(true);
      expect(isBooleanAttr('selected')).toBe(true);
      expect(isBooleanAttr('multiple')).toBe(true);
      expect(isBooleanAttr('autofocus')).toBe(true);
      expect(isBooleanAttr('required')).toBe(true);
      expect(isBooleanAttr('async')).toBe(true);
      expect(isBooleanAttr('defer')).toBe(true);
    });

    it('should return false for non-boolean attributes', () => {
      expect(isBooleanAttr('class')).toBe(false);
      expect(isBooleanAttr('id')).toBe(false);
      expect(isBooleanAttr('style')).toBe(false);
      expect(isBooleanAttr('href')).toBe(false);
      expect(isBooleanAttr('src')).toBe(false);
      expect(isBooleanAttr('onclick')).toBe(false);
    });
  });

  // VOID_ELEMENTS
  describe('VOID_ELEMENTS', () => {
    it('should be a Set', () => {
      expect(VOID_ELEMENTS).toBeInstanceOf(Set);
    });

    it('should contain common void elements', () => {
      expect(VOID_ELEMENTS.has('br')).toBe(true);
      expect(VOID_ELEMENTS.has('hr')).toBe(true);
      expect(VOID_ELEMENTS.has('img')).toBe(true);
      expect(VOID_ELEMENTS.has('input')).toBe(true);
      expect(VOID_ELEMENTS.has('link')).toBe(true);
      expect(VOID_ELEMENTS.has('meta')).toBe(true);
      expect(VOID_ELEMENTS.has('area')).toBe(true);
      expect(VOID_ELEMENTS.has('base')).toBe(true);
      expect(VOID_ELEMENTS.has('col')).toBe(true);
      expect(VOID_ELEMENTS.has('embed')).toBe(true);
      expect(VOID_ELEMENTS.has('source')).toBe(true);
      expect(VOID_ELEMENTS.has('track')).toBe(true);
      expect(VOID_ELEMENTS.has('wbr')).toBe(true);
    });

    it('should not contain non-void elements', () => {
      expect(VOID_ELEMENTS.has('div')).toBe(false);
      expect(VOID_ELEMENTS.has('span')).toBe(false);
      expect(VOID_ELEMENTS.has('script')).toBe(false);
    });
  });

  // BOOLEAN_ATTRS
  describe('BOOLEAN_ATTRS', () => {
    it('should be a Set', () => {
      expect(BOOLEAN_ATTRS).toBeInstanceOf(Set);
    });

    it('should contain common boolean attributes', () => {
      expect(BOOLEAN_ATTRS.has('disabled')).toBe(true);
      expect(BOOLEAN_ATTRS.has('checked')).toBe(true);
      expect(BOOLEAN_ATTRS.has('readonly')).toBe(true);
      expect(BOOLEAN_ATTRS.has('selected')).toBe(true);
      expect(BOOLEAN_ATTRS.has('multiple')).toBe(true);
      expect(BOOLEAN_ATTRS.has('autofocus')).toBe(true);
      expect(BOOLEAN_ATTRS.has('required')).toBe(true);
      expect(BOOLEAN_ATTRS.has('async')).toBe(true);
      expect(BOOLEAN_ATTRS.has('defer')).toBe(true);
      expect(BOOLEAN_ATTRS.has('controls')).toBe(true);
      expect(BOOLEAN_ATTRS.has('loop')).toBe(true);
      expect(BOOLEAN_ATTRS.has('muted')).toBe(true);
    });

    it('should not contain non-boolean attributes', () => {
      expect(BOOLEAN_ATTRS.has('class')).toBe(false);
      expect(BOOLEAN_ATTRS.has('id')).toBe(false);
      expect(BOOLEAN_ATTRS.has('style')).toBe(false);
    });
  });

  // DANGEROUS_EVENT_ATTRS
  describe('DANGEROUS_EVENT_ATTRS', () => {
    it('should be a Set', () => {
      expect(DANGEROUS_EVENT_ATTRS).toBeInstanceOf(Set);
    });

    it('should contain common dangerous event attributes', () => {
      expect(DANGEROUS_EVENT_ATTRS.has('onclick')).toBe(true);
      expect(DANGEROUS_EVENT_ATTRS.has('onerror')).toBe(true);
      expect(DANGEROUS_EVENT_ATTRS.has('onload')).toBe(true);
      expect(DANGEROUS_EVENT_ATTRS.has('onmouseover')).toBe(true);
      expect(DANGEROUS_EVENT_ATTRS.has('onfocus')).toBe(true);
      expect(DANGEROUS_EVENT_ATTRS.has('onblur')).toBe(true);
      expect(DANGEROUS_EVENT_ATTRS.has('onsubmit')).toBe(true);
      expect(DANGEROUS_EVENT_ATTRS.has('onkeydown')).toBe(true);
      expect(DANGEROUS_EVENT_ATTRS.has('ontouchstart')).toBe(true);
      expect(DANGEROUS_EVENT_ATTRS.has('oncopy')).toBe(true);
      expect(DANGEROUS_EVENT_ATTRS.has('onpaste')).toBe(true);
    });

    it('should have a reasonable size (at least 50 entries)', () => {
      expect(DANGEROUS_EVENT_ATTRS.size).toBeGreaterThanOrEqual(50);
    });

    it('should not contain non-event attributes', () => {
      expect(DANGEROUS_EVENT_ATTRS.has('class')).toBe(false);
      expect(DANGEROUS_EVENT_ATTRS.has('id')).toBe(false);
      expect(DANGEROUS_EVENT_ATTRS.has('style')).toBe(false);
      expect(DANGEROUS_EVENT_ATTRS.has('href')).toBe(false);
    });
  });
});
