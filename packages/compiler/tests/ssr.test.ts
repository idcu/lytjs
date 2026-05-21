// tests/ssr.test.ts
// SSR 编译模式测试

import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';

describe('SSR Compilation Mode', () => {
  describe('compile with ssrMode', () => {
    it('应该在 ssrMode 下生成 renderToString 格式的代码', () => {
      const result = compile('<div>Hello</div>', { ssrMode: true });
      expect(result.code).toContain('function render(_ctx)');
      expect(result.code).toContain('renderToString');
    });

    it('应该在 SSR 模式下保留静态文本', () => {
      const result = compile('<div>Hello World</div>', { ssrMode: true });
      expect(result.code).toContain('Hello World');
    });

    it('应该在 SSR 模式下保留插值表达式', () => {
      const result = compile('<div>{{ message }}</div>', { ssrMode: true });
      expect(result.code).toContain('String(message)');
    });

    it('应该在 SSR 模式下保留 v-bind 指令', () => {
      const result = compile('<div :id="myId"></div>', { ssrMode: true });
      expect(result.code).toContain('id');
      expect(result.code).toContain('myId');
    });

    it('应该在 SSR 模式下保留 v-if 指令', () => {
      const result = compile('<div v-if="show">content</div>', { ssrMode: true });
      expect(result.code).toContain('show');
    });

    it('应该在 SSR 模式下保留 v-for 指令', () => {
      const result = compile('<li v-for="item in items">{{ item }}</li>', { ssrMode: true });
      expect(result.code).toContain('items');
    });
  });

  describe('SSR 模式下跳过客户端指令', () => {
    it('应该在 SSR 模式下跳过 v-on 指令', () => {
      const result = compile('<div @click="handleClick">text</div>', { ssrMode: true });
      // v-on should not generate event binding code in SSR
      expect(result.code).not.toContain('onClick');
      expect(result.code).not.toContain('handleClick');
    });

    it('应该在 SSR 模式下跳过 v-model 指令', () => {
      const result = compile('<input v-model="message">', { ssrMode: true });
      // v-model should not generate modelValue/onUpdate in SSR
      expect(result.code).not.toContain('modelValue');
      expect(result.code).not.toContain('onUpdate:modelValue');
    });

    it('应该在 SSR 模式下跳过 v-show 指令', () => {
      const result = compile('<div v-show="visible">content</div>', { ssrMode: true });
      // v-show should not generate style display:none logic in SSR
      expect(result.code).not.toContain("'none'");
    });
  });

  describe('SSR 模式下保留 SSR 相关指令', () => {
    it('应该在 SSR 模式下保留 v-html', () => {
      const result = compile('<div v-html="htmlContent"></div>', { ssrMode: true });
      expect(result.code).toContain('htmlContent');
    });

    it('应该在 SSR 模式下保留 v-text', () => {
      const result = compile('<div v-text="textContent"></div>', { ssrMode: true });
      // v-text in SSR should still render the text
      expect(result.code).toContain('textContent');
    });
  });

  describe('SSR 模式下生成正确的 HTML 结构', () => {
    it('应该生成正确的开始和结束标签', () => {
      const result = compile('<span>text</span>', { ssrMode: true });
      expect(result.code).toContain('<span');
      expect(result.code).toContain('</span>');
    });

    it('应该处理自闭合标签', () => {
      const result = compile('<br>', { ssrMode: true });
      expect(result.code).toContain('<br');
      expect(result.code).not.toContain('</br>');
    });

    it('应该处理嵌套元素', () => {
      const result = compile('<div><span>nested</span></div>', { ssrMode: true });
      expect(result.code).toContain('<div');
      expect(result.code).toContain('<span');
      expect(result.code).toContain('nested');
      expect(result.code).toContain('</span>');
      expect(result.code).toContain('</div>');
    });

    it('应该处理属性', () => {
      const result = compile('<div id="app" class="container">text</div>', { ssrMode: true });
      expect(result.code).toContain('id="app"');
      expect(result.code).toContain('class="container"');
    });
  });

  describe('SSR 与非 SSR 模式对比', () => {
    it('SSR 模式应该生成不同于客户端模式的代码', () => {
      const ssrResult = compile('<div @click="handler">text</div>', { ssrMode: true });
      const clientResult = compile('<div @click="handler">text</div>');

      // SSR should not contain VNode creation
      expect(ssrResult.code).not.toContain('createElementVNode');
      // Client should contain VNode creation (createBlock for elements with dynamic bindings)
      expect(clientResult.code).toContain('createBlock');
    });

    it('SSR 模式应该包含 renderToString 辅助函数', () => {
      const result = compile('<div>text</div>', { ssrMode: true });
      expect(result.code).toContain('function renderToString');
    });
  });
});
