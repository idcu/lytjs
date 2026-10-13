// 覆盖电池测试：packages/compiler/src/optimizations/staticAnalysis.ts
//
// 目标：把此前 0 覆盖的静态分析模块拉起真实覆盖率。
// 策略：绝大多数分支用真实 `parse()` 产出 RootNode 触发；少数解析器无法自然产出的
// 分支（void 元素带内容、>100 节点、>20 指令）用手工最小 AST 触发。
import { describe, it, expect } from 'vitest';
import { parse } from '../index';
import { NodeTypes } from '../constants';
import {
  performStaticAnalysis,
  formatStaticAnalysisResult,
  type StaticAnalysisResult,
} from './staticAnalysis';
import type { RootNode } from '../types';

function ast(src: string): RootNode {
  return parse(src) as RootNode;
}

function emptyResult(): StaticAnalysisResult {
  return { warnings: [], errors: [], suggestions: [], performanceTips: [] };
}

describe('performStaticAnalysis — 错误检查（errors）', () => {
  it('v-if + v-for 同元素 ⇒ conflicting-directives 警告', () => {
    const r = performStaticAnalysis(ast('<div v-if="x" v-for="i in list">x</div>'));
    expect(r.warnings.some((w) => w.type === 'conflicting-directives')).toBe(true);
  });

  it('void 元素带子内容 ⇒ unnecessary-content 警告（手工 AST）', () => {
    const imgAst = {
      type: NodeTypes.ROOT,
      children: [
        {
          type: NodeTypes.ELEMENT,
          tag: 'img',
          props: [],
          children: [{ type: NodeTypes.TEXT, content: 'x' }],
        },
      ],
    } as unknown as RootNode;
    const r = performStaticAnalysis(imgAst);
    expect(r.warnings.some((w) => w.type === 'unnecessary-content')).toBe(true);
  });
});

describe('performStaticAnalysis — 最佳实践（bestPractices）', () => {
  it('v-for 缺 :key ⇒ missing-key 建议', () => {
    const r = performStaticAnalysis(ast('<div v-for="i in list"></div>'));
    expect(r.suggestions.some((s) => s.type === 'missing-key')).toBe(true);
  });

  it('v-for 带 :key ⇒ 不产生 missing-key 建议', () => {
    const r = performStaticAnalysis(ast('<div v-for="i in list" :key="i.id"></div>'));
    expect(r.suggestions.some((s) => s.type === 'missing-key')).toBe(false);
  });

  it('事件名以 on 开头 ⇒ event-naming 建议', () => {
    const r = performStaticAnalysis(ast('<div @onclick="fn"></div>'));
    expect(r.suggestions.some((s) => s.type === 'event-naming')).toBe(true);
  });

  it('style 含插值 ⇒ style-binding 建议', () => {
    const r = performStaticAnalysis(ast('<div style="{{ color }}"></div>'));
    expect(r.suggestions.some((s) => s.type === 'style-binding')).toBe(true);
  });
});

describe('performStaticAnalysis — 性能（performance）', () => {
  it('v-for 的复杂子模板 ⇒ large-list 性能提示', () => {
    const r = performStaticAnalysis(
      ast('<ul v-for="i in list"><li><span><b><i>x</i></b></span></li></ul>'),
    );
    expect(r.performanceTips.some((t) => t.type === 'large-list')).toBe(true);
  });

  it('深度嵌套模板 ⇒ complex-template 性能提示', () => {
    const open = Array.from({ length: 25 }, () => '<div>').join('');
    const close = Array.from({ length: 25 }, () => '</div>').join('');
    const r = performStaticAnalysis(ast(open + 'x' + close));
    expect(r.performanceTips.some((t) => t.type === 'complex-template')).toBe(true);
  });

  it('插值数量 > 3 ⇒ multiple-interpolations 性能提示', () => {
    const r = performStaticAnalysis(ast('<div>{{a}}{{b}}{{c}}{{d}}</div>'));
    expect(r.performanceTips.some((t) => t.type === 'multiple-interpolations')).toBe(true);
  });
});

describe('performStaticAnalysis — 全局分析', () => {
  it('节点数 > 100 ⇒ large-template 性能提示', () => {
    const many = Array.from({ length: 101 }, () => '<div></div>').join('');
    const r = performStaticAnalysis(ast(many));
    expect(r.performanceTips.some((t) => t.type === 'large-template')).toBe(true);
  });

  it('指令数 > 20 ⇒ many-directives 建议', () => {
    const many = Array.from({ length: 21 }, () => '<div v-if="x"></div>').join('');
    const r = performStaticAnalysis(ast(many));
    expect(r.suggestions.some((s) => s.type === 'many-directives')).toBe(true);
  });
});

describe('performStaticAnalysis — 选项开关', () => {
  it('默认（无 options）⇒ all 检查全开', () => {
    const r = performStaticAnalysis(ast('<div v-for="i in list"></div>'));
    expect(r.suggestions.some((s) => s.type === 'missing-key')).toBe(true);
  });

  it('all:false 且各开关全关 ⇒ 不产生任何 per-node 结果', () => {
    const r = performStaticAnalysis(ast('<div v-if="x" v-for="i in list">x</div>'), {
      all: false,
      errors: false,
      bestPractices: false,
      performance: false,
    });
    expect(r.warnings.length).toBe(0);
    expect(r.suggestions.length).toBe(0);
    expect(r.performanceTips.length).toBe(0);
  });

  it('all:false 但仅 performance:true ⇒ 仅性能项', () => {
    const r = performStaticAnalysis(ast('<div>{{a}}{{b}}{{c}}{{d}}</div>'), {
      all: false,
      performance: true,
    });
    expect(r.performanceTips.length).toBeGreaterThan(0);
    expect(r.warnings.length).toBe(0);
    expect(r.suggestions.length).toBe(0);
  });

  it('customRules 被逐节点应用', () => {
    const r = performStaticAnalysis(ast('<div></div>'), {
      all: false,
      customRules: [
        {
          name: 'my-rule',
          type: 'warning',
          check: (node, ctx) => {
            if (node.type === NodeTypes.ELEMENT) {
              ctx.result.warnings.push({ type: 'my-rule', message: 'hit' });
            }
          },
        },
      ],
    });
    expect(r.warnings.some((w) => w.type === 'my-rule')).toBe(true);
  });
});

describe('formatStaticAnalysisResult', () => {
  it('全空 ⇒ 未发现问题', () => {
    expect(formatStaticAnalysisResult(emptyResult())).toContain('未发现问题');
  });

  it('含 errors（带 location）/ warnings / suggestions / performanceTips 全部渲染', () => {
    const r = emptyResult();
    r.errors.push({ type: 'e', message: 'err', location: 'L1' });
    r.warnings.push({ type: 'w', message: 'warn', suggestion: 'fix' });
    r.suggestions.push({ type: 's', message: 'sug', example: '<x/>' });
    r.performanceTips.push({ type: 'p', message: 'perf', impact: 'high' });
    const out = formatStaticAnalysisResult(r);
    expect(out).toContain('错误');
    expect(out).toContain('警告');
    expect(out).toContain('最佳实践建议');
    expect(out).toContain('性能优化建议');
    expect(out).toContain('L1');
    expect(out).toContain('fix');
    expect(out).toContain('<x/>');
    expect(out).toContain('high');
  });
});
