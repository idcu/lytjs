/**
 * Lyt.js 事件发射系统
 *
 * 提供组件自定义事件的声明、标准化与发射能力。
 * 支持驼峰命名自动转短横线、emits 声明校验。
 * 纯原生实现，零外部依赖。
 */

// ============================================================
// 类型定义
// ============================================================

/** emits 声明形式：字符串数组或带验证器的对象 */
export type EmitsOptions = string[] | Record<string, ((...args: any[]) => boolean) | null>;

/** 标准化后的 emits 配置 */
export interface NormalizedEmitsOptions {
  /** 已声明的事件名集合（短横线形式） */
  keys: string[];
  /** 事件名 → 验证函数映射（无验证器则为 null） */
  validators: Record<string, ((...args: any[]) => boolean) | null>;
}

/** 组件实例所需的最小 emit 接口 */
export interface EmitInstance {
  /** 组件的 emits 声明（标准化后） */
  emitsOptions?: NormalizedEmitsOptions;
  /** 组件注册的事件处理函数映射（key 为短横线形式） */
  props?: Record<string, any>;
}

/**
 * 从事件处理器类型提取事件类型
 * 例如：
 * - { onClick: (e: MouseEvent) => void } → { click: (e: MouseEvent) => void }
 */
export type ExtractEmitsFromHandlers<Handlers> = {
  [K in keyof Handlers as K extends `on${infer E}`
    ? Uncapitalize<E>
    : never]: Handlers[K] extends (...args: infer Args) => any
      ? (...args: Args) => void
      : never;
};

/**
 * 定义 emits 类型的工具函数
 * 用于类型安全的事件声明
 */
export function defineEmits<T extends EmitsOptions>(emits: T): T {
  return emits;
}

// ============================================================
// 内部工具
// ============================================================

/**
 * 将驼峰命名转为短横线命名
 *
 * 示例：
 * - handleChange → change
 * - updateValue → update-value
 * - myCustomEvent → my-custom-event
 *
 * @param str - 驼峰命名的字符串
 * @returns 短横线命名的字符串
 */
export function camelizeToHyphen(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}

/**
 * 将短横线命名转为驼峰命名
 *
 * 示例：
 * - update-value → updateValue
 * - my-custom-event → myCustomEvent
 *
 * @param str - 短横线命名的字符串
 * @returns 驼峰命名的字符串
 */
export function hyphenToCamel(str: string): string {
  return str.replace(/-(\w)/g, (_, c) => c.toUpperCase());
}

/**
 * 判断值是否为函数
 */
function isFunction(val: unknown): val is Function {
  return typeof val === 'function';
}

/**
 * 判断值是否为数组
 */
function isArray(val: unknown): val is any[] {
  return Array.isArray(val);
}

/**
 * 判断值是否为普通对象
 */
function isPlainObject(val: unknown): val is Record<string, any> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

// ============================================================
// 核心函数
// ============================================================

/**
 * 标准化 emits 声明
 *
 * 支持两种形式：
 * - 数组形式：['change', 'update'] → 每个事件无验证器
 * - 对象形式：{ change: null, update: (val) => val > 0 } → 可附带验证器
 *
 * 所有事件名统一转为短横线形式。
 *
 * @param emits - 组件 options 中传入的 emits 声明
 * @returns 标准化后的 emits 配置
 */
export function normalizeEmits(
  emits: EmitsOptions | undefined | null
): NormalizedEmitsOptions {
  if (!emits) {
    return { keys: [], validators: {} };
  }

  const keys: string[] = [];
  const validators: Record<string, ((...args: any[]) => boolean) | null> = {};

  // 数组形式
  if (isArray(emits)) {
    for (let i = 0; i < emits.length; i++) {
      const key = camelizeToHyphen(emits[i]);
      keys.push(key);
      validators[key] = null;
    }
    return { keys, validators };
  }

  // 对象形式
  const emitKeys = Object.keys(emits);
  for (let i = 0; i < emitKeys.length; i++) {
    const rawKey = emitKeys[i];
    const key = camelizeToHyphen(rawKey);
    const validator = emits[rawKey];

    keys.push(key);

    if (isFunction(validator)) {
      validators[key] = validator;
    } else {
      validators[key] = null;
    }
  }

  return { keys, validators };
}

/**
 * 组件事件发射
 *
 * 流程：
 * 1. 将事件名转为短横线形式
 * 2. 如果组件声明了 emits，校验事件是否已声明
 * 3. 如果该事件有验证器，执行验证
 * 4. 在实例 props 中查找对应的处理函数并调用
 *
 * 事件处理函数命名约定：
 * - 事件 "change" 对应处理函数 "onChange"
 * - 事件 "update-value" 对应处理函数 "onUpdateValue"
 *
 * @param instance - 组件实例
 * @param event - 事件名（支持驼峰或短横线形式）
 * @param args - 传递给事件处理函数的参数
 * @returns 事件是否有对应的处理函数被调用
 */
export function emit(
  instance: EmitInstance,
  event: string,
  ...args: any[]
): boolean {
  // 1. 将事件名统一转为短横线形式
  const eventName = camelizeToHyphen(event);

  // 2. emits 声明校验
  const emitsOptions = instance.emitsOptions;
  if (emitsOptions && emitsOptions.keys.length > 0) {
    const isDeclared = emitsOptions.keys.indexOf(eventName) !== -1;

    if (!isDeclared) {
      console.warn(
        `[Lyt Emit] 组件触发了未声明的事件: "${eventName}"。` +
          `请在 emits 选项中声明该事件。`
      );
      // 未声明的事件仍然尝试调用处理函数，但给出警告
    }

    // 3. 执行验证器
    const validator = emitsOptions.validators[eventName];
    if (isFunction(validator)) {
      try {
        const valid = validator(...args);
        if (!valid) {
          console.warn(
            `[Lyt Emit] 事件 "${eventName}" 的参数未通过验证。`
          );
          return false;
        }
      } catch (err) {
        console.warn(
          `[Lyt Emit] 事件 "${eventName}" 的验证器执行出错:`,
          err
        );
        return false;
      }
    }
  }

  // 4. 查找并调用事件处理函数
  // 短横线事件名 "update-value" → 处理函数名 "onUpdateValue"
  const handlerName = 'on' + eventName.charAt(0).toUpperCase() + eventName.slice(1);
  // 同时替换短横线为驼峰：onUpdate-value → onUpdateValue
  const camelHandlerName = handlerName.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

  const props = instance.props || {};
  const handler = props[camelHandlerName] || props[handlerName];

  if (isFunction(handler)) {
    handler(...args);
    return true;
  }

  return false;
}
