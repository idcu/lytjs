/* eslint-disable @typescript-eslint/no-unused-vars */
// tests/codegen-signal-optimized.test.ts
// Phase 1.1: Signal 代码生成器优化测试

import { describe, it, expect } from 'vitest';
import { compile, generateSignalOptimized } from '../src';

describe('Signal Codegen Optimized', () => {
  describe('Code Size Reduction', () => {
    it('should generate signal code', () => {
      const template = '<div><span>{{ message }}</span></div>';

      const result = compile(template, {
        rendererMode: 'signal',
        optimizeSignal: true,
      });

      expect(result.code).toBeDefined();
      expect(result.code.length).toBeGreaterThan(0);
    });

    it('should use short import aliases', () => {
      const template = '<div>{{ message }}</div>';
      const result = compile(template, {
        rendererMode: 'signal',
        optimizeSignal: true,
      });

      // ⚠️ 2026-09-30 订正：本用例原先断言 `toMatch(/e as effect/)`，**恰好把错误写法固化成契约** ——
      //    `import{e as effect}` 的语义是「导入名为 `e` 的导出」，而 `@lytjs/reactivity` 没有 `e`
      //    这个导出；产物函数体里用的又是**短名** `e` ⇒ 产物**根本无法加载**。
      //    正确写法是「真实导出 as 短名」。
      expect(result.code).toMatch(/import\{effect as e\}from'@lytjs\/reactivity';/);
      expect(result.code).not.toMatch(/\be as effect\b/);
    });

    it('should generate signal effects', () => {
      const template = '<div :class="cls" :style="style">{{ text }}</div>';
      const result = compile(template, {
        rendererMode: 'signal',
        optimizeSignal: true,
      });

      expect(result.code).toContain('e(');
    });

    it('should generate compact function parameters', () => {
      const template = '<div>{{ message }}</div>';
      const result = compile(template, {
        rendererMode: 'signal',
        optimizeSignal: true,
      });

      expect(result.code).toMatch(/function render\(_c,_n\)/);
    });
  });

  describe('Functionality Preservation', () => {
    it('should handle simple interpolation', () => {
      const template = '<div>{{ message }}</div>';
      const result = compile(template, {
        rendererMode: 'signal',
        optimizeSignal: true,
      });

      expect(result.code).toContain('e(()=>x(_0,_c.message))');
    });

    it('should handle v-if directive', () => {
      const template = '<div v-if="show">content</div>';
      const result = compile(template, {
        rendererMode: 'signal',
        optimizeSignal: true,
      });

      expect(result.code).toContain('e(()=>{if(_c.show)');
    });

    it('should handle v-for directive', () => {
      const template = '<ul><li v-for="item in items" :key="item.id">{{ item.name }}</li></ul>';
      const result = compile(template, {
        rendererMode: 'signal',
        optimizeSignal: true,
      });

      expect(result.code).toContain('n(_0,_c.items');
    });

    it('should handle v-model directive', () => {
      const template = '<input v-model="value" />';
      const result = compile(template, {
        rendererMode: 'signal',
        optimizeSignal: true,
      });

      expect(result.code).toContain('.value=_c.value');
    });

    it('should handle v-on directive', () => {
      const template = '<button @click="handleClick">Click</button>';
      const result = compile(template, {
        rendererMode: 'signal',
        optimizeSignal: true,
      });

      expect(result.code).toContain("v(_0,'click',_c.handleClick)");
    });

    it('should handle v-bind directive', () => {
      const template = '<div :class="cls" :style="style"></div>';
      const result = compile(template, {
        rendererMode: 'signal',
        optimizeSignal: true,
      });

      expect(result.code).toContain('c(_0,_c.cls)');
      expect(result.code).toContain('s(_0,_c.style)');
    });
  });

  describe('Edge Cases', () => {
    it('should handle nested elements', () => {
      const template = '<div><span><em>{{ text }}</em></span></div>';
      const result = compile(template, {
        rendererMode: 'signal',
        optimizeSignal: true,
      });

      expect(result.code).toBeDefined();
      expect(result.code).toContain('t(');
    });

    it('should handle multiple root-level directives', () => {
      const template = '<div v-if="show" v-for="item in items">{{ item }}</div>';
      const result = compile(template, {
        rendererMode: 'signal',
        optimizeSignal: true,
      });

      expect(result.code).toBeDefined();
    });

    it('should handle v-show directive', () => {
      const template = '<div v-show="visible">content</div>';
      const result = compile(template, {
        rendererMode: 'signal',
        optimizeSignal: true,
      });

      expect(result.code).toContain('.style.display');
    });
  });

  describe('Size Comparison', () => {
    it('should generate valid code for typical templates', () => {
      const templates = [
        '<div>{{ message }}</div>',
        '<div><span>{{ text }}</span></div>',
        '<div :class="cls" :style="style">{{ content }}</div>',
        '<input v-model="value" />',
        '<button @click="handleClick">{{ label }}</button>',
        '<ul><li v-for="item in items" :key="item.id">{{ item.name }}</li></ul>',
      ];

      for (const template of templates) {
        const result = compile(template, {
          rendererMode: 'signal',
          optimizeSignal: true,
        });

        expect(result.code).toBeDefined();
        expect(result.code.length).toBeGreaterThan(0);
      }
    });
  });
});
