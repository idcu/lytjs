/**
 * 插槽能力演示（可被浏览器 demo 与集成测试共用同一份代码）
 *
 * 覆盖：具名插槽 / 插槽作用域 / 插槽内 v-for / v-if / v-else / v-show / 组件事件 / v-model。
 */

import { ref } from '@lytjs/reactivity';
import { createVNode } from '@lytjs/vdom';
// 注意：`createSignalRenderer` 必须从 **src** 导入（与 renderer 的测试同源）：
// `@lytjs/renderer` 这个别名在 vitest 里指向 dist（构建产物），其导出与 src 不一致
// （曾出现过 `renderer.render is not a function`）。
import { createSignalRenderer } from '../../packages/renderer/src/signal/signal-renderer';
import type { SignalRenderer } from '../../packages/renderer/src/signal/signal-renderer';

/** 具名插槽 + 默认插槽的卡片组件 */
const Card = {
  name: 'Card',
  setup(_props: unknown, ctx: { slots: Record<string, (() => unknown) | undefined> }) {
    return () =>
      createVNode('section', { class: 'card' }, [
        createVNode('header', { class: 'card-hd' }, ctx.slots.header ? ctx.slots.header() : null),
        createVNode('div', { class: 'card-bd' }, ctx.slots.default ? ctx.slots.default() : null),
        createVNode('footer', { class: 'card-ft' }, ctx.slots.footer ? ctx.slots.footer() : null),
      ]);
  },
};

/** 作用域插槽组件：把 item 通过插槽参数回传给父级 */
const DataList = {
  name: 'DataList',
  setup(
    _props: unknown,
    ctx: { slots: Record<string, ((scope?: unknown) => unknown) | undefined> },
  ) {
    return () => {
      const slot = ctx.slots.default;
      if (!slot) return createVNode('ul', { class: 'list' }, null);
      // 注意：槽函数返回的是**数组**；两次调用若直接放进数组会形成嵌套数组
      //（children = [[li1],[li2]]），渲染器不会自动展平 ⇒ 必须展开。
      const rows = [
        ...((slot({ item: { id: 1, label: '第一条' } }) as unknown[]) ?? []),
        ...((slot({ item: { id: 2, label: '第二条' } }) as unknown[]) ?? []),
      ];
      return createVNode('ul', { class: 'list' }, rows);
    };
  },
};

export interface SlotsDemoHandle {
  renderer: SignalRenderer;
  state: {
    visible: ReturnType<typeof ref<boolean>>;
    items: ReturnType<typeof ref<Array<{ name: string }>>>;
  };
}

/**
 * 把演示挂载到 container。
 * 注意：模板写在组件里（Signal 模式要求根组件提供 template 字符串）。
 */
export function mountSlotsDemo(container: HTMLElement): SlotsDemoHandle {
  const visible = ref(true);
  const items = ref([{ name: 'alpha' }, { name: 'beta' }, { name: 'gamma' }]);
  const text = ref('hello');

  const template = `
    <section class="demo">
      <Card>
        <template #header><h2>具名插槽：header</h2></template>
        <p v-show="visible">默认插槽（受 v-show 控制）</p>
        <span v-if="visible">条件：可见</span>
        <i v-else>条件：隐藏</i>
        <ul><li v-for="it in items">{{ it.name }}</li></ul>
        <template #footer><small>具名插槽：footer</small></template>
      </Card>
      <DataList v-slot="scope"><li class="scoped">{{ scope.item.label }}</li></DataList>
      <input v-model="text" />
    </section>
  `;

  const renderer = createSignalRenderer(template, { visible, items, text, Card, DataList });
  renderer.render(container);
  return { renderer, state: { visible, items } };
}
