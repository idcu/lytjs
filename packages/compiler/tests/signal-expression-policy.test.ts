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
 * 本文件锁定两侧：
 *   ① 常见表达式必须**能用**，且产物里的标识符被正确前缀化
 *   ② 危险/带副作用的表达式必须**被拒绝**
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';

const signal = (tpl: string) => () =>
  compile(tpl, { rendererMode: 'signal', optimizeSignal: false });
const ssr = (tpl: string) => () => compile(tpl, { ssr: true, ssrMode: true });
const code = (tpl: string) => compile(tpl, { rendererMode: 'signal', optimizeSignal: false }).code;

describe('Signal 表达式 - 常见写法应支持（且与 SSR 一致）', () => {
  const supported = [
    ['标识符', `<div :title="t">x</div>`],
    ['属性路径', `<div :title="obj.tip">x</div>`],
    ['class 数组', `<div :class="['a','b']">x</div>`],
    ['class 对象', `<div :class="{ active: ok }">x</div>`],
    ['class 混合', `<div :class="['a',{active:ok}]">x</div>`],
    ['style 对象', `<div :style="{ color: c }">x</div>`],
    ['三元', `<div :title="ok ? 'a' : 'b'">x</div>`],
    ['字符串拼接', `<div :title="a + '!'">x</div>`],
    ['索引访问', `<div :title="list[0]">x</div>`],
    ['逻辑运算', `<div :title="a && b">x</div>`],
    ['相等比较', `<div :title="a === b ? 'y' : 'n'">x</div>`],
  ] as const;

  for (const [name, tpl] of supported) {
    it(`${name} 应可编译，且 SSR 亦可（两端一致）`, () => {
      expect(signal(tpl)).not.toThrow();
      expect(ssr(tpl)).not.toThrow();
    });
  }
});

describe('Signal 表达式 - 标识符必须被正确前缀化', () => {
  it('对象字面量的 key 不加前缀、值加前缀', () => {
    expect(code(`<div :class="{ active: ok }">x</div>`)).toContain('{ active: _ctx.ok }');
  });

  it('数组元素里的标识符加前缀', () => {
    expect(code(`<div :class="['a', cls]">x</div>`)).toContain("['a', _ctx.cls]");
  });

  it('三元与拼接里的标识符加前缀', () => {
    expect(code(`<div :title="ok ? 'a' : 'b'">x</div>`)).toContain("_ctx.ok ? 'a' : 'b'");
    expect(code(`<div :title="a + '!'">x</div>`)).toContain("_ctx.a + '!'");
  });

  it('字符串字面量内部不被改写', () => {
    const c = code(`<div :title="'hello world'">x</div>`);
    expect(c).toContain("'hello world'");
    expect(c).not.toContain("'hello _ctx");
  });
});

describe('Signal 表达式 - 危险写法必须被拒绝', () => {
  const dangerous = [
    ['语句分隔', `<div :title="a; alert(1)">x</div>`],
    ['箭头函数', `<div :title="() => 1">x</div>`],
    ['function 声明', `<div :title="function(){}">x</div>`],
    ['new 表达式', `<div :title="new Date()">x</div>`],
    ['require', `<div :title="require('fs')">x</div>`],
    ['import()', `<div :title="import('x')">x</div>`],
    ['赋值', `<div :title="x = 1">x</div>`],
    ['delete', `<div :title="delete a.b">x</div>`],
  ] as const;

  for (const [name, tpl] of dangerous) {
    it(`${name} 应被拒绝`, () => {
      expect(signal(tpl)).toThrow();
    });
  }
});
