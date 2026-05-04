// src/transforms/v-for.ts
// v-for 转换逻辑

import { NodeTypes } from '../constants';
import type {
  RootNode,
  TemplateChildNode,
  ElementNode,
  TransformContext,
  VNodeCall,
  JSCallExpression,
} from '../types';
import { createSimpleExpression, createCallExpression, createCompoundExpression } from '../ast';
import { getExpContent, findDirective } from './helpers';
import { transformElement } from './transform-element';
import { warn } from '@lytjs/common-error';

/**
 * Type guard: check if a codegenNode is a VNodeCall.
 */
function isVNodeCall(node: unknown): node is VNodeCall {
  return (
    typeof node === 'object' && node !== null && (node as VNodeCall).type === NodeTypes.VNODE_CALL
  );
}

/**
 * Type guard: check if a codegenNode is a JSCallExpression.
 */
function isJSCallExpression(node: unknown): node is JSCallExpression {
  return (
    typeof node === 'object' &&
    node !== null &&
    (node as JSCallExpression).type === NodeTypes.JS_CALL_EXPRESSION
  );
}

export function transformFor(node: RootNode | TemplateChildNode, context: TransformContext): void {
  if (node.type !== NodeTypes.ELEMENT) return;

  const element = node as ElementNode;
  const forDir = findDirective(element, 'for');
  if (!forDir || !forDir.exp) return;

  // Remove v-for directive from props
  element.props = element.props.filter(
    (p) => !(p.type === NodeTypes.DIRECTIVE && p.name === 'for'),
  );

  // Parse v-for expression
  const expContent = getExpContent(forDir.exp);
  if (!expContent) return;

  // Supports:
  // - item in list
  // - (item, index) in list
  // - { key, value } in entries
  // - { key, value }, index in entries
  // - [ a, b ] in array
  // - [ a, b ], index in array
  const inMatch = expContent.match(
    /^\s*(?:\(([^)]+)\)|(\{[^}]+\}(?:\s*,\s*\w+)?)|(\[[^\]]+\](?:\s*,\s*\w+)?)|(\S+))\s+(?:in|of)\s+(.+)$/,
  );
  if (!inMatch) return;

  // inMatch[1]: parenthesized syntax (item, index)
  // inMatch[2]: object destructuring { key, value } [, index]
  // inMatch[3]: array destructuring [ a, b ] [, index]
  // inMatch[4]: simple variable name
  // inMatch[5]: right-hand side iteration expression
  const left = (inMatch[1] ?? inMatch[2] ?? inMatch[3] ?? inMatch[4])!.trim();
  const right = inMatch[5]!.trim();

  // Check for destructuring patterns
  const destructureResult = parseDestructure(left);

  let itemVar: string;
  let indexVar: string | undefined;
  let destructureExpr: string | undefined;

  if (destructureResult) {
    // Destructuring pattern: { key, value } or [ index, value ]
    itemVar = destructureResult.tempVar;
    indexVar = destructureResult.indexVar;
    destructureExpr = destructureResult.pattern;
  } else if (inMatch[1]) {
    // Parenthesized syntax: (item, index) or (item)
    const parts = left.split(',').map((p) => p.trim());
    if (parts.length > 2) {
      if (__DEV__) {
        warn(`v-for does not support more than 2 variables in (item, index) syntax.`);
      }
    }
    itemVar = parts[0] ?? 'item';
    indexVar = parts[1];
  } else if (left.startsWith('[') && left.endsWith(']')) {
    const inner = left.slice(1, -1).trim();
    const parts = inner.split(',').map((p) => p.trim());
    if (parts.length > 2) {
      if (__DEV__) {
        warn(`v-for does not support more than 2 variables in [item, index] syntax.`);
      }
    }
    itemVar = parts[0] ?? 'item';
    indexVar = parts[1];
  } else {
    itemVar = left;
  }

  // Transform the element
  transformElement(element, context);

  const codegenNode = element.codegenNode;
  if (!codegenNode) return;

  // Use type guards instead of double type assertions
  const renderItem = isVNodeCall(codegenNode)
    ? codegenNode
    : isJSCallExpression(codegenNode)
      ? codegenNode
      : (codegenNode as VNodeCall);

  context.helper('RENDER_LIST');

  // Build the arrow function body
  let arrowBody: TemplateChildNode[];
  if (destructureExpr) {
    // For destructuring, add a destructuring statement before the render item
    arrowBody = [
      createSimpleExpression(`const ${destructureExpr} = ${itemVar}`, false, forDir.exp.loc, false),
      renderItem as unknown as TemplateChildNode,
    ];
  } else {
    arrowBody = [renderItem as unknown as TemplateChildNode];
  }

  const renderListCall = createCallExpression('RENDER_LIST', [
    createSimpleExpression(right, false, forDir.exp.loc, false),
    createCompoundExpression(
      [
        `(${itemVar}${indexVar ? `, ${indexVar}` : ''}) => { `,
        ...arrowBody,
        ` }`,
      ],
      forDir.exp.loc,
    ),
  ]);

  context.replaceNode(renderListCall as unknown as TemplateChildNode);
}

/**
 * Parse a destructuring pattern from the left-hand side of v-for.
 *
 * Supports:
 * - `{ key, value }` -> object destructuring
 * - `{ key, value }, index` -> object destructuring with index
 * - `[ index, value ]` -> array destructuring
 * - `[ index, value ], index` -> array destructuring with outer index
 *
 * Returns null if the pattern is not a destructuring expression.
 */
function parseDestructure(
  left: string,
): { pattern: string; tempVar: string; indexVar?: string } | null {
  // Match: { ... } [, index]
  const objMatch = left.match(/^(\{[^}]+\})(?:\s*,\s*(\w+))?$/);
  if (objMatch) {
    return {
      pattern: objMatch[1]!.trim(),
      tempVar: '__destructureItem',
      indexVar: objMatch[2]?.trim(),
    };
  }

  // Match: [ ... ] [, index]
  const arrMatch = left.match(/^(\[[^\]]+\])(?:\s*,\s*(\w+))?$/);
  if (arrMatch) {
    return {
      pattern: arrMatch[1]!.trim(),
      tempVar: '__destructureItem',
      indexVar: arrMatch[2]?.trim(),
    };
  }

  return null;
}
