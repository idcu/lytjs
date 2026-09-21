/**
 * <slot> 编译测试
 *
 * 背景：`transformSlot` 此前既未注册进 builtInTransforms，运行时也没有 renderSlot ——
 * `<slot>` 会被当普通元素编译成 createVNode('slot')，插槽内容静默丢失。
 * 本文件锁定「编译为 renderSlot(...) 调用」这一契约。
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../../src/index';

function compileTemplate(template: string): string {
  return compile(template).code;
}

describe('transformSlot - <slot> 编译', () => {
  it('默认插槽应编译为 renderSlot(_ctx.$slots, "default")', () => {
    const code = compileTemplate('<div><slot/></div>');
    expect(code).toContain('renderSlot(_ctx.$slots, "default"');
  });

  it('具名插槽应编译出对应插槽名', () => {
    const code = compileTemplate('<div><slot name="header"/></div>');
    expect(code).toContain('renderSlot(_ctx.$slots, "header"');
  });

  it('动态插槽名应使用 _ctx 前缀的表达式', () => {
    const code = compileTemplate('<div><slot :name="slotName"/></div>');
    expect(code).toContain('renderSlot(_ctx.$slots, _ctx.slotName');
  });

  it('作用域插槽参数应进入第三个参数（对象）', () => {
    const code = compileTemplate('<div><slot :user="currentUser"/></div>');
    expect(code).toContain('renderSlot(_ctx.$slots, "default", { "user": _ctx.currentUser }');
  });

  it('静态属性应作为插槽参数传入', () => {
    const code = compileTemplate('<div><slot label="hi"/></div>');
    expect(code).toContain('{ "label": "hi" }');
  });

  it('回退内容应作为第四个参数', () => {
    const code = compileTemplate('<div><slot><span>fallback</span></slot></div>');
    expect(code).toContain('renderSlot(_ctx.$slots, "default", {}, ');
    expect(code).toContain('"span"');
  });

  it('应注册 renderSlot helper（产物需要从运行时导入）', () => {
    const result = compile('<div><slot/></div>');
    expect(result.code).toContain('renderSlot(');
    expect(result.preamble).toContain('renderSlot');
  });

  it('slot 出口不应再被编译成 createVNode("slot")', () => {
    const code = compileTemplate('<div><slot/></div>');
    expect(code).not.toContain('"slot"');
  });

  it('slot 作为根节点时应直接产出调用（不再包 createVNode）', () => {
    const code = compileTemplate('<slot/>');
    expect(code).toContain('renderSlot(_ctx.$slots, "default"');
    expect(code).not.toContain('createVNode("slot"');
  });
});
