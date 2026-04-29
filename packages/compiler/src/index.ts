// src/index.ts
// @lytjs/compiler - Main entry point
// Re-exports all public APIs

// Compile function
import { parse } from './parser';
import { transform, builtInTransforms, builtInDirectiveTransforms } from './transform';
import { optimize } from './optimize';
import { generate } from './codegen';
import type { CompilerOptions, CodegenResult } from './types';

export { parse, transform, optimize, generate };

export function compile(source: string, options: CompilerOptions = {}): CodegenResult {
  // 1. Parse template to AST
  const ast = parse(source, options);

  // 2. Transform AST
  const transformOptions = {
    nodeTransforms: [...builtInTransforms, ...(options.nodeTransforms ?? [])],
    directiveTransforms: {
      ...builtInDirectiveTransforms,
      ...(options.directiveTransforms ?? {}),
    },
    ...options,
  };
  transform(ast, transformOptions);

  // 3. Optimize AST
  optimize(ast, options);

  // 4. Generate code
  const codegenResult = generate(ast, options);

  return codegenResult;
}

// Constants
export { NodeTypes } from './constants';
export { ElementTypes } from './constants';
export { ConstantTypes } from './constants';
export { TagType } from './constants';
export { TextModes } from './constants';
export { BindingTypes } from './constants';
export { PatchFlags } from './constants';
export { helperNameMap } from './constants';

// Types
export type { RootNode } from './types';
export type { ElementNode } from './types';
export type { TextNode } from './types';
export type { CommentNode } from './types';
export type { InterpolationNode } from './types';
export type { AttributeNode } from './types';
export type { DirectiveNode } from './types';
export type { SimpleExpressionNode } from './types';
export type { CompoundExpressionNode } from './types';
export type { VNodeCall } from './types';
export type { JSCallExpression } from './types';
export type { JSObjectExpression } from './types';
export type { JSProperty } from './types';
export type { JSArrayExpression } from './types';
export type { JSFunctionExpression } from './types';
export type { JSConditionalExpression } from './types';
export type { JSCacheExpression } from './types';
export type { JSChildNode } from './types';
export type { TemplateChildNode } from './types';
export type { ExpressionNode } from './types';
export type { CompilerOptions } from './types';
export type { ParserOptions } from './types';
export type { TransformOptions } from './types';
export type { CodegenOptions } from './types';
export type { TransformContext } from './types';
export type { CodegenResult } from './types';
export type { NodeTransform } from './types';
export type { DirectiveTransform } from './types';
export type { DirectiveTransformResult } from './types';
export type { BindingMetadata } from './types';
export type { SourceLocation } from './types';
export type { ParentNode } from './types';
export type { BaseNode } from './types';
export type { Property } from './types';

// AST helpers
export { createRoot } from './ast';
export { createElement } from './ast';
export { createText } from './ast';
export { createComment } from './ast';
export { createInterpolation } from './ast';
export { createAttribute } from './ast';
export { createDirective } from './ast';
export { createSimpleExpression } from './ast';
export { createCompoundExpression } from './ast';
export { createVNodeCall } from './ast';
export { createObjectExpression } from './ast';
export { createObjectProperty } from './ast';
export { createCallExpression } from './ast';
export { createConditionalExpression } from './ast';
export { createArrayExpression } from './ast';

// Transforms
export { transformElement } from './transform';
export { transformIf } from './transform';
export { transformFor } from './transform';
export { transformOnce } from './transform';
export { transformSlot } from './transform';
export { transformBind } from './transform';
export { transformOn } from './transform';
export { transformModel } from './transform';
export { transformShow } from './transform';
