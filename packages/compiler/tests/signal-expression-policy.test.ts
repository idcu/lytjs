/**
 * Signal 模式下「模板表达式」的**当前支持边界**（回归防线 + 限制登记）
 *
 * 背景：Signal codegen 有十余处直接拼接 `_ctx.${exp}`（假定表达式就是属性路径），
 * 因此 `:class="['a',{b:ok}]"` / `:style="{color:c}"` / ":title=\"a+'!'\"" / 三元 等
 * **常见写法在本模式下不可用**（编译期明确报错），而同样模板在 **SSR 模式可以**。
 * ⇒ 这是**已知的两端能力差异**，不是想要的终态。
 *
 * 正确修法（待专项）：把那十余处 `_ctx.${exp}` 统一改为 `prefixIdentifiers(exp, locals)`，
 * 并处理 v-for / 插槽等 locals 的传递。在此之前**必须保持"明确报错"**——
 * 曾经一度放宽校验，结果生成了 `_ctx.['a','b']` 这类**语法错误的产物**，比报错更糟。
 *
 * 本文件同时锁定两侧：
 *   ① 支持的写法必须**继续支持**（防回退）
 *   ② 不支持的写法必须**明确报错**（防"悄悄产出坏代码"）
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';

const signal = (tpl: string) => () =>
  compile(tpl, { rendererMode: 'signal', optimizeSignal: false });
const ssr = (tpl: string) => () => compile(tpl, { ssr: true, ssrMode: true });

describe('Signal 表达式 - 当前支持的写法（防回退）', () => {
  const supported = [
    ['标识符', `<div :title="t">x</div>`],
    ['属性路径', `<div :title="obj.tip">x</div>`],
    ['深属性路径', `<div :title="a.b.c">x</div>`],
    ['插值标识符', `<div>{{ msg }}</div>`],
    ['插值属性路径', `<div>{{ a.b }}</div>`],
  ] as const;

  for (const [name, tpl] of supported) {
    it(`${name} 应可编译`, () => {
      expect(signal(tpl)).not.toThrow();
    });
  }
});

describe('Signal 表达式 - 当前不支持（应明确报错，而非产出坏代码）', () => {
  // 这些写法 SSR 可以编译 —— 差异本身即为待办事项
  const unsupportedButSsrOk = [
    ['class 数组', `<div :class="['a','b']">x</div>`],
    ['class 对象', `<div :class="{ active: ok }">x</div>`],
    ['class 混合', `<div :class="['a',{active:ok}]">x</div>`],
    ['style 对象', `<div :style="{ color: c }">x</div>`],
    ['三元', `<div :title="ok ? 'a' : 'b'">x</div>`],
    ['字符串拼接', `<div :title="a + '!'">x</div>`],
    ['索引访问', `<div :title="list[0]">x</div>`],
    ['逻辑运算', `<div :title="a && b">x</div>`],
  ] as const;

  for (const [name, tpl] of unsupportedButSsrOk) {
    it(`${name}：Signal 应明确报错（SSR 可编译 —— 差异记为待办）`, () => {
      expect(signal(tpl)).toThrow(/Unsupported expression|Invalid expression/);
      // 记录差异：SSR 端确实支持
      expect(ssr(tpl)).not.toThrow();
    });
  }

  it('不支持的表达式：报错信息应**给出可用替代写法**（而非只说"不支持"）', () => {
    let msg = '';
    try {
      signal(`<div :class="['a','b']">x</div>`)();
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toContain('Unsupported expression');
    // 用户需要"然后怎么办"，而不只是"不能这么做"
    expect(msg).toContain('Workaround');
    expect(msg).toContain('computed');
  });

  const dangerous = [
    ['语句分隔', `<div :title="a; alert(1)">x</div>`],
    ['箭头函数', `<div :title="() => 1">x</div>`],
    ['赋值', `<div :title="x = 1">x</div>`],
  ] as const;

  for (const [name, tpl] of dangerous) {
    it(`${name} 应被拒绝`, () => {
      expect(signal(tpl)).toThrow();
    });
  }
});
