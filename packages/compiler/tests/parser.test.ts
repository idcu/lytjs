// tests/parser.test.ts
// Parser tests

import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser';
import { NodeTypes, ElementTypes } from '../src/constants';
import type { ElementNode, RootNode, TextNode, InterpolationNode, CommentNode, DirectiveNode, AttributeNode } from '../src/types';

describe('parser', () => {
  describe('basic parsing', () => {
    it('should parse empty template', () => {
      const ast = parse('');
      expect(ast.type).toBe(NodeTypes.ROOT);
      expect(ast.children.length).toBe(0);
    });

    it('should parse simple text', () => {
      const ast = parse('hello world');
      expect(ast.children.length).toBe(1);
      const text = ast.children[0] as TextNode;
      expect(text.type).toBe(NodeTypes.TEXT);
      expect(text.content).toBe('hello world');
    });

    it('should parse simple element', () => {
      const ast = parse('<div></div>');
      expect(ast.children.length).toBe(1);
      const element = ast.children[0] as ElementNode;
      expect(element.type).toBe(NodeTypes.ELEMENT);
      expect(element.tag).toBe('div');
    });

    it('should parse self-closing element', () => {
      const ast = parse('<br />');
      expect(ast.children.length).toBe(1);
      const element = ast.children[0] as ElementNode;
      expect(element.type).toBe(NodeTypes.ELEMENT);
      expect(element.tag).toBe('br');
      expect(element.isSelfClosing).toBe(true);
    });

    it('should parse element with text content', () => {
      const ast = parse('<p>Hello</p>');
      expect(ast.children.length).toBe(1);
      const element = ast.children[0] as ElementNode;
      expect(element.tag).toBe('p');
      expect(element.children.length).toBe(1);
      const text = element.children[0] as TextNode;
      expect(text.type).toBe(NodeTypes.TEXT);
      expect(text.content).toBe('Hello');
    });
  });

  describe('nested elements', () => {
    it('should parse nested elements', () => {
      const ast = parse('<div><span></span></div>');
      expect(ast.children.length).toBe(1);
      const div = ast.children[0] as ElementNode;
      expect(div.tag).toBe('div');
      expect(div.children.length).toBe(1);
      const span = div.children[0] as ElementNode;
      expect(span.tag).toBe('span');
    });

    it('should parse deeply nested elements', () => {
      const ast = parse('<div><ul><li></li></ul></div>');
      const div = ast.children[0] as ElementNode;
      const ul = div.children[0] as ElementNode;
      const li = ul.children[0] as ElementNode;
      expect(li.tag).toBe('li');
    });

    it('should parse sibling elements', () => {
      const ast = parse('<div></div><span></span>');
      expect(ast.children.length).toBe(2);
      expect((ast.children[0] as ElementNode).tag).toBe('div');
      expect((ast.children[1] as ElementNode).tag).toBe('span');
    });
  });

  describe('attributes', () => {
    it('should parse element with attributes', () => {
      const ast = parse('<div id="app" class="container"></div>');
      const element = ast.children[0] as ElementNode;
      expect(element.props.length).toBe(2);
      const id = element.props[0] as AttributeNode;
      expect(id.type).toBe(NodeTypes.ATTRIBUTE);
      expect(id.name).toBe('id');
      expect(id.value?.content).toBe('app');
      const cls = element.props[1] as AttributeNode;
      expect(cls.name).toBe('class');
      expect(cls.value?.content).toBe('container');
    });

    it('should parse boolean attribute', () => {
      const ast = parse('<input disabled>');
      const element = ast.children[0] as ElementNode;
      const disabled = element.props[0] as AttributeNode;
      expect(disabled.name).toBe('disabled');
      expect(disabled.value).toBeUndefined();
    });
  });

  describe('directives', () => {
    it('should parse v-bind directive', () => {
      const ast = parse('<div v-bind:id="myId"></div>');
      const element = ast.children[0] as ElementNode;
      const dir = element.props[0] as DirectiveNode;
      expect(dir.type).toBe(NodeTypes.DIRECTIVE);
      expect(dir.name).toBe('bind');
      expect((dir.arg as any).content).toBe('id');
      expect(dir.exp?.content).toBe('myId');
    });

    it('should parse v-bind shorthand (:prop)', () => {
      const ast = parse('<div :class="className"></div>');
      const element = ast.children[0] as ElementNode;
      const dir = element.props[0] as DirectiveNode;
      expect(dir.type).toBe(NodeTypes.DIRECTIVE);
      expect(dir.name).toBe('bind');
      expect((dir.arg as any).content).toBe('class');
      expect(dir.exp?.content).toBe('className');
    });

    it('should parse v-on directive', () => {
      const ast = parse('<div v-on:click="handleClick"></div>');
      const element = ast.children[0] as ElementNode;
      const dir = element.props[0] as DirectiveNode;
      expect(dir.type).toBe(NodeTypes.DIRECTIVE);
      expect(dir.name).toBe('on');
      expect((dir.arg as any).content).toBe('click');
    });

    it('should parse v-on shorthand (@event)', () => {
      const ast = parse('<div @click="handleClick"></div>');
      const element = ast.children[0] as ElementNode;
      const dir = element.props[0] as DirectiveNode;
      expect(dir.type).toBe(NodeTypes.DIRECTIVE);
      expect(dir.name).toBe('on');
      expect((dir.arg as any).content).toBe('click');
    });

    it('should parse v-if directive', () => {
      const ast = parse('<div v-if="show"></div>');
      const element = ast.children[0] as ElementNode;
      const dir = element.props[0] as DirectiveNode;
      expect(dir.type).toBe(NodeTypes.DIRECTIVE);
      expect(dir.name).toBe('if');
      expect(dir.exp?.content).toBe('show');
    });

    it('should parse v-for directive', () => {
      const ast = parse('<li v-for="item in items"></li>');
      const element = ast.children[0] as ElementNode;
      const dir = element.props[0] as DirectiveNode;
      expect(dir.type).toBe(NodeTypes.DIRECTIVE);
      expect(dir.name).toBe('for');
      expect(dir.exp?.content).toBe('item in items');
    });

    it('should parse v-model directive', () => {
      const ast = parse('<input v-model="message">');
      const element = ast.children[0] as ElementNode;
      const dir = element.props[0] as DirectiveNode;
      expect(dir.type).toBe(NodeTypes.DIRECTIVE);
      expect(dir.name).toBe('model');
      expect(dir.exp?.content).toBe('message');
    });

    it('should parse v-show directive', () => {
      const ast = parse('<div v-show="visible"></div>');
      const element = ast.children[0] as ElementNode;
      const dir = element.props[0] as DirectiveNode;
      expect(dir.type).toBe(NodeTypes.DIRECTIVE);
      expect(dir.name).toBe('show');
    });
  });

  describe('interpolation', () => {
    it('should parse interpolation', () => {
      const ast = parse('{{ message }}');
      expect(ast.children.length).toBe(1);
      const interp = ast.children[0] as InterpolationNode;
      expect(interp.type).toBe(NodeTypes.INTERPOLATION);
      expect(interp.content.type).toBe(NodeTypes.SIMPLE_EXPRESSION);
      expect(interp.content.content).toBe('message');
    });

    it('should parse interpolation inside element', () => {
      const ast = parse('<div>{{ message }}</div>');
      const element = ast.children[0] as ElementNode;
      expect(element.children.length).toBe(1);
      const interp = element.children[0] as InterpolationNode;
      expect(interp.type).toBe(NodeTypes.INTERPOLATION);
      expect(interp.content.content).toBe('message');
    });
  });

  describe('comments', () => {
    it('should parse comments', () => {
      const ast = parse('<!-- comment -->');
      expect(ast.children.length).toBe(1);
      const comment = ast.children[0] as CommentNode;
      expect(comment.type).toBe(NodeTypes.COMMENT);
      expect(comment.content).toBe(' comment ');
    });
  });

  describe('component tags', () => {
    it('should detect component tags (PascalCase)', () => {
      const ast = parse('<MyComponent></MyComponent>');
      const element = ast.children[0] as ElementNode;
      expect(element.tagType).toBe(ElementTypes.COMPONENT);
    });

    it('should detect component tags (kebab-case with hyphen)', () => {
      const ast = parse('<my-component></my-component>');
      const element = ast.children[0] as ElementNode;
      expect(element.tagType).toBe(ElementTypes.COMPONENT);
    });

    it('should detect native element tags', () => {
      const ast = parse('<div></div>');
      const element = ast.children[0] as ElementNode;
      expect(element.tagType).toBe(ElementTypes.ELEMENT);
    });
  });
});
