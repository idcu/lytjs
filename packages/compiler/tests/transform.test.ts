// tests/transform.test.ts
// Transform tests

import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser';
import { transform, builtInTransforms, builtInDirectiveTransforms } from '../src/transform';
import { NodeTypes, ElementTypes } from '../src/constants';
import type { RootNode, ElementNode, JSConditionalExpression } from '../src/types';

function transformTemplate(source: string) {
  const ast = parse(source);
  transform(ast, {
    nodeTransforms: builtInTransforms,
    directiveTransforms: builtInDirectiveTransforms,
  });
  return ast;
}

describe('transform', () => {
  describe('transformElement', () => {
    it('should create VNodeCall for element', () => {
      const ast = transformTemplate('<div></div>');
      const element = ast.children[0] as ElementNode;
      expect(element.codegenNode).toBeDefined();
      expect(element.codegenNode!.type).toBe(NodeTypes.VNODE_CALL);
    });

    it('should set tag in VNodeCall', () => {
      const ast = transformTemplate('<span></span>');
      const element = ast.children[0] as ElementNode;
      const vnode = element.codegenNode!;
      expect(vnode.type).toBe(NodeTypes.VNODE_CALL);
      expect(vnode.tag).toBe('"span"');
    });

    it('should handle static attributes', () => {
      const ast = transformTemplate('<div id="app"></div>');
      const element = ast.children[0] as ElementNode;
      const vnode = element.codegenNode!;
      expect(vnode.type).toBe(NodeTypes.VNODE_CALL);
      expect(vnode.props).toBeDefined();
      expect(vnode.props!.type).toBe(NodeTypes.JS_OBJECT_EXPRESSION);
    });

    it('should handle v-bind directive', () => {
      const ast = transformTemplate('<div :id="myId"></div>');
      const element = ast.children[0] as ElementNode;
      const vnode = element.codegenNode!;
      expect(vnode.type).toBe(NodeTypes.VNODE_CALL);
      expect(vnode.props).toBeDefined();
    });

    it('should handle v-on directive', () => {
      const ast = transformTemplate('<div @click="handleClick"></div>');
      const element = ast.children[0] as ElementNode;
      const vnode = element.codegenNode!;
      expect(vnode.type).toBe(NodeTypes.VNODE_CALL);
      expect(vnode.props).toBeDefined();
    });
  });

  describe('transformIf', () => {
    it('should create conditional expression for v-if', () => {
      const ast = transformTemplate('<div v-if="show"></div>');
      const conditional = ast.children[0] as JSConditionalExpression;
      expect(conditional.type).toBe(NodeTypes.JS_CONDITIONAL_EXPRESSION);
    });

    it('should merge v-if/v-else-if/v-else into one conditional', () => {
      const ast = transformTemplate(
        '<div v-if="a"></div><div v-else-if="b"></div><div v-else></div>',
      );
      // The three elements should be merged into one conditional node
      expect(ast.children.length).toBe(1);
      expect(ast.children[0]!.type).toBe(NodeTypes.JS_CONDITIONAL_EXPRESSION);
    });
  });

  describe('transformFor', () => {
    it('should create renderList call for v-for', () => {
      const ast = transformTemplate('<li v-for="item in items"></li>');
      // The v-for element should be replaced with a renderList call
      expect(ast.children[0]!.type).toBe(NodeTypes.JS_CALL_EXPRESSION);
    });
  });

  describe('helpers and metadata', () => {
    it('should populate helpers on root', () => {
      const ast = transformTemplate('<div></div>');
      expect(ast.helpers.length).toBeGreaterThan(0);
    });

    it('should register component tags', () => {
      const ast = transformTemplate('<MyComponent></MyComponent>');
      expect(ast.components).toContain('MyComponent');
    });

    it('should register custom directives', () => {
      const ast = transformTemplate('<div v-custom="arg"></div>');
      expect(ast.directives).toContain('custom');
    });
  });

  describe('interpolation', () => {
    it('should handle interpolation in children', () => {
      const ast = transformTemplate('<div>{{ message }}</div>');
      const element = ast.children[0] as ElementNode;
      const vnode = element.codegenNode!;
      expect(vnode.type).toBe(NodeTypes.VNODE_CALL);
      // Children should reference toDisplayString
      expect(ast.helpers).toContain('TO_DISPLAY_STRING');
    });

    it('should handle text and interpolation mix', () => {
      const ast = transformTemplate('<div>Hello {{ name }}!</div>');
      const element = ast.children[0] as ElementNode;
      expect(element.codegenNode).toBeDefined();
    });
  });

  describe('v-model', () => {
    it('should handle v-model directive', () => {
      const ast = transformTemplate('<input v-model="message">');
      const element = ast.children[0] as ElementNode;
      const vnode = element.codegenNode!;
      expect(vnode.type).toBe(NodeTypes.VNODE_CALL);
      expect(vnode.props).toBeDefined();
    });
  });

  describe('v-show', () => {
    it('should handle v-show directive', () => {
      const ast = transformTemplate('<div v-show="visible"></div>');
      const element = ast.children[0] as ElementNode;
      const vnode = element.codegenNode!;
      expect(vnode.type).toBe(NodeTypes.VNODE_CALL);
      expect(vnode.props).toBeDefined();
    });
  });
});
