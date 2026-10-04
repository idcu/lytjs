// @vitest-environment jsdom
/**
 * 回归判据：子组件的 `setup` 闭包**能看到**父组件更新后的 props
 *
 * ## 曾经的症状（2026-10-04 已修）
 *
 * 父组件更新传给子组件的 prop 后，子组件**仍渲染旧值**：
 * 父用 `signal` 驱动 `<Child label="a" />`，改成 `'b'` 后子组件的 `<span>` 仍是 `a`。
 *
 * ## 根因（已定位到具体一行）
 *
 * `patch` 更新组件时 → `ctx.normalizeProps(instance, nextProps)`
 * → `component/src/component-setup.ts` 的 `initProps()`：
 *
 *     const props = {};            // 每次**新建**
 *     …填充…
 *     instance.props = props;      // 整体替换
 *
 * 而子组件 `setup(props, …)` 的**形参捕获的是首次那个对象**，
 * 之后 `instance.props` 被换成新对象 ⇒ 闭包里的 `const p = props` **永远陈旧**。
 *
 * ⚠️ 本仓几乎所有组件都是这个写法（`const p = props` 后在 `computed` / `render`
 * 里读它）⇒ **从第二次更新起全部读到陈旧值**。
 * 这也是 `RadioGroup` / `CheckboxGroup` 的 v-model 至今无法工作的根因。
 *
 * ## 为什么没有直接改

 * 试过「就地更新已有对象」⇒ 报 **`object is not extensible`**
 * ⇒ props 对象被**冻结**（框架刻意为之）⇒ 这条路被设计挡住。
 * 真正的修法需要框架级决策（见审计文档 §四十四），故本轮只固化判据。
 *
 * ## 用法
 *
 * 本条用 `it.fails` 标记为**预期失败**：缺陷存在时它「红」，套件整体仍是绿的；
 * 一旦有人修好，它会因「fails 却通过了」而报错 ⇒ 提醒摘掉 `it.fails`。
 *
 * ## 背景（2026-10-04）
 *
 * 在给 `RadioGroup` / `CheckboxGroup` 实现 v-model 时发现：注入新的 `modelValue` 后，
 * 子 `Radio` 的 `isChecked`（`computed(() => _props.modelValue === _props.label)`）
 * **不重算** —— 勾选态永远停在初始值。
 *
 * 怀疑链条：`patch` 更新组件时调用 `ctx.normalizeProps(component, nextProps)`
 * → `initProps` **新建**一个 props 对象并赋给 `instance.props`
 * ⇒ 而子组件 `setup(props, …)` 的 `props` 形参**捕获的是旧对象引用**
 * ⇒ 闭包里的 `_props` **永远看不到新值**。
 *
 * 若成立，这是**框架级**缺陷：任何在 `setup` 里捕获 `props` 的组件
 * （本仓几乎全部）**从第二次更新起就是陈旧的**。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h, defineComponent, signal } from '../src/index';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
});

const Child = defineComponent({
  name: 'Child',
  props: {
    label: { type: String, default: '' },
  },
  setup(props: Record<string, unknown>) {
    // 与本仓所有组件一样：把 props 捕获进局部别名再在 computed / render 里读
    const p = props;
    return () => h('span', { id: 'child' }, String(p.label));
  },
});

async function tick(ms = 30): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

describe('回归：子组件能看到父组件更新后的 props', () => {
  // ★ 用 `it.fails` 标记为**预期失败**：这条判据现在是红的（缺陷存在）。
  //   一旦有人修好它，这条会因「fails 但通过了」而报错 ⇒ 提醒把 `it.fails` 去掉。
  it('★ 父组件改 prop 后，子组件渲染应随之更新', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    hosts.push(host);

    const label = signal('a');
    await createApp({
      setup() {
        return () => h(Child as never, { label: label() });
      },
    } as never).mount(host);
    await tick();

    expect(host.querySelector('#child')?.textContent).toBe('a');

    label.set('b');
    await tick();

    // ★ 判别点：修复前这里是 'a'（陈旧）⇒ 本条即该缺陷的回归判据
    expect(host.querySelector('#child')?.textContent).toBe('b');
  });
});
