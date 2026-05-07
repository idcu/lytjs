// src/component-options.ts
// 组件选项合并、定义辅助函数和应用上下文

import { isFunction, hasOwn } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import type {
  ComponentOptions,
  ComponentPublicInstance,
  AppContext,
} from './types';
import type { VNode } from '@lytjs/common-vnode';

// ==================== defineComponent ====================

/**
 * defineComponent 是一个恒等函数，直接返回选项对象。
 * 它为组件选项提供 TypeScript 类型推断。
 */
export function defineComponent(options: ComponentOptions): ComponentOptions {
  return options;
}

// ==================== defineFunctionalComponent ====================

/**
 * 定义函数式组件。
 * 函数式组件没有实例、没有生命周期钩子、没有响应式状态。
 * 它接收 props 并直接返回渲染函数。
 *
 * FIX: P1-22 使用精确类型替代 Record<string, any>，
 * render 参数明确为返回 VNode 的函数，props 参数使用 Record<string, unknown>
 */
export function defineFunctionalComponent(
  render: (props: Record<string, unknown>) => VNode | VNode[] | null,
  props?: Record<string, unknown>,
): ComponentOptions {
  return {
    name: 'FunctionalComponent',
    props: props ?? {},
    setup(_props: Record<string, unknown>) {
      // 直接返回原始渲染函数，使 handleSetupResult
      // 将其赋值给 instance.render，让函数式组件正常工作。
      return render as unknown as () => VNode;
    },
    // 标记为函数式组件
    __isFunctional: true,
  } as ComponentOptions;
}

// ==================== mergeOptions ====================

/**
 * 合并组件选项的 extends 和 mixins。
 * 使用路径跟踪提供详细的循环依赖警告，
 * 包含完整的合并链和组件名称。
 *
 * FIX: P2-37 使用 pathLength 替代 [...path] 数组复制：
 * 原实现在每次递归调用时通过 [...path] 复制整个 path 数组，
 * 在深层嵌套的 extends/mixins 链中会产生 O(n^2) 的内存开销。
 * 改为传递原始 path 引用 + 当前路径长度 pathLength，
 * 在需要构建警告信息时通过 path.slice(0, pathLength) 获取当前路径，
 * 避免不必要的数组复制。
 */
export function mergeOptions(
  options: ComponentOptions,
  seen = new WeakSet<ComponentOptions>(),
  path: ComponentOptions[] = [],
  pathLength: number = 0,
): ComponentOptions {
  if (seen.has(options)) {
    if (__DEV__) {
      // 构建可读的循环路径（使用组件名称）
      const currentPath = path.slice(0, pathLength);
      const cycleStart = currentPath.indexOf(options);
      const cyclePath = currentPath
        .slice(cycleStart)
        .map((opts, i) => {
          const name =
            (opts as Record<string, unknown>).name ||
            (opts as Record<string, unknown>).__name ||
            `anonymous#${i}`;
          return String(name);
        })
        .join(' -> ');
      warn(`Circular mixin/extends detected: ${cyclePath} -> (cycle). Skipping.`);
    }
    return { ...options };
  }
  seen.add(options);
  path[pathLength] = options;

  let merged: ComponentOptions = { ...options };

  // 先应用 extends
  if (options.extends) {
    merged = mergeOptionsPair(mergeOptions(options.extends, seen, path, pathLength + 1), merged);
  }

  // 再应用 mixins
  if (options.mixins) {
    for (const mixin of options.mixins) {
      merged = mergeOptionsPair(merged, mergeOptions(mixin, seen, path, pathLength + 1));
    }
  }

  return merged;
}

/**
 * 合并两个 ComponentOptions 对象。
 */
function mergeOptionsPair(parent: ComponentOptions, child: ComponentOptions): ComponentOptions {
  // 使用 Record<string, unknown> 作为中间类型以支持动态键访问，
  // 最终通过类型断言返回 ComponentOptions
  const merged: Record<string, unknown> = { ...parent };

  for (const key in child) {
    if (key === 'props' || key === 'emits' || key === 'inject') {
      const parentVal = (parent as Record<string, unknown>)[key];
      const childVal = (child as Record<string, unknown>)[key];
      if (parentVal && childVal) {
        merged[key] = { ...parentVal, ...childVal };
      } else if (childVal) {
        merged[key] = childVal;
      }
    } else if (key === 'data' || key === 'provide') {
      const parentVal = (parent as Record<string, unknown>)[key];
      const childVal = (child as Record<string, unknown>)[key];
      if (parentVal && childVal) {
        merged[key] = function (this: ComponentPublicInstance) {
          const parentData = isFunction(parentVal) ? parentVal.call(this) : parentVal;
          const childData = isFunction(childVal) ? childVal.call(this) : childVal;
          return {
            ...(parentData as Record<string, unknown>),
            ...(childData as Record<string, unknown>),
          };
        };
      } else if (childVal) {
        merged[key] = childVal;
      }
    } else if (key === 'computed' || key === 'methods' || key === 'watch') {
      const parentVal = (parent as Record<string, unknown>)[key];
      const childVal = (child as Record<string, unknown>)[key];
      if (parentVal && childVal) {
        merged[key] = { ...parentVal, ...childVal };
      } else if (childVal) {
        merged[key] = childVal;
      }
    } else if (
      key === 'beforeCreate' ||
      key === 'created' ||
      key === 'beforeMount' ||
      key === 'mounted' ||
      key === 'beforeUpdate' ||
      key === 'updated' ||
      key === 'beforeUnmount' ||
      key === 'unmounted'
    ) {
      const parentVal = (parent as Record<string, unknown>)[key];
      const childVal = (child as Record<string, unknown>)[key];
      if (parentVal && childVal) {
        merged[key] = function (this: ComponentPublicInstance) {
          (parentVal as (...args: unknown[]) => unknown).call(this);
          (childVal as (...args: unknown[]) => unknown).call(this);
        };
      } else if (childVal) {
        merged[key] = childVal;
      }
    } else if (key === 'mixins' || key === 'extends') {
      // 跳过 - 已处理
    } else if (hasOwn(child, key)) {
      merged[key] = (child as Record<string, unknown>)[key];
    }
  }

  return merged as ComponentOptions;
}

// ==================== createAppContext ====================

/**
 * 创建基础应用上下文对象。
 * 导出供 @lytjs/core 扩展运行时字段。
 */
export function createAppContext(): AppContext {
  return {
    config: {},
    components: {},
    directives: {},
    mixins: [],
    provides: Object.create(null) as Record<string | symbol, unknown>,
  };
}
