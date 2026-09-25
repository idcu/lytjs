/**
 * Signal 模式下表达式校验的策略（回归防线）
 *
 * 背景：原实现把 `v-bind` 限制为「简单属性访问路径」，导致
 *   :class="['a',{active:ok}]" / :style="{color:c}" / :title="a+'!'" / :title="ok?'a':'b'"
 * 这些**极常见**写法在 Signal 下**直接编译失败**，而同样模板 SSR 却能通过
 * ⇒ 两端不一致、客户端可用性严重受限。
 *
 * 现改为黑名单式：默认信任模板（由开发者书写），只拒绝明显危险/带副作用的模式。
 * 本文件同时锁定「放行什么」与「拒绝什么」——**两侧都必须测**，否则安全策略会悄悄失效。
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';

const signal = (tpl: string) => () =>
  compile(tpl, { rendererMode: 'signal', optimizeSignal: false });
const ssr = (tpl: string) => () => compile(tpl, { ssr: true, ssrMode: true });

describe('Signal 表达式策略 - 应放行的常见写法', () => {
  const legal = [
    ['class 数组', `<div :class="['a','b']">x</div>`],
    ['class 对象', `<div :class="{ active: ok }">x</div>`],
    ['class 混合', `<div :class="['a',{active:ok}]">x</div>`],
    ['style 对象', `<div :style="{ color: c }">x</div>`],
    ['三元', `<div :title="ok ? 'a' : 'b'">x</div>`],
    ['字符串拼接', `<div :title="a + '!'">x</div>`],
    ['属性路径', `<div :title="obj.tip">x</div>`],
    ['索引访问', `<div :title="list[0]">x</div>`],
    ['逻辑运算', `<div :title="a && b">x</div>`],
    ['相等比较', `<div :title="a === b ? 'y' : 'n'">x</div>`],
    ['大于等于', `<div :title="a >= b ? 'y' : 'n'">x</div>`],
  ] as const;

  for (const [name, tpl] of legal) {
    it(`${name} 应可编译，且 SSR 亦可（两端一致）`, () => {
      expect(signal(tpl)).not.toThrow();
      expect(ssr(tpl)).not.toThrow();
    });
  }
});

describe('Signal 表达式策略 - 应拒绝的危险写法', () => {
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
