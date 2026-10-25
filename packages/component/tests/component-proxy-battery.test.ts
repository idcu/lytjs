/**
 * 行为级判据：`@lytjs/component` 的**公共实例代理**（`src/component-proxy.ts`）
 *
 * ## 为什么要有这条
 *
 * 这个代理就是模板里 `this` / `_ctx` 的那个对象 —— 所有 Options API 的取值、赋值、
 * 组件名解析都从这里过。覆盖率实测该文件仅 ~54%（87 行空档），而空档里藏着一条 P1：
 *
 * **`has` 陷阱会把取值路径永久带偏**：命中后它一律往 `accessCache` 写 `CONTEXT`，
 * 而 `get` 读到 `CONTEXT` 时只去 `target`（公共实例 ctx）取值。`setupState` / `data` /
 * `props` 的值并不在 target 上 ⇒ `'count' in vm` 之后再 `vm.count` 是 **undefined**。
 * `accessCache` 是粘性的，所以一次 `in` 探测会污染该 key 之后**所有**读取。
 *
 * 另：`PUBLIC_PROPERTIES_MAP` 是同一概念的第二套位编码，且与 `PublicInstanceProxyAccessCache`
 * 数值冲突（`$el: 2` vs `SETUP_STATE = 2`），全仓零消费 —— 已删除，本电池守住"只有一套编码"。
 *
 * ## 手法
 *
 * 用一个最小假实例（只要代理真正读到的字段），逐条断言**代理对外的可见行为**：
 * 取到什么、`in` 说什么、赋值落到哪个桶。缓存是内部机制，只作为"第二次读仍正确"的旁证。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, computed } from '@lytjs/reactivity';
import {
  createComponentPublicInstance,
  PublicInstanceProxyAccessCache,
} from '../src/component-proxy';
import type { ComponentInternalInstance, ComponentPublicInstance } from '../src/types';

/** 造一个只含代理会读到的字段的最小实例 */
function makeInstance(over: Record<string, unknown> = {}) {
  const instance = {
    setupState: {} as Record<string, unknown>,
    data: {} as Record<string, unknown>,
    props: {} as Record<string, unknown>,
    refs: {},
    slots: { default: () => [] },
    type: { name: 'Fake', ...(over.type as object) },
    vnode: { el: null as unknown },
    accessCache: undefined as Record<string, number> | undefined,
    appContext: {
      config: { globalProperties: {} as Record<string, unknown> },
      components: {} as Record<string, unknown>,
      provides: {},
    },
    emit: vi.fn(),
    update: undefined as (() => void) | undefined,
    isMounted: false,
    isUnmounted: false,
    render: undefined as unknown,
    subTree: undefined as unknown,
    ...over,
  };
  return instance;
}

const asProxy = (inst: ReturnType<typeof makeInstance>) =>
  createComponentPublicInstance(inst as unknown as ComponentInternalInstance);

let inst: ReturnType<typeof makeInstance>;
let vm: ComponentPublicInstance & Record<string, unknown>;

beforeEach(() => {
  inst = makeInstance();
  vm = asProxy(inst) as unknown as ComponentPublicInstance & Record<string, unknown>;
});

// ==================== 公共属性 ====================

describe('公共属性（$ 前缀）', () => {
  it('$data / $props / $refs / $slots / $options 原样暴露', () => {
    inst.data = { a: 1 };
    inst.props = { b: 2 };

    expect(vm.$data).toBe(inst.data);
    expect(vm.$props).toBe(inst.props);
    expect(vm.$refs).toBe(inst.refs);
    expect(vm.$slots).toBe(inst.slots);
    expect(vm.$options).toBe(inst.type);
  });

  it('$el 取 vnode.el；没有 vnode 时为 null', () => {
    const el = { tagName: 'DIV' };
    inst.vnode = { el };

    expect(vm.$el).toBe(el);

    const bare = makeInstance({ vnode: null });
    expect(asProxy(bare).$el).toBeNull();
  });

  it('$emit 透传到 instance.emit', () => {
    vm.$emit('change', 1);

    expect(inst.emit).toHaveBeenCalledWith('change', 1);
  });

  it('$forceUpdate 优先调用 instance.update', () => {
    const update = vi.fn();
    inst.update = update;

    vm.$forceUpdate();

    expect(update).toHaveBeenCalledTimes(1);
  });

  it('$nextTick 返回 Promise', async () => {
    const p = vm.$nextTick();
    expect(typeof (p as Promise<void>).then).toBe('function');
    await expect(p as Promise<void>).resolves.toBeUndefined();
  });
});

// ==================== 取值优先级 ====================

describe('get 的优先级：ctx > globalProperties > setupState > data > props', () => {
  /**
   * ⚠️ 每换一个桶都要 `delete accessCache[key]`：`accessCache` 记的是"**上次命中的桶**"，
   *    桶被删掉后它不会自动失效（与 Vue 一致，靠"桶不会凭空消失"这个前提成立）。
   *    直接删缓存才能真正验证优先级，否则测的是缓存粘性。
   */
  const reread = (key: string) => {
    delete inst.accessCache![key];
    return vm[key];
  };

  it('同一 key 出现在多个桶时按优先级取', () => {
    inst.props.same = 'props';
    inst.data.same = 'data';
    inst.setupState.same = 'setup';
    inst.appContext.config.globalProperties.same = 'global';

    expect(reread('same')).toBe('global');

    delete inst.appContext.config.globalProperties.same;
    expect(reread('same')).toBe('setup');

    delete inst.setupState.same;
    expect(reread('same')).toBe('data');

    delete inst.data.same;
    expect(reread('same')).toBe('props');
  });

  it('ctx 上的自有属性压过一切', () => {
    // `set` 兜底会把未知 key 写到 ctx（= 代理的 target）
    vm.only = 'ctx';

    // 之后再往 setupState 里放同名 key：ctx 仍然赢
    inst.setupState.only = 'setup';

    expect(reread('only')).toBe('ctx');
  });

  it('ref 会被解包（模板里不能渲染出 [object Object]）', () => {
    inst.setupState.count = ref(3);
    inst.data.total = ref(4);
    inst.props.size = ref(5);

    expect(vm.count).toBe(3);
    expect(vm.total).toBe(4);
    expect(vm.size).toBe(5);
  });

  it('computed 装到 ctx 上时同样解包', () => {
    vm.double = computed(() => 42);

    expect(vm.double).toBe(42);
  });

  it('未命中返回 undefined', () => {
    expect(vm.nope).toBeUndefined();
  });

  it('ctx 上的函数被 bind 到代理（this 指向实例）', () => {
    const raw = function (this: unknown) {
      return this;
    };
    vm.who = raw;

    const bound = vm.who as () => unknown;

    expect(bound).not.toBe(raw);
    expect(bound()).toBe(vm);
  });

  it('★ 绑定的 this 必须是**代理**：方法里要能读到 setupState / data / props', () => {
    inst.setupState.s = 'S';
    inst.data.d = 'D';
    inst.props.p = 'P';

    // 模拟 `finishComponentSetup` 装 methods：写进公共实例
    vm.readAll = function (this: Record<string, unknown>) {
      return [this.s, this.d, this.p];
    };

    expect((vm.readAll as () => unknown)()).toEqual(['S', 'D', 'P']);
  });
});

// ==================== has 陷阱（P1）====================

describe('★ `in` 探测不得污染后续取值', () => {
  it('setupState：`in` 为真后取值仍是真值', () => {
    inst.setupState.count = 7;

    expect('count' in vm).toBe(true);
    expect(vm.count).toBe(7);
  });

  it('data：`in` 为真后取值仍是真值', () => {
    inst.data.total = 'T';

    expect('total' in vm).toBe(true);
    expect(vm.total).toBe('T');
  });

  it('props：`in` 为真后取值仍是真值', () => {
    inst.props.size = 9;

    expect('size' in vm).toBe(true);
    expect(vm.size).toBe(9);
  });

  it('globalProperties：`in` 为真后取值仍是真值', () => {
    inst.appContext.config.globalProperties.$api = { call: 1 };

    expect('$api' in vm).toBe(true);
    expect(vm.$api).toEqual({ call: 1 });
  });

  it('ref 在 `in` 之后仍被解包', () => {
    inst.setupState.count = ref(11);

    expect('count' in vm).toBe(true);
    expect(vm.count).toBe(11);
  });

  it('未命中的 key：`in` 为假，取值 undefined，再探测仍为假（OTHER 缓存）', () => {
    expect('ghost' in vm).toBe(false);
    expect(vm.ghost).toBeUndefined();
    expect('ghost' in vm).toBe(false);
  });

  it('缓存写入的是**命中的那个桶**，不是一律 CONTEXT', () => {
    inst.setupState.k = 1;
    expect('k' in vm).toBe(true);

    expect(inst.accessCache!.k).toBe(PublicInstanceProxyAccessCache.SETUP_STATE);
  });

  it('组件名：`in` 与取值一致（局部 + 全局注册表）', () => {
    const Local = { name: 'Local' };
    const Global = { name: 'Global' };
    inst.type = { name: 'Fake', components: { Local } };
    inst.appContext.components = { Global };

    expect('Local' in vm).toBe(true);
    expect(vm.Local).toBe(Local);
    expect('Global' in vm).toBe(true);
    expect(vm.Global).toBe(Global);
  });
});

// ==================== 赋值 ====================

describe('set 的落点', () => {
  it('setupState 命中 ⇒ 写 setupState', () => {
    inst.setupState.a = 1;
    vm.a = 2;

    expect(inst.setupState.a).toBe(2);
  });

  it('data 命中 ⇒ 写 data', () => {
    inst.data.b = 1;
    vm.b = 2;

    expect(inst.data.b).toBe(2);
  });

  it('ctx 上是 ref ⇒ 写 .value（否则 computed 的 setter 不触发）', () => {
    const r = ref(1);
    vm.c = r; // 兜底写到 ctx

    vm.c = 5;

    expect(r.value).toBe(5);
  });

  it('都没命中 ⇒ 兜底写到公共实例（methods / computed 靠这条装上）', () => {
    vm.myMethod = () => 'ok';

    // 写进去了才读得回来 —— 这是"没被静默丢弃"的判据
    expect(vm.myMethod).toBeTypeOf('function');
  });

  it('$ 前缀是保留名 ⇒ 拒绝写入并告警', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const ok = Reflect.set(vm as object, '$el', 'hijack');

    expect(ok).toBe(false);
    expect(vm.$el).not.toBe('hijack');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('symbol key 直接写实例；Symbol.toPrimitive / iterator 拒绝', () => {
    const sym = Symbol('s');
    (vm as unknown as Record<symbol, unknown>)[sym] = 1;
    expect((vm as unknown as Record<symbol, unknown>)[sym]).toBe(1);

    expect(Reflect.set(vm as object, Symbol.toPrimitive, () => '')).toBe(false);
    expect(Reflect.set(vm as object, Symbol.iterator, () => [])).toBe(false);
  });
});

// ==================== symbol 读取 ====================

describe('symbol key', () => {
  it('存在则返回，函数自动 bind', () => {
    const sym = Symbol('fn');
    const raw = function (this: unknown) {
      return this;
    };
    (vm as unknown as Record<symbol, unknown>)[sym] = raw;

    const got = (vm as unknown as Record<symbol, () => unknown>)[sym];

    expect(got).not.toBe(raw);
    expect(got()).toBe(vm);
  });

  it('不存在则 undefined', () => {
    expect((vm as unknown as Record<symbol, unknown>)[Symbol('missing')]).toBeUndefined();
  });

  it('Symbol.toPrimitive / iterator 不被 bind（否则字符串化会炸）', () => {
    const toPrim = () => 'x';
    // 代理没有 defineProperty 陷阱 ⇒ 直接定义在 target（ctx）上
    Object.defineProperty(vm, Symbol.toPrimitive, { value: toPrim, configurable: true });

    expect((vm as unknown as Record<symbol, unknown>)[Symbol.toPrimitive]).toBe(toPrim);
  });
});

// ==================== 缓存不冻结值 ====================

describe('accessCache 只是"从哪个桶取"的缓存，不缓存值', () => {
  it('桶内值变化后，第二次读取拿到的是新值', () => {
    inst.setupState.n = 1;
    expect(vm.n).toBe(1);

    inst.setupState.n = 2;
    expect(vm.n).toBe(2);

    // 且确实走了缓存分支（桶标记已写入）
    expect(inst.accessCache!.n).toBe(PublicInstanceProxyAccessCache.SETUP_STATE);
  });
});
