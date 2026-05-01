// tests/codegen.test.ts
// Codegen tests

import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';

describe('codegen', () => {
  describe('basic codegen', () => {
    it('should generate render function', () => {
      const result = compile('<div></div>');
      expect(result.code).toMatch(/function\s+render\s*\(/);
      expect(result.code).toMatch(/return\b/);
    });

    it('should generate createElementVNode call', () => {
      const result = compile('<div></div>');
      expect(result.code).toMatch(/createElementVNode\(/);
    });

    it('should generate preamble with imports', () => {
      const result = compile('<div></div>');
      expect(result.preamble).toMatch(/\bimport\b/);
      expect(result.preamble).toMatch(/createElementVNode/);
    });

    it('should return code and preamble', () => {
      const result = compile('<div></div>');
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('preamble');
    });
  });

  describe('element codegen', () => {
    it('should generate correct tag name', () => {
      const result = compile('<span></span>');
      expect(result.code).toContain('"span"');
    });

    it('should generate static attributes', () => {
      const result = compile('<div id="app"></div>');
      expect(result.code).toContain('"id"');
      expect(result.code).toContain('"app"');
    });

    it('should generate multiple attributes', () => {
      const result = compile('<div id="app" class="container"></div>');
      expect(result.code).toContain('"id"');
      expect(result.code).toContain('"app"');
      expect(result.code).toContain('"class"');
      expect(result.code).toContain('"container"');
    });
  });

  describe('interpolation codegen', () => {
    it('should generate toDisplayString for interpolation', () => {
      const result = compile('<div>{{ message }}</div>');
      expect(result.preamble).toContain('toDisplayString');
    });

    it('should generate expression content', () => {
      const result = compile('<div>{{ message }}</div>');
      expect(result.code).toContain('message');
    });
  });

  describe('v-if codegen', () => {
    it('should generate conditional expression', () => {
      const result = compile('<div v-if="show"></div>');
      expect(result.code).toContain('?');
      expect(result.code).toContain(':');
    });

    it('should generate v-if/v-else chain', () => {
      const result = compile(
        '<div v-if="a">A</div><div v-else>B</div>',
      );
      expect(result.code).toContain('?');
      expect(result.code).toContain(':');
    });
  });

  describe('v-for codegen', () => {
    it('should generate renderList call', () => {
      const result = compile('<li v-for="item in items"></li>');
      expect(result.preamble).toContain('renderList');
      expect(result.code).toContain('renderList');
    });
  });

  describe('v-model codegen', () => {
    it('should generate modelValue and onUpdate:modelValue', () => {
      const result = compile('<input v-model="message">');
      expect(result.code).toContain('modelValue');
      expect(result.code).toContain('onUpdate:modelValue');
    });
  });

  describe('component codegen', () => {
    it('should generate component tag without quotes', () => {
      const result = compile('<MyComponent></MyComponent>');
      expect(result.code).toContain('MyComponent');
    });
  });

  describe('text codegen', () => {
    it('should generate text content', () => {
      const result = compile('hello');
      expect(result.code).toContain('"hello"');
    });
  });

  describe('nested elements', () => {
    it('should generate nested elements', () => {
      const result = compile('<div><span></span></div>');
      expect(result.code).toContain('createElementVNode');
    });
  });
});
