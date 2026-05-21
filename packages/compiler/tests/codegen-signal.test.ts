// tests/codegen-signal.test.ts
// Signal 模式代码生成测试

import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';

describe('codegen-signal', () => {
  // ============================================================
  // 静态元素
  // ============================================================

  describe('static elements', () => {
    it('should generate template string for static elements', () => {
      const result = compile('<div></div>', { rendererMode: 'signal' });
      expect(result.code).toContain('"<div></div>"');
    });

    it('should generate template with static attributes', () => {
      const result = compile('<div class="app"><h1>Title</h1><p></p></div>', {
        rendererMode: 'signal',
      });
      expect(result.code).toContain('class');
      expect(result.code).toContain('app');
    });

    it('should destructure child elements', () => {
      const result = compile('<div><h1></h1><p></p></div>', { rendererMode: 'signal' });
      expect(result.code).toMatch(/const\[_1,_2\]=_0\.children/);
    });

    it('should generate insert call', () => {
      const result = compile('<div></div>', { rendererMode: 'signal' });
      expect(result.code).toContain('i(');
      expect(result.code).toContain('_n');
    });

    it('should import from @lytjs/reactivity and @lytjs/dom-runtime', () => {
      const result = compile('<div></div>', { rendererMode: 'signal' });
      expect(result.code).toContain('@lytjs/reactivity');
      expect(result.code).toContain('@lytjs/dom-runtime');
    });

    it('should generate render function with _c and _n params', () => {
      const result = compile('<div></div>', { rendererMode: 'signal' });
      expect(result.code).toMatch(/export\s+function\s+render\s*\(\s*_c\s*,\s*_n\s*\)/);
    });

    it('should generate onCleanup', () => {
      const result = compile('<div></div>', { rendererMode: 'signal' });
      expect(result.code).toContain('o(');
      expect(result.code).toContain('.remove()');
    });
  });

  // ============================================================
  // v-if
  // ============================================================

  describe('v-if', () => {
    it('should generate if statement with effect for v-if', () => {
      const result = compile('<p v-if="show">hello</p>', { rendererMode: 'signal' });
      expect(result.code).toContain('e(()=>{');
      expect(result.code).toContain('if(_c.show)');
      expect(result.code).toContain('t(');
      expect(result.code).toContain('i(');
      expect(result.code).toContain('r(');
    });

    it('should show element when v-if condition is true (code level)', () => {
      const result = compile('<p v-if="show">hello</p>', { rendererMode: 'signal' });
      expect(result.code).toContain('t(');
      expect(result.code).toContain('i(');
    });

    it('should hide element when v-if condition is false (code level)', () => {
      const result = compile('<p v-if="show">hello</p>', { rendererMode: 'signal' });
      expect(result.code).toContain('r(');
    });

    it('should generate v-else branch', () => {
      const result = compile('<p v-if="show">A</p><p v-else>B</p>', { rendererMode: 'signal' });
      expect(result.code).toContain('if(_c.show)');
      expect(result.code).toContain('else');
      expect(result.code).toContain('e(()=>{');
    });

    it('should generate v-else-if chain', () => {
      const result = compile(
        '<p v-if="type === 1">A</p><p v-else-if="type === 2">B</p><p v-else>C</p>',
        { rendererMode: 'signal' },
      );
      expect(result.code).toContain('if(_c.');
      expect(result.code).toContain('else');
      expect(result.code).toContain('e(()=>{');
    });

    it('should generate nested v-if (outer condition)', () => {
      const result = compile('<div v-if="outer"><span v-if="inner">nested</span></div>', {
        rendererMode: 'signal',
      });
      expect(result.code).toContain('if(_c.outer)');
      expect(result.code).toContain('e(()=>{');
    });

    it('should generate setText inside v-if when interpolation is present', () => {
      const result = compile('<p v-if="show">{{ message }}</p>', { rendererMode: 'signal' });
      expect(result.code).toContain('e(()=>{');
      expect(result.code).toContain('if(_c.show)');
    });
  });

  // ============================================================
  // v-for
  // ============================================================

  describe('v-for', () => {
    it('should generate reconcileArray for v-for', () => {
      const result = compile('<li v-for="item in items">{{ item.name }}</li>', {
        rendererMode: 'signal',
      });
      expect(result.code).toContain('n(');
      expect(result.code).toContain('_c.items');
      expect(result.code).toContain('key:');
      expect(result.code).toContain('create:');
    });

    it('should generate document.createElement inside create callback', () => {
      const result = compile('<li v-for="item in items">{{ item.name }}</li>', {
        rendererMode: 'signal',
      });
      expect(result.code).toContain('document.createElement');
    });

    it('should generate setText inside create callback', () => {
      const result = compile('<li v-for="item in items">{{ item.name }}</li>', {
        rendererMode: 'signal',
      });
      expect(result.code).toContain('document.createElement');
    });
  });

  // ============================================================
  // v-bind
  // ============================================================

  describe('v-bind', () => {
    it('should generate setClass for :class binding', () => {
      const result = compile('<div :class="cls"></div>', { rendererMode: 'signal' });
      expect(result.code).toContain('c(');
    });

    it('should generate setAttribute for :attr binding', () => {
      const result = compile('<div :name="nm"></div>', { rendererMode: 'signal' });
      expect(result.code).toContain('a(');
    });

    it('should generate setAttribute for :prop binding', () => {
      const result = compile('<input :value="val" />', { rendererMode: 'signal' });
      expect(result.code).toContain('a(');
    });
  });

  // ============================================================
  // v-on
  // ============================================================

  describe('v-on', () => {
    it('should generate addEventListener for @click binding', () => {
      const result = compile('<button @click="handleClick">Click</button>', {
        rendererMode: 'signal',
      });
      expect(result.code).toContain('v(');
      expect(result.code).toContain('click');
    });

    it('should generate addEventListener for multiple event handlers', () => {
      const result = compile('<div @mouseenter="onEnter" @mouseleave="onLeave"></div>', {
        rendererMode: 'signal',
      });
      expect(result.code).toContain('v(');
    });

    it('should handle event modifiers', () => {
      const result = compile('<button @click.stop="handleClick">Stop</button>', {
        rendererMode: 'signal',
      });
      expect(result.code).toContain('v(');
    });
  });

  // ============================================================
  // v-model
  // ============================================================

  describe('v-model', () => {
    it('should generate value effect for v-model', () => {
      const result = compile('<input v-model="text" />', { rendererMode: 'signal' });
      expect(result.code).toContain('e(()=>{');
      expect(result.code).toContain('.value=_c.text');
    });

    it('should generate input event listener for v-model', () => {
      const result = compile('<input v-model="text" />', { rendererMode: 'signal' });
      expect(result.code).toContain('v(');
      expect(result.code).toContain('input');
      expect(result.code).toContain('_c.text=');
    });

    it('should generate v-model on textarea', () => {
      const result = compile('<textarea v-model="content"></textarea>', { rendererMode: 'signal' });
      expect(result.code).toContain('e(()=>{');
      expect(result.code).toContain('.value=_c.content');
      expect(result.code).toContain('v(');
    });

    it('should generate v-model on select', () => {
      const result = compile('<select v-model="selected"><option>A</option></select>', {
        rendererMode: 'signal',
      });
      expect(result.code).toContain('e(()=>{');
      expect(result.code).toContain('.value=_c.selected');
      expect(result.code).toContain('v(');
    });

    it('should generate v-model with .lazy modifier', () => {
      const result = compile('<input v-model.lazy="text" />', { rendererMode: 'signal' });
      expect(result.code).toContain('export function render(_c,_n)');
    });

    it('should generate v-model with .number modifier', () => {
      const result = compile('<input v-model.number="count" />', { rendererMode: 'signal' });
      expect(result.code).toContain('export function render(_c,_n)');
    });

    it('should generate v-model with .trim modifier', () => {
      const result = compile('<input v-model.trim="text" />', { rendererMode: 'signal' });
      expect(result.code).toContain('export function render(_c,_n)');
    });

    it('should generate v-model with combined modifiers', () => {
      const result = compile('<input v-model.lazy.number="count" />', { rendererMode: 'signal' });
      expect(result.code).toContain('export function render(_c,_n)');
    });
  });

  // ============================================================
  // v-show
  // ============================================================

  describe('v-show', () => {
    it('should generate style.display effect for v-show', () => {
      const result = compile('<div v-show="visible">content</div>', { rendererMode: 'signal' });
      expect(result.code).toContain('e(()=>{');
      expect(result.code).toContain('style.display');
      expect(result.code).toContain("_c.visible?'':");
    });
  });

  // ============================================================
  // v-text
  // ============================================================

  describe('v-text', () => {
    it('should generate setText effect for v-text', () => {
      const result = compile('<div v-text="content"></div>', { rendererMode: 'signal' });
      expect(result.code).toContain('e(()=>x(');
      expect(result.code).toContain('_c.content');
    });
  });

  // ============================================================
  // v-html
  // ============================================================

  describe('v-html', () => {
    it('should generate setHTML effect for v-html', () => {
      const result = compile('<div v-html="htmlContent"></div>', { rendererMode: 'signal' });
      expect(result.code).toContain('e(()=>h(');
      expect(result.code).toContain('_c.htmlContent');
    });
  });

  // ============================================================
  // 插值 {{ }}
  // ============================================================

  describe('interpolation', () => {
    it('should generate setText with effect for interpolation', () => {
      const result = compile('<span>{{ message }}</span>', { rendererMode: 'signal' });
      expect(result.code).toContain('e(()=>x(');
      expect(result.code).toContain('_c.message');
    });
  });

  // ============================================================
  // 多个 v-if / v-for 组合
  // ============================================================

  describe('v-if and v-for combinations', () => {
    it('should generate both v-if and v-for in the same template', () => {
      const result = compile(
        `<div>
          <p v-if="show">conditional</p>
          <li v-for="item in items">{{ item.name }}</li>
        </div>`,
        { rendererMode: 'signal' },
      );
      expect(result.code).toContain('if(_c.show)');
      expect(result.code).toContain('n(');
      expect(result.code).toContain('_c.items');
      expect(result.code).toContain('e(()=>{');
    });

    it('should generate v-for inside v-if', () => {
      const result = compile(
        '<div v-if="show"><li v-for="item in items">{{ item.name }}</li></div>',
        { rendererMode: 'signal' },
      );
      expect(result.code).toContain('if(_c.show)');
      expect(result.code).toContain('e(()=>{');
    });

    it('should generate v-if inside v-for', () => {
      const result = compile(
        '<ul><li v-for="item in items"><span v-if="item.active">{{ item.name }}</span></li></ul>',
        { rendererMode: 'signal' },
      );
      expect(result.code).toContain('n(');
      expect(result.code).toContain('_c.items');
      expect(result.code).toContain('e(()=>');
    });

    it('should handle multiple v-if blocks on sibling elements', () => {
      const result = compile('<div><p v-if="a">A</p><p v-if="b">B</p><p v-if="c">C</p></div>', {
        rendererMode: 'signal',
      });
      expect(result.code).toContain('if(_c.');
      expect(result.code).toContain('e(()=>');
    });

    it('should handle multiple v-for blocks on sibling elements', () => {
      const result = compile(
        '<div><li v-for="x in listX">{{ x }}</li><li v-for="y in listY">{{ y }}</li></div>',
        { rendererMode: 'signal' },
      );
      expect(result.code).toContain('n(');
      expect(result.code).toContain('_c.listX');
      expect(result.code).toContain('_c.listY');
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
        { rendererMode: 'signal' },
      );

      expect(result.code).toContain('export function render(_c,_n)');
      expect(result.code).toContain('n(');
      expect(result.code).toContain('if(_c.show)');
      expect(result.code).toContain('e(()=>');
    });

    it('should return CodegenResult with code and ast', () => {
      const result = compile('<div></div>', { rendererMode: 'signal' });
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('ast');
      expect(result.code).toBeTruthy();
      expect(result.ast).toBeTruthy();
    });
  });
});
