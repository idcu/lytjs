/**
 * 行为级判据：`@lytjs/component` 的**组件初始化**（`src/component-init.ts`，364 行）
 *
 * ## 为什么要有这条
 *
 * `finishComponentSetup` 是每个组件 setup 的**收口**（data / methods / computed / watch /
 * created / render 七步，每步独立 try-catch）。实测该文件 **213/275 语句未覆盖（22.5%）** ——
 * 未覆盖区间正是 **computed 整段（197-256）、watch 整段（261-309）、data/props 冲突、
 * template 运行时编译、renderTracked/renderTriggered**。
 *
 * 为什么覆盖率这么低：现有测试多走 `createApp` + `mount`，而 `@lytjs/core` 用的是
 * `@lytjs/component` 的 **dist 副本** ⇒ `component/src` 只有被**直接 import** 时才计入覆盖率。
 * 本文件直接驱动 `setupComponent`，把 src 路径真正跑起来。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createComponentInstance } from '../src/component';
import { setupComponent } from '../src/component-setup';
import { setTemplateCompiler, getTemplateCompiler } from '../src/component-init';

let warns: string[];

beforeEach(() => {
  warns = [];
  vi.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => {
    warns.push(a.join(' '));
  });
  vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => {
    warns.push(a.join(' '));
  });
  setTemplateCompiler(null as never); // 每个用例从「未注入编译器」开始
});

afterEach(() => {
  vi.restoreAllMocks();
});

const out = (): string => warns.join('\n');

/** 走真实路径：创建实例 → setupComponent（内部调 finishComponentSetup） */
const init = (options: Record<string, unknown>, props: Record<string, unknown> = {}) => {
  const vnode = { type: options, props, children: null };
  const instance = createComponentInstance(vnode as never, null);
  setupComponent(instance);
  return instance;
};

// ==================== data ====================

describe('data 初始化', () => {
  it('data() 的返回值成为响应式数据', () => {
    const inst = init({ data: () => ({ count: 1 }) });

    expect(inst.data).toEqual({ count: 1 });
    expect((inst.ctx as Record<string, unknown>).count).toBe(1);
  });

  it('data() 返回 undefined ⇒ 退化为空对象', () => {
    const inst = init({ data: () => undefined });

    expect(inst.data).toEqual({});
  });

  it('★ data() 抛错 ⇒ 降级为空渲染并走错误处理（不把异常抛给调用方）', () => {
    const inst = init({
      name: 'BoomData',
      data: () => {
        throw new Error('data-boom');
      },
    });

    expect(typeof inst.render).toBe('function');
    expect(inst.render!({} as never, [] as never)).toBeNull();
    expect(out()).toContain('Failed to initialize data');
  });

  it('★ data 的键与 props 同名 ⇒ 开发期警告', () => {
    init(
      { props: { shared: { type: String } }, data: () => ({ shared: 1 }) },
      { shared: 'from-props' },
    );

    expect(out()).toContain('is already defined as a prop');
  });
});

// ==================== methods ====================

describe('methods 初始化', () => {
  it('方法被绑定到公共实例（this 可用）', () => {
    const inst = init({
      data: () => ({ n: 2 }),
      methods: {
        double(this: Record<string, number>) {
          return this.n * 2;
        },
      },
    });

    const fn = (inst.ctx as Record<string, (...a: unknown[]) => unknown>).double!;
    expect(fn()).toBe(4);
  });

  it('★ 非函数方法 ⇒ 警告并跳过（不写入 ctx）', () => {
    const inst = init({ methods: { bad: 42 } });

    expect((inst.ctx as Record<string, unknown>).bad).toBeUndefined();
    expect(out()).toContain('Expected a function');
  });

  it('★ 方法与 props 同名 ⇒ 警告', () => {
    init({ props: { clash: { type: String } }, methods: { clash() {} } }, { clash: 'p' });

    expect(out()).toContain('is already defined as a prop');
  });
});

// ==================== computed ====================

describe('computed 初始化', () => {
  it('函数形式（只有 getter）', () => {
    const inst = init({
      data: () => ({ n: 3 }),
      computed: {
        triple(this: Record<string, number>) {
          return this.n * 3;
        },
      },
    });

    // `get` 对 ctx 解包 ref ⇒ 读到的直接是值
    expect((inst.ctx as Record<string, number>).triple).toBe(9);
  });

  it('对象形式：getter + setter 都可写', () => {
    const inst = init({
      data: () => ({ n: 1 }),
      computed: {
        plusOne: {
          get(this: Record<string, number>) {
            return this.n + 1;
          },
          set(this: Record<string, number>, v: number) {
            this.n = v - 1;
          },
        },
      },
    });

    const ctx = inst.ctx as Record<string, unknown>;
    expect(ctx.plusOne).toBe(2);
    // 写入应走 computed 的 setter（代理会把写操作转成 `ref.value = v`）
    ctx.plusOne = 10;
    expect(inst.data.n).toBe(9);
  });

  it('★ 对象形式缺 getter ⇒ 警告并跳过', () => {
    const inst = init({ computed: { broken: { set: () => {} } } });

    expect((inst.ctx as Record<string, unknown>).broken).toBeUndefined();
    expect(out()).toContain('has no getter');
  });

  it('★ 既不是函数也不是对象 ⇒ 警告并跳过', () => {
    const inst = init({ computed: { weird: 123 } });

    expect((inst.ctx as Record<string, unknown>).weird).toBeUndefined();
    expect(out()).toContain('is not a function or object');
  });

  it('★ computed 与 method 同名 ⇒ 警告（方法会被覆盖）', () => {
    init({
      methods: { same() {} },
      computed: {
        same() {
          return 1;
        },
      },
    });

    expect(out()).toContain('conflicts with a method');
  });

  it('★ computed 与 props 同名 ⇒ 警告', () => {
    init(
      {
        props: { clash: { type: String } },
        computed: {
          clash() {
            return 1;
          },
        },
      },
      { clash: 'p' },
    );

    expect(out()).toContain('is already defined as a prop');
  });
});

// ==================== watch ====================

describe('watch 初始化', () => {
  it('函数 handler：数据变化后触发', async () => {
    const spy = vi.fn();
    const inst = init({ data: () => ({ n: 0 }), watch: { n: spy } });

    (inst.data as Record<string, number>).n = 1;
    await Promise.resolve();

    expect(spy).toHaveBeenCalled();
  });

  it('字符串 handler：按方法名解析', async () => {
    const spy = vi.fn();
    const inst = init({
      data: () => ({ n: 0 }),
      methods: { onChange: spy },
      watch: { n: 'onChange' },
    });

    (inst.data as Record<string, number>).n = 2;
    await Promise.resolve();

    expect(spy).toHaveBeenCalled();
  });

  it('对象形式：immediate 立即触发一次', async () => {
    const spy = vi.fn();
    init({ data: () => ({ n: 5 }), watch: { n: { handler: spy, immediate: true } } });

    await Promise.resolve();

    expect(spy).toHaveBeenCalled();
  });

  it('数组形式：多个 handler 都触发', async () => {
    const a = vi.fn();
    const b = vi.fn();
    const inst = init({ data: () => ({ n: 0 }), watch: { n: [a, b] } });

    (inst.data as Record<string, number>).n = 3;
    await Promise.resolve();

    expect(a).toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });

  it('★ 字符串 handler 找不到同名方法 ⇒ 警告且不注册', () => {
    init({ data: () => ({ n: 0 }), watch: { n: 'missingMethod' } });

    expect(out()).toContain('No matching method found');
  });

  it('★ 非法 handler 类型 ⇒ 警告', () => {
    init({ data: () => ({ n: 0 }), watch: { n: 42 } });

    expect(out()).toContain('Invalid watch handler');
  });
});

// ==================== 渲染追踪钩子 ====================

describe('renderTracked / renderTriggered', () => {
  it('两个钩子被注册进实例（并绑定 ctx）', () => {
    const inst = init({
      data: () => ({ n: 1 }),
      renderTracked() {},
      renderTriggered() {},
    });

    expect(inst.renderTrackedHooks).toHaveLength(1);
    expect(inst.renderTriggeredHooks).toHaveLength(1);
  });
});

// ==================== render 解析优先级 ====================

describe('render 解析', () => {
  it('options.render 被绑定到 ctx', () => {
    const inst = init({ data: () => ({ n: 1 }), render() {} });

    expect(typeof inst.render).toBe('function');
  });

  it('★ 有 template 但未注入编译器 ⇒ 明确警告 + 空渲染（不是静默空白）', () => {
    const inst = init({ name: 'TplComp', template: '<div>hi</div>' });

    expect(inst.render!({} as never, [] as never)).toBeNull();
    expect(out()).toContain('没有可用的模板编译器');
  });

  it('★ 注入编译器后，template 会被真正编译', () => {
    const compiler = vi.fn(() => () => 'compiled');
    setTemplateCompiler(compiler as never);

    expect(getTemplateCompiler()).toBe(compiler);

    const inst = init({ template: '<div/>' });

    expect(compiler).toHaveBeenCalledWith('<div/>');
    expect(inst.render!({} as never, [] as never)).toBe('compiled');
  });
});
