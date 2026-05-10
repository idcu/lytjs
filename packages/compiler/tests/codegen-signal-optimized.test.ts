// tests/codegen-signal-optimized.test.ts
// Phase 1.1: Signal 代码生成器优化测试

import { describe, it, expect } from 'vitest';
import { compile, generateSignalOptimized } from '../src';

describe('Signal Codegen Optimized', () => {
  describe('Code Size Reduction', () => {
    it('should generate shorter variable names', () => {
      const template = '<div><span>{{ message }}</span></div>';
      
      // 原始版本
      const originalResult = compile(template, {
        rendererMode: 'signal',
        optimizeSignal: false,
      });
      
      // 优化版本
      const optimizedResult = compile(template, {
        rendererMode: 'signal',
        optimizeSignal: true,
      });
      
      // 优化版本应该更小
      expect(optimizedResult.code.length).toBeLessThan(originalResult.code.length);
      
      // 验证优化版本使用短变量名
      expect(optimizedResult.code).toMatch(/const _0/);
    });

    it('should use short import aliases', () => {
      const template = '<div>{{ message }}</div>';
      const result = compile(template, {
        rendererMode: 'signal',
        optimizeSignal: true,
      });
      
      // 应该使用短名称
      expect(result.code).toMatch(/e as effect/);
      expect(result.code).toMatch(/x as setText/);
    });

    it('should merge multiple effects', () => {
      const template = '<div :class="cls" :style="style">{{ text }}</div>';
      const result = compile(template, {
        rendererMode: 'signal',
        optimizeSignal: true,
      });
      
      // 统计 effect 调用次数
      const effectCount = (result.code.match(/e\(\(\)=>/g) || []).length;
      
      // 多个绑定应该合并为单个 effect
      expect(effectCount).toBeLessThanOrEqual(2);
    });

    it('should generate compact function parameters', () => {
      const template = '<div>{{ message }}</div>';
      const result = compile(template, {
        rendererMode: 'signal',
        optimizeSignal: true,
      });
      
      // 使用短参数名
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
    it('should achieve at least 30% size reduction for typical templates', () => {
      const templates = [
        '<div>{{ message }}</div>',
        '<div><span>{{ text }}</span></div>',
        '<div :class="cls" :style="style">{{ content }}</div>',
        '<input v-model="value" />',
        '<button @click="handleClick">{{ label }}</button>',
        '<ul><li v-for="item in items" :key="item.id">{{ item.name }}</li></ul>',
      ];

      let totalOriginal = 0;
      let totalOptimized = 0;

      for (const template of templates) {
        const original = compile(template, {
          rendererMode: 'signal',
          optimizeSignal: false,
        });
        const optimized = compile(template, {
          rendererMode: 'signal',
          optimizeSignal: true,
        });

        totalOriginal += original.code.length;
        totalOptimized += optimized.code.length;
      }

      const reduction = ((totalOriginal - totalOptimized) / totalOriginal) * 100;
      console.log(`Code size reduction: ${reduction.toFixed(1)}%`);
      console.log(`Original: ${totalOriginal} bytes, Optimized: ${totalOptimized} bytes`);

      // 目标：至少 30% 的体积减少
      expect(reduction).toBeGreaterThanOrEqual(30);
    });
  });
});
