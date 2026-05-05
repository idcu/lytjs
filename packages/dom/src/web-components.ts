/**
 * @lytjs/dom - Web Components 集成模块
 *
 * 提供与原生 Web Components 的互操作性支持，包括：
 * - 自定义元素注册与管理
 * - 属性反射（Attribute Reflection）
 * - 属性变更观察
 * - 与 LytJS 组件系统的桥接
 *
 * @module @lytjs/dom/web-components
 * @version 6.0.0
 */

import { isString, isObject, isFunction, hasOwn } from '@lytjs/common-is';
// FIX: P2-v11-24 从 @lytjs/shared 导入 camelToKebab，避免重复定义
import { camelToKebab as sharedCamelToKebab, kebabToCamel as sharedKebabToCamel } from '@lytjs/shared';

// ============================================================
// 类型定义
// ============================================================

/**
 * Web Component 属性定义
 */
export interface WCPropertyDefinition {
  /** 属性名 */
  name: string;
  /** 属性类型 */
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  /** 默认值 */
  default?: unknown;
  /** 是否反射到 attribute */
  reflect?: boolean;
  /** 属性变更回调 */
  onChange?: (newValue: unknown, oldValue: unknown) => void;
}

/**
 * Web Component 配置选项
 */
export interface WebComponentOptions {
  /** 组件属性定义 */
  properties?: WCPropertyDefinition[];
  /** 是否使用 Shadow DOM */
  shadow?: boolean | ShadowRootInit;
  /** 样式内容（用于 Shadow DOM） */
  styles?: string;
  /** 观察的属性列表（attributeChangedCallback） */
  observedAttributes?: string[];
  /** 是否扩展内置元素 */
  extends?: string;
}

/**
 * 属性反射配置
 */
export interface AttributeReflectionConfig {
  /** 属性名 */
  prop: string;
  /** 对应的 attribute 名（可选，默认使用 kebab-case） */
  attr?: string;
  /** 类型转换器 */
  converter?: {
    toAttribute?: (value: unknown) => string | null;
    fromAttribute?: (value: string | null) => unknown;
  };
}

// ============================================================
// 内置类型转换器
// ============================================================

/**
 * 字符串类型转换器
 */
export const StringConverter = {
  toAttribute: (value: unknown): string | null =>
    value == null ? null : String(value),
  fromAttribute: (value: string | null): string =>
    value ?? '',
};

/**
 * 数字类型转换器
 */
export const NumberConverter = {
  toAttribute: (value: unknown): string | null =>
    value == null || value === '' ? null : String(value),
  fromAttribute: (value: string | null): number | null => {
    if (value === null) return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
  },
};

/**
 * 布尔类型转换器
 */
export const BooleanConverter = {
  toAttribute: (value: unknown): string | null =>
    value ? '' : null,
  fromAttribute: (value: string | null): boolean =>
    value !== null,
};

/**
 * 对象类型转换器（使用 JSON）
 */
export const ObjectConverter = {
  toAttribute: (value: unknown): string | null => {
    if (value == null) return null;
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  },
  fromAttribute: (value: string | null): unknown => {
    if (value === null) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  },
};

/**
 * 获取类型对应的转换器
 */
export function getConverterByType(
  type: WCPropertyDefinition['type'],
): AttributeReflectionConfig['converter'] {
  switch (type) {
    case 'string':
      return StringConverter;
    case 'number':
      return NumberConverter;
    case 'boolean':
      return BooleanConverter;
    case 'object':
    case 'array':
      return ObjectConverter;
    default:
      return StringConverter;
  }
}

// ============================================================
// 属性反射工具函数
// ============================================================

// FIX: P2-v11-24 使用从 @lytjs/shared 导入的 camelToKebab，删除重复定义
// 局部别名保持向后兼容
const camelToKebab = sharedCamelToKebab;
const kebabToCamel = sharedKebabToCamel;

/**
 * 属性反射管理器
 * 处理属性与 attribute 之间的双向同步
 */
export class AttributeReflector {
  private configs = new Map<string, AttributeReflectionConfig>();

  /**
   * 注册属性反射配置
   */
  register(config: AttributeReflectionConfig): void {
    const attrName = config.attr ?? camelToKebab(config.prop);
    this.configs.set(config.prop, { ...config, attr: attrName });
  }

  /**
   * 批量注册属性反射配置
   */
  registerAll(configs: AttributeReflectionConfig[]): void {
    configs.forEach((config) => this.register(config));
  }

  /**
   * 属性值变更时同步到 attribute
   */
  reflectToAttribute(
    element: HTMLElement,
    prop: string,
    value: unknown,
  ): void {
    const config = this.configs.get(prop);
    if (!config) return;

    const converter = config.converter ?? StringConverter;
    const attrValue = converter.toAttribute?.(value);

    if (attrValue === null) {
      element.removeAttribute(config.attr!);
    } else {
      element.setAttribute(config.attr!, attrValue);
    }
  }

  /**
   * 从 attribute 同步到属性值
   */
  reflectFromAttribute(
    element: HTMLElement,
    attr: string,
  ): { prop: string; value: unknown } | null {
    for (const [prop, config] of this.configs) {
      if (config.attr === attr || camelToKebab(prop) === attr) {
        const converter = config.converter ?? StringConverter;
        const attrValue = element.getAttribute(attr);
        const value = converter.fromAttribute?.(attrValue ?? null);
        return { prop, value };
      }
    }
    return null;
  }

  /**
   * 获取所有观察的 attribute 名称
   */
  getObservedAttributes(): string[] {
    return Array.from(this.configs.values()).map((c) => c.attr!);
  }

  /**
   * 获取属性名对应的 attribute 名
   */
  getAttributeName(prop: string): string | undefined {
    return this.configs.get(prop)?.attr;
  }

  /**
   * 获取 attribute 名对应的属性名
   */
  getPropertyName(attr: string): string | undefined {
    for (const [prop, config] of this.configs) {
      if (config.attr === attr) return prop;
    }
    return kebabToCamel(attr);
  }
}

// ============================================================
// Web Component 基类增强
// ============================================================

/**
 * 创建增强的 Web Component 基类
 * 提供属性反射、变更观察等能力
 * FIX: P2-v11-25 定义精确的返回类型 EnhancedElementClass，
 * 包含 getProperty/setProperty/onConnected 等增强方法的类型信息
 */
// FIX: P2-v11-25 定义精确的增强元素类型接口
export interface EnhancedElementClass extends HTMLElement {
  getProperty<T = unknown>(name: string): T | undefined;
  setProperty<T = unknown>(name: string, value: T): void;
  isConnectedToDOM: boolean;
  onConnected?(): void;
  onDisconnected?(): void;
  onPropertyChanged?(name: string, newValue: unknown, oldValue: unknown): void;
  onAttributeChanged?(name: string, oldValue: string | null, newValue: string | null): void;
}

export function createEnhancedElementClass(
  options: WebComponentOptions = {},
): typeof EnhancedElementClass {
  const reflector = new AttributeReflector();

  // 注册属性反射
  if (options.properties) {
    options.properties.forEach((prop) => {
      if (prop.reflect !== false) {
        reflector.register({
          prop: prop.name,
          converter: getConverterByType(prop.type),
        });
      }
    });
  }

  class EnhancedElement extends HTMLElement {
    static get observedAttributes(): string[] {
      return [
        ...(options.observedAttributes ?? []),
        ...reflector.getObservedAttributes(),
      ];
    }

    private _propertyValues = new Map<string, unknown>();
    private _isConnected = false;

    constructor() {
      super();

      // 初始化 Shadow DOM
      if (options.shadow) {
        const shadowInit: ShadowRootInit =
          typeof options.shadow === 'object'
            ? options.shadow
            : { mode: 'open' };
        this.attachShadow(shadowInit);

        // 注入样式
        if (options.styles && this.shadowRoot) {
          const style = document.createElement('style');
          style.textContent = options.styles;
          this.shadowRoot.appendChild(style);
        }
      }

      // 初始化属性默认值
      options.properties?.forEach((prop) => {
        if (hasOwn(prop, 'default')) {
          this._propertyValues.set(prop.name, prop.default);
        }
      });
    }

    connectedCallback(): void {
      this._isConnected = true;
      this.onConnected?.();
    }

    disconnectedCallback(): void {
      this._isConnected = false;
      this.onDisconnected?.();
    }

    attributeChangedCallback(
      name: string,
      oldValue: string | null,
      newValue: string | null,
    ): void {
      if (oldValue === newValue) return;

      const reflection = reflector.reflectFromAttribute(this, name);
      if (reflection) {
        const oldPropValue = this._propertyValues.get(reflection.prop);
        this._propertyValues.set(reflection.prop, reflection.value);

        // 触发属性变更回调
        const propDef = options.properties?.find(
          (p) => p.name === reflection.prop,
        );
        if (propDef?.onChange) {
          propDef.onChange(reflection.value, oldPropValue);
        }

        this.onPropertyChanged?.(reflection.prop, reflection.value, oldPropValue);
      }

      this.onAttributeChanged?.(name, oldValue, newValue);
    }

    /**
     * 获取属性值
     */
    getProperty<T = unknown>(name: string): T | undefined {
      return this._propertyValues.get(name) as T | undefined;
    }

    /**
     * 设置属性值（自动触发反射）
     */
    setProperty<T = unknown>(name: string, value: T): void {
      const oldValue = this._propertyValues.get(name);
      // FIX: P1-17 使用 Object.is() 替代 ===，正确处理 NaN 和 +/-0 等边界情况；
      // 对对象类型使用 JSON 序列化进行深度比较，避免引用不同但内容相同导致误判
      if (typeof value === 'object' && value !== null && typeof oldValue === 'object' && oldValue !== null) {
        if (JSON.stringify(value) === JSON.stringify(oldValue)) return;
      } else if (Object.is(oldValue, value)) {
        return;
      }

      this._propertyValues.set(name, value);

      // 反射到 attribute
      const propDef = options.properties?.find((p) => p.name === name);
      if (propDef?.reflect !== false) {
        reflector.reflectToAttribute(this, name, value);
      }

      // 触发变更回调
      if (propDef?.onChange) {
        propDef.onChange(value, oldValue);
      }

      this.onPropertyChanged?.(name, value, oldValue);
    }

    /**
     * 检查组件是否已连接
     */
    get isConnectedToDOM(): boolean {
      return this._isConnected;
    }

    /**
     * 生命周期钩子：已连接
     */
    protected onConnected?(): void;

    /**
     * 生命周期钩子：已断开
     */
    protected onDisconnected?(): void;

    /**
     * 生命周期钩子：属性变更
     */
    protected onPropertyChanged?(
      name: string,
      newValue: unknown,
      oldValue: unknown,
    ): void;

    /**
     * 生命周期钩子：attribute 变更
     */
    protected onAttributeChanged?(
      name: string,
      oldValue: string | null,
      newValue: string | null,
    ): void;
  }

  return EnhancedElement as typeof EnhancedElementClass;
}

// ============================================================
// 与 LytJS 组件系统的桥接
// ============================================================

/**
 * LytJS 组件与 Web Component 桥接选项
 */
export interface LytJSBridgeOptions {
  /** LytJS 组件定义 */
  component: unknown;
  /** 属性映射 */
  propMapping?: Record<string, string>;
  /** 事件映射 */
  eventMapping?: Record<string, string>;
  /** 插槽映射 */
  slotMapping?: Record<string, string>;
}

/**
 * 创建 LytJS 组件的 Web Component 包装器
 */
// FIX: P1-16 参数前加下划线表示有意未使用，添加 TODO 注释说明桥接功能待实现
export function defineLytJSWebComponent(
  name: string,
  _bridgeOptions: LytJSBridgeOptions,
  options?: WebComponentOptions,
): void {
  // TODO: 待实现 bridgeOptions 桥接功能，将 LytJS 组件的属性、事件、插槽映射到 Web Component
  const ElementClass = createEnhancedElementClass(options);

  customElements.define(name, ElementClass);
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 检查浏览器是否支持 Web Components
 */
export function supportsWebComponents(): boolean {
  return (
    typeof window !== 'undefined' &&
    'customElements' in window &&
    'HTMLElement' in window
  );
}

/**
 * 等待自定义元素定义完成
 */
export function whenDefined(name: string): Promise<void> {
  if (!supportsWebComponents()) {
    return Promise.reject(new Error('Web Components not supported'));
  }
  return customElements.whenDefined(name);
}

/**
 * 检查自定义元素是否已定义
 */
export function isDefined(name: string): boolean {
  if (!supportsWebComponents()) return false;
  return !!customElements.get(name);
}

/**
 * 升级页面中所有未升级的自定义元素
 */
export function upgradeAll(root: HTMLElement = document.body): void {
  if (!supportsWebComponents()) return;
  customElements.upgrade(root);
}

// ============================================================
// 导出
// ============================================================

export {
  camelToKebab,
  kebabToCamel,
};
