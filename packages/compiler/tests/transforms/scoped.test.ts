/* eslint-disable @typescript-eslint/no-unused-vars */
// tests/transforms/scoped.test.ts
// transformScoped unit tests

import { describe, it, expect } from 'vitest';
import { transformScoped, hasVDeep, getScopeId } from '../../src/transforms/scoped';
import { NodeTypes } from '../../src/constants';
import type { ElementNode, DirectiveNode, TransformContext } from '../../src/types';
import { createMockContext } from './helpers';
import { createElement, createDirective } from '../../src/ast';

/**
 * Create a mock context with scopeId set.
 * The scopeId is stored directly on the context object (as an extension of TransformContext).
 */
function createScopedContext(scopeId?: string | null): TransformContext {
  const context = createMockContext();
  if (scopeId) {
    (context as TransformContext & { scopeId?: string }).scopeId = scopeId;
  }
  return context;
}

describe('transformScoped', () => {
  describe('scopeId attribute injection', () => {
    it('should add scopeId attribute to element when scopeId is provided', () => {
      const scopeId = 'data-v-abc123';
      const context = createScopedContext(scopeId);
      const node = createElement('div');

      transformScoped(node, context);

      // Should have added a scopeId attribute
      const scopeAttr = node.props.find(
        (p) => p.type === NodeTypes.ATTRIBUTE && p.name === scopeId,
      );
      expect(scopeAttr).toBeDefined();
      expect(scopeAttr!.type).toBe(NodeTypes.ATTRIBUTE);
      expect(scopeAttr!.name).toBe(scopeId);
    });

    it('should set scopeId on the element node', () => {
      const scopeId = 'data-v-test';
      const context = createScopedContext(scopeId);
      const node = createElement('span');

      transformScoped(node, context);

      expect(node.scopeId).toBe(scopeId);
    });

    it('should not modify element when scopeId is not provided', () => {
      const context = createScopedContext();
      const node = createElement('div');
      const originalPropsLength = node.props.length;

      transformScoped(node, context);

      expect(node.props.length).toBe(originalPropsLength);
      expect(node.scopeId).toBeUndefined();
    });

    it('should not modify element when scopeId is null', () => {
      const context = createScopedContext(null);
      const node = createElement('div');
      const originalPropsLength = node.props.length;

      transformScoped(node, context);

      expect(node.props.length).toBe(originalPropsLength);
    });
  });

  describe('multiple elements', () => {
    it('should add scopeId to each element independently', () => {
      const scopeId = 'data-v-multi';
      const context = createScopedContext(scopeId);

      const div = createElement('div');
      const span = createElement('span');
      const p = createElement('p');

      transformScoped(div, context);
      transformScoped(span, context);
      transformScoped(p, context);

      expect(div.scopeId).toBe(scopeId);
      expect(span.scopeId).toBe(scopeId);
      expect(p.scopeId).toBe(scopeId);

      expect(div.props.some((p) => p.type === NodeTypes.ATTRIBUTE && p.name === scopeId)).toBe(
        true,
      );
      expect(span.props.some((p) => p.type === NodeTypes.ATTRIBUTE && p.name === scopeId)).toBe(
        true,
      );
      expect(p.props.some((p) => p.type === NodeTypes.ATTRIBUTE && p.name === scopeId)).toBe(true);
    });
  });

  describe('v-deep directive handling', () => {
    it('should process v-deep directive on child elements', () => {
      const scopeId = 'data-v-deep';
      const context = createScopedContext(scopeId);

      // Create a child element with v-deep directive
      const childElement = createElement('span');
      const vDeepDir = createDirective('deep');
      childElement.props.push(vDeepDir);

      // Create parent element with the child
      const parentElement = createElement('div', [], [childElement]);

      transformScoped(parentElement, context);

      // v-deep directive should be removed from child
      const deepDirRemaining = childElement.props.find(
        (p) => p.type === NodeTypes.DIRECTIVE && p.name === 'deep',
      );
      expect(deepDirRemaining).toBeUndefined();

      // v-deep marker attribute should be added
      const deepAttr = childElement.props.find(
        (p) => p.type === NodeTypes.ATTRIBUTE && p.name === `${scopeId}-deep`,
      );
      expect(deepAttr).toBeDefined();
      expect(deepAttr!.type).toBe(NodeTypes.ATTRIBUTE);
      expect(deepAttr!.name).toBe(`${scopeId}-deep`);
    });

    it('should not affect elements without v-deep', () => {
      const scopeId = 'data-v-nodeep';
      const context = createScopedContext(scopeId);

      const childElement = createElement('span');
      const parentElement = createElement('div', [], [childElement]);

      transformScoped(parentElement, context);

      // No deep attribute should be added to child
      const deepAttr = childElement.props.find(
        (p) => p.type === NodeTypes.ATTRIBUTE && p.name === `${scopeId}-deep`,
      );
      expect(deepAttr).toBeUndefined();
    });
  });

  describe('non-element nodes', () => {
    it('should not process non-element nodes', () => {
      const scopeId = 'data-v-skip';
      const context = createScopedContext(scopeId);

      // Create a text-like node (not an element)
      const textNode = {
        type: NodeTypes.TEXT,
        content: 'hello',
        isStatic: true,
        loc: {
          start: { line: 1, column: 1, offset: 0 },
          end: { line: 1, column: 6, offset: 5 },
          source: 'hello',
        },
      };

      // Should not throw
      expect(() => transformScoped(textNode as unknown as ElementNode, context)).not.toThrow();
    });
  });

  describe('scopeId value format', () => {
    it('should handle scopeId with various formats', () => {
      const testCases = ['data-v-abc123', 'data-v-x', '_scope_id', 'my-scope'];

      for (const scopeId of testCases) {
        const context = createScopedContext(scopeId);
        const node = createElement('div');

        transformScoped(node, context);

        const scopeAttr = node.props.find(
          (p) => p.type === NodeTypes.ATTRIBUTE && p.name === scopeId,
        );
        expect(scopeAttr).toBeDefined();
        expect(node.scopeId).toBe(scopeId);
      }
    });
  });
});

describe('hasVDeep', () => {
  it('should return true when element has v-deep directive', () => {
    const node = createElement('div');
    const vDeepDir = createDirective('deep');
    node.props.push(vDeepDir);

    expect(hasVDeep(node)).toBe(true);
  });

  it('should return false when element has no v-deep directive', () => {
    const node = createElement('div');
    expect(hasVDeep(node)).toBe(false);
  });

  it('should return false when element has other directives', () => {
    const node = createElement('div');
    const vIfDir = createDirective('if');
    const vForDir = createDirective('for');
    node.props.push(vIfDir, vForDir);

    expect(hasVDeep(node)).toBe(false);
  });
});

describe('getScopeId', () => {
  it('should return scopeId from context', () => {
    const scopeId = 'data-v-get';
    const context = createScopedContext(scopeId);

    expect(getScopeId(context)).toBe(scopeId);
  });

  it('should return undefined when scopeId is not set', () => {
    const context = createScopedContext();
    expect(getScopeId(context)).toBeUndefined();
  });
});
