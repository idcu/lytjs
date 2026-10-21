// @vitest-environment jsdom
/**
 * `core/src/composition.ts` 行为电池。
 *
 * 该文件此前 **128/182 语句未覆盖（30%）**。既有 `tests/composition.test.ts`
 * 把 `getCurrentInstance` **整体 mock 掉**了 ⇒ 这些 API **从未在真实组件实例上跑过**
 * （mock 的 `refs` 想给什么就给什么，`useTemplateRef` 那条链因此完全隐形）。
 * 本电池全部走**真实挂载**（`createApp(...).mount()`）。
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createApp, h } from '../src/index';
import {
  useSlots,
  useAttrs,
  useModel,
  defineModel,
  useTemplateRef,
  useId,
  useCssModule,
  registerCssModules,
  useCssVars,
} from '../src/composition';
import { ref } from '@lytjs/reactivity';
import { getCurrentInstance } from '@lytjs/component';

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
  vi.restoreAllMocks();
});

function newHost(): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  return host;
}

const flush = (ms = 40): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** 直接以组件为根挂载 */
async function mount(
  comp: Record<string, unknown>,
  props: Record<string, unknown> = {},
): Promise<HTMLElement> {
  const host = newHost();
  await createApp(comp as never, props).mount(host);
  await flush(10);
  return host;
}

describe('useSlots / useAttrs（真实实例）', () => {
  it('useSlots 返回父组件传入的 slots', async () => {
    let captured: Record<string, unknown> | null = null;
    const Child = {
      setup() {
        const slots = useSlots() as unknown as Record<string, () => unknown>;
        captured = slots as unknown as Record<string, unknown>;
        return () => h('div', null, [slots.default ? slots.default() : 'child']);
      },
    };
    const Parent = {
      render: () => h(Child, null, { default: () => [h('span', null, 'slotted')] }),
    };

    const host = await mount(Parent);

    expect(typeof captured!.default).toBe('function');
    expect(host.textContent).toContain('slotted');
  });

  it('useAttrs 含未声明属性、不含已声明 prop', async () => {
    let attrs: Record<string, unknown> = {};
    const Comp = {
      props: { msg: { type: String } },
      setup() {
        attrs = useAttrs();
        return () => h('div', null, 'x');
      },
    };

    await mount(Comp, { msg: 'hi', 'data-x': '1', class: 'c' });

    expect(attrs['data-x']).toBe('1');
    expect(attrs.class).toBe('c');
    expect('msg' in attrs).toBe(false);
  });

  it('上下文外调用返回空对象并告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(useSlots()).toEqual({});
    expect(useAttrs()).toEqual({});
    expect(warn).toHaveBeenCalled();
  });
});

describe('useModel', () => {
  it('读取 prop 值，写入触发 update:<key>', async () => {
    const updates: unknown[] = [];
    let model: { value: unknown } | null = null;
    const Comp = {
      props: { title: { type: String } },
      setup() {
        model = useModel<unknown>({ title: 'initial' } as never, 'title') as never;
        return () => h('div', null, String(model!.value));
      },
    };

    const host = await mount(Comp, {
      title: 'from-parent',
      'onUpdate:title': (v: unknown) => updates.push(v),
    });

    // useModel 读的是**传入的 props 对象**（这里是字面量），不是 instance.props
    expect(host.textContent).toBe('initial');

    (model as unknown as { value: unknown }).value = 'next';

    expect(updates).toEqual(['next']);
  });

  it('上下文外返回只读退化的 computed（读 undefined、写不抛错）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const m = useModel<number>({}, 'k');

    expect(m.value).toBeUndefined();
    expect(() => {
      m.value = 1;
    }).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });
});

describe('defineModel', () => {
  it('默认读取 modelValue 并触发 update:modelValue', async () => {
    const updates: unknown[] = [];
    let model: { value: unknown } | null = null;
    const Comp = {
      props: { modelValue: { type: Number } },
      setup() {
        model = defineModel<number>() as never;
        return () => h('div', null, String(model!.value));
      },
    };

    const host = await mount(Comp, {
      modelValue: 7,
      'onUpdate:modelValue': (v: unknown) => updates.push(v),
    });

    expect(host.textContent).toBe('7');

    (model as unknown as { value: unknown }).value = 8;

    expect(updates).toEqual([8]);
  });

  it('命名 model 读写 update:<name>', async () => {
    const updates: unknown[] = [];
    let model: { value: unknown } | null = null;
    const Comp = {
      props: { count: { type: Number } },
      setup() {
        model = defineModel<number>('count') as never;
        return () => h('div', null, String(model!.value));
      },
    };

    const host = await mount(Comp, {
      count: 3,
      'onUpdate:count': (v: unknown) => updates.push(v),
    });

    expect(host.textContent).toBe('3');
    (model as unknown as { value: unknown }).value = 4;
    expect(updates).toEqual([4]);
  });

  it('值为 undefined 时回落到 default', async () => {
    let model: { value: unknown } | null = null;
    const Comp = {
      props: { modelValue: { type: Number } },
      setup() {
        model = defineModel<number>(undefined, { default: 42 }) as never;
        return () => h('div', null, String(model!.value));
      },
    };

    const host = await mount(Comp);

    expect(host.textContent).toBe('42');
  });

  it('transform 在 emit 之前生效', async () => {
    const updates: unknown[] = [];
    let model: { value: unknown } | null = null;
    const Comp = {
      props: { modelValue: { type: Number } },
      setup() {
        model = defineModel<number>(undefined, { transform: (v) => (v as number) * 10 }) as never;
        return () => h('div', null, 'x');
      },
    };

    await mount(Comp, { modelValue: 1, 'onUpdate:modelValue': (v: unknown) => updates.push(v) });
    (model as unknown as { value: unknown }).value = 5;

    expect(updates).toEqual([50]);
  });

  it('required 且值缺失时给出警告（只警告一次）', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Comp = {
      props: { modelValue: { type: String } },
      setup() {
        const m = defineModel<string>(undefined, { required: true });
        void m.value;
        void m.value;
        return () => h('div', null, 'x');
      },
    };

    await mount(Comp);

    const hits = warn.mock.calls.filter((c) => String(c[0]).includes('marked as required'));
    expect(hits).toHaveLength(1);
  });

  it('上下文外返回 default 且写入 no-op', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const m = defineModel<number>(undefined, { default: 9 });

    expect(m.value).toBe(9);
    expect(() => {
      m.value = 1;
    }).not.toThrow();
    expect(m.value).toBe(9);
  });
});

describe('useTemplateRef', () => {
  it('★ 挂载后 .value 必须拿到真实 DOM 元素', async () => {
    let box: { value: HTMLElement | null } | null = null;
    const Comp = {
      setup() {
        box = useTemplateRef<HTMLElement>('box') as never;
        return () => h('div', { ref: 'box', class: 'target' }, 'content');
      },
    };

    const host = await mount(Comp);

    // 修复前：`watch` 的 getter 读的是**普通对象** `instance.refs`（非响应式），
    // 且 refs 在 mount 阶段才写入 ⇒ immediate 拿到 null 之后**永不重跑** ⇒ 恒为 null。
    expect(box!.value).not.toBeNull();
    expect((box!.value as unknown as HTMLElement).className).toBe('target');
    expect(host.querySelector('.target')).toBe(box!.value);
  });

  it('上下文外返回 null 的 ref 并告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = useTemplateRef('x');

    expect(r.value).toBeNull();
    expect(warn).toHaveBeenCalled();
  });
});

describe('useId', () => {
  it('同一组件内多次调用 ⇒ 计数递增且 id 互不相同', async () => {
    const ids: string[] = [];
    const Comp = {
      setup() {
        ids.push(useId().value, useId().value);
        return () => h('div', null, 'x');
      },
    };

    await mount(Comp);

    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
    expect(ids[0]).toMatch(/^lyt-\d+-1-/);
    expect(ids[1]).toMatch(/^lyt-\d+-2-/);
  });

  it('两个组件实例的 id 前缀不同（按 uid 区分）', async () => {
    const ids: string[] = [];
    const Comp = {
      setup() {
        ids.push(useId().value);
        return () => h('div', null, 'x');
      },
    };

    await mount(Comp);
    await mount(Comp);

    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('上下文外降级为 lyt-<随机后缀>', () => {
    const id = useId().value;

    expect(id).toMatch(/^lyt-[a-z0-9-]+$/);
    expect(id).not.toBe(useId().value);
  });

  it('返回的是只读 ref（外部写入不生效）', () => {
    const id = useId();
    const before = id.value;

    // 写入被静默忽略（readonly 的 set 陷阱返回 true 但不落值）。
    // ⚠️ 不断言「告警」：`@lytjs/reactivity` 在本仓 vitest 里别名到 **dist**，
    //    而 dist 以 `define: { __DEV__: 'false' }` 构建 ⇒ 告警分支已被压掉。
    (id as unknown as { value: string }).value = 'hacked';

    expect(id.value).toBe(before);
  });
});

describe('useCssModule / registerCssModules', () => {
  it('未注册时返回空对象', async () => {
    let mods: Record<string, string> = {};
    const Comp = {
      setup() {
        mods = useCssModule();
        return () => h('div', null, 'x');
      },
    };

    await mount(Comp);

    expect(mods).toEqual({});
  });

  it('registerCssModules 之后可按名字读取（默认 $style）', async () => {
    let mods: Record<string, string> = {};
    let named: Record<string, string> = {};
    const Comp = {
      setup() {
        const inst = getCurrentInstance()!;
        registerCssModules(inst, '$style', { title: 'Title_hash' });
        registerCssModules(inst, 'theme', { dark: 'dark_hash' });
        mods = useCssModule();
        named = useCssModule('theme');
        return () => h('div', null, 'x');
      },
    };

    await mount(Comp);

    expect(mods).toEqual({ title: 'Title_hash' });
    expect(named).toEqual({ dark: 'dark_hash' });
  });

  it('重复注册同名映射 ⇒ 后者覆盖前者', async () => {
    let mods: Record<string, string> = {};
    const Comp = {
      setup() {
        const inst = getCurrentInstance()!;
        registerCssModules(inst, '$style', { a: 'old' });
        registerCssModules(inst, '$style', { a: 'new' });
        mods = useCssModule();
        return () => h('div', null, 'x');
      },
    };

    await mount(Comp);

    expect(mods).toEqual({ a: 'new' });
  });

  it('上下文外调用返回空对象并告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(useCssModule()).toEqual({});
    expect(warn).toHaveBeenCalled();
  });
});

describe('useCssVars', () => {
  it('挂载后把 CSS 变量写到根元素上（自动补 `--` 前缀）', async () => {
    const Comp = {
      setup() {
        useCssVars(() => ({ color: 'red', '--size': '10px' }));
        return () => h('div', { class: 'root' }, 'x');
      },
    };

    const host = await mount(Comp);
    const el = host.querySelector('.root') as HTMLElement;

    expect(el.style.getPropertyValue('--color')).toBe('red');
    expect(el.style.getPropertyValue('--size')).toBe('10px');
  });

  it('依赖变化后变量值跟着更新', async () => {
    const color = ref('red');
    const Comp = {
      setup() {
        useCssVars(() => ({ color: color.value }));
        return () => h('div', { class: 'root' }, 'x');
      },
    };

    const host = await mount(Comp);
    const el = host.querySelector('.root') as HTMLElement;
    expect(el.style.getPropertyValue('--color')).toBe('red');

    color.value = 'blue';
    await flush(20);

    expect(el.style.getPropertyValue('--color')).toBe('blue');
  });

  it('上下文外调用不抛错', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => useCssVars(() => ({ a: 'b' }))).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });
});
