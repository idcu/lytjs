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
 * 执行产物，断言「初值绑到哪个属性」，并**模拟事件**触发生成的处理器，
 * 断言上下文被写回成什么值。组件形态必须仍走 `modelValue` / `onUpdate:modelValue`。
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';
import { asVNode, execute } from './support/execute';

type Props = Record<string, unknown>;
type Handler = (event: unknown) => void;

interface Mounted {
  props: Props;
  ctx: Record<string, unknown>;
  emit: (name: string, event: unknown) => void;
}

const mount = (template: string, ctx: Record<string, unknown> = {}): Mounted => {
  const node = asVNode(execute(compile(template))(ctx));
  const props = (node.props ?? {}) as Props;
  return {
    props,
    ctx,
    emit: (name, event) => {
      const handler = props[name];
      expect(typeof handler).toBe('function');
      (handler as Handler)(event);
    },
  };
};

describe('原生 v-model（P0 回归）', () => {
  it('input[text] 绑定 value + onInput，输入写回上下文', () => {
    const mounted = mount('<input v-model="msg">', { msg: 'M' });
    expect(mounted.props.value).toBe('M');
    expect(mounted.props).not.toHaveProperty('modelValue');
    mounted.emit('onInput', { target: { value: 'N' } });
    expect(mounted.ctx.msg).toBe('N');
  });

  it('.lazy 走 onChange，失焦式提交才写回', () => {
    const mounted = mount('<input v-model.lazy="msg">', { msg: 'M' });
    expect(mounted.props).not.toHaveProperty('onInput');
    mounted.emit('onChange', { target: { value: 'L' } });
    expect(mounted.ctx.msg).toBe('L');
  });

  it('.trim 写入前裁剪', () => {
    const mounted = mount('<input v-model.trim="msg">', { msg: '' });
    mounted.emit('onInput', { target: { value: '  x  ' } });
    expect(mounted.ctx.msg).toBe('x');
  });

  it('.number 转数字（不走 _ctx.Number）', () => {
    const mounted = mount('<input v-model.number="n">', { n: 0 });
    mounted.emit('onInput', { target: { value: '42' } });
    expect(mounted.ctx.n).toBe(42);
    expect(typeof mounted.ctx.n).toBe('number');
  });

  it('checkbox 绑定 checked + onChange', () => {
    const mounted = mount('<input type="checkbox" v-model="ok">', { ok: true });
    expect(mounted.props.checked).toBe(true);
    mounted.emit('onChange', { target: { checked: false } });
    expect(mounted.ctx.ok).toBe(false);
  });

  it('radio 带 value 时按值比较并赋回', () => {
    const unchecked = mount('<input type="radio" v-model="pick" value="a">', { pick: 'b' });
    expect(unchecked.props.checked).toBe(false);
    unchecked.emit('onChange', { target: { checked: true } });
    expect(unchecked.ctx.pick).toBe('a');

    const checked = mount('<input type="radio" v-model="pick" value="a">', { pick: 'a' });
    expect(checked.props.checked).toBe(true);
  });

  it('textarea 绑定 value + onInput', () => {
    const mounted = mount('<textarea v-model="msg"></textarea>', { msg: 'M' });
    expect(mounted.props.value).toBe('M');
    mounted.emit('onInput', { target: { value: 'T' } });
    expect(mounted.ctx.msg).toBe('T');
  });

  it('select 绑定 value + onChange', () => {
    const mounted = mount('<select v-model="sel"><option>a</option></select>', { sel: 'a' });
    expect(mounted.props.value).toBe('a');
    mounted.emit('onChange', { target: { value: 'b' } });
    expect(mounted.ctx.sel).toBe('b');
  });

  it('组件形态必须保持 modelValue / onUpdate:modelValue', () => {
    const mounted = mount('<Comp v-model="msg" />', { msg: 'M', Comp: 'Comp' });
    expect(mounted.props.modelValue).toBe('M');
    expect(mounted.props).not.toHaveProperty('onInput');
    mounted.emit('onUpdate:modelValue', 'N');
    expect(mounted.ctx.msg).toBe('N');
  });
});
