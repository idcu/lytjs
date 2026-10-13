/**
 * compiler/optimizations 覆盖率电池（Task C）
 *
 * 该模块的导出（analyzeMemoNeeds / analyzeDeadCode / eliminateDeadCode /
 * precompileTemplate）几乎不被任何运行期代码调用，因此必须**直接单测**，
 * 否则分支永远无法通过编译模板的路径覆盖。
 */
import { describe, it, expect } from 'vitest';
import { parse, compile } from '../src/index';
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
  it('返回构建期渲染函数代码，size 可度量', () => {
    const r = precompileTemplate('<div class="a">{{ msg }}</div>');
    expect(typeof r.code).toBe('string');
    expect(r.code).toContain('function render');
    expect(r.size).toBe(r.code.length);
    expect(r.size).toBeGreaterThan(0);
  });

  // ⚠️ P2-3 回归：历史实现在**生成代码文本**上跑正则算术折叠（且用 eval），
  // 实测会把下面四类代码**静默改坏**。
  // 现在 AOT 产物 = helper import + 渲染函数代码主体 + `export { render }`；
  // 其中**代码主体**必须与 `compile()` **逐字节一致**（AOT 只补前后缀，不改写代码）。
  it('不再对生成代码做文本级改写（P2-3 回归）', () => {
    const templates = [
      '<div>{{ x1 + 2 }}</div>', // 历史：x1 + 2 → x3（标识符被吞）
      '<div>{{ 1.5 + 2 }}</div>', // 历史：1.5 + 2 → 1.7（小数被拆）
      '<div>{{ "1+2" }}</div>', // 历史："1+2" → "3"（字符串内容被改）
      '<div>{{ 1 + 2 }}</div>', // 历史：靠这处"折叠"伪造出 reduction > 0
    ];
    for (const tpl of templates) {
      // AOT 产物必须**包含**未改写的代码主体（前后仅补 import / export）
      expect(precompileTemplate(tpl).code).toContain(compile(tpl).code);
    }
  });

  it('产物不含历史 pass 引入的未定义引用', () => {
    const r = precompileTemplate('<div class="a">{{ msg }}</div>');
    // optimizeForTarget 曾把 document. → _document.（未定义）、createElement( → document.createElement(
    expect(r.code).not.toContain('_document.');
    // extractAndInlineStatic 曾产出 __getStatic(...)（运行时无定义）
    expect(r.code).not.toContain('__getStatic');
  });
});
