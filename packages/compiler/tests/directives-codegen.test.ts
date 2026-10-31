/**
 * 自定义指令的**编译产物**（2026-10-31 新增）
 *
 * 背景：`transform-element` 的 `default:` 分支此前只 `context.directives.add(name)`，
 * **不产任何码** ⇒ `<div v-focus>` 编译成普通 div，指令写了等于没写。
 *
 * 这里只断言**产物形状**；运行时行为（钩子是否真的被调用）由
 * `scripts/check-integration.mjs` 的 `[指令]` 段覆盖。
 */
import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';

const gen = (template: string): string => compile(template, { mode: 'function' }).code;

describe('自定义指令的编译产物', () => {
  it('无值指令 → withDirectives 包裹，value 为 void 0', () => {
    const code = gen('<div v-focus></div>');
    expect(code).toContain('withDirectives(');
    expect(code).toContain('resolveDirective("focus")');
    expect(code).toContain('void 0');
  });

  it('带值指令 → value 是**前缀化后的表达式**', () => {
    const code = gen('<div v-demo="msg"></div>');
    expect(code).toContain('resolveDirective("demo")');
    expect(code).toContain('_ctx.msg');
    // 曾经的缺陷：值被当成普通属性写进 props
    expect(code).not.toContain('="msg"');
  });

  it('参数与修饰符 → arg 是字符串字面量、modifiers 是对象', () => {
    const code = gen('<div v-demo:bar.prevent.stop="x"></div>');
    expect(code).toContain('"bar"');
    expect(code).toContain('"prevent":true');
    expect(code).toContain('"stop":true');
  });

  it('动态参数 → arg 是表达式而非字面量', () => {
    const code = gen('<div v-demo:[key]="x"></div>');
    expect(code).toContain('_ctx.key');
  });

  it('内置指令**不会**被 withDirectives 包裹', () => {
    expect(gen('<div v-show="ok"></div>')).not.toContain('withDirectives(');
    expect(gen('<div :class="c"></div>')).not.toContain('withDirectives(');
    expect(gen('<div v-if="ok"></div>')).not.toContain('withDirectives(');
  });

  it('同一元素多个自定义指令 → 同一数组里两项', () => {
    const code = gen('<div v-a v-b="x"></div>');
    expect(code).toContain('resolveDirective("a")');
    expect(code).toContain('resolveDirective("b")');
  });

  it('组件标签上的指令也要产码', () => {
    const code = gen('<Child v-demo="x" />');
    expect(code).toContain('withDirectives(');
    expect(code).toContain('resolveDirective("demo")');
  });
});
