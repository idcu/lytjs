// @vitest-environment jsdom
/**
 * `core-vnode/src/web-component.ts` 行为电池。
 *
 * 既有 `core/tests/web-component.test.ts` 覆盖的是**形状**（构造器类型、shadowRoot 是否存在、
 * observedAttributes 列表），**从未断言渲染输出** —— 所有组件都是 `render() { return null }`。
 * 本文件补**行为**：真的渲染出东西、attribute 变更真的生效、生命周期真的按次触发、
 * 上下文 API 真的返回当前元素。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createVNode } from '@lytjs/vdom';
import { onMounted, onUnmounted, onBeforeUnmount } from '@lytjs/component';
import {
  defineCustomElement,
  useShadowRoot,
  useHost,
  useWebComponentSlots,
  injectChildStyles,
} from '../src/web-component';

let container: HTMLElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  container.remove();
  vi.restoreAllMocks();
});

/** 定义并挂载一个自定义元素，返回宿主元素 */
function mount(
  tag: string,
  componentOptions: Record<string, unknown>,
  attrs: Record<string, string> = {},
  elementOptions: Record<string, unknown> = {},
): HTMLElement {
  defineCustomElement(componentOptions as never, { name: tag, ...elementOptions });
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  container.appendChild(el);
  return el;
}

describe('注册与 observedAttributes', () => {
  it('用组件 name（camelCase ⇒ kebab）作为默认标签名', () => {
    const ctor = defineCustomElement({ name: 'BatteryAutoName', render: () => null } as never);

    expect(customElements.get('battery-auto-name')).toBe(ctor);
  });

  it('无 name 时退化为 lyt-component', () => {
    const ctor = defineCustomElement({ render: () => null } as never);

    expect(customElements.get('lyt-component')).toBe(ctor);
  });

  it('显式 name 优先于组件 name', () => {
    const ctor = defineCustomElement({ name: 'ignored-name', render: () => null } as never, {
      name: 'battery-explicit',
    });

    expect(customElements.get('battery-explicit')).toBe(ctor);
  });

  it('observedAttributes 由 props 派生并转 kebab', () => {
    const ctor = defineCustomElement(
      {
        name: 'BatteryObserved',
        props: { msg: { type: String }, maxLength: { type: Number } },
        render: () => null,
      } as never,
      { name: 'battery-observed' },
    );

    expect(ctor.observedAttributes).toEqual(['msg', 'max-length']);
  });

  it('无 props 时 observedAttributes 为空', () => {
    const ctor = defineCustomElement({ name: 'BatteryNoProps', render: () => null } as never, {
      name: 'battery-no-props',
    });

    expect(ctor.observedAttributes).toEqual([]);
  });

  it('同名重复注册不覆盖首次注册的构造器', () => {
    const first = defineCustomElement({ render: () => null } as never, { name: 'battery-dup' });
    const second = defineCustomElement({ render: () => null } as never, { name: 'battery-dup' });

    expect(customElements.get('battery-dup')).toBe(first);
    expect(second).not.toBe(first);
  });
});

describe('shadow DOM 与样式', () => {
  it('默认创建 open 模式的 shadowRoot', () => {
    const el = mount('battery-shadow', { render: () => null });

    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot!.mode).toBe('open');
  });

  it('shadowRoot:false 时不建 shadow，内容进 light DOM', () => {
    const el = mount(
      'battery-no-shadow',
      { render: () => createVNode('div', null, 'light') },
      {},
      { shadowRoot: false },
    );

    expect(el.shadowRoot).toBeNull();
    expect(el.textContent).toContain('light');
  });

  it('css 注入为 shadowRoot 内的 <style>', () => {
    const el = mount('battery-css', { render: () => null }, {}, { css: '.a{color:red}' });

    const style = el.shadowRoot!.querySelector('style');

    expect(style).not.toBeNull();
    expect(style!.textContent).toBe('.a{color:red}');
  });

  it('css 为空串时不注入 style', () => {
    const el = mount('battery-empty-css', { render: () => null }, {}, { css: '' });

    expect(el.shadowRoot!.querySelector('style')).toBeNull();
  });
});

describe('渲染与 props 反序列化', () => {
  const textComp = {
    name: 'BatteryText',
    props: { msg: { type: String } },
    render(this: { msg?: string }) {
      return createVNode('div', null, `msg=${this.msg}`);
    },
  };

  it('★ 真的把组件渲染进 shadowRoot（不是空壳）', () => {
    const el = mount('battery-text', textComp, { msg: 'hello' });

    expect(el.shadowRoot!.textContent).toBe('msg=hello');
  });

  it('Number 类型的 attribute 被反序列化为数字', () => {
    const el = mount(
      'battery-number',
      {
        props: { count: { type: Number } },
        render(this: { count?: number }) {
          return createVNode('div', null, `${typeof this.count}:${this.count}`);
        },
      },
      { count: '42' },
    );

    expect(el.shadowRoot!.textContent).toBe('number:42');
  });

  it('Number 类型遇到非数字时保留原字符串（不产生 NaN）', () => {
    const el = mount(
      'battery-number-bad',
      {
        props: { count: { type: Number } },
        render(this: { count?: unknown }) {
          return createVNode('div', null, `${typeof this.count}:${String(this.count)}`);
        },
      },
      { count: 'abc' },
    );

    expect(el.shadowRoot!.textContent).toBe('string:abc');
  });

  it('Boolean 类型：`false`/`0` 为假，其他值为真', () => {
    const el = mount(
      'battery-bool',
      {
        props: { a: { type: Boolean }, b: { type: Boolean }, c: { type: Boolean } },
        render(this: { a?: boolean; b?: boolean; c?: boolean }) {
          return createVNode('div', null, `${this.a}/${this.b}/${this.c}`);
        },
      },
      { a: 'false', b: '0', c: 'yes' },
    );

    expect(el.shadowRoot!.textContent).toBe('false/false/true');
  });

  it('★ Boolean 类型：属性存在但无值（`<x active>`）应为 true', () => {
    const el = mount(
      'battery-bool-empty',
      {
        props: { active: { type: Boolean } },
        render(this: { active?: boolean }) {
          return createVNode('div', null, String(this.active));
        },
      },
      { active: '' },
    );

    // HTML 的布尔属性约定：**存在即为真**（`<x active>` 与 `active=""` 等价）
    expect(el.shadowRoot!.textContent).toBe('true');
  });

  it('未提供的 attribute 得到 undefined', () => {
    const el = mount('battery-absent', textComp);

    expect(el.shadowRoot!.textContent).toBe('msg=undefined');
  });

  it('★ 子组件也能渲染（渲染器必须注入 setupChildComponent）', () => {
    const Child = {
      name: 'BatteryChild',
      props: { label: { type: String } },
      render(this: { label?: string }) {
        return createVNode('span', null, `child:${this.label}`);
      },
    };
    const Parent = {
      name: 'BatteryParent',
      render() {
        return createVNode('div', null, [
          createVNode('p', null, 'parent'),
          createVNode(Child, { label: 'L' }),
        ]);
      },
    };

    const el = mount('battery-parent', Parent);

    expect(el.shadowRoot!.textContent).toContain('parent');
    expect(el.shadowRoot!.textContent).toContain('child:L');
  });
});

describe('attribute 变更', () => {
  it('★ setAttribute 后重新渲染出新值', () => {
    const el = mount(
      'battery-attr-change',
      {
        props: { msg: { type: String } },
        render(this: { msg?: string }) {
          return createVNode('div', null, `msg=${this.msg}`);
        },
      },
      { msg: 'one' },
    );

    el.setAttribute('msg', 'two');

    expect(el.shadowRoot!.textContent).toBe('msg=two');
  });

  it('★ 移除 attribute 后 prop 变回 undefined 并重渲染', () => {
    const el = mount(
      'battery-attr-remove',
      {
        props: { msg: { type: String } },
        render(this: { msg?: string }) {
          return createVNode('div', null, `msg=${this.msg}`);
        },
      },
      { msg: 'gone' },
    );

    el.removeAttribute('msg');

    expect(el.shadowRoot!.textContent).toBe('msg=undefined');
  });

  it('反序列化后等值的变更不触发重渲染（避免无谓 diff）', () => {
    const renderSpy = vi.fn(function (this: { count?: number }) {
      return createVNode('div', null, `${this.count}`);
    });
    const el = mount(
      'battery-attr-same',
      { props: { count: { type: Number } }, render: renderSpy },
      { count: '5' },
    );

    const before = renderSpy.mock.calls.length;
    // '05' 与 '5' 反序列化后都是 5 ⇒ 应跳过
    el.setAttribute('count', '05');

    expect(renderSpy.mock.calls.length).toBe(before);
  });
});

describe('上下文 API（setup 内）', () => {
  it('useShadowRoot 返回当前元素的 shadowRoot', () => {
    let captured: ShadowRoot | null = null;
    const el = mount('battery-use-shadow', {
      setup() {
        captured = useShadowRoot();
        return () => createVNode('div', null, 'x');
      },
    });

    expect(captured).toBe(el.shadowRoot);
  });

  it('useHost 返回宿主元素本身', () => {
    let captured: HTMLElement | null = null;
    const el = mount('battery-use-host', {
      setup() {
        captured = useHost();
        return () => createVNode('div', null, 'x');
      },
    });

    expect(captured).toBe(el);
  });

  it('injectChildStyles 在 setup 内把样式追加到 shadowRoot', () => {
    const el = mount('battery-inject', {
      setup() {
        injectChildStyles('.injected{color:blue}');
        return () => createVNode('div', null, 'x');
      },
    });

    const styles = el.shadowRoot!.querySelectorAll('style');

    expect(styles.length).toBe(1);
    expect(styles[0]!.textContent).toBe('.injected{color:blue}');
  });

  it('上下文外调用 useShadowRoot / useHost 返回 null 并告警', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(useShadowRoot()).toBeNull();
    expect(useHost()).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('上下文外 injectChildStyles 不抛错且不注入', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => injectChildStyles('.x{}')).not.toThrow();
    expect(document.querySelectorAll('style').length).toBe(0);
  });
});

describe('生命周期与清理', () => {
  it('★ 挂载触发一次 mounted，卸载触发一次 beforeUnmount + unmounted', () => {
    const mounted = vi.fn();
    const beforeUnmount = vi.fn();
    const unmounted = vi.fn();

    const el = mount('battery-lifecycle', {
      setup() {
        onMounted(mounted);
        onBeforeUnmount(beforeUnmount);
        onUnmounted(unmounted);
        return () => createVNode('div', null, 'x');
      },
    });

    expect(mounted).toHaveBeenCalledTimes(1);
    expect(beforeUnmount).toHaveBeenCalledTimes(0);

    el.remove();

    // 渲染器已注入 invokeXxxHook ⇒ 手工再调一次就会重复触发
    expect(beforeUnmount).toHaveBeenCalledTimes(1);
    expect(unmounted).toHaveBeenCalledTimes(1);
  });

  it('卸载后 shadowRoot 内容被清空，重新挂载能再渲染', () => {
    const el = mount('battery-reconnect', { render: () => createVNode('div', null, 'again') }, {});

    expect(el.shadowRoot!.textContent).toBe('again');

    el.remove();
    expect(el.shadowRoot!.textContent).toBe('');

    container.appendChild(el);
    expect(el.shadowRoot!.textContent).toBe('again');
  });

  it('★ 卸载后 slot 回调不残留到下一个实例', async () => {
    const staleCallback = vi.fn();

    const elA = mount('battery-slot-a', {
      setup() {
        useWebComponentSlots(staleCallback);
        return () => createVNode('div', null, 'a');
      },
    });

    elA.remove();

    // B **不**注册 slot 回调；它的 MutationObserver 不应调到 A 留下的回调
    const elB = mount('battery-slot-b', {
      setup() {
        return () => createVNode('div', null, 'b');
      },
    });

    elB.appendChild(document.createElement('i'));
    await new Promise((r) => setTimeout(r, 0));

    expect(staleCallback).not.toHaveBeenCalled();
  });

  it('未挂载就移除不抛错', () => {
    defineCustomElement({ render: () => createVNode('div', null, 'x') } as never, {
      name: 'battery-remove-unmounted',
    });
    const el = document.createElement('battery-remove-unmounted');

    expect(() => el.remove()).not.toThrow();
  });
});
