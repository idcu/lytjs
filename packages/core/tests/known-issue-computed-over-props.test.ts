// @vitest-environment jsdom
/**
 * ★ 已知缺陷（2026-10-04 定位，**未修**）：**依赖 props 的 `computed` 不随 props 更新重算**
 *
 * ## 背景
 *
 * 已有回归判据证明「子组件 render 里直接读 `props.x`」在 2026-10-04 修复后
 * 能拿到新值（`known-issue-child-props-stale.test.ts`）。
 * 但 `RadioGroup` 的 v-model 仍不更新，其子组件 `Radio` 的选中态是
 * **`computed(() => _props.modelValue === _props.label)`** ⇒ 本条隔离「computed 这条路」。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h, defineComponent, signal, computed } from '../src/index';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
});

const Child = defineComponent({
  name: 'ChildComputed',
  props: {
    modelValue: { type: String, default: '' },
  },
  setup(props: Record<string, unknown>) {
    const p = props;
    // 与本仓 UI 组件同构：`computed` 读 props
    const isChecked = computed(() => p.modelValue === 'b');
    return () => h('span', { id: 'child' }, isChecked.value ? 'CHECKED' : 'UNCHECKED');
  },
});

describe('已知缺陷：依赖 props 的 computed 能否随 props 更新重算', () => {
  // ★ 用 `it.fails` 标记为**预期失败**：缺陷存在时它「红」，套件整体仍绿；
  //   一旦有人修好，它会因「fails 却通过了」而报错 ⇒ 提醒摘掉 `it.fails`。
  it.fails('★ 父改 prop 后，依赖 props 的 computed 应重算（当前不重算）', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    hosts.push(host);

    const mv = signal('a');
    await createApp({
      setup() {
        return () => h(Child as never, { modelValue: mv() });
      },
    } as never).mount(host);
    await new Promise((r) => setTimeout(r, 30));

    expect(host.querySelector('#child')?.textContent).toBe('UNCHECKED');

    mv.set('b');
    await new Promise((r) => setTimeout(r, 30));

    // ★ 判别点：若仍是 UNCHECKED ⇒ computed 这条路仍不通
    expect(host.querySelector('#child')?.textContent).toBe('CHECKED');
  });
});
