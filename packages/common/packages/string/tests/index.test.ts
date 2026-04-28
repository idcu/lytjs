import { describe, it, expect } from 'vitest'
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
} from '../src/index'

describe('@lytjs/common-string', () => {
  // capitalize
  describe('capitalize', () => {
    it('should capitalize the first letter', () => {
      expect(capitalize('hello')).toBe('Hello')
      expect(capitalize('world')).toBe('World')
    })

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('')
    })

    it('should handle single character', () => {
      expect(capitalize('a')).toBe('A')
    })

    it('should not modify already capitalized string', () => {
      expect(capitalize('Hello')).toBe('Hello')
    })
  })

  // kebabCase
  describe('kebabCase', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(kebabCase('helloWorld')).toBe('hello-world')
      expect(kebabCase('myComponent')).toBe('my-component')
    })

    it('should handle pascalCase', () => {
      expect(kebabCase('MyComponent')).toBe('my-component')
    })

    it('should handle already kebab-case', () => {
      expect(kebabCase('hello-world')).toBe('hello-world')
    })

    it('should handle single word', () => {
      expect(kebabCase('hello')).toBe('hello')
    })

    it('should handle empty string', () => {
      expect(kebabCase('')).toBe('')
    })

    it('should handle consecutive uppercase', () => {
      expect(kebabCase('XMLParser')).toBe('xml-parser')
    })
  })

  // camelCase
  describe('camelCase', () => {
    it('should convert kebab-case to camelCase', () => {
      expect(camelCase('hello-world')).toBe('helloWorld')
      expect(camelCase('my-component')).toBe('myComponent')
    })

    it('should handle snake_case', () => {
      expect(camelCase('hello_world')).toBe('helloWorld')
    })

    it('should handle space separated', () => {
      expect(camelCase('hello world')).toBe('helloWorld')
    })

    it('should handle empty string', () => {
      expect(camelCase('')).toBe('')
    })

    it('should handle single word', () => {
      expect(camelCase('hello')).toBe('hello')
    })
  })

  // pascalCase
  describe('pascalCase', () => {
    it('should convert kebab-case to PascalCase', () => {
      expect(pascalCase('hello-world')).toBe('HelloWorld')
    })

    it('should convert camelCase to PascalCase', () => {
      expect(pascalCase('helloWorld')).toBe('HelloWorld')
    })

    it('should handle single word', () => {
      expect(pascalCase('hello')).toBe('Hello')
    })

    it('should handle empty string', () => {
      expect(pascalCase('')).toBe('')
    })
  })

  // camelToKebab
  describe('camelToKebab', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(camelToKebab('helloWorld')).toBe('hello-world')
      expect(camelToKebab('backgroundColor')).toBe('background-color')
    })

    it('should handle empty string', () => {
      expect(camelToKebab('')).toBe('')
    })
  })

  // kebabToCamel
  describe('kebabToCamel', () => {
    it('should convert kebab-case to camelCase', () => {
      expect(kebabToCamel('hello-world')).toBe('helloWorld')
      expect(kebabToCamel('background-color')).toBe('backgroundColor')
    })

    it('should handle empty string', () => {
      expect(kebabToCamel('')).toBe('')
    })
  })

  // escapeRegExp
  describe('escapeRegExp', () => {
    it('should escape special regex characters', () => {
      expect(escapeRegExp('[hello]')).toBe('\\[hello\\]')
      expect(escapeRegExp('(world)')).toBe('\\(world\\)')
      expect(escapeRegExp('a.b*c?')).toBe('a\\.b\\*c\\?')
    })

    it('should not escape normal characters', () => {
      expect(escapeRegExp('hello')).toBe('hello')
      expect(escapeRegExp('abc123')).toBe('abc123')
    })

    it('should handle empty string', () => {
      expect(escapeRegExp('')).toBe('')
    })
  })

  // escapeHTML
  describe('escapeHTML', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHTML('<div>')).toBe('&lt;div&gt;')
      expect(escapeHTML('&')).toBe('&amp;')
      expect(escapeHTML('"hello"')).toBe('&quot;hello&quot;')
      expect(escapeHTML("it's")).toBe('it&#39;s')
    })

    it('should handle multiple special characters', () => {
      expect(escapeHTML('<div class="test">&</div>')).toBe(
        '&lt;div class=&quot;test&quot;&gt;&amp;&lt;/div&gt;'
      )
    })

    it('should not modify normal text', () => {
      expect(escapeHTML('hello world')).toBe('hello world')
    })

    it('should handle empty string', () => {
      expect(escapeHTML('')).toBe('')
    })
  })

  // unescapeHTML
  describe('unescapeHTML', () => {
    it('should unescape HTML entities', () => {
      expect(unescapeHTML('&lt;div&gt;')).toBe('<div>')
      expect(unescapeHTML('&amp;')).toBe('&')
      expect(unescapeHTML('&quot;hello&quot;')).toBe('"hello"')
      expect(unescapeHTML('it&#39;s')).toBe("it's")
    })

    it('should be the inverse of escapeHTML', () => {
      const original = '<div class="test">&</div>'
      expect(unescapeHTML(escapeHTML(original))).toBe(original)
    })
  })

  // trim
  describe('trim', () => {
    it('should trim whitespace from both ends', () => {
      expect(trim('  hello  ')).toBe('hello')
      expect(trim('\t\nhello\n\t')).toBe('hello')
    })

    it('should handle empty string', () => {
      expect(trim('')).toBe('')
    })

    it('should handle string with no whitespace', () => {
      expect(trim('hello')).toBe('hello')
    })
  })

  // trimChars
  describe('trimChars', () => {
    it('should trim specified characters from both ends', () => {
      expect(trimChars('___hello___', '_')).toBe('hello')
      expect(trimChars('***hello***', '*')).toBe('hello')
    })

    it('should handle multiple trim characters', () => {
      expect(trimChars('_*hello*_', '_*')).toBe('hello')
    })

    it('should handle empty string', () => {
      expect(trimChars('', '_')).toBe('')
    })

    it('should not trim characters not in the set', () => {
      expect(trimChars('hello', '_')).toBe('hello')
    })
  })

  // repeat
  describe('repeat', () => {
    it('should repeat string n times', () => {
      expect(repeat('ab', 3)).toBe('ababab')
      expect(repeat('a', 5)).toBe('aaaaa')
    })

    it('should return empty string for 0 count', () => {
      expect(repeat('ab', 0)).toBe('')
    })

    it('should return empty string for negative count', () => {
      expect(repeat('ab', -1)).toBe('')
    })
  })

  // padStart
  describe('padStart', () => {
    it('should pad string at the start', () => {
      expect(padStart('5', 3, '0')).toBe('005')
      expect(padStart('10', 5, 'x')).toBe('xxx10')
    })

    it('should not pad if string is long enough', () => {
      expect(padStart('hello', 3, 'x')).toBe('hello')
    })

    it('should handle empty string', () => {
      expect(padStart('', 3, 'x')).toBe('xxx')
    })
  })

  // padEnd
  describe('padEnd', () => {
    it('should pad string at the end', () => {
      expect(padEnd('5', 3, '0')).toBe('500')
      expect(padEnd('10', 5, 'x')).toBe('10xxx')
    })

    it('should not pad if string is long enough', () => {
      expect(padEnd('hello', 3, 'x')).toBe('hello')
    })
  })

  // startsWith
  describe('startsWith', () => {
    it('should check if string starts with prefix', () => {
      expect(startsWith('hello world', 'hello')).toBe(true)
      expect(startsWith('hello world', 'world')).toBe(false)
    })

    it('should handle position parameter', () => {
      expect(startsWith('hello world', 'world', 6)).toBe(true)
    })

    it('should handle empty string', () => {
      expect(startsWith('', '')).toBe(true)
      expect(startsWith('hello', '')).toBe(true)
    })
  })

  // endsWith
  describe('endsWith', () => {
    it('should check if string ends with suffix', () => {
      expect(endsWith('hello world', 'world')).toBe(true)
      expect(endsWith('hello world', 'hello')).toBe(false)
    })

    it('should handle empty string', () => {
      expect(endsWith('', '')).toBe(true)
      expect(endsWith('hello', '')).toBe(true)
    })
  })

  // includes
  describe('includes', () => {
    it('should check if string contains substring', () => {
      expect(includes('hello world', 'world')).toBe(true)
      expect(includes('hello world', 'foo')).toBe(false)
    })

    it('should be case sensitive', () => {
      expect(includes('Hello', 'hello')).toBe(false)
    })

    it('should handle empty string', () => {
      expect(includes('hello', '')).toBe(true)
    })
  })

  // split
  describe('split', () => {
    it('should split string by separator', () => {
      expect(split('a,b,c', ',')).toEqual(['a', 'b', 'c'])
      expect(split('hello world', ' ')).toEqual(['hello', 'world'])
    })

    it('should handle empty separator', () => {
      expect(split('abc', '')).toEqual(['a', 'b', 'c'])
    })

    it('should handle separator not found', () => {
      expect(split('hello', ',')).toEqual(['hello'])
    })
  })

  // words
  describe('words', () => {
    it('should split string into words', () => {
      expect(words('hello world')).toEqual(['hello', 'world'])
      expect(words('hello-world_foo')).toEqual(['hello', 'world', 'foo'])
    })

    it('should handle camelCase', () => {
      expect(words('helloWorld')).toEqual(['hello', 'World'])
    })

    it('should handle empty string', () => {
      expect(words('')).toEqual([])
    })
  })

  // substring
  describe('substring', () => {
    it('should extract substring', () => {
      expect(substring('hello world', 0, 5)).toBe('hello')
      expect(substring('hello world', 6)).toBe('world')
    })

    it('should handle negative start', () => {
      expect(substring('hello', -3)).toBe('llo')
    })

    it('should handle out of bounds', () => {
      expect(substring('hello', 100)).toBe('')
    })
  })

  // truncate
  describe('truncate', () => {
    it('should truncate string with ellipsis', () => {
      expect(truncate('hello world', 5)).toBe('he...')
    })

    it('should not truncate if string is short enough', () => {
      expect(truncate('hello', 10)).toBe('hello')
    })

    it('should use custom omission', () => {
      expect(truncate('hello world', 8, '...')).toBe('hello...')
    })

    it('should handle empty string', () => {
      expect(truncate('', 10)).toBe('')
    })
  })

  // template
  describe('template', () => {
    it('should replace placeholders with values', () => {
      expect(template('Hello, {name}!', { name: 'World' })).toBe('Hello, World!')
    })

    it('should handle multiple placeholders', () => {
      expect(template('{a} + {b} = {c}', { a: '1', b: '2', c: '3' })).toBe('1 + 2 = 3')
    })

    it('should leave unreplaced placeholders', () => {
      expect(template('Hello, {name}!', {})).toBe('Hello, {name}!')
    })

    it('should handle empty template', () => {
      expect(template('', {})).toBe('')
    })
  })

  // normalizeClass
  describe('normalizeClass', () => {
    it('should normalize string class', () => {
      expect(normalizeClass('foo')).toBe('foo')
    })

    it('should normalize array of classes', () => {
      expect(normalizeClass(['foo', 'bar'])).toBe('foo bar')
    })

    it('should normalize object of classes', () => {
      expect(normalizeClass({ foo: true, bar: false, baz: true })).toBe('foo baz')
    })

    it('should normalize mixed classes', () => {
      expect(normalizeClass(['foo', { bar: true, baz: false }, 'qux'])).toBe('foo bar qux')
    })

    it('should filter out empty values', () => {
      expect(normalizeClass(['', 'foo', null, undefined, false, 0, 'bar'])).toBe('foo bar')
    })
  })

  // normalizeStyle
  describe('normalizeStyle', () => {
    it('should pass through string styles', () => {
      expect(normalizeStyle('color: red')).toBe('color: red')
    })

    it('should normalize object styles', () => {
      const result = normalizeStyle({ color: 'red', fontSize: '16px' })
      expect(result).toBe('color: red; font-size: 16px')
    })

    it('should handle camelCase to kebab-case conversion', () => {
      const result = normalizeStyle({ backgroundColor: 'blue', marginTop: '10px' })
      expect(result).toBe('background-color: blue; margin-top: 10px')
    })

    it('should handle empty object', () => {
      expect(normalizeStyle({})).toBe('')
    })

    it('should handle null/undefined', () => {
      expect(normalizeStyle(null as any)).toBe('')
      expect(normalizeStyle(undefined as any)).toBe('')
    })

    it('should handle array of styles', () => {
      const result = normalizeStyle(['color: red', { fontSize: '16px' }])
      expect(result).toBe('color: red; font-size: 16px')
    })
  })
})
