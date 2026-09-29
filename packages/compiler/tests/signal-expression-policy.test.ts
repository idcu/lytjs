/**
 * Signal 模式下「模板表达式」的支持边界（2026-09-26 起：已支持常见表达式）
 *
 * 历史：此前 Signal 只允许「简单属性路径」（`a` / `a.b`），
 *   `:class="['a',{b:ok}]"` / `:style="{color:c}"` / 三元 / 拼接 一律**编译报错**，
 *   而同样模板在 SSR 下可以通过 ⇒ 两端能力不一致。
 * 根因：DOM 侧有十余处直接拼接 `` `_ctx.${exp}` ``（假定表达式就是属性路径）。
 *
 * 修复：这些位置统一改走 `prefixIdentifiers(exp, locals)` —— 它能正确处理
 *   数组/对象/三元/拼接/索引，并**跳过**属性名、字符串字面量与 locals。
 *   （前置验证：对简单路径，两者产物完全一致，因此替换不改变既有行为。）
 *
 * ⚠️ **2026-09-30 补齐「双写」**：本文件原先**只跑非优化版**（`optimizeSignal: false`），
 *   于是优化版（`optimizeSignal: true`，**默认**）仍留着旧的「简单属性路径」白名单校验，
 *   上述修复**没落到默认路径**——常见表达式在默认路径下依旧报错。
 *   现已把优化版同构修好（黑名单校验 + `renderExpression()`），
 *   并**把本文件参数化为两套 codegen 都跑**，从此两侧绑定在同一份门禁上。
 *
 * 本文件锁定两侧：
 *   ① 常见表达式必须**能用**，且产物里的标识符被正确前缀化
 *   ② 危险/带副作用的表达式必须**被拒绝**
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';

type Variant = {
  name: string;
  /** 上下文标识符前缀：非优化版为 `_ctx`，优化版为 `_c` */
  ctx: string;
  options: Record<string, unknown>;
};

const VARIANTS: Variant[] = [
  { name: '非优化版', ctx: '_ctx', options: { rendererMode: 'signal', optimizeSignal: false } },
  { name: '优化版', ctx: '_c', options: { rendererMode: 'signal', optimizeSignal: true } },
];

const ssr = (tpl: string) => () => compile(tpl, { ssr: true, ssrMode: true });

/** 常见表达式（**两套 codegen 都必须支持**） */
const SUPPORTED: ReadonlyArray<readonly [string, string]> = [
  ['标识符', `<div :title="t">x</div>`],
  ['属性路径', `<div :title="obj.tip">x</div>`],
  ['class 数组', `<div :class="['a','b']">x</div>`],
  ['class 数组（含标识符）', `<div :class="['a', cls]">x</div>`],
  ['class 对象', `<div :class="{ active: ok }">x</div>`],
  ['class 混合', `<div :class="['a',{active:ok}]">x</div>`],
  ['style 对象', `<div :style="{ color: c }">x</div>`],
  ['三元', `<div :title="ok ? 'a' : 'b'">x</div>`],
  ['字符串拼接', `<div :title="a + '!'">x</div>`],
  ['索引访问', `<div :title="list[0]">x</div>`],
  ['逻辑运算', `<div :title="a && b">x</div>`],
  ['相等比较', `<div :title="a === b ? 'y' : 'n'">x</div>`],
  ['带连字符的属性名', `<div :data-x="a">x</div>`],
  ['v-on 方法引用', `<button @click="fn">x</button>`],
  ['v-on 内联语句', `<button @click="fn()">x</button>`],
];

/** 危险/带副作用的写法（**两套 codegen 都必须拒绝**） */
const DANGEROUS: ReadonlyArray<readonly [string, string]> = [
  ['语句分隔', `<div :title="a; alert(1)">x</div>`],
  ['箭头函数', `<div :title="() => 1">x</div>`],
  ['function 声明', `<div :title="function(){}">x</div>`],
  ['new 表达式', `<div :title="new Date()">x</div>`],
  ['require', `<div :title="require('fs')">x</div>`],
  ['import()', `<div :title="import('x')">x</div>`],
  ['赋值', `<div :title="x = 1">x</div>`],
  ['delete', `<div :title="delete a.b">x</div>`],
];

describe('Signal 表达式 - 常见写法应支持（两套 codegen 一致，且与 SSR 一致）', () => {
  for (const v of VARIANTS) {
    describe(v.name, () => {
      for (const [name, tpl] of SUPPORTED) {
        it(`${name} 应可编译，且 SSR 亦可`, () => {
          expect(() => compile(tpl, v.options as never)).not.toThrow();
          expect(ssr(tpl)).not.toThrow();
        });
      }
    });
  }
});

describe('Signal 表达式 - 危险写法必须被拒绝（两套 codegen 一致）', () => {
  for (const v of VARIANTS) {
    describe(v.name, () => {
      for (const [name, tpl] of DANGEROUS) {
        it(`${name} 应被拒绝`, () => {
          expect(() => compile(tpl, v.options as never)).toThrow();
        });
      }
    });
  }
});

describe('Signal 表达式 - 标识符必须被正确前缀化（两套 codegen）', () => {
  for (const v of VARIANTS) {
    const code = (tpl: string) => compile(tpl, v.options as never).code;
    const p = v.ctx;

    describe(v.name, () => {
      it('对象字面量的 key 不加前缀、值加前缀', () => {
        expect(code(`<div :class="{ active: ok }">x</div>`)).toContain(`{ active: ${p}.ok }`);
      });

      it('数组元素里的标识符加前缀', () => {
        expect(code(`<div :class="['a', cls]">x</div>`)).toContain(`['a', ${p}.cls]`);
      });

      it('三元与拼接里的标识符加前缀', () => {
        expect(code(`<div :title="ok ? 'a' : 'b'">x</div>`)).toContain(`${p}.ok ? 'a' : 'b'`);
        expect(code(`<div :title="a + '!'">x</div>`)).toContain(`${p}.a + '!'`);
      });

      it('字符串字面量内部不被改写', () => {
        const c = code(`<div :title="'hello world'">x</div>`);
        expect(c).toContain("'hello world'");
        expect(c).not.toContain(`'hello ${p}`);
      });
    });
  }
});
