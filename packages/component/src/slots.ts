/**
 * Lyt.js 插槽系统
 *
 * 提供组件插槽的初始化、标准化与访问能力。
 * 支持默认插槽、具名插槽和作用域插槽。
 * 纯原生实现，零外部依赖。
 */

// ============================================================
// 类型定义
// ============================================================

import { isFunction, isPlainObject } from '@lytjs/common';

/**
 * 插槽内容类型
 *
 * 插槽内容可以是：
 * - 普通值（字符串、数字等）
 * - 返回 VNode / 内容的函数（作用域插槽）
 * - VNode 数组
 * - null / undefined（空插槽）
 */
export type SlotValue =
  | Function
  | object[]
  | string
  | number
  | boolean
  | null
  | undefined;

/** 插槽映射表：插槽名 → 插槽内容 */
export type Slots = Record<string, SlotValue>;

/** 子节点结构，用于传递插槽内容 */
export interface SlotChildren {
  /** 默认插槽内容 */
  default?: SlotValue;
  /** 具名插槽内容 */
  [name: string]: SlotValue | undefined;
}

/** 组件实例所需的最小插槽接口 */
export interface SlotsInstance {
  /** 初始化后的插槽映射 */
  slots: Slots;
}

// ============================================================
// 核心函数
// ============================================================

/**
 * 标准化插槽内容
 *
 * 将各种形式的插槽内容统一处理：
 * - null / undefined → 返回 null（空插槽）
 * - 函数 → 保持原样（作用域插槽，调用时传入 props）
 * - 数组 → 保持原样（多个子节点）
 * - 其他值 → 包装为数组（单个子节点）
 *
 * @param value - 原始插槽内容
 * @returns 标准化后的插槽内容
 */
export function normalizeSlotValue(value: SlotValue): SlotValue {
  // 空值：空插槽
  if (value === null || value === undefined) {
    return null;
  }

  // 函数：作用域插槽，保持原样
  if (isFunction(value)) {
    return value;
  }

  // 数组：多个子节点，保持原样
  if (Array.isArray(value)) {
    return value.length > 0 ? value : null;
  }

  // 其他值：直接返回（字符串、数字等简单值不需要包装为数组）
  return value;
}

/**
 * 初始化组件插槽
 *
 * 从 children 中提取插槽内容并标准化。
 * children 可以是：
 * - null / undefined → 无插槽
 * - 函数 → 默认作用域插槽
 * - 数组 → 默认插槽内容（多个子节点）
 * - 普通对象 → 具名插槽映射
 *
 * @param instance - 组件实例（需有 slots 属性）
 * @param children - 父组件传入的子节点 / 插槽内容
 * @returns 初始化后的插槽映射
 */
export function initSlots(
  instance: SlotsInstance,
  children: SlotChildren | SlotValue | null | undefined
): Slots {
  const slots: Slots = {};

  // 无子节点
  if (children === null || children === undefined) {
    instance.slots = slots;
    return slots;
  }

  // 函数：作为默认作用域插槽
  if (isFunction(children)) {
    slots.default = normalizeSlotValue(children);
    instance.slots = slots;
    return slots;
  }

  // 数组：作为默认插槽内容
  if (Array.isArray(children)) {
    slots.default = normalizeSlotValue(children);
    instance.slots = slots;
    return slots;
  }

  // 普通对象：具名插槽映射
  if (isPlainObject(children)) {
    const keys = Object.keys(children);

    for (let i = 0; i < keys.length; i++) {
      const name = keys[i];
      const value = children[name];

      if (value !== undefined) {
        slots[name] = normalizeSlotValue(value);
      }
    }

    instance.slots = slots;
    return slots;
  }

  // 其他值：作为默认插槽
  slots.default = normalizeSlotValue(children);
  instance.slots = slots;
  return slots;
}

/**
 * 渲染插槽
 *
 * 获取指定名称的插槽内容并渲染。
 * 如果是作用域插槽（函数），传入 scope 参数调用。
 *
 * @param slots - 插槽映射
 * @param name - 插槽名称（默认为 'default'）
 * @param scope - 传递给作用域插槽的数据
 * @returns 插槽渲染结果，如果没有对应插槽则返回 null
 */
export function renderSlot(
  slots: Slots,
  name: string = 'default',
  scope?: any
): any {
  const slot = slots[name];

  if (slot === null || slot === undefined) {
    return null;
  }

  // 作用域插槽：调用函数并传入 scope
  if (isFunction(slot)) {
    return slot(scope);
  }

  // 普通插槽：直接返回内容
  return slot;
}

/**
 * 检查插槽是否存在
 *
 * @param slots - 插槽映射
 * @param name - 插槽名称（默认为 'default'）
 * @returns 插槽是否存在且有内容
 */
export function hasSlot(slots: Slots, name: string = 'default'): boolean {
  const slot = slots[name];
  return slot !== null && slot !== undefined;
}
