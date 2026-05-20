/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
import { describe, it, expect } from 'vitest';
import { tokenize, buildAST, parseInterpolation } from '../../src/wasm/wasm-parser';
import type { ASTNode } from '../../src/wasm/wasm-compiler';

describe('tokenize', () => {
  it('should tokenize a simple element', () => {
    const tokens = tokenize('<div></div>');
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens.some((t) => t.type === 'tag-open')).toBe(true);
    expect(tokens.some((t) => t.type === 'tag-close')).toBe(true);
  });

  it('should tokenize text content', () => {
    const tokens = tokenize('Hello World');
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens[0].type).toBe('text');
    expect(tokens[0].value).toBe('Hello World');
  });

  it('should tokenize interpolation', () => {
    const tokens = tokenize('{{ message }}');
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens.some((t) => t.type === 'interpolation')).toBe(true);
  });

  it('should tokenize attributes', () => {
    const tokens = tokenize('<div class="app" id="root"></div>');
    expect(tokens.some((t) => t.type === 'attr-name')).toBe(true);
    expect(tokens.some((t) => t.type === 'attr-value')).toBe(true);
  });

  it('should tokenize comments', () => {
    const tokens = tokenize('<!-- comment --><div></div>');
    expect(tokens.some((t) => t.type === 'comment')).toBe(true);
  });

  it('should tokenize self-closing elements', () => {
    const tokens = tokenize('<input type="text" />');
    expect(tokens.some((t) => t.type === 'tag-open')).toBe(true);
  });

  it('should handle empty input', () => {
    const tokens = tokenize('');
    expect(tokens).toEqual([]);
  });

  it('should tokenize mixed content', () => {
    const tokens = tokenize('<div>Hello {{ name }}!</div>');
    expect(tokens.some((t) => t.type === 'tag-open')).toBe(true);
    expect(tokens.some((t) => t.type === 'text')).toBe(true);
    expect(tokens.some((t) => t.type === 'interpolation')).toBe(true);
  });
});

describe('buildAST', () => {
  it('should build AST from simple template', () => {
    const ast = buildAST('<div>Hello</div>');
    expect(ast).toBeDefined();
    expect(ast.length).toBeGreaterThan(0);
    expect(ast[0].type).toBe('Element');
    expect(ast[0].tag).toBe('div');
  });

  it('should build AST with nested elements', () => {
    const ast = buildAST('<div><span>text</span></div>');
    const div = ast[0] as ASTNode;
    expect(div.children).toBeDefined();
    expect(div.children!.length).toBeGreaterThan(0);
    expect(div.children![0].type).toBe('Element');
    expect(div.children![0].tag).toBe('span');
  });

  it('should build AST with interpolation', () => {
    const ast = buildAST('{{ message }}');
    expect(ast[0].type).toBe('Interpolation');
    expect(ast[0].content).toBe('message');
  });

  it('should build AST with text', () => {
    const ast = buildAST('plain text');
    expect(ast[0].type).toBe('Text');
    expect(ast[0].content).toContain('plain text');
  });

  it('should handle empty template', () => {
    const ast = buildAST('');
    expect(ast).toEqual([]);
  });
});

describe('parseInterpolation', () => {
  it('should parse simple interpolation', () => {
    expect(parseInterpolation('{{ message }}')).toBe('message');
  });

  it('should parse expression interpolation', () => {
    expect(parseInterpolation('{{ a + b }}')).toBe('a + b');
  });

  it('should return null for non-interpolation', () => {
    expect(parseInterpolation('hello')).toBeNull();
  });

  it('should return null for empty interpolation', () => {
    expect(parseInterpolation('{{ }}')).toBeNull();
  });

  it('should handle interpolation with extra whitespace', () => {
    expect(parseInterpolation('  {{  count  }}  ')).toBe('count');
  });

  it('should return null for unclosed interpolation', () => {
    expect(parseInterpolation('{{ message')).toBeNull();
  });
});
