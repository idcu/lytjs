/**
 * @lytjs/web - CSS 变量支持模块
 *
 * 提供增强的 CSS 自定义属性（CSS Variables）支持，
 * 包括设置、获取、监听 CSS 变量变化等功能
 *
 * @module @lytjs/web/css-vars
 * @version 6.0.0
 */

// ============================================================
// 类型定义
// ============================================================

/**
 * CSS 变量值类型
 */
export type CSSVarValue = string | number | null | undefined;

/**
 * CSS 变量变更回调
 */
export type CSSVarChangeCallback = (
  newValue: string | null,
  oldValue: string | null,
  variable: string,
) => void;

/**
 * CSS 变量配置选项
 */
export interface CSSVarOptions {
  /** 是否继承父元素的值 */
  inherit?: boolean;
  /** 单位（用于数值类型） */
  unit?: string;
}

// ============================================================
// 核心工具函数
// ============================================================

/**
 * 规范化 CSS 变量名
 * 确保变量名以 -- 开头
 *
 * @param name - 变量名（可带或不带 -- 前缀）
 * @returns 规范化后的变量名
 * @example
 * ```ts
 * normalizeVarName('primary-color') // '--primary-color'
 * normalizeVarName('--primary-color') // '--primary-color'
 * ```
 */
export function normalizeVarName(name: string): string {
  return name.startsWith('--') ? name : `--${name}`;
}

/**
 * 移除 CSS 变量名的 -- 前缀
 *
 * @param name - 变量名
 * @returns 无前缀的变量名
 * @example
 * ```ts
 * stripVarPrefix('--primary-color') // 'primary-color'
 * stripVarPrefix('primary-color') // 'primary-color'
 * ```
 */
export function stripVarPrefix(name: string): string {
  return name.startsWith('--') ? name.slice(2) : name;
}

/**
 * 设置 CSS 变量
 *
 * @param element - 目标元素（默认为 document.documentElement）
 * @param name - 变量名
 * @param value - 变量值（null/undefined 表示移除）
 * @param options - 配置选项
 * @example
 * ```ts
 * // 设置全局变量
 * setCSSVar('--primary-color', '#007bff')
 *
 * // 设置元素变量
 * setCSSVar(myElement, 'font-size', 16, { unit: 'px' })
 *
 * // 移除变量
 * setCSSVar(myElement, '--old-var', null)
 * ```
 */
export function setCSSVar(
  element: HTMLElement | string,
  name?: string,
  value?: CSSVarValue,
  options?: CSSVarOptions,
): void;
export function setCSSVar(
  name: string,
  value?: CSSVarValue,
  options?: CSSVarOptions,
): void;
export function setCSSVar(
  elementOrName: HTMLElement | string,
  nameOrValue?: string | CSSVarValue,
  valueOrOptions?: CSSVarValue | CSSVarOptions,
  options?: CSSVarOptions,
): void {
  // 处理重载签名
  let element: HTMLElement;
  let varName: string;
  let varValue: CSSVarValue;
  let opts: CSSVarOptions | undefined;

  if (typeof elementOrName === 'string') {
    // 第一个参数是变量名（全局设置）
    element = document.documentElement;
    varName = normalizeVarName(elementOrName);
    varValue = nameOrValue as CSSVarValue;
    opts = valueOrOptions as CSSVarOptions | undefined;
  } else {
    // 第一个参数是元素
    element = elementOrName;
    varName = normalizeVarName(nameOrValue as string);
    varValue = valueOrOptions as CSSVarValue;
    opts = options;
  }

  if (!element) return;

  // 处理 null/undefined（移除变量）
  if (varValue === null || varValue === undefined) {
    element.style.removeProperty(varName);
    return;
  }

  // 处理数值和单位
  let finalValue: string;
  if (typeof varValue === 'number') {
    finalValue = opts?.unit ? `${varValue}${opts.unit}` : String(varValue);
  } else {
    finalValue = varValue;
  }

  element.style.setProperty(varName, finalValue);
}

/**
 * 获取 CSS 变量值
 *
 * @param element - 目标元素（默认为 document.documentElement）
 * @param name - 变量名
 * @param fallback - 默认值（变量不存在时返回）
 * @returns 变量值或默认值
 * @example
 * ```ts
 * // 获取全局变量
 * const color = getCSSVar('--primary-color')
 *
 * // 获取元素变量
 * const size = getCSSVar(myElement, 'font-size', '16px')
 * ```
 */
export function getCSSVar(name: string, fallback?: string): string | null;
export function getCSSVar(
  element: HTMLElement,
  name: string,
  fallback?: string,
): string | null;
export function getCSSVar(
  elementOrName: HTMLElement | string,
  nameOrFallback?: string,
  fallback?: string,
): string | null {
  // 处理重载签名
  let element: HTMLElement;
  let varName: string;
  let defaultValue: string | undefined;

  if (typeof elementOrName === 'string') {
    element = document.documentElement;
    varName = normalizeVarName(elementOrName);
    defaultValue = nameOrFallback;
  } else {
    element = elementOrName;
    varName = normalizeVarName(nameOrFallback as string);
    defaultValue = fallback;
  }

  if (!element) return defaultValue ?? null;

  // 首先尝试从元素的 style 属性获取
  const inlineValue = element.style.getPropertyValue(varName);
  if (inlineValue) return inlineValue;

  // 然后从计算样式获取
  const computedStyle = window.getComputedStyle(element);
  const value = computedStyle.getPropertyValue(varName).trim();

  return value || defaultValue || null;
}

/**
 * 批量设置 CSS 变量
 *
 * @param element - 目标元素（默认为 document.documentElement）
 * @param vars - 变量键值对对象
 * @example
 * ```ts
 * setCSSVars({
 *   '--primary-color': '#007bff',
 *   '--font-size': '16px',
 *   '--spacing': 8,
 * })
 * ```
 */
export function setCSSVars(
  vars: Record<string, CSSVarValue>,
): void;
export function setCSSVars(
  element: HTMLElement,
  vars: Record<string, CSSVarValue>,
): void;
export function setCSSVars(
  elementOrVars: HTMLElement | Record<string, CSSVarValue>,
  vars?: Record<string, CSSVarValue>,
): void {
  let element: HTMLElement;
  let variables: Record<string, CSSVarValue>;

  if (elementOrVars instanceof HTMLElement) {
    element = elementOrVars;
    variables = vars ?? {};
  } else {
    element = document.documentElement;
    variables = elementOrVars;
  }

  if (!element) return;

  Object.entries(variables).forEach(([name, value]) => {
    setCSSVar(element, name, value);
  });
}

/**
 * 批量获取 CSS 变量
 *
 * @param names - 变量名数组
 * @returns 变量值对象
 * @example
 * ```ts
 * const values = getCSSVars(['--primary-color', '--font-size'])
 * // { '--primary-color': '#007bff', '--font-size': '16px' }
 * ```
 */
export function getCSSVars(names: string[]): Record<string, string | null>;
export function getCSSVars(
  element: HTMLElement,
  names: string[],
): Record<string, string | null>;
export function getCSSVars(
  elementOrNames: HTMLElement | string[],
  names?: string[],
): Record<string, string | null> {
  let element: HTMLElement;
  let varNames: string[];

  if (elementOrNames instanceof HTMLElement) {
    element = elementOrNames;
    varNames = names ?? [];
  } else {
    element = document.documentElement;
    varNames = elementOrNames;
  }

  const result: Record<string, string | null> = {};
  varNames.forEach((name) => {
    result[name] = getCSSVar(element, name);
  });
  return result;
}

/**
 * 移除 CSS 变量
 *
 * @param element - 目标元素（默认为 document.documentElement）
 * @param name - 变量名
 * @example
 * ```ts
 * removeCSSVar('--old-variable')
 * removeCSSVar(myElement, '--old-variable')
 * ```
 */
export function removeCSSVar(name: string): void;
export function removeCSSVar(element: HTMLElement, name: string): void;
export function removeCSSVar(
  elementOrName: HTMLElement | string,
  name?: string,
): void {
  let element: HTMLElement;
  let varName: string;

  if (typeof elementOrName === 'string') {
    element = document.documentElement;
    varName = normalizeVarName(elementOrName);
  } else {
    element = elementOrName;
    varName = normalizeVarName(name as string);
  }

  if (!element) return;
  element.style.removeProperty(varName);
}

/**
 * 批量移除 CSS 变量
 *
 * @param names - 变量名数组
 * @example
 * ```ts
 * removeCSSVars(['--var1', '--var2'])
 * ```
 */
export function removeCSSVars(names: string[]): void;
export function removeCSSVars(element: HTMLElement, names: string[]): void;
export function removeCSSVars(
  elementOrNames: HTMLElement | string[],
  names?: string[],
): void {
  let element: HTMLElement;
  let varNames: string[];

  if (elementOrNames instanceof HTMLElement) {
    element = elementOrNames;
    varNames = names ?? [];
  } else {
    element = document.documentElement;
    varNames = elementOrNames;
  }

  if (!element) return;
  varNames.forEach((name) => {
    element.style.removeProperty(normalizeVarName(name));
  });
}

// ============================================================
// 高级功能
// ============================================================

/**
 * 检查元素是否有指定的 CSS 变量
 *
 * @param element - 目标元素（默认为 document.documentElement）
 * @param name - 变量名
 * @returns 如果变量存在则返回 true
 * @example
 * ```ts
 * if (hasCSSVar('--primary-color')) {
 *   // 变量存在
 * }
 * ```
 */
export function hasCSSVar(name: string): boolean;
export function hasCSSVar(element: HTMLElement, name: string): boolean;
export function hasCSSVar(
  elementOrName: HTMLElement | string,
  name?: string,
): boolean {
  let element: HTMLElement;
  let varName: string;

  if (typeof elementOrName === 'string') {
    element = document.documentElement;
    varName = normalizeVarName(elementOrName);
  } else {
    element = elementOrName;
    varName = normalizeVarName(name as string);
  }

  if (!element) return false;

  // 检查内联样式
  if (element.style.getPropertyValue(varName)) return true;

  // 检查计算样式
  const computedStyle = window.getComputedStyle(element);
  return !!computedStyle.getPropertyValue(varName).trim();
}

/**
 * 获取元素上定义的所有 CSS 变量
 *
 * @param element - 目标元素（默认为 document.documentElement）
 * @returns CSS 变量键值对
 * @example
 * ```ts
 * const vars = getAllCSSVars()
 * // { '--primary-color': '#007bff', '--font-size': '16px', ... }
 * ```
 */
export function getAllCSSVars(element?: HTMLElement): Record<string, string> {
  const el = element ?? document.documentElement;
  if (!el) return {};

  const result: Record<string, string> = {};
  const computedStyle = window.getComputedStyle(el);

  // 遍历所有计算样式属性
  for (let i = 0; i < computedStyle.length; i++) {
    const prop = computedStyle[i];
    if (prop.startsWith('--')) {
      const value = computedStyle.getPropertyValue(prop).trim();
      if (value) {
        result[prop] = value;
      }
    }
  }

  return result;
}

/**
 * 切换 CSS 变量的值（在两个值之间切换）
 *
 * @param element - 目标元素（默认为 document.documentElement）
 * @param name - 变量名
 * @param value1 - 第一个值
 * @param value2 - 第二个值
 * @returns 切换后的值
 * @example
 * ```ts
 * // 在 'dark' 和 'light' 之间切换主题
 * toggleCSSVar('--theme', 'dark', 'light')
 * ```
 */
export function toggleCSSVar(
  name: string,
  value1: string,
  value2: string,
): string;
export function toggleCSSVar(
  element: HTMLElement,
  name: string,
  value1: string,
  value2: string,
): string;
export function toggleCSSVar(
  elementOrName: HTMLElement | string,
  nameOrValue1: string,
  value1OrValue2?: string,
  value2?: string,
): string {
  let element: HTMLElement;
  let varName: string;
  let val1: string;
  let val2: string;

  if (typeof elementOrName === 'string') {
    element = document.documentElement;
    varName = normalizeVarName(elementOrName);
    val1 = nameOrValue1;
    val2 = value1OrValue2 as string;
  } else {
    element = elementOrName;
    varName = normalizeVarName(nameOrValue1);
    val1 = value1OrValue2 as string;
    val2 = value2 as string;
  }

  const currentValue = getCSSVar(element, varName);
  const newValue = currentValue === val1 ? val2 : val1;
  setCSSVar(element, varName, newValue);
  return newValue;
}

// ============================================================
// CSS 变量观察器
// ============================================================

/**
 * CSS 变量观察器
 * 用于监听 CSS 变量的变化
 */
export class CSSVarObserver {
  private observer: MutationObserver | null = null;
  private callbacks = new Map<string, Set<CSSVarChangeCallback>>();
  private element: HTMLElement;

  constructor(element?: HTMLElement) {
    this.element = element ?? document.documentElement;
  }

  /**
   * 开始观察 CSS 变量变化
   *
   * @param names - 要观察的变量名数组（可选，不指定则观察所有）
   */
  observe(names?: string[]): void {
    if (this.observer) return;

    const targetNames = names?.map(normalizeVarName);

    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          this.checkChanges(targetNames);
        }
      });
    });

    this.observer.observe(this.element, {
      attributes: true,
      attributeFilter: ['style'],
    });
  }

  /**
   * 停止观察
   */
  disconnect(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  /**
   * 订阅变量变化
   *
   * @param name - 变量名
   * @param callback - 变化回调
   * @returns 取消订阅函数
   */
  subscribe(name: string, callback: CSSVarChangeCallback): () => void {
    const varName = normalizeVarName(name);

    if (!this.callbacks.has(varName)) {
      this.callbacks.set(varName, new Set());
    }

    this.callbacks.get(varName)!.add(callback);

    return () => {
      this.callbacks.get(varName)?.delete(callback);
    };
  }

  /**
   * 检查变量变化
   */
  private lastValues = new Map<string, string | null>();

  private checkChanges(targetNames?: string[]): void {
    const namesToCheck = targetNames ?? Array.from(this.callbacks.keys());

    namesToCheck.forEach((name) => {
      const currentValue = getCSSVar(this.element, name);
      const lastValue = this.lastValues.get(name);

      if (currentValue !== lastValue) {
        this.lastValues.set(name, currentValue);

        const callbacks = this.callbacks.get(name);
        if (callbacks) {
          callbacks.forEach((cb) => cb(currentValue, lastValue ?? null, name));
        }
      }
    });
  }
}

// ============================================================
// 主题管理
// ============================================================

/**
 * 主题配置
 */
export interface ThemeConfig {
  [key: string]: CSSVarValue;
}

/**
 * 主题管理器
 * 用于管理多主题切换
 */
export class ThemeManager {
  private themes = new Map<string, ThemeConfig>();
  private currentTheme: string | null = null;
  private element: HTMLElement;

  constructor(element?: HTMLElement) {
    this.element = element ?? document.documentElement;
  }

  /**
   * 注册主题
   *
   * @param name - 主题名称
   * @param config - 主题配置（CSS 变量键值对）
   */
  register(name: string, config: ThemeConfig): void {
    this.themes.set(name, config);
  }

  /**
   * 应用主题
   *
   * @param name - 主题名称
   */
  apply(name: string): boolean {
    const theme = this.themes.get(name);
    if (!theme) return false;

    // 保存当前主题变量值用于切换动画
    const oldTheme = this.currentTheme;

    setCSSVars(this.element, theme);
    this.currentTheme = name;

    // 设置 data-theme 属性
    this.element.setAttribute('data-theme', name);

    return true;
  }

  /**
   * 获取当前主题名称
   */
  getCurrentTheme(): string | null {
    return this.currentTheme;
  }

  /**
   * 获取已注册的主题列表
   */
  getRegisteredThemes(): string[] {
    return Array.from(this.themes.keys());
  }

  /**
   * 检查主题是否存在
   */
  hasTheme(name: string): boolean {
    return this.themes.has(name);
  }

  /**
   * 获取主题配置
   */
  getThemeConfig(name: string): ThemeConfig | undefined {
    return this.themes.get(name);
  }
}

// ============================================================
// 导出
// ============================================================

export {
  // 核心函数
  normalizeVarName,
  stripVarPrefix,

  // 变量操作
  setCSSVar,
  getCSSVar,
  setCSSVars,
  getCSSVars,
  removeCSSVar,
  removeCSSVars,

  // 高级功能
  hasCSSVar,
  getAllCSSVars,
  toggleCSSVar,

  // 类
  CSSVarObserver,
  ThemeManager,
};
