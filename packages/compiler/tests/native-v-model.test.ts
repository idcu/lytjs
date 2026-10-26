/**
 * 原生表单元素的 v-model（P0 回归电池）
 *
 * ## 为什么需要这条
 *
 * 2026-10-26 的评估实测：`handleVModel` **不分元素类型**，一律产出
 * `{ modelValue, "onUpdate:modelValue" }`。这对组件是对的，对原生表单元素是**静默失效**：
 *
 *   <input v-model="msg">  →  { "modelValue": _ctx.msg, "onUpdate:modelValue": ... }
 *
 * 原生 input 不认识 `modelValue`，只认 `value` + `oninput`。结果是：
 * 输入框没有初值、用户打字后 `msg` 永远不变，**且不报错**。
 *
 * ## 判据
 *
 * 按元素类型断言「绑定到哪个属性 / 哪个事件」，以及 `.lazy` / `.number` / `.trim` 的产物。
 * 组件形态必须保持 `modelValue`（不能被这次修复误伤）。
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';

const compileOne = (template: string): string => compile(template).code;

describe('原生 v-model（P0 回归）', () => {
  it('input[text] 绑定 value + onInput', () => {
    const code = compileOne('<input v-model="msg">');
    expect(code).toContain('"value": _ctx.msg');
    expect(code).toContain('"onInput": $event => (_ctx.msg = $event.target.value)');
    expect(code).not.toContain('modelValue');
  });

  it('.lazy 走 onChange', () => {
    const code = compileOne('<input v-model.lazy="msg">');
    expect(code).toContain('"onChange"');
    expect(code).not.toContain('"onInput"');
  });

  it('.trim 读取时裁剪', () => {
    const code = compileOne('<input v-model.trim="msg">');
    expect(code).toContain('$event.target.value.trim()');
  });

  it('.number 转数字（用一元 +，不得出现 _ctx.Number）', () => {
    const code = compileOne('<input v-model.number="n">');
    expect(code).toContain('+($event.target.value)');
    expect(code).not.toContain('_ctx.Number');
  });

  it('checkbox 绑定 checked + onChange', () => {
    const code = compileOne('<input type="checkbox" v-model="ok">');
    expect(code).toContain('"checked": _ctx.ok');
    expect(code).toContain('$event.target.checked');
  });

  it('radio 带 value 时按值比较并赋回', () => {
    const code = compileOne('<input type="radio" v-model="pick" value="a">');
    expect(code).toContain('"checked": _ctx.pick === "a"');
    expect(code).toContain('_ctx.pick = "a"');
  });

  it('textarea 绑定 value + onInput', () => {
    const code = compileOne('<textarea v-model="msg"></textarea>');
    expect(code).toContain('"value": _ctx.msg');
    expect(code).toContain('"onInput"');
  });

  it('select 绑定 value + onChange', () => {
    const code = compileOne('<select v-model="sel"><option>a</option></select>');
    expect(code).toContain('"value": _ctx.sel');
    expect(code).toContain('"onChange"');
  });

  it('组件形态必须保持 modelValue / onUpdate:modelValue', () => {
    const code = compileOne('<Comp v-model="msg" />');
    expect(code).toContain('"modelValue": _ctx.msg');
    expect(code).toContain('"onUpdate:modelValue"');
    expect(code).not.toContain('"onInput"');
  });
});
