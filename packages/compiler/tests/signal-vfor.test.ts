// @vitest-environment jsdom
/**
 * Signal/Vapor 模式 v-for 项生成测试
 *
 * 修复前实测产物：
 *   reconcileArray(_n, _c.items, { key:(item)=>item.id,
 *     create:(item)=>{ const _li=document.createElement('li'); return _li; } })
 * —— 列表项里的插值（`{{ item.name }}`）与绑定属性**完全没有生成**，
 * 因为优化版 codegen 只认「字符串子节点」和「裸 SIMPLE_EXPRESSION」两种形态，
 * 而插值在 AST 里是 JS_CALL_EXPRESSION(TO_DISPLAY_STRING)。
 *
 * 断言方式：在 jsdom 里执行产物，检查真实列表 DOM / mountComponent 实参。
 */

import { describe, it, expect, vi } from 'vitest';
import { reactive } from '@lytjs/reactivity';
import { Text } from '@lytjs/vdom';
import { compile as compileImpl } from '../src/index';
import { asVNode, execute, executeSignal } from './support/execute';

/** A04/D1：本文件断言优化版产物，故显式开启 optimizeSignal（断言未改动）。 */
const compile = (template: string, options: Parameters<typeof compileImpl>[1] = {}) =>
  compileImpl(template, { rendererMode: 'signal', optimizeSignal: true, ...options });

const mount = (template: string, ctx: Record<string, unknown> = {}) =>
  executeSignal(compile(template), ctx);

const itemsOf = (handle: ReturnType<typeof mount>) => [...handle.container.querySelectorAll('li')];

interface MountCall {
  comp: unknown;
  props?: Record<string, unknown>;
  host: Element;
  slots?: Record<string, (arg?: unknown) => unknown[]>;
}

/** 执行产物并捕获 mountComponent 的实参（组件、props、宿主、插槽） */
const mountComponentCalls = (
  template: string,
  ctx: Record<string, unknown> = {},
  options: Parameters<typeof compileImpl>[1] = {},
): MountCall[] => {
  const calls: MountCall[] = [];
  executeSignal(compile(template, options), ctx, {
    mountComponent: (
      comp: unknown,
      props: Record<string, unknown>,
      host: Element,
      slots?: MountCall['slots'],
    ) => {
      calls.push({ comp, props, host, slots });
    },
  });
  return calls;
};

const sample = () => [
  { id: 1, name: 'a' },
  { id: 2, name: 'b' },
];

describe('Signal 模式 - v-for 项内容', () => {
  it('插值应写入元素 textContent', () => {
    expect(
      itemsOf(
        mount('<ul><li v-for="item in items">{{ item.name }}</li></ul>', { items: sample() }),
      ).map((li) => li.textContent),
    ).toEqual(['a', 'b']);
  });

  it('应生成 update 回调驱动响应式更新', () => {
    const state = reactive({ items: [{ id: 1, name: 'a' }] });
    const handle = mount('<ul><li v-for="item in items">{{ item.name }}</li></ul>', state);
    expect(itemsOf(handle)[0].textContent).toBe('a');

    // update 回调必须订阅到列表项：改名后 DOM 跟随
    state.items[0].name = 'b';
    expect(itemsOf(handle)[0].textContent).toBe('b');
  });

  it('静态文本子节点应写死', () => {
    expect(
      itemsOf(mount('<ul><li v-for="item in items">static</li></ul>', { items: sample() })).map(
        (li) => li.textContent,
      ),
    ).toEqual(['static', 'static']);
  });

  it('静态文本含反斜杠与引号时应正确转义（C-04）', () => {
    // 文本字面量同时含单引号与反斜杠：转义顺序颠倒会先产出 `\'`，
    // 再被反斜杠转义二次处理成 `\\\'`，最终源码 `'it\\'s a\\b'` 语法错误。
    const raw = "it's a\\b";
    // 缺陷在基础实现（`optimizeSignal` 默认关闭）的列表项发射路径。
    const handle = executeSignal(
      compile(`<ul><li v-for="item in items">${raw}</li></ul>`, { optimizeSignal: false }),
      { items: sample() },
    );
    expect(itemsOf(handle).map((li) => li.textContent)).toEqual([raw, raw]);
  });

  it('动态属性应写入 create 与 update', () => {
    const state = reactive({
      items: [{ id: 1, title: 'T', name: 'a' }],
    });
    const handle = mount(
      '<ul><li v-for="item in items" :title="item.title">{{ item.name }}</li></ul>',
      state,
    );
    expect(itemsOf(handle)[0].getAttribute('title')).toBe('T');

    state.items[0].title = 'U';
    expect(itemsOf(handle)[0].getAttribute('title')).toBe('U');
  });

  it('静态属性只写在 create 里', () => {
    const handle = mount('<ul><li v-for="item in items" class="row">{{ item.name }}</li></ul>', {
      items: sample(),
    });
    expect(itemsOf(handle).map((li) => li.className)).toEqual(['row', 'row']);
  });

  it('用户 :key 应被采用（不再写死 item.id）', () => {
    // ⚠️ S25b 保留：key 函数的行为差异只体现在 reconciliation 的**节点复用**上，
    //   渲染结果（文本/顺序）在同一输入下不可区分；这里保留产物形态断言，
    //   以确保用户 :key 不被内部默认 `item.id` 覆盖（公开契约，非实现细节）。
    const code = compile(
      '<ul><li v-for="item in items" :key="item.uuid">{{ item.name }}</li></ul>',
    ).code;
    expect(code).toContain('key:(item)=>item.uuid');
    expect(code).not.toMatch(/key:\(item\)=>item\.id/);
  });

  it('不应再产出 item.item.name 这类错误路径', () => {
    const handle = mount('<ul><li v-for="item in items">{{ item.name }}</li></ul>', {
      items: sample(),
    });
    // 错误路径会渲染成 `undefined`
    expect(itemsOf(handle).map((li) => li.textContent)).toEqual(['a', 'b']);
  });
});

describe('Signal 模式 - 子组件（两版 codegen 均已支持挂载）', () => {
  it('应生成 mountComponent 调用（而不是把标签当 HTML 输出）', () => {
    const Child = {};
    const call = mountComponentCalls('<div><Child :title="t"/></div>', { Child, t: 'T' })[0];
    expect(call.comp).toBe(Child);
    expect(call.props).toEqual({ title: 'T' });
    expect(call.host.tagName).toBe('LYT-COMP');
  });

  it('组件应被序列化为占位元素以保持结构位置', () => {
    const Child = {};
    const call = mountComponentCalls('<div><span>a</span><Child/><b>b</b></div>', { Child })[0];
    // 占位必须是元素（不是注释）：注释不在 element.children 里会打乱下标
    expect(call.host.tagName).toBe('LYT-COMP');
    expect(call.host.getAttribute('data-lyt-comp')).toBe('Child');
    const children = [...(call.host.parentElement as Element).children];
    expect(children.map((child) => child.tagName)).toEqual(['SPAN', 'LYT-COMP', 'B']);
  });

  it('静态属性应进入 props 对象', () => {
    expect(mountComponentCalls('<div><Child a="1"/></div>', { Child: {} })[0].props).toEqual({
      a: '1',
    });
  });

  it('无值静态属性应写为 true', () => {
    expect(mountComponentCalls('<div><Child flag/></div>', { Child: {} })[0].props).toEqual({
      flag: true,
    });
  });

  it('v-bind 对象语法（无 arg）应被忽略而不是产出非法 props', () => {
    const call = mountComponentCalls('<div><Child v-bind="obj"/></div>', {
      Child: {},
      obj: { a: 1 },
    })[0];
    expect(call.props).toEqual({});
  });

  it('事件指令应编译为 onXxx prop（供组件 emit 回查）', () => {
    const onClick = vi.fn();
    expect(
      mountComponentCalls('<div><Child @click="onClick"/></div>', { Child: {}, onClick })[0].props
        ?.onClick,
    ).toBe(onClick);
  });

  it('kebab-case 事件名应 camelize 为 onXxx', () => {
    const fn = vi.fn();
    expect(
      mountComponentCalls('<div><Child @my-event="fn"/></div>', { Child: {}, fn })[0].props
        ?.onMyEvent,
    ).toBe(fn);
  });

  it('非优化版（optimizeSignal:false）同样支持组件挂载，不再误报告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Child = {};
    const calls = mountComponentCalls('<div><Child/></div>', { Child }, { optimizeSignal: false });

    expect(calls).toHaveLength(1);
    expect(calls[0].comp).toBe(Child);
    // 不再输出"暂不支持子组件"的误导性告警
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('暂不支持子组件'));
    warn.mockRestore();
  });

  it('组件子内容应编译为默认插槽（vnode 形态，短别名）', () => {
    const call = mountComponentCalls('<div><Child>hello</Child></div>', { Child: {} })[0];
    const [vnode] = call.slots!.default() as Array<{ type: unknown; children: unknown }>;
    expect(vnode.type).toBe(Text);
    expect(vnode.children).toBe('hello');
  });

  it('无子内容的组件不应带插槽参数', () => {
    const call = mountComponentCalls('<div><Child/></div>', { Child: {} })[0];
    expect(call.slots).toBeUndefined();
    expect(call.props).toEqual({});
  });

  it('插槽内插值应编译为动态文本 vnode', () => {
    const call = mountComponentCalls('<div><Child>{{ msg }}</Child></div>', {
      Child: {},
      msg: 'M',
    })[0];
    expect((call.slots!.default()[0] as { children: unknown }).children).toBe('M');
  });

  it('插槽内元素的绑定与事件应进入 vnode props', () => {
    const bind = mountComponentCalls('<div><Child><span :title="t">x</span></Child></div>', {
      Child: {},
      t: 'T',
    })[0];
    expect((bind.slots!.default()[0] as { props: unknown }).props).toEqual({ title: 'T' });

    const fn = () => undefined;
    const on = mountComponentCalls('<div><Child><span @click="fn">x</span></Child></div>', {
      Child: {},
      fn,
    })[0];
    expect((on.slots!.default()[0] as { props: Record<string, unknown> }).props.onClick).toBe(fn);
  });

  it('插槽内 v-if 应编译为条件 vnode', () => {
    const tpl = '<div><Child><span v-if="ok">x</span></Child></div>';
    expect(
      (
        mountComponentCalls(tpl, { Child: {}, ok: true })[0].slots!.default()[0] as {
          type: unknown;
        }
      ).type,
    ).toBe('span');
    expect(mountComponentCalls(tpl, { Child: {}, ok: false })[0].slots!.default()[0]).toBeNull();
  });

  it('插槽内 v-else 应编译为三元另支', () => {
    const tpl = '<div><Child><span v-if="ok">a</span><span v-else>b</span></Child></div>';
    const textOf = (ok: boolean) =>
      (
        mountComponentCalls(tpl, { Child: {}, ok })[0].slots!.default()[0] as {
          children: Array<{ children: unknown }>;
        }
      ).children[0].children;
    expect(textOf(true)).toBe('a');
    expect(textOf(false)).toBe('b');
  });

  it('插槽内 v-else-if 链应编译为嵌套三元', () => {
    const tpl =
      '<div><Child><span v-if="a">x</span><span v-else-if="b">y</span><span v-else>z</span></Child></div>';
    const textOf = (ctx: Record<string, unknown>) =>
      (
        mountComponentCalls(tpl, { Child: {}, ...ctx })[0].slots!.default()[0] as {
          children: Array<{ children: unknown }>;
        }
      ).children[0].children;
    expect(textOf({ a: true })).toBe('x');
    expect(textOf({ a: false, b: true })).toBe('y');
    expect(textOf({ a: false, b: false })).toBe('z');
  });

  it('插槽内 v-if 内容含 v-for 时应展开为 vnode 列表', () => {
    const call = mountComponentCalls(
      '<div><Child><span v-if="ok"><i v-for="x in xs">y</i></span></Child></div>',
      { Child: {}, ok: true, xs: ['1'] },
    )[0];
    const branch = call.slots!.default()[0] as { type: string; children: Array<{ type: string }> };
    expect(branch.type).toBe('span');
    expect(branch.children).toHaveLength(1);
    expect(branch.children[0].type).toBe('i');
  });

  it('插槽内 v-if 空内容应生成 null children', () => {
    const call = mountComponentCalls('<div><Child><span v-if="ok"></span></Child></div>', {
      Child: {},
      ok: true,
    })[0];
    expect((call.slots!.default()[0] as { children: unknown }).children).toBeNull();
  });

  it('插槽内 v-show 应编译为 style.display 绑定', () => {
    const ctx: Record<string, unknown> = { Child: {}, s: true };
    const call = mountComponentCalls('<div><Child><i v-show="s">y</i></Child></div>', ctx)[0];
    const styleOf = () =>
      (call.slots!.default()[0] as { props: { style: Record<string, unknown> } }).props.style;
    expect(styleOf().display).toBe('');
    ctx.s = false;
    expect(styleOf().display).toBe('none');
  });

  it('插槽内 v-for 应编译为 map 展开（短别名）', () => {
    const call = mountComponentCalls(
      '<div><Child><li v-for="item in items">{{ item.name }}</li></Child></div>',
      { Child: {}, items: sample() },
    )[0];
    const list = call.slots!.default() as Array<{
      type: string;
      children: Array<{ children: unknown }>;
    }>;
    expect(list.map((vnode) => vnode.type)).toEqual(['li', 'li']);
    expect(list.map((vnode) => vnode.children[0].children)).toEqual(['a', 'b']);
  });

  it('插槽内 v-for 的循环变量不应被加前缀', () => {
    const call = mountComponentCalls(
      '<div><Child><li v-for="(item, i) in items" :key="item.id">{{ item.name }}</li></Child></div>',
      { Child: {}, items: sample() },
    )[0];
    const list = call.slots!.default() as Array<{
      props: Record<string, unknown>;
      children: Array<{ children: unknown }>;
    }>;
    // _c.item 前缀会让 key / 文本都变成 undefined
    expect(list.map((vnode) => vnode.props.key)).toEqual([1, 2]);
    expect(list.map((vnode) => vnode.children[0].children)).toEqual(['a', 'b']);
  });

  it('具名插槽应编译为独立插槽函数（短别名）', () => {
    const call = mountComponentCalls(
      '<div><Child><template #header>H</template>body</Child></div>',
      { Child: {} },
    )[0];
    expect((call.slots!.header()[0] as { children: unknown }).children).toBe('H');
    expect((call.slots!.default()[0] as { children: unknown }).children).toBe('body');
  });

  it('插槽作用域应作为插槽函数参数传入且不加前缀', () => {
    const call = mountComponentCalls('<div><Child v-slot="p">{{ p.x }}</Child></div>', {
      Child: {},
    })[0];
    expect((call.slots!.default({ x: 'X' })[0] as { children: unknown }).children).toBe('X');
  });

  it('VNode 模式组件标签应前缀化', () => {
    const Child = {};
    const vnode = asVNode(
      execute(compileImpl('<div><Child/></div>', { rendererMode: 'vnode' }))({ Child }),
    );
    expect(vnode.type).toBe('div');
    expect((asVNode(vnode.children) as { type: unknown }).type).toBe(Child);
  });
});
