// @vitest-environment jsdom
/**
 * 端到端判据：`setup(props, { slots })` 拿到的 slots **必须是同一个对象**
 * 且**能看到父组件重渲染后的新内容**（P0）
 *
 * ## 修之前实测
 *
 * ```ts
 * // component-setup.ts
 * const context: SetupContext = { slots: instance.slots, … };   // ← 引用
 * // slots.ts（2026-10-27 那次「更新时重建插槽」的修法）
 * instance.slots = slots;                                       // ← 换了个新对象
 * ```
 *
 * 于是组件在 `setup` 里拿到的 `slots` 永远指向**首帧那个 `{}`**：
 *
 * - 父组件重渲染后，`instance.slots` 是新的，但组件看到的还是旧的；
 * - 表现是「**v-if 写在插槽里、切换后组件毫无反应**」，不报错、不告警；
 * - 更迷惑的是：改成渲染时读 `instance.slots` 的组件就是对的
 *   ⇒ 「有的组件正常、有的组件冻结」，极难归因。
 *
 * 触发者：`<Transition>`（本批在修它时撞上）。但**所有**用
 * `setup(_p, { slots })` 的组件都受影响。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h, nextTick, ref } from '../src/index';

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
});

function newHost(): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  return host;
}

/** 一个只在 setup 里**捕获一次** slots 的组件（这正是文档推荐的写法） */
function makeSlotConsumer(render: (slots: Record<string, () => unknown[]>) => unknown) {
  return {
    setup(_p: unknown, { slots }: { slots: Record<string, () => unknown[]> }) {
      // ⚠️ 刻意在 setup 里捕获，不在渲染时读 instance.slots —— 这就是用户写法
      return () => render(slots);
    },
  };
}

describe('slots 对象身份（P0 回归）', () => {
  it('setup 捕获的 slots 在父组件重渲染后能看到新内容', async () => {
    const msg = ref('A');
    const Consumer = makeSlotConsumer((slots) =>
      h('div', { class: 'c' }, slots.default?.() as never),
    );

    const host = newHost();
    await createApp({
      components: { Consumer },
      setup() {
        return { msg };
      },
      template: `<div id="app"><Consumer><span>{{ msg }}</span></Consumer></div>`,
    } as never).mount(host);

    expect(host.textContent).toBe('A');

    msg.value = 'B';
    await nextTick();

    expect(host.textContent).toBe('B');
  });

  it('插槽内容从「无」变「有」（v-if 写在插槽里）', async () => {
    const on = ref(false);
    const Consumer = makeSlotConsumer((slots) => {
      const kids = (slots.default?.() ?? []) as unknown[];
      return h('div', { class: 'c' }, kids as never);
    });

    const host = newHost();
    await createApp({
      components: { Consumer },
      setup() {
        return { on };
      },
      template: `<div id="app"><Consumer><b v-if="on" class="x">X</b></Consumer></div>`,
    } as never).mount(host);

    expect(host.querySelector('.x')).toBeNull();

    on.value = true;
    await nextTick();

    expect(host.querySelector('.x')).not.toBeNull();
  });

  it('插槽内容从「有」变「无」', async () => {
    const on = ref(true);
    const Consumer = makeSlotConsumer((slots) => {
      const kids = (slots.default?.() ?? []) as unknown[];
      return h('div', { class: 'c' }, kids as never);
    });

    const host = newHost();
    await createApp({
      components: { Consumer },
      setup() {
        return { on };
      },
      template: `<div id="app"><Consumer><b v-if="on" class="x">X</b></Consumer></div>`,
    } as never).mount(host);

    expect(host.querySelector('.x')).not.toBeNull();

    on.value = false;
    await nextTick();

    expect(host.querySelector('.x')).toBeNull();
  });

  it('具名插槽的内容变化也要被感知', async () => {
    const n = ref(1);
    const Consumer = makeSlotConsumer((slots) =>
      h('div', { class: 'c' }, [h('header', { class: 'h' }, (slots.header?.() ?? []) as never)]),
    );

    const host = newHost();
    await createApp({
      components: { Consumer },
      setup() {
        return { n };
      },
      template: `<div id="app"><Consumer><template #header><b class="hn">{{ n }}</b></template></Consumer></div>`,
    } as never).mount(host);

    expect(host.querySelector('.hn')!.textContent).toBe('1');

    n.value = 2;
    await nextTick();

    expect(host.querySelector('.hn')!.textContent).toBe('2');
  });

  it('`ctx.slots` 与 `instance.slots` 必须是**同一个对象**（身份判据）', async () => {
    const { getCurrentInstance } = await import('@lytjs/component');

    const flip = ref(false);
    let sameAtSetup = false;
    let sameAfterUpdate = false;
    let ctxSlots: unknown = null;
    let instSlots: unknown = null;

    const Consumer = {
      setup(_p: unknown, ctx: { slots: unknown }) {
        const inst = getCurrentInstance() as { slots?: unknown } | null;
        ctxSlots = ctx.slots;
        instSlots = inst?.slots;
        sameAtSetup = inst?.slots === ctx.slots;
        return () => {
          // 更新后 `instance.slots` 会被重新填充 —— 但**对象身份不能变**
          sameAfterUpdate =
            (getCurrentInstance() as { slots?: unknown } | null)?.slots === ctxSlots ||
            instSlots === ctxSlots;
          return h('div', { class: 'c' }, String(flip.value));
        };
      },
    };

    const host = newHost();
    await createApp({
      components: { Consumer },
      setup() {
        return { flip };
      },
      template: `<div id="app"><Consumer /></div>`,
    } as never).mount(host);

    expect(sameAtSetup).toBe(true);

    flip.value = true;
    await nextTick();

    // 关键：更新时若 `initSlots` 换了新对象，`instSlots !== ctxSlots` 就会暴露
    expect(instSlots).toBe(ctxSlots);
    expect(sameAfterUpdate).toBe(true);
    expect(host.textContent).toBe('true');
  });
});
