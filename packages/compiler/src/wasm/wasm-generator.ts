/**
 * @lytjs/compiler - WASM Generator Interface
 * 封装 Generator 相关的 WASM-ready 接口。
 */

import { parse } from '../parser';
import { transform } from '../transform';
import { generate } from '../codegen';
import { generateSSR } from '../codegen-ssr';
import { NodeTypes } from '../constants';
import type { RootNode, ElementNode, TemplateChildNode } from '../types';
import type { WASMGenerateOptions } from './wasm-compiler';

// ============================================================
// generateRenderCode — 生成渲染函数代码
// ============================================================

/**
 * 从模板源码生成渲染函数代码。
 */
export function generateRenderCode(
  source: string,
  options: WASMGenerateOptions = {},
): string {
  const { mode = 'module', prefix = '', ssr = false } = options as any;

  const root = parse(source);
  transform(root, { ssr } as any);

  let code: string;
  if (ssr) {
    const result = generateSSR(root, { mode });
    code = result.code;
  } else {
    const result = generate(root, { mode, sourceMap: false });
    code = result.code;
  }

  return prefix ? `${prefix}\n${code}` : code;
}

// ============================================================
// generateHoistedCode — 生成静态提升代码
// ============================================================

/**
 * 生成静态提升（hoisted）变量的声明代码。
 */
export function generateHoistedCode(source: string): string {
  const root = parse(source);
  transform(root, {});

  if (!root.hoists || root.hoists.length === 0) {
    return '';
  }

  const lines: string[] = [];
  for (let i = 0; i < root.hoists.length; i++) {
    const hoistedNode = root.hoists[i];
    const result = generate(createRootWithCodegen([hoistedNode as TemplateChildNode]), {
      sourceMap: false,
    });
    lines.push(`const _hoisted_${i + 1} = ${result.code.trim()}`);
  }

  return lines.join('\n');
}

function createRootWithCodegen(children: TemplateChildNode[]): RootNode {
  return {
    type: NodeTypes.ROOT,
    children: [],
    helpers: [],
    components: [],
    directives: [],
    hoists: [],
    codegenNode: children[0] as any,
    imports: [],
    cached: 0,
    temps: 0,
    loc: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 }, source: '' },
  };
}

// ============================================================
// generatePatchFlags — 生成 Patch Flag 映射
// ============================================================

/**
 * 遍历 AST，收集所有元素的 patch flag。
 */
export function generatePatchFlags(source: string): Record<string, number> {
  const root = parse(source);
  transform(root, {});

  const flags: Record<string, number> = {};

  function walk(node: TemplateChildNode, path: string): void {
    if (node.type === NodeTypes.ELEMENT) {
      const el = node as ElementNode;
      if ((el as any).patchFlag && (el as any).patchFlag !== 0) {
        flags[path] = (el as any).patchFlag;
      }
      el.children.forEach((child, index) => {
        walk(child, `${el.tag}.${index}`);
      });
    }
  }

  root.children.forEach((child, index) => {
    walk(child, `root.${index}`);
  });

  return flags;
}
