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
      // 断言两个分支的**内容**都出现 —— 只断言 `?` / `:` 等于没断言
      //（任何三元都有这两个字符，"整条链丢分支"的 bug 曾因此潜伏）
      expect(result.code).toContain('A');
      expect(result.code).toContain('B');
      expect(result.code).toContain('_ctx.a');
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
      // 空白模板 → 渲染函数体为空，且不应产生任何元素
      expect(result.code).toContain('function render');
      expect(result.code).not.toContain('createElementVNode');
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
      // 三个分支的内容都必须出现（回归：丢分支的 bug 只影响 v-else-if 链）
      expect(result.code).toContain('A');
      expect(result.code).toContain('B');
      expect(result.code).toContain('C');
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
      // 注释必须**不进入**产物，但宿主元素仍在
      expect(result.code).not.toContain('comment');
      expect(result.code).toContain('createElementVNode("div"');
    });

    it('should handle mixed v-bind and v-on', () => {
      const result = compile('<input :value="val" @input="onInput">');
      expect(result.code).toContain('value');
      expect(result.code).toContain('onInput');
    });

    it('should keep v-pre subtree as literals (skip compilation)', () => {
      const result = compile('<div v-pre>{{ raw }}</div>');
      // v-pre 的语义是**跳过编译**：插值必须原样保留为文本字面量。
      // 此前该测试只断言 `toBeDefined()`，掩盖了 v-pre **完全未实现**
      //（插值被照常编译成 toDisplayString(_ctx.raw)）。
      expect(result.code).toContain('"{{ raw }}"');
      expect(result.code).not.toContain('toDisplayString(_ctx.raw)');
    });

    it('should keep v-pre applied to nested subtrees', () => {
      const result = compile('<div v-pre><span>{{ raw }}</span></div>');
      expect(result.code).toContain('"{{ raw }}"');
      expect(result.code).not.toContain('toDisplayString(_ctx.raw)');
    });

    it('should hoist v-once subtree (KNOWN ISSUE: constant references _ctx)', () => {
      const result = compile('<div v-once>{{ message }}</div>');
      // v-once 的目标语义：只渲染一次（当前实现走"提升为模块级常量"）
      expect(result.code).toContain('_hoisted_1');
      expect(result.code).toContain('return _ctx._hoisted_1');
      // ⚠️ 已知缺陷（本轮审计发现，**未修**）：
      //   1) 提升出的常量体仍引用 `_ctx.message`，而常量在**模块级作用域**求值
      //      ⇒ 运行时会抛 `_ctx is not defined`；
      //   2) render 用 `_ctx._hoisted_1` 访问模块级常量，访问路径同样不对。
      //   正确做法应在 render 内用闭包变量做一次性缓存。
      //   这里如实锁定现状（而非"断言它没问题"），把它变成**可见的**待办。
      expect(result.code).toMatch(/const _hoisted_1 = [\s\S]*?_ctx\.message/);
    });

    it('should strip v-cloak but keep compiling the subtree', () => {
      const result = compile('<div v-cloak>{{ message }}</div>');
      // v-cloak 只用于初始渲染前的 CSS 隐藏，编译后**必须从产物中消失**，
      // 但子树照常编译
      expect(result.code).not.toContain('v-cloak');
      expect(result.code).toContain('toDisplayString(_ctx.message)');
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
