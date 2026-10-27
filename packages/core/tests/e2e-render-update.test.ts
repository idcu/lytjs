// @vitest-environment jsdom
/**
 * 端到端**更新**电池：ref 变了，DOM 真的跟着变吗？
 *
 * ## 为什么单独有这个文件
 *
 * `e2e-template-render.test.ts` 覆盖的是**首帧**：模板 → 编译 → 挂载 → DOM 对不对。
 * 但用户实际感受到的绝大部分问题在**第二次渲染**之后：
 *
 *   · 条件分支切换后旧节点没被移除（页面上两份内容）；
 *   · 列表重排后 DOM 顺序不对，或复用错了节点（输入框的值跟着串位）；
 *   · 父组件重渲染后子组件/插槽还显示旧内容（2026-10-27 修过「插槽冻结」这个 P0）；
 *   · `v-model` 单向（输入能进数据，但数据改了 DOM 不动）。
 *
 * 这些缺陷**首帧断言全部通过**，因为首帧是对的。
 *
 * ## 判据设计
 *
 * 每个用例都：(1) 挂载 → 断言首帧；(2) **改数据** → `await nextTick()` → 断言 DOM。
 * 断言的永远是可观测的页面内容/顺序，不是中间产物。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, nextTick } from '@lytjs/core';
import { ref, reactive, computed } from '@lytjs/reactivity';

afterEach(() => {
  document.body.innerHTML = '';
});

const text = (el: HTMLElement): string => (el.textContent ?? '').trim();

describe('更新：插值与计算属性', () => {
  it('ref 变化后文本必须更新', async () => {
    const msg = ref('a');
    const el = document.createElement('div');
    document.body.appendChild(el);
    await createApp({
      setup() {
        return { msg };
      },
      template: '<p>{{ msg }}</p>',
    } as never).mount(el);

    expect(text(el)).toBe('a');
    msg.value = 'b';
    await nextTick();
    expect(text(el)).toBe('b');
  });

  it('computed 依赖变化后必须更新', async () => {
    const n = ref(1);
    const double = computed(() => n.value * 2);
    const el = document.createElement('div');
    document.body.appendChild(el);
    await createApp({
      setup() {
        return { n, double };
      },
      template: '<p>{{ n }}|{{ double }}</p>',
    } as never).mount(el);

    expect(text(el)).toBe('1|2');
    n.value = 5;
    await nextTick();
    expect(text(el)).toBe('5|10');
  });

  it('深层对象属性变化必须更新', async () => {
    const state = reactive({ user: { name: 'a' } });
    const el = document.createElement('div');
    document.body.appendChild(el);
    await createApp({
      setup() {
        return { state };
      },
      template: '<p>{{ state.user.name }}</p>',
    } as never).mount(el);

    expect(text(el)).toBe('a');
    state.user.name = 'b';
    await nextTick();
    expect(text(el)).toBe('b');
  });
});

describe('更新：条件与显隐', () => {
  it('v-if 真→假必须移除节点，假→真必须重新插入', async () => {
    const show = ref(true);
    const el = document.createElement('div');
    document.body.appendChild(el);
    await createApp({
      setup() {
        return { show };
      },
      template: '<div><span v-if="show">A</span><em v-else>B</em></div>',
    } as never).mount(el);

    expect(el.querySelector('span')?.textContent).toBe('A');
    expect(el.querySelector('em')).toBeNull();

    show.value = false;
    await nextTick();
    expect(el.querySelector('span')).toBeNull();
    expect(el.querySelector('em')?.textContent).toBe('B');

    show.value = true;
    await nextTick();
    expect(el.querySelector('span')?.textContent).toBe('A');
    expect(el.querySelector('em')).toBeNull();
    // 关键：不能留下两份内容
    expect(el.querySelectorAll('span, em')).toHaveLength(1);
  });

  it('v-show 切换 display 且不移除节点', async () => {
    const show = ref(true);
    const el = document.createElement('div');
    document.body.appendChild(el);
    await createApp({
      setup() {
        return { show };
      },
      template: '<div><span v-show="show">A</span></div>',
    } as never).mount(el);

    const span = el.querySelector('span')!;
    expect(span.style.display).toBe('');

    show.value = false;
    await nextTick();
    expect(el.querySelector('span')).toBe(span);
    expect(span.style.display).toBe('none');

    show.value = true;
    await nextTick();
    expect(span.style.display).toBe('');
  });
});

describe('更新：列表（diff 正确性）', () => {
  it('push 后必须新增一项', async () => {
    const list = ref(['a', 'b']);
    const el = document.createElement('div');
    document.body.appendChild(el);
    await createApp({
      setup() {
        return { list };
      },
      template: '<ul><li v-for="x in list" :key="x">{{ x }}</li></ul>',
    } as never).mount(el);

    expect([...el.querySelectorAll('li')].map((n) => n.textContent)).toEqual(['a', 'b']);

    list.value = [...list.value, 'c'];
    await nextTick();
    expect([...el.querySelectorAll('li')].map((n) => n.textContent)).toEqual(['a', 'b', 'c']);
  });

  it('重排后 DOM 顺序必须与数据一致（:key）', async () => {
    const list = ref(['a', 'b', 'c']);
    const el = document.createElement('div');
    document.body.appendChild(el);
    await createApp({
      setup() {
        return { list };
      },
      template: '<ul><li v-for="x in list" :key="x">{{ x }}</li></ul>',
    } as never).mount(el);

    list.value = ['c', 'a', 'b'];
    await nextTick();
    expect([...el.querySelectorAll('li')].map((n) => n.textContent)).toEqual(['c', 'a', 'b']);
    // 不能残留多余节点
    expect(el.querySelectorAll('li')).toHaveLength(3);
  });

  it('删除中间项后必须只剩正确的项', async () => {
    const list = ref(['a', 'b', 'c']);
    const el = document.createElement('div');
    document.body.appendChild(el);
    await createApp({
      setup() {
        return { list };
      },
      template: '<ul><li v-for="x in list" :key="x">{{ x }}</li></ul>',
    } as never).mount(el);

    list.value = ['a', 'c'];
    await nextTick();
    expect([...el.querySelectorAll('li')].map((n) => n.textContent)).toEqual(['a', 'c']);
  });

  it('重排时必须**复用**节点（输入框里的值跟着走，不串位）', async () => {
    const list = ref(['a', 'b']);
    const el = document.createElement('div');
    document.body.appendChild(el);
    await createApp({
      setup() {
        return { list };
      },
      template: '<ul><li v-for="x in list" :key="x"><input :data-k="x" /></li></ul>',
    } as never).mount(el);

    const inputs = [...el.querySelectorAll('input')];
    inputs[0]!.value = 'typed-a';
    inputs[1]!.value = 'typed-b';

    list.value = ['b', 'a'];
    await nextTick();

    const after = [...el.querySelectorAll('input')];
    // key 是 x ⇒ 值必须跟着 key 走，而不是留在原位置
    expect(after[0]!.getAttribute('data-k')).toBe('b');
    expect(after[0]!.value).toBe('typed-b');
    expect(after[1]!.getAttribute('data-k')).toBe('a');
    expect(after[1]!.value).toBe('typed-a');
  });

  it('v-for 支持数字与对象', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    await createApp({
      setup() {
        return { n: 3, obj: { a: 1, b: 2 } };
      },
      template:
        '<div><i v-for="i in n">{{ i }}</i><b v-for="(v, k) in obj">{{ k }}{{ v }}</b></div>',
    } as never).mount(el);

    expect([...el.querySelectorAll('i')].map((x) => x.textContent)).toEqual(['1', '2', '3']);
    expect([...el.querySelectorAll('b')].map((x) => x.textContent)).toEqual(['a1', 'b2']);
  });
});

describe('更新：绑定与双向', () => {
  it(':class 对象增删必须生效', async () => {
    const on = ref(true);
    const el = document.createElement('div');
    document.body.appendChild(el);
    await createApp({
      setup() {
        return { on };
      },
      template: '<div><span :class="{ active: on }">A</span></div>',
    } as never).mount(el);

    const span = el.querySelector('span')!;
    expect(span.className).toBe('active');

    on.value = false;
    await nextTick();
    expect(span.className).toBe('');
  });

  it(':style 对象增删必须生效', async () => {
    const color = ref('red');
    const el = document.createElement('div');
    document.body.appendChild(el);
    await createApp({
      setup() {
        return { color };
      },
      template: '<div><span :style="{ color }">A</span></div>',
    } as never).mount(el);

    const span = el.querySelector('span') as HTMLElement;
    expect(span.style.color).toBe('red');

    color.value = 'blue';
    await nextTick();
    expect(span.style.color).toBe('blue');
  });

  it('v-model：输入事件写回数据，数据变化再写回 DOM', async () => {
    const msg = ref('a');
    const el = document.createElement('div');
    document.body.appendChild(el);
    await createApp({
      setup() {
        return { msg };
      },
      template: '<div><input v-model="msg" /><p>{{ msg }}</p></div>',
    } as never).mount(el);

    const input = el.querySelector('input')!;
    expect(input.value).toBe('a');

    // ① 输入 → 数据
    input.value = 'typed';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    expect(msg.value).toBe('typed');
    expect(el.querySelector('p')!.textContent).toBe('typed');

    // ② 数据 → DOM
    msg.value = 'from-data';
    await nextTick();
    expect(input.value).toBe('from-data');
  });

  it('v-model：checkbox 勾选写回布尔', async () => {
    const checked = ref(false);
    const el = document.createElement('div');
    document.body.appendChild(el);
    await createApp({
      setup() {
        return { checked };
      },
      template: '<div><input type="checkbox" v-model="checked" /></div>',
    } as never).mount(el);

    const box = el.querySelector('input') as HTMLInputElement;
    expect(box.checked).toBe(false);

    box.checked = true;
    box.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();
    expect(checked.value).toBe(true);
  });
});

describe('更新：组件与插槽', () => {
  it('子组件 props 变化必须更新其 DOM', async () => {
    const label = ref('a');
    const Child = {
      props: { label: { type: String, default: '' } },
      template: '<span>{{ label }}</span>',
    };
    const el = document.createElement('div');
    document.body.appendChild(el);
    await createApp({
      setup() {
        return { label };
      },
      components: { Child },
      template: '<div><Child :label="label" /></div>',
    } as never).mount(el);

    expect(el.querySelector('span')!.textContent).toBe('a');
    label.value = 'b';
    await nextTick();
    expect(el.querySelector('span')!.textContent).toBe('b');
  });

  it('父重渲染后插槽内容必须跟着更新（插槽冻结回归）', async () => {
    const msg = ref('a');
    const Child = {
      template: '<div class="child"><slot /></div>',
    };
    const el = document.createElement('div');
    document.body.appendChild(el);
    await createApp({
      setup() {
        return { msg };
      },
      components: { Child },
      template: '<div><Child><i>{{ msg }}</i></Child></div>',
    } as never).mount(el);

    expect(el.querySelector('.child i')!.textContent).toBe('a');
    msg.value = 'b';
    await nextTick();
    expect(el.querySelector('.child i')!.textContent).toBe('b');
  });

  it('卸载后数据变化不得再更新 DOM', async () => {
    const msg = ref('a');
    const el = document.createElement('div');
    document.body.appendChild(el);

    const app = createApp({
      setup() {
        return { msg };
      },
      template: '<p>{{ msg }}</p>',
    } as never);
    await app.mount(el);

    expect(el.querySelector('p')!.textContent).toBe('a');

    // 先确认「未卸载时更新是生效的」—— 否则下面的断言可能因为「本来就不更新」而假绿
    msg.value = 'b';
    await nextTick();
    expect(el.querySelector('p')!.textContent).toBe('b');

    app.unmount();
    msg.value = 'c';
    await nextTick();
    // 卸载后容器已被清空；即便重新查询也不该出现 'c'
    expect(el.textContent ?? '').not.toContain('c');
  });
});
