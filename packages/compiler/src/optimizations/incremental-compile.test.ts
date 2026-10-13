// 覆盖电池测试：packages/compiler/src/optimizations/incremental-compile.ts
//
// 目标：把此前 0 覆盖的增量编译模块拉起真实覆盖率。
// 重点覆盖：首编/复用/结构重编/文本微调重编、analyzeTemplateDiff、
// analyzeAstDiff（added/removed/modified + 文本/注释节点相等判定）、缓存管理 API。
import { describe, it, expect, beforeEach } from 'vitest';
import { parse } from '../index';
import {
  incrementalCompile,
  clearIncrementalCache,
  getIncrementalCompiler,
} from './incremental-compile';

beforeEach(() => {
  clearIncrementalCache();
});

describe('incrementalCompile — 缓存行为', () => {
  it('首次编译（无缓存）⇒ usedIncremental:false 且产出真实 code', () => {
    const r = incrementalCompile('<div>hi</div>');
    expect(r.usedIncremental).toBe(false);
    expect(typeof (r.result as { code?: string }).code).toBe('string');
  });

  it('相同源重编 ⇒ usedIncremental:true 且复用结果', () => {
    incrementalCompile('<div>hi</div>');
    const r = incrementalCompile('<div>hi</div>');
    expect(r.usedIncremental).toBe(true);
    expect(r.modified.length).toBe(0);
  });

  it('结构变化（含 <）⇒ 全量重编 usedIncremental:false，modified 为 full', () => {
    incrementalCompile('<div>hi</div>', {}, 'structural.vue');
    const r = incrementalCompile('<div><span>bye</span></div>', {}, 'structural.vue');
    expect(r.usedIncremental).toBe(false);
    expect(r.modified.some((m) => m.nodeType === 'full')).toBe(true);
  });

  it('纯文本微调（无 < / v-）⇒ usedIncremental:true，modified 为 content', () => {
    incrementalCompile('hello world', {}, 'minor.vue');
    const r = incrementalCompile('hello there', {}, 'minor.vue');
    expect(r.usedIncremental).toBe(true);
    expect(r.modified.some((m) => m.nodeType === 'content')).toBe(true);
  });

  it('按 filePath 缓存：同 filePath 不同源复用键', () => {
    incrementalCompile('<p>a</p>', {}, 'f.vue');
    const r = incrementalCompile('<p>b</p>', {}, 'f.vue');
    expect(r.usedIncremental).toBe(true);
  });
});

describe('IncrementalCompiler.analyzeTemplateDiff', () => {
  const c = getIncrementalCompiler();

  it('源完全相同 ⇒ No changes，无修改区间', () => {
    const d = c.analyzeTemplateDiff('abc', 'abc');
    expect(d.description).toBe('No changes');
    expect(d.modifiedRanges.length).toBe(0);
  });

  it('结构变化（modifiedContent 含 <）⇒ 显著变化', () => {
    const d = c.analyzeTemplateDiff('<div></div>', '<span></span>');
    expect(d.hasSignificantChange).toBe(true);
  });

  it('纯文本微调 ⇒ 非显著变化', () => {
    const d = c.analyzeTemplateDiff('hello', 'world');
    expect(d.hasSignificantChange).toBe(false);
    expect(d.description).toContain('Minor');
  });
});

describe('IncrementalCompiler.analyzeAstDiff', () => {
  const c = getIncrementalCompiler();

  it('新增节点 ⇒ added + needsRecompile', () => {
    const d = c.analyzeAstDiff(
      parse('<div></div>') as never,
      parse('<div></div><span></span>') as never,
    );
    expect(d.needsRecompile).toBe(true);
    expect(d.modifiedNodes.some((m) => m.type === 'added')).toBe(true);
  });

  it('删除节点 ⇒ removed + needsRecompile', () => {
    const d = c.analyzeAstDiff(
      parse('<div></div><span></span>') as never,
      parse('<div></div>') as never,
    );
    expect(d.needsRecompile).toBe(true);
    expect(d.modifiedNodes.some((m) => m.type === 'removed')).toBe(true);
  });

  it('修改节点（标签变更）⇒ modified', () => {
    const d = c.analyzeAstDiff(parse('<div></div>') as never, parse('<span></span>') as never);
    expect(d.modifiedNodes.some((m) => m.type === 'modified')).toBe(true);
  });

  it('文本节点内容变更 ⇒ modified（覆盖 TEXT 相等判定）', () => {
    const d = c.analyzeAstDiff(parse('<div>a</div>') as never, parse('<div>b</div>') as never);
    expect(d.needsRecompile).toBe(true);
  });

  it('注释节点内容变更 ⇒ modified（覆盖 COMMENT 相等判定）', () => {
    const d = c.analyzeAstDiff(parse('<!--a-->') as never, parse('<!--b-->') as never);
    expect(d.needsRecompile).toBe(true);
  });

  it('完全相同的 AST ⇒ 无修改且产出可复用部分', () => {
    const d = c.analyzeAstDiff(parse('<div></div>') as never, parse('<div></div>') as never);
    expect(d.needsRecompile).toBe(false);
    expect(d.reusableParts.length).toBe(1);
  });
});

describe('IncrementalCompiler — 缓存管理 API', () => {
  it('clearCache / getCacheSize / getCompileHistory', () => {
    const c = getIncrementalCompiler();
    incrementalCompile('<div>x</div>', {}, 'g.vue');
    expect(c.getCacheSize()).toBeGreaterThanOrEqual(1);
    expect(c.getCompileHistory().length).toBeGreaterThanOrEqual(1);
    c.clearCache();
    expect(c.getCacheSize()).toBe(0);
  });
});
