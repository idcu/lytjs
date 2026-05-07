// src/web-component.ts
// @lytjs/core-vnode - Web Component 支持

declare const __DEV__: boolean;

import { createVNode } from '@lytjs/vdom';
import type { VNode } from '@lytjs/vdom';
import { createDOMRenderer } from '@lytjs/renderer';
import {
  createComponentInstance,
  setupComponent,
  callUnmountedHook,
  createAppContext,
} from '@lytjs/component';
import type {
  ComponentOptions,
  ComponentInternalInstance,
  AppContext,
} from '@lytjs/component';
import { warn } from '@lytjs/common-error';

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

/** 当前 Custom Element 的 Shadow Root（供 useShadowRoot 使用） */
let _currentShadowRoot: ShadowRoot | null = null;

/** 当前 Custom Element 的宿主元素（供 useHost 使用） */
let _currentHost: HTMLElement | null = null;

/** 当前 Custom Element 的 slot 变化回调（供 useSlots 使用） */
let _currentSlotCallback: (() => void) | null = null;

// ==================== Props 类型映射 ====================

/**
 * 从组件 props 定义中提取 observedAttributes
 */
function extractObservedAttributes(propsOptions: Record<string, unknown>): string[] {
  const attributes: string[] = [];
  for (const key in propsOptions) {
    // 将 camelCase 转换为 kebab-case
    const attrName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    attributes.push(attrName);
  }
  return attributes;
}

/**
 * 将 kebab-case attribute 名称转换为 camelCase prop 名称
 */
function attrToProp(attrName: string): string {
  return attrName.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * 将 attribute 值反序列化为对应类型的 prop 值
 */
function deserializeValue(value: string | null, propOptions: unknown): unknown {
  if (value === null) return undefined;

  const options = propOptions as
    | { type?: unknown; default?: unknown }
    | true
    | undefined;

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
    // 布尔属性：只要存在即为 true
    return value !== 'false' && value !== '0' && value !== '';
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
    (componentOptions.name
      ? componentOptions.name.replace(/([A-Z])/g, '-$1').toLowerCase()
      : 'lyt-component');
  const css = options?.css || '';

  // 从组件 props 中提取 observedAttributes
  const propsOptions = componentOptions.props || {};
  const observedAttributes = extractObservedAttributes(propsOptions);

  class LytCustomElement extends HTMLElement {
    private _instance: ComponentInternalInstance | null = null;
    private _root: ShadowRoot | HTMLElement;
    private _renderer: ReturnType<typeof createDOMRenderer> | null = null;
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
      _currentShadowRoot = useShadowDOM ? (this._root as ShadowRoot) : null;
      _currentHost = this as unknown as HTMLElement;

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

        // 创建组件实例
        const instance = createComponentInstance(vnode, null);
        instance.appContext = this._appContext;
        this._instance = instance;

        // 设置组件
        setupComponent(instance);

        // 创建渲染器并挂载
        const renderer = createDOMRenderer();
        this._renderer = renderer;
        renderer.mount(vnode, this._root);

        // 设置 slot 变化监听
        this._setupSlotObserver();
      } finally {
        _currentShadowRoot = null;
        _currentHost = null;
      }
    }

    disconnectedCallback(): void {
      if (this._instance) {
        callUnmountedHook(this._instance);
      }

      if (this._renderer && this._vnode) {
        this._renderer.unmount(this._vnode);
      }

      if (this._slotObserver) {
        this._slotObserver.disconnect();
        this._slotObserver = null;
      }

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
      if (!this._instance || !this._vnode) return;

      const propKey = attrToProp(name);
      const deserializedValue = deserializeValue(newValue, propsOptions[propKey]);

      // 更新组件 props
      this._instance.props[propKey] = deserializedValue;

      // 触发更新：重新渲染
      if (this._renderer && this._vnode) {
        // 更新 vnode 的 props
        (this._vnode.props as Record<string, unknown>)[propKey] = deserializedValue;
        // 使用 render 方法重新渲染
        if (this._renderer.render && this._vnode) {
          this._renderer.render(this._vnode, this._root as Element);
        }
      }
    }

    private _setupSlotObserver(): void {
      // 监听 Light DOM slot 内容变化
      this._slotObserver = new MutationObserver(() => {
        if (_currentSlotCallback) {
          _currentSlotCallback();
        }
      });

      this._slotObserver.observe(this, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  }

  // 注册 Custom Element
  if (!customElements.get(tagName)) {
    customElements.define(tagName, LytCustomElement);
  }

  return LytCustomElement;
}

// ==================== Composition API: useShadowRoot ====================

/**
 * 在 setup 中获取当前 Custom Element 的 Shadow Root
 */
export function useShadowRoot(): ShadowRoot | null {
  if (__DEV__ && !_currentShadowRoot) {
    warn(
      'useShadowRoot() was called outside of a Custom Element context. ' +
        'Make sure this is called inside a component wrapped by defineCustomElement.',
    );
  }
  return _currentShadowRoot;
}

// ==================== Composition API: useHost ====================

/**
 * 在 setup 中获取当前 Custom Element 的宿主元素
 */
export function useHost(): HTMLElement | null {
  if (__DEV__ && !_currentHost) {
    warn(
      'useHost() was called outside of a Custom Element context. ' +
        'Make sure this is called inside a component wrapped by defineCustomElement.',
    );
  }
  return _currentHost;
}

// ==================== Composition API: useSlots (Web Component 版) ====================

/**
 * 在 setup 中获取 slot 变化通知（MutationObserver）
 * 返回一个注册回调的函数
 */
export function useWebComponentSlots(onChange: () => void): void {
  _currentSlotCallback = onChange;
}

// ==================== injectChildStyles ====================

/**
 * 向 Shadow DOM 注入样式
 */
export function injectChildStyles(styles: string): void {
  const shadowRoot = _currentShadowRoot;
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
