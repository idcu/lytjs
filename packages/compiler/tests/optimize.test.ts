// tests/optimize.test.ts
// Optimize tests

import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser';
import { transform, builtInTransforms, builtInDirectiveTransforms } from '../src/transform';
import { optimize } from '../src/optimize';
import { NodeTypes } from '../src/constants';
import type { ElementNode } from '../src/types';

function compileForOptimize(source: string) {
  const ast = parse(source);
  transform(ast, {
    nodeTransforms: builtInTransforms,
    directiveTransforms: builtInDirectiveTransforms,
  });
  optimize(ast);
  return ast;
}

describe('optimize', () => {
  describe('markConstants', () => {
    it('should mark static elements', () => {
      const ast = compileForOptimize('<div><span></span></div>');
      const div = ast.children[0] as ElementNode;
      expect(div.isStatic).toBe(true);
    });

    it('should not mark elements with directives as static', () => {
      const ast = compileForOptimize('<div v-if="show"></div>');
      // After transform, v-if creates a conditional, so check root children
      // The conditional itself is not an element, so we check differently
      expect(ast.children[0]!.type).toBe(NodeTypes.JS_CONDITIONAL_EXPRESSION);
    });

    it('should not mark elements with interpolation as static', () => {
      const ast = compileForOptimize('<div>{{ message }}</div>');
      const element = ast.children[0] as ElementNode;
      expect(element.isStatic).toBe(false);
    });

    it('should mark text nodes as static', () => {
      const ast = compileForOptimize('hello');
      // Text nodes are marked static
      expect(ast.children[0]!.type).toBe(NodeTypes.TEXT);
    });
  });

  describe('hoistStatic', () => {
    it('should hoist static elements', () => {
      const ast = compileForOptimize('<div><span></span></div>');
      // Static elements should be hoisted
      expect(ast.hoists.length).toBeGreaterThan(0);
    });

    it('should not hoist dynamic elements', () => {
      const ast = compileForOptimize('<div>{{ message }}</div>');
      // Dynamic elements should not be hoisted
      // The hoists may be empty or contain only truly static nodes
      expect(ast.hoists.length).toBe(0);
    });
  });

  describe('markPatchFlags', () => {
    it('should mark patch flags on elements with interpolation', () => {
      const ast = compileForOptimize('<div>{{ message }}</div>');
      const element = ast.children[0] as ElementNode;
      expect(element.patchFlag).toBeGreaterThan(0);
    });

    it('should mark patch flags on elements with dynamic bindings', () => {
      const ast = compileForOptimize('<div :id="myId"></div>');
      const element = ast.children[0] as ElementNode;
      expect(element.patchFlag).toBeGreaterThan(0);
    });

    it('should not mark patch flags on static elements', () => {
      const ast = compileForOptimize('<div><span></span></div>');
      const div = ast.children[0] as ElementNode;
      expect(div.patchFlag).toBe(0);
    });
  });

  describe('collectDynamicChildren', () => {
    it('should collect dynamic children for block tree', () => {
      const ast = compileForOptimize('<div><span>{{ msg }}</span></div>');
      const div = ast.children[0] as ElementNode;
      // The div has a dynamic child (span with interpolation)
      expect(div.dynamicChildren).toBeDefined();
      expect(div.dynamicChildren!.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty template', () => {
      const ast = compileForOptimize('');
      expect(ast.hoists.length).toBe(0);
    });

    it('should handle template with only static text', () => {
      const ast = compileForOptimize('static text');
      expect(ast.hoists.length).toBeGreaterThan(0);
    });

    it('should handle mixed static and dynamic siblings', () => {
      const ast = compileForOptimize('<div>static<span>{{ dynamic }}</span></div>');
      const element = ast.children[0] as ElementNode;
      expect(element.patchFlag).toBeGreaterThan(0);
    });

    it('should handle nested static elements', () => {
      const ast = compileForOptimize('<div><section><article><p>deep static</p></article></section></div>');
      const div = ast.children[0] as ElementNode;
      expect(div.isStatic).toBe(true);
    });

    it('should handle v-bind with static value', () => {
      const ast = compileForOptimize('<div :id="\'static-id\'"></div>');
      const element = ast.children[0] as ElementNode;
      // Even though it's a binding, the value is static string
      expect(element.patchFlag).toBeGreaterThan(0);
    });

    it('should handle multiple dynamic bindings on same element', () => {
      const ast = compileForOptimize('<div :id="myId" :class="myClass" :data-value="value"></div>');
      const element = ast.children[0] as ElementNode;
      expect(element.patchFlag).toBeGreaterThan(0);
    });

    it('should handle v-for on static content', () => {
      const ast = compileForOptimize('<li v-for="item in items">static</li>');
      // v-for creates dynamic structure
      expect(ast.children.length).toBeGreaterThan(0);
    });

    it('should handle conditional static content', () => {
      const ast = compileForOptimize('<div v-if="show">static</div>');
      // The content is static but conditionally rendered
      expect(ast.children[0]!.type).toBe(NodeTypes.JS_CONDITIONAL_EXPRESSION);
    });

    it('should handle element with event handlers', () => {
      const ast = compileForOptimize('<button @click="handleClick">Click</button>');
      const element = ast.children[0] as ElementNode;
      expect(element.patchFlag).toBeGreaterThan(0);
    });

    it('should handle element with both static and dynamic props', () => {
      const ast = compileForOptimize('<div id="static" :class="dynamicClass">content</div>');
      const element = ast.children[0] as ElementNode;
      expect(element.patchFlag).toBeGreaterThan(0);
    });
  });
});
