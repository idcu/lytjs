/**
 * 自定义指令的**编译产物**（2026-10-31 新增）
 *
 * 背景：`transform-element` 的 `default:` 分支此前只 `context.directives.add(name)`，
 * **不产任何码** ⇒ `<div v-focus>` 编译成普通 div，指令写了等于没写。
 *
 * 判据：执行产物，断言 VNode 上挂的**指令描述符**（运行时就是靠它调钩子）。
 * 钩子是否真的被调用由 `scripts/check-integration.mjs` 的 `[指令]` 段覆盖。
 */
import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';
import { asVNode, execute, type RenderedVNode } from './support/execute';

type Directive = [unknown, unknown, unknown, Record<string, boolean>];

const mount = (template: string, ctx: Record<string, unknown> = {}): RenderedVNode =>
  asVNode(execute(compile(template, { mode: 'function' }))(ctx));

const directivesOf = (node: RenderedVNode): Directive[] =>
  ((node as unknown as { __directives?: Directive[] }).__directives ?? []) as Directive[];

describe('自定义指令的编译产物', () => {
  it('无值指令 → 指令描述符 value 为 undefined', () => {
    const node = mount('<div v-focus></div>');
    expect(directivesOf(node)).toEqual([['focus', undefined, undefined, undefined]]);
  });

  it('带值指令 → value 是**前缀化后的表达式**，且不写进 props', () => {
    const node = mount('<div v-demo="msg"></div>', { msg: 'M' });
    expect(directivesOf(node)).toEqual([['demo', 'M', undefined, undefined]]);
    expect(node.props ?? {}).not.toHaveProperty('msg');
  });

  it('参数与修饰符 → arg 是字符串、modifiers 是对象', () => {
    const node = mount('<div v-demo:bar.prevent.stop="x"></div>', { x: 'X' });
    expect(directivesOf(node)).toEqual([['demo', 'X', 'bar', { prevent: true, stop: true }]]);
  });

  it('动态参数 → arg 按上下文求值', () => {
    const node = mount('<div v-demo:[key]="x"></div>', { key: 'bar', x: 'X' });
    expect(directivesOf(node)[0][2]).toBe('bar');
  });

  it('内置指令**不会**被当作自定义指令派发', () => {
    expect(directivesOf(mount('<div v-show="ok"></div>', { ok: true }))).toEqual([]);
    expect(directivesOf(mount('<div :class="c"></div>', { c: 'x' }))).toEqual([]);
    expect(directivesOf(mount('<div v-if="ok"></div>', { ok: true }))).toEqual([]);
  });

  it('同一元素多个自定义指令 → 同一数组里两项', () => {
    const node = mount('<div v-a v-b="x"></div>', { x: 'X' });
    expect(directivesOf(node)).toEqual([
      ['a', undefined, undefined, undefined],
      ['b', 'X', undefined, undefined],
    ]);
  });

  it('组件标签上的指令也要产码', () => {
    const node = mount('<Child v-demo="x" />', { x: 'X', Child: 'Child' });
    expect(node.type).toBe('Child');
    expect(directivesOf(node)).toEqual([['demo', 'X', undefined, undefined]]);
  });
});
