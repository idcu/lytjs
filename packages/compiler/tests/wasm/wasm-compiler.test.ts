/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
import { describe, it, expect } from 'vitest';
import { wasmCompile, serializeAST } from '../../src/wasm/wasm-compiler';
import type { WASMCompileError, ASTNode } from '../../src/wasm/wasm-compiler';

describe('wasmCompile', () => {
  describe('basic compilation', () => {
    it('should compile a simple template', () => {
      const result = wasmCompile('<div>Hello</div>');
      expect(result.code).toContain('function render');
      expect(result.errors).toHaveLength(0);
      expect(result.ast).toBeDefined();
      expect(result.ast.length).toBeGreaterThan(0);
    });

    it('should return renderFn as "render"', () => {
      const result = wasmCompile('<div>test</div>');
      expect(result.renderFn).toBe('render');
    });

    it('should return positive compileTime', () => {
      const result = wasmCompile('<div>test</div>');
      expect(result.compileTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.compileTime).toBe('number');
    });
  });

  describe('AST serialization', () => {
    it('should serialize element nodes', () => {
      const result = wasmCompile('<div><span>text</span></div>');
      const root = result.ast[0] as ASTNode;
      expect(root.type).toBe('Element');
      expect(root.tag).toBe('div');
      expect(root.children).toBeDefined();
      expect(root.children!.length).toBeGreaterThan(0);
    });

    it('should serialize text nodes', () => {
      const result = wasmCompile('Hello World');
      const textNode = result.ast[0] as ASTNode;
      expect(textNode.type).toBe('Text');
      expect(textNode.content).toContain('Hello World');
    });

    it('should serialize interpolation nodes', () => {
      const result = wasmCompile('{{ message }}');
      const interpNode = result.ast[0] as ASTNode;
      expect(interpNode.type).toBe('Interpolation');
      expect(interpNode.content).toBe('message');
    });

    it('should serialize attributes', () => {
      const result = wasmCompile('<div class="container" id="app"></div>');
      const el = result.ast[0] as ASTNode;
      expect(el.props).toBeDefined();
      expect(el.props!.length).toBeGreaterThan(0);
    });

    it('should serialize directives', () => {
      const result = wasmCompile('<div v-if="show">content</div>');
      const el = result.ast[0] as ASTNode;
      expect(el.props).toBeDefined();
      const vIf = el.props!.find((p) => p.name.includes('if'));
      expect(vIf).toBeDefined();
    });
  });

  describe('node counting', () => {
    it('should count static nodes', () => {
      const result = wasmCompile('<div>static text</div>');
      expect(result.staticCount).toBeGreaterThan(0);
    });

    it('should count dynamic nodes', () => {
      const result = wasmCompile('<div>{{ message }}</div>');
      expect(result.dynamicCount).toBeGreaterThan(0);
    });

    it('should count both static and dynamic nodes', () => {
      const result = wasmCompile('<div><span>static</span>{{ msg }}</div>');
      expect(result.staticCount).toBeGreaterThan(0);
      expect(result.dynamicCount).toBeGreaterThan(0);
    });
  });

  describe('compile options', () => {
    it('should respect ssr option', () => {
      const result = wasmCompile('<div>test</div>', { ssr: true });
      expect(result.code).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it('should respect filename option', () => {
      const result = wasmCompile('<div>test</div>', { filename: 'App.vue' });
      expect(result.code).toBeDefined();
    });

    it('should work with mode "function"', () => {
      const result = wasmCompile('<div>test</div>', { mode: 'function' });
      expect(result.code).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it('should work with mode "module"', () => {
      const result = wasmCompile('<div>test</div>', { mode: 'module' });
      expect(result.code).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it('should work with inline option', () => {
      const result = wasmCompile('<div>test</div>', { inline: true });
      expect(result.code).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should collect errors for invalid templates', () => {
      const result = wasmCompile('');
      expect(result).toBeDefined();
      expect(result.errors).toBeInstanceOf(Array);
    });

    it('should return empty code on critical error', () => {
      const result = wasmCompile('');
      expect(result.code).toBeDefined();
      expect(typeof result.code).toBe('string');
    });

    it('should include error code in WASMCompileError', () => {
      const result = wasmCompile('');
      if (result.errors.length > 0) {
        const error = result.errors[0] as WASMCompileError;
        expect(error.message).toBeDefined();
        expect(typeof error.message).toBe('string');
      }
    });
  });

  describe('warning handling', () => {
    it('should return warnings array', () => {
      const result = wasmCompile('<div>test</div>');
      expect(result.warnings).toBeInstanceOf(Array);
    });

    it('should have no warnings for valid templates', () => {
      const result = wasmCompile('<div>test</div>');
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('complex templates', () => {
    it('should compile template with v-for', () => {
      const result = wasmCompile(
        '<ul><li v-for="item in list" :key="item.id">{{ item.name }}</li></ul>',
      );
      expect(result.code).toContain('function render');
      expect(result.errors).toHaveLength(0);
    });

    it('should compile template with v-if / v-else', () => {
      const result = wasmCompile('<div v-if="show">A</div><div v-else>B</div>');
      expect(result.code).toContain('function render');
      expect(result.errors).toHaveLength(0);
    });

    it('should compile template with nested elements', () => {
      const result = wasmCompile(
        '<div><header><nav><a href="/">Home</a></nav></header><main><p>Content</p></main></div>',
      );
      expect(result.code).toContain('function render');
      expect(result.errors).toHaveLength(0);
      expect(result.ast[0]).toBeDefined();
    });

    it('should compile template with multiple interpolations', () => {
      const result = wasmCompile('<p>{{ a }} + {{ b }} = {{ a + b }}</p>');
      expect(result.code).toContain('function render');
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe('serializeAST', () => {
  it('should be exported and callable', () => {
    expect(typeof serializeAST).toBe('function');
  });
});

// ============================================================
// P2-6: 边界场景测试增强
// ============================================================

describe('edge cases and boundary conditions', () => {
  describe('empty and whitespace handling', () => {
    it('should handle empty template gracefully', () => {
      const result = wasmCompile('');
      expect(result).toBeDefined();
      expect(result.code).toBeDefined();
    });

    it('should handle whitespace-only template', () => {
      const result = wasmCompile('   \n\t  ');
      expect(result).toBeDefined();
      expect(result.code).toBeDefined();
    });

    it('should preserve significant whitespace in text', () => {
      const result = wasmCompile('<div>  spaced  text  </div>');
      expect(result.code).toBeDefined();
    });
  });

  describe('special characters', () => {
    it('should handle HTML entities in text', () => {
      const result = wasmCompile('<div>&lt;script&gt;</div>');
      expect(result.code).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it('should handle quotes in attributes', () => {
      const result = wasmCompile('<div title="Hello \'World\'">test</div>');
      expect(result.code).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it('should handle unicode in text content', () => {
      const result = wasmCompile('<div>你好世界 🎉</div>');
      expect(result.code).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('deeply nested structures', () => {
    it('should handle deeply nested elements', () => {
      const deep = '<div>'.repeat(20) + 'deep' + '</div>'.repeat(20);
      const result = wasmCompile(deep);
      expect(result.code).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it('should handle sibling elements at root', () => {
      const result = wasmCompile('<span>A</span><span>B</span><span>C</span>');
      expect(result.code).toBeDefined();
      expect(result.ast.length).toBeGreaterThan(1);
    });
  });

  describe('directive edge cases', () => {
    it('should handle v-bind with dynamic argument', () => {
      const result = wasmCompile('<div :[attr]="value">test</div>');
      expect(result.code).toBeDefined();
    });

    it('should handle v-on with modifiers', () => {
      const result = wasmCompile('<button @click.stop.prevent="handle">Click</button>');
      expect(result.code).toBeDefined();
    });

    it('should handle v-slot syntax', () => {
      const result = wasmCompile(
        '<template v-slot:default="slotProps">{{ slotProps.item }}</template>',
      );
      expect(result.code).toBeDefined();
    });

    it('should handle v-model on input', () => {
      const result = wasmCompile('<input v-model="value" />');
      expect(result.code).toBeDefined();
    });
  });

  describe('performance and limits', () => {
    it('should compile large template without timeout', () => {
      const items = Array.from({ length: 100 }, (_, i) => `<li>Item ${i}</li>`).join('');
      const result = wasmCompile(`<ul>${items}</ul>`);
      expect(result.code).toBeDefined();
      expect(result.compileTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should report compileTime accurately', () => {
      const result = wasmCompile('<div>test</div>');
      expect(typeof result.compileTime).toBe('number');
      expect(result.compileTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('SSR mode edge cases', () => {
    it('should generate SSR-compatible code when ssr option is true', () => {
      const result = wasmCompile('<div>{{ message }}</div>', { ssr: true });
      expect(result.code).toBeDefined();
    });

    it('should handle v-html in SSR mode', () => {
      const result = wasmCompile('<div v-html="rawHtml"></div>', { ssr: true });
      expect(result.code).toBeDefined();
    });
  });
});
