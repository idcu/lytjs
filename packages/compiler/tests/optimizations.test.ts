/**
 * `optimizations/` 对外 API 的契约测试
 *
 * 背景：这几个 API 此前**没有任何测试**，而实跑暴露了 `precompileTemplate` 的问题 ——
 * 它以**原始模板串**为起点、只做文本级替换，于是 `AOTResult.code` 实际是模板本身
 * （`reduction` 恒为 0），与类型注释「编译后的代码」不符。
 *
 * 2026-10-10 二次核查（P2-3）：改为真 `compile()` 之后，追加的三个"文本级优化" pass
 * 被探针证明**全部不成立**，其中算术折叠会**静默改坏用户代码**（`x1 + 2` → `x3`）。
 * 故整组删除，`precompileTemplate` 收敛为「AOT = 构建期编译」。
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

    it('size 应等于产物长度', () => {
      const result = precompileTemplate('<div>{{ msg }}</div>');
      expect(result.size).toBe(result.code.length);
      expect(result.size).toBeGreaterThan(0);
    });

    // ⚠️ P2-3：历史 AOTResult 上有 stats.reduction，其**唯一非 0 来源是"误伤式改写"**
    // （`x1 + 2` → `x3`）。该字段与产生它的 pass 一并删除，此处锁死"不再存在"。
    it('不再暴露 reduction / types / staticAssets 等无法兑现的字段', () => {
      const result = precompileTemplate('<div>{{ msg }}</div>') as unknown as Record<
        string,
        unknown
      >;
      expect(result.reduction).toBeUndefined();
      expect(result.types).toBeUndefined();
      expect(result.staticAssets).toBeUndefined();
      expect(result.stats).toBeUndefined();
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
