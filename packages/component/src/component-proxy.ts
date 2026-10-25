// src/component-proxy.ts
// Public instance proxy ($data, $props, $el, etc.) and access cache

import { hasOwn } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import { nextTick } from '@lytjs/common-scheduler';
// ★ 2026-10-20：`get` 需要对 ctx / setupState / data 的返回值**解包 ref**，
//   否则 options API 的 `computed` 读出来是 ComputedRef 对象（模板里渲染成 [object Object]）。
import { unref, isRef } from '@lytjs/reactivity';
import type { ComponentInternalInstance, ComponentPublicInstance } from './types';
import { forceComponentUpdate } from './force-update';
// FIX: DTS build error - VNode 未使用
// import type { VNode } from '@lytjs/common-vnode';

// ==================== accessCache 常量 ====================

/**
 * PublicInstanceProxy 属性访问缓存位掩码。
 * 每个公共属性对应一个唯一的位，用于在 accessCache 数组中标记
 * 该属性首次被访问时的查找结果，避免后续重复遍历 setupState/data/props。
 *
 * 位值设计：
 *   0       - 未缓存（需要首次查找）
 *   1       - $ 属性（$data, $props, $el, $emit 等）
 *   2       - setupState
 *   4       - data
 *   8       - props
 *   16      - globalProperties
 *   32      - ctx（公共实例自身属性）
 */
export const enum PublicInstanceProxyAccessCache {
  /** 未缓存 */
  NONE = 0,
  /** 其他（无法归类到具体来源） */
  OTHER = 1,
  /** 来自 setupState */
  SETUP_STATE = 2,
  /** 来自 data */
  DATA = 4,
  /** 来自 props */
  PROPS = 8,
  /** 来自 globalProperties */
  GLOBAL_PROPERTIES = 16,
  /** 来自 ctx（公共实例自身属性，如 $data, $el 等） */
  CONTEXT = 32,
}

/**
 * 公共属性名到 accessCache 位掩码的映射。
 *
 * ⚠️ 2026-10-25 **已删除**（原为 `PUBLIC_PROPERTIES_MAP`）。原因：
 *   它是同一概念（"这个 key 属于哪个来源桶"）的**第二套编码**，且与上面的
 *   `PublicInstanceProxyAccessCache` **数值冲突** —— 例如 `$el: 2`，而枚举里
 *   `2` 是 `SETUP_STATE`。谁若拿它去填 `accessCache`，`get` 就会去
 *   `setupState.$el` 取 `$el`（永远 undefined）。
 *   全仓**零消费点**（只有两处 `export` 转发），留着就是给后来者埋雷。
 *   需要判断"是不是内置公共属性"请用 `key.startsWith('$')` 或直接查 `ctx`。
 */

// ==================== createComponentPublicInstance ====================

/**
 * Create the public instance proxy ($data, $props, $el, etc.).
 * Uses a Proxy so that Options API `this` correctly resolves properties
 * from setupState, data, props, and public instance fields ($el, $emit, etc.).
 */
export function createComponentPublicInstance(
  instance: ComponentInternalInstance,
): ComponentPublicInstance {
  // 初始化 accessCache（惰性创建）
  if (!instance.accessCache) {
    instance.accessCache = Object.create(null) as Record<string, number>;
  }

  // ★ 2026-10-25 修复（P1）：此前三处 `res.bind(target)` 把函数绑到 **target（原始 ctx 对象）**，
  //   而 `target` 只是 `$data`/`$props`/`$el` 这些 getter 的宿主 —— `setupState` / `data` / `props`
  //   里的值**不在它身上**。于是 Options API 的 `methods` 里写 `this.count`（count 在 data 里）
  //   一律拿到 undefined：方法能调用，但读不到任何数据。
  //   正确做法与 Vue 一致：绑到**对外那个 Proxy**。
  //   用「容器对象」而不是 `let publicThis`：`prefer-const` 会把「声明后只赋值一次」
  //   判成该用 const，而 const 又没法在 handlers 之后赋值 ⇒ 只能借一个可变字段。
  //   陷阱只在赋值之后才会被触发，故读 `self.current` 时一定已经就绪。
  const self = { current: null as unknown as ComponentPublicInstance };

  const PublicInstanceProxyHandlers: ProxyHandler<ComponentPublicInstance> = {
    get(target: ComponentPublicInstance, key: string | symbol): unknown {
      // Symbol.key 无法缓存，直接走原始逻辑
      if (typeof key === 'symbol') {
        if (key in target) {
          const res = (target as unknown as Record<string | symbol, unknown>)[key];
          if (typeof res === 'function' && key !== Symbol.toPrimitive && key !== Symbol.iterator) {
            return res.bind(self.current);
          }
          return res;
        }
        return undefined;
      }

      // 尝试从 accessCache 获取缓存结果
      const cachedValue = instance.accessCache![key];
      if (cachedValue !== undefined) {
        switch (cachedValue) {
          case PublicInstanceProxyAccessCache.CONTEXT: {
            const res = (target as unknown as Record<string | symbol, unknown>)[key];
            if (typeof res === 'function' && key !== '$emit') {
              return res.bind(self.current);
            }
            return unref(res);
          }
          case PublicInstanceProxyAccessCache.OTHER:
            return undefined;
          case PublicInstanceProxyAccessCache.SETUP_STATE:
            return unref(instance.setupState[key]);
          case PublicInstanceProxyAccessCache.DATA:
            return unref(instance.data[key]);
          case PublicInstanceProxyAccessCache.PROPS:
            return unref(instance.props[key]);
          case PublicInstanceProxyAccessCache.GLOBAL_PROPERTIES: {
            const globalProperties = instance.appContext?.config?.globalProperties as
              | Record<string, unknown>
              | undefined;
            return globalProperties ? globalProperties[key] : undefined;
          }
        }
      }

      // 1. Public properties ($data, $props, $el, $emit, etc.)
      if (key in target) {
        const res = (target as unknown as Record<string | symbol, unknown>)[key];
        // Bind functions to the proxy so `this` works correctly
        if (typeof res === 'function' && key !== '$emit') {
          return res.bind(self.current);
        }
        // 缓存查找结果
        instance.accessCache![key] = PublicInstanceProxyAccessCache.CONTEXT;
        // ★ 2026-10-20：解包 ref —— options API 的 `computed` 是经 `ctx[key] = computedRef`
        //   装到这里的（见 component-init 的 finishComponentSetup）。
        return unref(res);
      }

      // 2. globalProperties
      const globalProperties = instance.appContext?.config?.globalProperties as
        | Record<string, unknown>
        | undefined;
      if (globalProperties && hasOwn(globalProperties, key)) {
        instance.accessCache![key] = PublicInstanceProxyAccessCache.GLOBAL_PROPERTIES;
        return globalProperties[key as string];
      }

      // 3. setupState
      if (hasOwn(instance.setupState, key)) {
        instance.accessCache![key] = PublicInstanceProxyAccessCache.SETUP_STATE;
        return unref(instance.setupState[key as string]);
      }

      // 4. data
      if (hasOwn(instance.data, key)) {
        instance.accessCache![key] = PublicInstanceProxyAccessCache.DATA;
        return unref(instance.data[key as string]);
      }

      // 5. props
      if (hasOwn(instance.props, key)) {
        instance.accessCache![key] = PublicInstanceProxyAccessCache.PROPS;
        return unref(instance.props[key as string]);
      }

      // 6. 组件注册表（局部 components → 全局 components）
      //
      // ⚠️ 2026-09-26 补充。编译器对**组件标签**生成的是 `_ctx.Child`
      // （见 codegen 的 genVNodeCall：「组件标签也要前缀化」），
      // 而不是 Vue 的 `_resolveComponent("Child")`。
      // 因此代理**必须**能解析组件名，否则 `_ctx.Child` 恒为 undefined ⇒
      // `createBlock(undefined, …)` ⇒ 子组件拿不到渲染结果 ⇒ 挂载崩溃
      // （现象：`Cannot read properties of null (reading 'el')`）。
      //
      // ⚠️ 命中时**不写 accessCache**：缓存里 `OTHER` 的语义是「未找到」
      // （见下方 case OTHER → return undefined），一旦写入，第二次 render
      // 就会直接返回 undefined。组件查找本身是 O(1) 的 hasOwn，无需缓存。
      const localComponents = (instance.type as { components?: Record<string, unknown> })
        .components;
      if (localComponents && hasOwn(localComponents, key)) {
        return localComponents[key as string];
      }
      const appComponents = instance.appContext?.components as Record<string, unknown> | undefined;
      if (appComponents && hasOwn(appComponents, key)) {
        return appComponents[key as string];
      }

      // 未找到，缓存为 OTHER 以避免重复查找
      instance.accessCache![key] = PublicInstanceProxyAccessCache.OTHER;
      return undefined;
    },

    set(_target: ComponentPublicInstance, key: string | symbol, value: unknown): boolean {
      // FIX: P1-16 完善 Symbol key 处理：Symbol key 不应被写入 setupState/data，
      // 应直接设置到 target 上（与 get handler 的 Symbol 处理保持一致）
      if (typeof key === 'symbol') {
        if (key === Symbol.toPrimitive || key === Symbol.iterator) {
          return false; // 不允许覆盖内置 Symbol
        }
        (_target as unknown as Record<string | symbol, unknown>)[key] = value;
        return true;
      }

      // 1. setupState
      if (hasOwn(instance.setupState, key)) {
        instance.setupState[key as string] = value;
        return true;
      }

      // 2. data
      if (hasOwn(instance.data, key)) {
        instance.data[key as string] = value;
        return true;
      }

      // 2.5 ctx 上已存在的 ref（options API 的 `computed`）⇒ 写 `.value` 才会走它的 setter。
      //     `get` 已经对 ctx 做了 `unref`，所以读出来是值；写的时候必须回到 ref 本体。
      const existing = (_target as unknown as Record<string, unknown>)[key];
      if (isRef(existing)) {
        (existing as { value: unknown }).value = value;
        return true;
      }

      // ★ 2026-10-20 修复（P1）：此前未命中 setupState / data 时**一律拒绝写入**并返回 false
      //   ⇒ options API 的 `methods` / `computed` **装不上公共实例**：
      //   `finishComponentSetup` 正是用 `instance.ctx[key] = …` 安装它们的，而 `ctx` 就是这个代理
      //   ⇒ 赋值被静默丢弃（DEV 下还会为**每个**方法/计算属性刷一条
      //   「has no property … This set operation was silently ignored」）。
      //   后果：`render` / `template` 里写 `this.myMethod()` 直接抛 TypeError ⇒ **整页空白**；
      //   `this.myComputed` 读到 undefined。既有测试只断言过 `instance.type.methods` **存在**，
      //   从未真正调用过方法，所以这个断链一直没暴露。
      //   修：兜底写到公共实例对象本身（与 Vue 的 `PublicInstanceProxyHandlers.set` 一致）；
      //   但 `$` 前缀是框架保留的公共属性（$el / $emit / $props …），仍拒绝覆盖。
      if (key.startsWith('$')) {
        if (__DEV__) {
          warn(
            `Cannot set reserved public property "${key}" on component public instance. ` +
              `This set operation was silently ignored.`,
          );
        }
        return false;
      }

      (_target as unknown as Record<string, unknown>)[key] = value;
      return true;
    },

    has(_target: ComponentPublicInstance, key: string | symbol): boolean {
      // Symbol key 无法使用 accessCache
      if (typeof key === 'symbol') {
        return (
          key in instance.setupState ||
          key in instance.data ||
          key in instance.props ||
          key in _target
        );
      }

      // 尝试从 accessCache 获取缓存结果
      const cachedValue = instance.accessCache![key];
      if (cachedValue !== undefined) {
        // 缓存值为 OTHER 表示未找到
        return cachedValue !== PublicInstanceProxyAccessCache.OTHER;
      }

      // ★ 2026-10-25 修复（P1）：此前命中后**一律写 `CONTEXT`**，而 `get` 读到 `CONTEXT`
      //   时只去 `target`（= 公共实例 ctx）上取值 —— `setupState` / `data` / `props` 的值
      //   并不在 target 上 ⇒ `'count' in vm` 之后再 `vm.count` 得到 **undefined**。
      //   即：一次 `in` 探测会把该 key 的取值路径永久带偏（accessCache 是粘性的）。
      //   现在按与 `get` **相同的优先级**判定命中的是哪个桶，再写缓存。
      const globalProperties = instance.appContext?.config?.globalProperties as
        | Record<string, unknown>
        | undefined;

      let bucket: PublicInstanceProxyAccessCache;
      if (key in _target) {
        bucket = PublicInstanceProxyAccessCache.CONTEXT;
      } else if (globalProperties && hasOwn(globalProperties, key)) {
        bucket = PublicInstanceProxyAccessCache.GLOBAL_PROPERTIES;
      } else if (hasOwn(instance.setupState, key)) {
        bucket = PublicInstanceProxyAccessCache.SETUP_STATE;
      } else if (hasOwn(instance.data, key)) {
        bucket = PublicInstanceProxyAccessCache.DATA;
      } else if (hasOwn(instance.props, key)) {
        bucket = PublicInstanceProxyAccessCache.PROPS;
      } else {
        bucket = PublicInstanceProxyAccessCache.OTHER;
      }

      // 组件注册表与 `get` 保持一致：能取到就算存在，但**不写缓存**
      // （`get` 对组件名也不缓存，见其注释）
      if (bucket === PublicInstanceProxyAccessCache.OTHER) {
        const localComponents = (instance.type as { components?: Record<string, unknown> })
          .components;
        if (localComponents && hasOwn(localComponents, key)) return true;
        const appComponents = instance.appContext?.components as
          | Record<string, unknown>
          | undefined;
        if (appComponents && hasOwn(appComponents, key)) return true;
      }

      instance.accessCache![key] = bucket;

      return bucket !== PublicInstanceProxyAccessCache.OTHER;
    },
  };

  const ctx: ComponentPublicInstance = {
    get $data() {
      return instance.data;
    },
    get $props() {
      return instance.props;
    },
    get $el() {
      return (instance.vnode?.el as Element) ?? null;
    },
    get $options() {
      return instance.type as unknown as Record<string, unknown>;
    },
    get $refs() {
      return instance.refs as Record<string, Element | ComponentPublicInstance | null>;
    },
    get $slots() {
      return instance.slots;
    },
    $emit: instance.emit,
    $forceUpdate: () => {
      // ★ 2026-10-16：回退逻辑已抽到 `force-update.ts`，与 `async-component.ts` 共用
      //   （此前这段回退**只在这里**，异步组件那边漏了 ⇒ 视图不切换）。
      forceComponentUpdate(instance);
    },
    $nextTick: () => nextTick(),
  };

  self.current = new Proxy(ctx, PublicInstanceProxyHandlers);
  return self.current;
}
