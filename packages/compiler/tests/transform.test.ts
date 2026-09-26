// tests/transform.test.ts
// Transform tests

import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser';
import { transform, builtInTransforms, builtInDirectiveTransforms } from '../src/transform';
import { NodeTypes } from '../src/constants';
import type { ElementNode, JSConditionalExpression } from '../src/types';

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
    it('静态元素应被静态提升为 _hoisted_N 引用（而非内联 VNodeCall）', () => {
      // 2026-09-26 修复：此前 hoistStatic 在 root.codegenNode 构建之后执行，
      // 而单根场景 root.codegenNode 持有的是**旧对象引用** ⇒ 提升不反映到产物，
      // render 里重造整棵静态子树、`_hoisted_N` 声明成为纯开销。
      // 现在提升在构建根 codegenNode 之前完成，元素被替换为对常量的引用。
      const ast = transformTemplate('<div></div>');
      const element = ast.children[0] as ElementNode;
      expect(element.codegenNode).toBeDefined();
      expect(element.codegenNode!.type).toBe(NodeTypes.SIMPLE_EXPRESSION);
      expect((element.codegenNode as unknown as { content: string }).content).toBe('_hoisted_1');
      // 模块级提升表里应有对应声明，供 codegen 生成 `const _hoisted_1 = …`
      expect(ast.hoists.length).toBe(1);
    });

    it('含动态内容的元素应生成 VNodeCall（不被提升）', () => {
      const ast = transformTemplate('<div>{{ msg }}</div>');
      const element = ast.children[0] as ElementNode;
      expect(element.codegenNode).toBeDefined();
      expect(element.codegenNode!.type).toBe(NodeTypes.VNODE_CALL);
    });

    it('should set tag in VNodeCall', () => {
      const ast = transformTemplate('<span :class="cls"></span>');
      const element = ast.children[0] as ElementNode;
      const vnode = element.codegenNode!;
      expect(vnode.type).toBe(NodeTypes.VNODE_CALL);
      expect(vnode.tag).toBe('"span"');
    });

    it('should handle static attributes', () => {
      const ast = transformTemplate('<div id="app" :class="cls"></div>');
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
