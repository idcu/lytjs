/**
 * `optimizations/` 对外 API 的契约测试
 *
 * 背景：这几个 API 此前**没有任何测试**，而实跑暴露了 `precompileTemplate` 的问题 ——
 * 它以**原始模板串**为起点、只做文本级替换，于是 `AOTResult.code` 实际是模板本身
 * （`reduction` 恒为 0），与类型注释「编译后的代码」不符。
 */

import { describe, it, expect } from 'vitest';
import {
  precompileTemplate,
  analyzeDeadCode,
  eliminateDeadCode,
  analyzeMemoNeeds,
} from '../src/optimizations';
import { parse } from '../src/parser';

describe('optimizations - 对外 API 契约', () => {
  describe('precompileTemplate', () => {
    it('应返回**编译后的**渲染函数代码（而不是原始模板串）', () => {
      const result = precompileTemplate('<div>{{ msg }}</div>');
      expect(result.code).toContain('function render');
      expect(result.code).toContain('_ctx.msg');
      // 关键回归：产物不能等于输入模板
      expect(result.code).not.toBe('<div>{{ msg }}</div>');
      expect(result.code).not.toContain('{{ msg }}');
    });

    it('stats 应可度量（originalSize 为未优化产物长度，reduction ≥ 0）', () => {
      const result = precompileTemplate('<div>{{ msg }}</div>');
      expect(result.stats.originalSize).toBeGreaterThan(0);
      expect(result.stats.compiledSize).toBeGreaterThan(0);
      expect(result.stats.reduction).toBeGreaterThanOrEqual(0);
    });
  });

  describe('analyzeDeadCode / eliminateDeadCode', () => {
    it('应识别未使用的变量', () => {
      const analysis = analyzeDeadCode('const a = 1; const b = 2; console.log(b);');
      expect(analysis.unusedVariables).toContain('a');
    });

    it('应能按分析结果消除死代码', () => {
      const source = 'const unusedVar = 1; const used = 2; console.log(used);';
      const analysis = analyzeDeadCode(source);
      const result = eliminateDeadCode(source, analysis);
      expect(result).not.toContain('unusedVar');
      expect(result).toContain('used');
    });
  });

  describe('analyzeMemoNeeds', () => {
    it('含插值的模板应报告需要 memo', () => {
      const analysis = analyzeMemoNeeds(parse('<div>{{ msg }}</div>'));
      expect(analysis.needsMemo).toBe(true);
      expect(analysis.dynamicBindings.length).toBeGreaterThan(0);
    });

    it('纯静态模板不应报告需要 memo', () => {
      const analysis = analyzeMemoNeeds(parse('<div>static</div>'));
      expect(analysis.needsMemo).toBe(false);
    });
  });
});
