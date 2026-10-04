// @vitest-environment jsdom
/**
 * 回归判据：**依赖 props 的 `computed` 会随 props 更新重算**（2026-10-04 修复）
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

describe('回归：依赖 props 的 computed 会随 props 更新重算', () => {
  it('★ 父改 prop 后，依赖 props 的 computed 应重算', async () => {
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

    // ★ 判别点：修复前这里是 UNCHECKED（computed 永久缓存）
    expect(host.querySelector('#child')?.textContent).toBe('CHECKED');
  });
});
