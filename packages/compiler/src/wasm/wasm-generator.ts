/**
 * @lytjs/compiler - WASM Generator Interface
 * 封装 Generator 相关的 WASM-ready 接口。
 */

import { parse } from '../parser';
import { transform } from '../transform';
import { generate } from '../codegen';
import { generateSSR } from '../codegen-ssr';
import { NodeTypes } from '../constants';
import type { ElementNode, TemplateChildNode, RootNode, TransformOptions } from '../types';
import type { WASMGenerateOptions } from './wasm-compiler';

// ============================================================
// generateRenderCode — 生成渲染函数代码
// ============================================================

/**
 * 从模板源码生成渲染函数代码。
 */
export function generateRenderCode(source: string, options: WASMGenerateOptions = {}): string {
  const { mode = 'module', prefix = '' } = options;
  const ssr = (options as unknown as { ssr?: boolean }).ssr ?? false;

  const root = parse(source);
  transform(root, { ssr } as TransformOptions);

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
    // 为每个 hoisted 节点创建独立的 RootNode
    const hoistRoot = {
      type: NodeTypes.ROOT,
      children: [],
      helpers: [],
      components: [],
      directives: [],
      hoists: [],
      codegenNode: hoistedNode,
      imports: [],
      cached: 0,
      temps: 0,
      loc: {
        start: { line: 1, column: 1, offset: 0 },
        end: { line: 1, column: 1, offset: 0 },
        source: '',
      },
    };
    const result = generate(hoistRoot as RootNode, { sourceMap: false });
    lines.push(`const _hoisted_${i + 1} = ${result.code.trim()}`);
  }

  return lines.join('\n');
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

  // FIX: P2-29 数组遍历优化 - 使用 for 循环替代 forEach
  function walk(node: TemplateChildNode, path: string): void {
    if (node.type === NodeTypes.ELEMENT) {
      const el = node as ElementNode;
      if (el.patchFlag && el.patchFlag !== 0) {
        flags[path] = el.patchFlag;
      }
      // FIX: P2-29 使用 for 循环替代 forEach
      for (let i = 0; i < el.children.length; i++) {
        walk(el.children[i]!, `${el.tag}.${i}`);
      }
    }
  }

  // FIX: P2-29 使用 for 循环替代 forEach
  for (let i = 0; i < root.children.length; i++) {
    walk(root.children[i]!, `root.${i}`);
  }

  return flags;
}
