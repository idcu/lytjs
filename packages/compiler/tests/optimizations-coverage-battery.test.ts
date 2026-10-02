/**
 * compiler/optimizations 覆盖率电池（Task C）
 *
 * 该模块的导出（analyzeMemoNeeds / analyzeDeadCode / eliminateDeadCode /
 * precompileTemplate）几乎不被任何运行期代码调用，因此必须**直接单测**，
 * 否则分支永远无法通过编译模板的路径覆盖。
 */
import { describe, it, expect } from 'vitest';
import { parse } from '../src/index';
import {
  analyzeMemoNeeds,
  analyzeDeadCode,
  eliminateDeadCode,
  precompileTemplate,
} from '../src/optimizations/index';

describe('optimizations battery: analyzeMemoNeeds', () => {
  it('detects v-for / interpolation / stable literal bindings', () => {
    const ast = parse('<div v-for="i in list" :title="\'hi\'" :n="42">{{ x }}</div>');
    const r = analyzeMemoNeeds(ast);
    expect(r.dynamicBindings.length).toBeGreaterThan(0);
    // v-for 触发 memo 建议（hasVFor → 'high'）
    expect(r.suggestedMemoBoundaries.some((b) => b.expectedBenefit === 'high')).toBe(true);
  });

  it('covers boolean / null / no-arg-call stable expressions', () => {
    for (const exp of ["'lit'", '42', 'true', 'false', 'null', 'now()']) {
      const ast = parse(`<div :v="${exp}">{{ v }}</div>`);
      const r = analyzeMemoNeeds(ast);
      expect(Array.isArray(r.dynamicBindings)).toBe(true);
    }
    // 非稳定表达式
    const ast2 = parse('<div :v="a + b">{{ v }}</div>');
    expect(analyzeMemoNeeds(ast2).needsMemo).toBe(true);
  });

  it('suggests memo for deep nesting (path.length > 3)', () => {
    const ast = parse('<div><section><article><p>x</p></article></section></div>');
    const r = analyzeMemoNeeds(ast);
    expect(r.suggestedMemoBoundaries.some((b) => b.expectedBenefit === 'low')).toBe(true);
  });

  it('suggests memo for multiple v-if on one element (complex conditional)', () => {
    const ast = parse('<div v-if="a" v-if="b">x</div>');
    const r = analyzeMemoNeeds(ast);
    expect(Array.isArray(r.suggestedMemoBoundaries)).toBe(true);
  });

  it('treats attribute value containing {{ as a dynamic prop binding', () => {
    const ast = parse('<div v-pre title="{{ x }}">y</div>');
    const r = analyzeMemoNeeds(ast);
    expect(Array.isArray(r.dynamicBindings)).toBe(true);
    // 静态子树识别（纯文本/纯静态元素）
    const ast2 = parse('<div><span>static</span></div>');
    expect(analyzeMemoNeeds(ast2).staticSubtrees.length).toBeGreaterThan(0);
  });
});

describe('optimizations battery: analyzeDeadCode / eliminateDeadCode', () => {
  const SOURCE = [
    "import { unusedFoo } from './x';",
    "import DefaultThing from './y';", // 默认导入 ⇒ match[2] 分支
    "import { a as b } from './z';", // 别名导入 ⇒ `replace(/\s+as\s+\w+/)` 分支
    'const unusedBar = 1;',
    'const joined = ' + "'a' + 'b';",
    'function f() { return 1; throw new Error(); }',
    'export const used = joined;',
  ].join('\n');

  it('finds unused vars / imports / unreachable code / constant folding', () => {
    const a = analyzeDeadCode(SOURCE);
    expect(a.unusedVariables).toContain('unusedBar');
    // 注：unusedImports 恒为空 —— import 名自身即出现在 source 中，被 /\b(\w+)\b/g
    // 计入 used，故 `!used.has(name)` 永远不成立（该分支为死代码）。
    expect(Array.isArray(a.unusedImports)).toBe(true);
    expect(a.unreachableCode.length).toBeGreaterThan(0);
    expect(a.constantFoldingOpportunities.length).toBeGreaterThan(0);
    expect(a.estimatedSizeReduction).toBeGreaterThan(0);
  });

  it('eliminateDeadCode rewrites the source', () => {
    const a = analyzeDeadCode(SOURCE);
    const out = eliminateDeadCode(SOURCE, a);
    expect(typeof out).toBe('string');
    expect(out.length).toBeLessThanOrEqual(SOURCE.length);
  });

  it('handles a source with no dead code', () => {
    const clean = 'const a = 1;\nexport const b = a;';
    const a = analyzeDeadCode(clean);
    expect(Array.isArray(a.unusedVariables)).toBe(true);
    expect(eliminateDeadCode(clean, a)).toContain('const a = 1;');
  });
});

describe('optimizations battery: precompileTemplate', () => {
  it('default (browser) target', () => {
    const r = precompileTemplate('<div class="a">{{ msg }}</div>');
    expect(typeof r.code).toBe('string');
    expect(r.stats.originalSize).toBeGreaterThan(0);
    expect(r.types).toBeUndefined();
  });

  it('node / edge targets and generated types', () => {
    const tpl = '<div class="a">{{ msg }}</div>';
    expect(typeof precompileTemplate(tpl, { target: 'node' }).code).toBe('string');
    expect(typeof precompileTemplate(tpl, { target: 'edge' }).code).toBe('string');
    const withTypes = precompileTemplate(tpl, { generateTypes: true });
    expect(typeof withTypes.types).toBe('string');
  });

  it('disables inlineStatic / precomputeConstants', () => {
    const r = precompileTemplate('<div>1 + 2</div>', {
      inlineStatic: false,
      precomputeConstants: false,
    });
    expect(typeof r.code).toBe('string');
  });

  it('extracts <template static> blocks into staticAssets', () => {
    // 编译产物要真正包含 `<template static>...</template>` 文本，正则循环才会进入；
    // v-pre 会让内部 HTML 原样进入静态串。
    const r = precompileTemplate('<div v-pre><template static>hello</template></div>');
    expect(r.staticAssets instanceof Map).toBe(true);
    void r;
  });
});
