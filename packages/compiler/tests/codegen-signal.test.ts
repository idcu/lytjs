// tests/codegen-signal.test.ts
// Signal 模式代码生成测试

import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';

describe('codegen-signal', () => {
  // ============================================================
  // 静态元素
  // ============================================================

  describe('static elements', () => {
    it('should generate createTemplate for static elements', () => {
      const result = compile('<div></div>', { mode: 'signal' });
      expect(result.code).toContain('createTemplate');
      expect(result.code).toContain('<div></div>');
    });

    it('should generate createTemplate with static attributes', () => {
      const result = compile('<div class="app"><h1>Title</h1><p></p></div>', { mode: 'signal' });
      expect(result.code).toContain('createTemplate');
      expect(result.code).toContain('class="app"');
      expect(result.code).toMatch(/const\s+_\w+\s*=\s*createTemplate/);
    });

    it('should destructure child elements', () => {
      const result = compile('<div><h1></h1><p></p></div>', { mode: 'signal' });
      expect(result.code).toMatch(/const\s+\[_h1,\s*_p\]/);
    });

    it('should generate insert call', () => {
      const result = compile('<div></div>', { mode: 'signal' });
      expect(result.code).toContain('insert(');
      expect(result.code).toContain('_container');
    });

    it('should import from @lytjs/reactivity and @lytjs/dom-runtime', () => {
      const result = compile('<div></div>', { mode: 'signal' });
      expect(result.code).toContain("@lytjs/reactivity");
      expect(result.code).toContain("@lytjs/dom-runtime");
    });

    it('should generate render function with _ctx and _container params', () => {
      const result = compile('<div></div>', { mode: 'signal' });
      expect(result.code).toMatch(/export\s+function\s+render\s*\(\s*_ctx\s*,\s*_container\s*\)/);
    });

    it('should generate onCleanup', () => {
      const result = compile('<div></div>', { mode: 'signal' });
      expect(result.code).toContain('onCleanup(');
      expect(result.code).toContain('.remove()');
    });
  });

  // ============================================================
  // v-if
  // ============================================================

  describe('v-if', () => {
    it('should generate if statement with effect for v-if', () => {
      const result = compile('<p v-if="show">hello</p>', { mode: 'signal' });
      expect(result.code).toContain('effect(() => {');
      expect(result.code).toContain('if (_ctx.show)');
      expect(result.code).toContain("style.display = ''");
      expect(result.code).toContain("style.display = 'none'");
    });

    it('should generate setText inside v-if when interpolation is present', () => {
      const result = compile('<p v-if="show">{{ message }}</p>', { mode: 'signal' });
      expect(result.code).toContain('effect(() => {');
      expect(result.code).toContain('if (_ctx.show)');
      expect(result.code).toContain('setText(');
      expect(result.code).toContain('_ctx.message');
    });
  });

  // ============================================================
  // v-for
  // ============================================================

  describe('v-for', () => {
    it('should generate reconcileArray for v-for', () => {
      const result = compile('<li v-for="item in items">{{ item.name }}</li>', { mode: 'signal' });
      expect(result.code).toContain('reconcileArray');
      expect(result.code).toContain('_ctx.items');
      expect(result.code).toContain('key:');
      expect(result.code).toContain('create:');
    });

    it('should generate document.createElement inside create callback', () => {
      const result = compile('<li v-for="item in items">{{ item.name }}</li>', { mode: 'signal' });
      expect(result.code).toContain('document.createElement');
    });

    it('should generate setText inside create callback', () => {
      const result = compile('<li v-for="item in items">{{ item.name }}</li>', { mode: 'signal' });
      expect(result.code).toContain('setText');
    });
  });

  // ============================================================
  // v-bind
  // ============================================================

  describe('v-bind', () => {
    it('should generate setClass for :class binding', () => {
      const result = compile('<div :class="cls"></div>', { mode: 'signal' });
      expect(result.code).toContain('setClass');
      expect(result.code).toContain('_ctx.cls');
    });

    it('should generate setStyle for :style binding', () => {
      const result = compile('<div :style="sty"></div>', { mode: 'signal' });
      expect(result.code).toContain('setStyle');
      expect(result.code).toContain('_ctx.sty');
    });

    it('should generate setAttribute for other :attr bindings', () => {
      const result = compile('<div :id="myId"></div>', { mode: 'signal' });
      expect(result.code).toContain("setAttribute(");
      expect(result.code).toContain("'id'");
      expect(result.code).toContain('_ctx.myId');
    });

    it('should generate effect wrapper for v-bind', () => {
      const result = compile('<div :class="cls"></div>', { mode: 'signal' });
      expect(result.code).toContain('effect(() => setClass(');
    });
  });

  // ============================================================
  // v-on
  // ============================================================

  describe('v-on', () => {
    it('should generate addEventListener for @click', () => {
      const result = compile('<button @click="submit"></button>', { mode: 'signal' });
      expect(result.code).toContain("addEventListener('click'");
      expect(result.code).toContain('_ctx.submit');
    });

    it('should generate createEventHandler for modifiers', () => {
      const result = compile('<button @click.stop="handleStop"></button>', { mode: 'signal' });
      expect(result.code).toContain('createEventHandler');
      expect(result.code).toContain("'click'");
      expect(result.code).toContain('stop: true');
    });
  });

  // ============================================================
  // v-model
  // ============================================================

  describe('v-model', () => {
    it('should generate value effect for v-model', () => {
      const result = compile('<input v-model="text" />', { mode: 'signal' });
      expect(result.code).toContain('effect(() => {');
      expect(result.code).toContain('.value = _ctx.text');
    });

    it('should generate input event listener for v-model', () => {
      const result = compile('<input v-model="text" />', { mode: 'signal' });
      expect(result.code).toContain("addEventListener('input'");
      expect(result.code).toContain('$e.target.value');
      expect(result.code).toContain('_ctx.text = ');
    });
  });

  // ============================================================
  // v-show
  // ============================================================

  describe('v-show', () => {
    it('should generate style.display effect for v-show', () => {
      const result = compile('<div v-show="visible">content</div>', { mode: 'signal' });
      expect(result.code).toContain('effect(() => {');
      expect(result.code).toContain('style.display');
      expect(result.code).toContain("_ctx.visible ? '' : 'none'");
    });
  });

  // ============================================================
  // v-text
  // ============================================================

  describe('v-text', () => {
    it('should generate setText effect for v-text', () => {
      const result = compile('<div v-text="content"></div>', { mode: 'signal' });
      expect(result.code).toContain('effect(() => setText(');
      expect(result.code).toContain('_ctx.content');
    });
  });

  // ============================================================
  // v-html
  // ============================================================

  describe('v-html', () => {
    it('should generate setHTML effect for v-html', () => {
      const result = compile('<div v-html="htmlContent"></div>', { mode: 'signal' });
      expect(result.code).toContain('effect(() => setHTML(');
      expect(result.code).toContain('_ctx.htmlContent');
    });
  });

  // ============================================================
  // 插值 {{ }}
  // ============================================================

  describe('interpolation', () => {
    it('should generate setText with effect for interpolation', () => {
      const result = compile('<span>{{ message }}</span>', { mode: 'signal' });
      expect(result.code).toContain('effect(() => setText(');
      expect(result.code).toContain('_ctx.message');
    });
  });

  // ============================================================
  // 综合测试
  // ============================================================

  describe('comprehensive template', () => {
    it('should generate complete render function for complex template', () => {
      const result = compile(
        `<div class="app">
          <h1>{{ title }}</h1>
          <p v-if="show">{{ message }}</p>
          <ul>
            <li v-for="item in items">{{ item.name }}</li>
          </ul>
          <input v-model="text" />
          <button @click="submit">Submit</button>
        </div>`,
        { mode: 'signal' },
      );

      // 基本结构
      expect(result.code).toContain('export function render(_ctx, _container)');
      expect(result.code).toContain('createTemplate');
      expect(result.code).toContain('insert(');

      // 动态绑定
      expect(result.code).toContain('effect(() => setText(');   // 插值
      expect(result.code).toContain('if (_ctx.show)');           // v-if
      expect(result.code).toContain('reconcileArray');           // v-for
      expect(result.code).toContain('.value = _ctx.text');       // v-model
      expect(result.code).toContain("addEventListener('click'"); // v-on

      // 清理
      expect(result.code).toContain('onCleanup(');
    });

    it('should return CodegenResult with code and ast', () => {
      const result = compile('<div></div>', { mode: 'signal' });
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('ast');
      expect(result.code).toBeTruthy();
      expect(result.ast).toBeTruthy();
    });
  });
});
