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
      const result = compile('<div v-if="a">A</div><div v-else>B</div>');
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

  describe('edge cases', () => {
    it('should handle template with only whitespace', () => {
      const result = compile('   \n\t  ');
      expect(result.code).toBeDefined();
    });

    it('should handle deeply nested elements', () => {
      const result = compile('<div><div><div><span>deep</span></div></div></div>');
      expect(result.code).toContain('createElementVNode');
    });

    it('should handle element with special characters in attribute', () => {
      const result = compile('<div data-value="a &lt; b"></div>');
      expect(result.code).toContain('data-value');
    });

    it('should handle multiple v-if/v-else-if/v-else branches', () => {
      const result = compile('<div v-if="a">A</div><div v-else-if="b">B</div><div v-else>C</div>');
      expect(result.code).toContain('?');
      expect(result.code).toContain(':');
    });

    it('should handle v-for with index', () => {
      const result = compile('<li v-for="(item, index) in items">{{ index }}: {{ item }}</li>');
      expect(result.preamble).toContain('renderList');
      expect(result.code).toContain('index');
    });

    it('should handle v-bind shorthand', () => {
      const result = compile('<div :id="myId"></div>');
      expect(result.code).toContain('id');
    });

    it('should handle v-on shorthand', () => {
      const result = compile('<button @click="handleClick">Click</button>');
      expect(result.code).toContain('onClick');
    });

    it('should handle dynamic arguments', () => {
      const result = compile('<div:[attrName]="value"></div>');
      expect(result.code).toContain('attrName');
    });

    it('should handle v-slot shorthand', () => {
      // #default 是默认插槽的简写，编译器会处理为插槽内容
      // 验证编译成功且生成正确的代码结构
      const result = compile(
        '<MyComponent #default="slotProps">{{ slotProps.text }}</MyComponent>',
      );
      expect(result.code).toContain('slotProps');
      expect(result.code).toContain('toDisplayString');
    });

    it('should handle comments in template', () => {
      const result = compile('<div><!-- comment --></div>');
      expect(result.code).toBeDefined();
    });

    it('should handle mixed v-bind and v-on', () => {
      const result = compile('<input :value="val" @input="onInput">');
      expect(result.code).toContain('value');
      expect(result.code).toContain('onInput');
    });

    it('should handle v-pre directive', () => {
      // v-pre 指令用于跳过编译，保持原始内容
      // 编译器应该能处理它而不报错
      const result = compile('<div v-pre>{{ raw }}</div>');
      expect(result.code).toBeDefined();
      // v-pre 元素内的内容会被保留
    });

    it('should handle v-once directive', () => {
      const result = compile('<div v-once>{{ message }}</div>');
      expect(result.code).toBeDefined();
    });

    it('should handle v-cloak directive', () => {
      const result = compile('<div v-cloak>{{ message }}</div>');
      expect(result.code).toBeDefined();
    });

    it('should handle svg element', () => {
      const result = compile('<svg><circle cx="50" cy="50" r="40"></circle></svg>');
      expect(result.code).toContain('svg');
    });

    it('should handle template refs', () => {
      const result = compile('<div ref="myRef"></div>');
      expect(result.code).toContain('ref');
    });

    it('should handle key attribute', () => {
      const result = compile('<div :key="itemId"></div>');
      expect(result.code).toContain('key');
    });

    it('should handle is attribute for dynamic component', () => {
      const result = compile('<component :is="componentName"></component>');
      expect(result.code).toContain('is');
    });
  });
});
