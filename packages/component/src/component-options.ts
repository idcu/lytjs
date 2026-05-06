// src/component-options.ts
// Component options merging, definition helpers, and app context

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
 * defineComponent is an identity function that returns the options.
 * It provides TypeScript type inference for component options.
 */
export function defineComponent(options: ComponentOptions): ComponentOptions {
  return options;
}

// ==================== defineFunctionalComponent ====================

/**
 * Define a functional component.
 * A functional component has no instance, no lifecycle hooks, and no reactive state.
 * It receives props and returns a render function directly.
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
      // Return the original render function directly so that handleSetupResult
      // assigns it as instance.render, making the functional component work correctly.
      return render as unknown as () => VNode;
    },
    // 标记为函数式组件
    __isFunctional: true,
  } as ComponentOptions;
}

// ==================== mergeOptions ====================

/**
 * Merge component options with extends and mixins.
 * Uses path tracking to provide detailed circular dependency warnings
 * that include the full merge chain with component names.
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
      // Build a human-readable cycle path using component names
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

  // Apply extends first
  if (options.extends) {
    merged = mergeOptionsPair(mergeOptions(options.extends, seen, path, pathLength + 1), merged);
  }

  // Then apply mixins
  if (options.mixins) {
    for (const mixin of options.mixins) {
      merged = mergeOptionsPair(merged, mergeOptions(mixin, seen, path, pathLength + 1));
    }
  }

  return merged;
}

/**
 * Merge two ComponentOptions objects.
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
      // Skip - already handled
    } else if (hasOwn(child, key)) {
      merged[key] = (child as Record<string, unknown>)[key];
    }
  }

  return merged as ComponentOptions;
}

// ==================== createAppContext ====================

/**
 * Create a base app context object.
 * Exported for @lytjs/core to extend with runtime fields.
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
