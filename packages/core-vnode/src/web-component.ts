// src/web-component.ts
// @lytjs/core-vnode - Web Component 支持

declare const __DEV__: boolean;

import { createVNode } from '@lytjs/vdom';
import type { VNode } from '@lytjs/vdom';
import { createAppContext, callBeforeUnmountHook, callUnmountedHook } from '@lytjs/component';
import type { AppContext, ComponentInternalInstance, ComponentOptions } from '@lytjs/component';
import { warn } from '@lytjs/common-error';
import { createComponentRenderer } from './component-renderer';

// ==================== 类型定义 ====================

/**
 * defineCustomElement 的配置选项
 */
export interface DefineCustomElementOptions {
  /** 是否使用 Shadow DOM（默认 true） */
  shadowRoot?: boolean;
  /** Custom Element 标签名（默认使用组件 name） */
  name?: string;
  /** CSS 样式（注入到 Shadow DOM） */
  css?: string;
}

// ==================== 内部状态 ====================

/**
 * 每个自定义元素实例自己的上下文。
 *
 * ⚠️ 2026-10-21：此前是**模块级**三个变量（`_currentShadowRoot` / `_currentHost` /
 * `_currentSlotCallback`）⇒ 多个实例互相覆盖，且 `_currentSlotCallback` **从不清理**：
 * 元素 A 卸载后，元素 B 的 MutationObserver 仍会调到 A 留下的回调（跨实例串台 + 泄漏）。
 * 改为按宿主元素存的 WeakMap，卸载时随元素一起消失。
 */
interface ElementContext {
  shadowRoot: ShadowRoot | null;
  host: HTMLElement;
  slotCallback: (() => void) | null;
}

const elementContextMap = new WeakMap<HTMLElement, ElementContext>();

/**
 * 正在执行 setup 的宿主元素栈。
 *
 * `connectedCallback` → `setupComponent` 是**同步**的，因此栈顶就是「当前正在 setup 的元素」。
 * 用栈而非单个变量，嵌套自定义元素（A 的模板里渲染出 B）时也能各自拿到正确的上下文。
 */
const setupStack: HTMLElement[] = [];

function getElementContext(host: HTMLElement): ElementContext {
  let ctx = elementContextMap.get(host);
  if (!ctx) {
    ctx = { shadowRoot: null, host, slotCallback: null };
    elementContextMap.set(host, ctx);
  }
  return ctx;
}

function getCurrentContext(): ElementContext | undefined {
  const host = setupStack[setupStack.length - 1];
  return host ? elementContextMap.get(host) : undefined;
}

// ==================== Props 类型映射 ====================

/**
 * camelCase → kebab-case
 *
 * ★ 2026-10-21：`BatteryAutoName` 用旧的 `replace(/([A-Z])/g, '-$1')` 会得到
 * **`-battery-auto-name`（前导连字符）** ⇒ 不是合法的自定义元素名 ⇒
 * `customElements.define()` 直接抛 `SyntaxError`（且这个抛错发生在 define 调用里，
 * 调用方毫无准备）。这里统一去掉前导连字符。
 */
function toKebabCase(input: string): string {
  return input
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-+/, '');
}

/**
 * 从组件 props 定义中提取 observedAttributes
 */
function extractObservedAttributes(propsOptions: Record<string, unknown>): string[] {
  const attributes: string[] = [];
  for (const key in propsOptions) {
    attributes.push(toKebabCase(key));
  }
  return attributes;
}

/**
 * 将 kebab-case attribute 名称转换为 camelCase prop 名称
 */
function attrToProp(attrName: string): string {
  return attrName.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * 将 attribute 值反序列化为对应类型的 prop 值
 */
function deserializeValue(value: string | null, propOptions: unknown): unknown {
  if (value === null) return undefined;

  const options = propOptions as { type?: unknown; default?: unknown } | true | undefined;

  if (options === true || options === undefined) {
    // 无类型声明，返回字符串
    return value;
  }

  const type = options.type;

  if (type === Number) {
    const num = Number(value);
    return isNaN(num) ? value : num;
  }
  if (type === Boolean) {
    // ★ 2026-10-21：HTML 的布尔属性约定是「**存在即为真**」——`<x active>` 与
    //   `active=""` 等价，都应为 `true`。此前 `value !== ''` 把这两种最常见写法
    //   判成 `false`（只有写 `active="yes"` 之类才为真，与 HTML 直觉相反）。
    if (value === '') return true;
    return value !== 'false' && value !== '0';
  }
  // String 或其他类型，直接返回字符串
  return value;
}

// ==================== defineCustomElement ====================

/**
 * 将 LytJS 组件包装为 Custom Element
 */
export function defineCustomElement(
  componentOptions: ComponentOptions,
  options?: DefineCustomElementOptions,
): CustomElementConstructor {
  const useShadowDOM = options?.shadowRoot !== false;
  const tagName =
    options?.name ||
    (componentOptions.name ? toKebabCase(componentOptions.name) : '') ||
    'lyt-component';
  const css = options?.css || '';

  // 从组件 props 中提取 observedAttributes
  const propsOptions = (componentOptions.props || {}) as Record<string, unknown>;
  const observedAttributes = extractObservedAttributes(propsOptions);

  class LytCustomElement extends HTMLElement {
    private _instance: ComponentInternalInstance | null = null;
    private _root: ShadowRoot | HTMLElement;
    private _renderer: ReturnType<typeof createComponentRenderer> | null = null;
    private _vnode: VNode | null = null;
    private _appContext: AppContext;
    private _slotObserver: MutationObserver | null = null;

    static get observedAttributes(): string[] {
      return observedAttributes;
    }

    constructor() {
      super();

      if (useShadowDOM) {
        this._root = this.attachShadow({ mode: 'open' });
        // 注入 CSS 样式
        if (css) {
          const style = document.createElement('style');
          style.textContent = css;
          this._root.appendChild(style);
        }
      } else {
        this._root = this;
      }

      this._appContext = createAppContext();
    }

    connectedCallback(): void {
      // 设置内部上下文
      const ctx = getElementContext(this);
      ctx.shadowRoot = useShadowDOM ? (this._root as ShadowRoot) : null;
      ctx.host = this;
      setupStack.push(this);

      try {
        // 从 attributes 收集 props
        const props: Record<string, unknown> = {};
        for (const attr of observedAttributes) {
          const propKey = attrToProp(attr);
          const value = this.getAttribute(attr);
          props[propKey] = deserializeValue(value, propsOptions[propKey]);
        }

        // 创建 VNode
        const vnode = createVNode(componentOptions, props);
        this._vnode = vnode;

        // ★ 2026-10-21：渲染器必须由 `createComponentRenderer()` 创建 ——
        //   它注入了 `setupChildComponent`（创建实例 + setup + **回填 `vnode.component`**）
        //   与四个生命周期钩子回调。裸调 `createDOMRenderer()` 会让 `mountComponent`
        //   因「组件 vnode 没有实例」而 warn + return ⇒ **整个元素渲染为空**。
        const renderer = createComponentRenderer(() => this._appContext);
        this._renderer = renderer;
        renderer.mount(vnode, this._root);

        // 实例由渲染器在挂载过程中创建（同步完成），这里取回来供属性更新/卸载使用
        this._instance =
          (vnode as unknown as { component?: ComponentInternalInstance }).component ?? null;

        // 设置 slot 变化监听
        this._setupSlotObserver();
      } finally {
        setupStack.pop();
      }
    }

    disconnectedCallback(): void {
      if (this._renderer && this._vnode) {
        // ⚠️ 2026-10-21：**不要**在这里手工调 `callBeforeUnmountHook` / `callUnmountedHook`。
        //   渲染器已注入 `invokeBeforeUnmountHook` / `invokeUnmountedHook`，`unmount()` 会自行
        //   按 beforeUnmount → 移除 DOM → unmounted 的顺序触发；两处都调会**重复触发**。
        this._renderer.unmount(this._vnode);
      } else if (this._instance) {
        // 兜底：没有渲染器（例如挂载中途失败）时仍保证钩子成对触发。
        // 这里与上面的分支互斥，不会重复。
        callBeforeUnmountHook(this._instance);
        callUnmountedHook(this._instance);
      }

      if (this._slotObserver) {
        this._slotObserver.disconnect();
        this._slotObserver = null;
      }

      // 上下文随元素消失（WeakMap 本身不阻止回收，这里显式清掉回调引用）
      elementContextMap.delete(this);

      this._instance = null;
      this._renderer = null;
      this._vnode = null;
    }

    attributeChangedCallback(
      name: string,
      _oldValue: string | null,
      newValue: string | null,
    ): void {
      // 仅在已挂载时处理属性变更
      if (!this._instance || !this._vnode || !this._renderer) return;

      const propKey = attrToProp(name);

      // 防御：只有声明过的 prop 才参与更新（避免任意 attribute 触发无谓 diff）
      if (!(propKey in propsOptions)) return;

      const deserializedValue = deserializeValue(newValue, propsOptions[propKey]);

      // 反序列化后等值 ⇒ 跳过（例如 `count="5"` → `count="05"` 都是 5）
      if ((this._instance.props as Record<string, unknown>)[propKey] === deserializedValue) return;

      // ★ 2026-10-21：必须传入**新的 vnode 副本**。`patch` 的组件分支用
      //   `shallowEqual(n1.props, n2.props)` 判断是否需要更新 —— 若原地改 `_vnode.props`
      //   再传同一个引用，`n1.props === n2.props` ⇒ 判定「没变化」⇒ **属性变更永不重渲染**。
      const newVNode = {
        ...this._vnode,
        props: {
          ...((this._vnode.props as Record<string, unknown> | null) ?? {}),
          [propKey]: deserializedValue,
        },
      } as VNode;

      this._renderer.patch(this._vnode, newVNode, this._root as Element);
      this._vnode = newVNode;
    }

    private _setupSlotObserver(): void {
      // 重连时先断掉旧的，避免同一个元素上叠加多个 observer
      this._slotObserver?.disconnect();

      // 监听 Light DOM slot 内容变化
      this._slotObserver = new MutationObserver(() => {
        const ctx = elementContextMap.get(this);
        ctx?.slotCallback?.();
      });

      this._slotObserver.observe(this, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  }

  // 注册 Custom Element（并发/重复注册时给出明确警告而不是让 SyntaxError 冒出去）
  if (!customElements.get(tagName)) {
    try {
      customElements.define(tagName, LytCustomElement);
    } catch (e) {
      if (__DEV__) {
        warn(
          `defineCustomElement: failed to register "${tagName}". ` +
            `It may have already been registered by another module. Error: ${String(e)}`,
        );
      }
    }
  }

  return LytCustomElement;
}

// ==================== Composition API: useShadowRoot ====================

/**
 * 在 setup 中获取当前 Custom Element 的 Shadow Root
 */
export function useShadowRoot(): ShadowRoot | null {
  const ctx = getCurrentContext();
  if (__DEV__ && !ctx?.shadowRoot) {
    warn(
      'useShadowRoot() was called outside of a Custom Element context. ' +
        'Make sure this is called inside a component wrapped by defineCustomElement.',
    );
  }
  return ctx?.shadowRoot ?? null;
}

// ==================== Composition API: useHost ====================

/**
 * 在 setup 中获取当前 Custom Element 的宿主元素
 */
export function useHost(): HTMLElement | null {
  const ctx = getCurrentContext();
  if (__DEV__ && !ctx?.host) {
    warn(
      'useHost() was called outside of a Custom Element context. ' +
        'Make sure this is called inside a component wrapped by defineCustomElement.',
    );
  }
  return ctx?.host ?? null;
}

// ==================== Composition API: useSlots (Web Component 版) ====================

/**
 * 在 setup 中获取 slot 变化通知（MutationObserver）
 * 返回一个注册回调的函数
 */
export function useWebComponentSlots(onChange: () => void): void {
  const ctx = getCurrentContext();
  if (ctx) {
    ctx.slotCallback = onChange;
  } else if (__DEV__) {
    warn(
      'useWebComponentSlots() was called outside of a Custom Element context. ' +
        'The callback will never be invoked.',
    );
  }
}

// ==================== injectChildStyles ====================

/**
 * 向 Shadow DOM 注入样式
 */
export function injectChildStyles(styles: string): void {
  const ctx = getCurrentContext();
  const shadowRoot = ctx?.shadowRoot ?? null;
  if (!shadowRoot) {
    if (__DEV__) {
      warn(
        'injectChildStyles() was called outside of a Custom Element context. ' +
          'Styles will not be injected.',
      );
    }
    return;
  }

  const style = document.createElement('style');
  style.textContent = styles;
  shadowRoot.appendChild(style);
}
