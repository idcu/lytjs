// src/component-init.ts
// 组件完成 setup：data、methods、computed、watch、render 初始化

import { reactive, computed, watch } from '@lytjs/reactivity';
import { hasOwn } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import type {
  ComponentInternalInstance,
  ComponentPublicInstance,
} from './types';
import type { VNode } from '@lytjs/common-vnode';
import { callCreatedHook, handleError } from './lifecycle';
import { createComponentPublicInstance } from './component-proxy';

// ==================== normalizeWatchHandler ====================

/**
 * 标准化原始 watch 处理器为绑定函数。
 * 支持函数、字符串（方法名）和对象 { handler } 形式。
 */
function normalizeWatchHandler(
  raw: unknown,
  methods: Record<string, Function> | undefined,
  proxy: ComponentPublicInstance,
): Function | null {
  if (typeof raw === 'function') {
    return raw.bind(proxy);
  }
  if (typeof raw === 'string') {
    if (methods && hasOwn(methods, raw)) {
      return methods[raw]!.bind(proxy);
    }
    if (__DEV__) {
      warn(`Invalid watch handler "${raw}". No matching method found.`);
    }
    return null;
  }
  if (raw !== null && typeof raw === 'object' && typeof (raw as Record<string, unknown>).handler !== 'undefined') {
    return normalizeWatchHandler((raw as Record<string, unknown>).handler, methods, proxy);
  }
  if (__DEV__) {
    warn(`Invalid watch handler. Expected a function, method name string, or { handler } object.`);
  }
  return null;
}

/**
 * 完成组件 setup：处理 data、methods、computed、render。
 *
 * 错误处理：整个 setup 过程包裹在 try-catch 中，
 * 优雅地处理 data/methods/computed/watch 初始化期间的错误。
 * 错误会传播到最近的 ErrorBoundary。
 */
export function finishComponentSetup(instance: ComponentInternalInstance): void {
  const { type } = instance;

  // 步骤 1：创建公共实例代理
  try {
    instance.ctx = createComponentPublicInstance(instance);
  } catch (err) {
    if (__DEV__) {
      warn(
        `Failed to create public instance proxy for ${(type as Record<string, unknown>).name || '(anonymous)'}: ${(err as Error).message}`,
      );
    }
    handleError(err as Error, instance, 'finishComponentSetup (createComponentPublicInstance)');
    instance.render = () => null as unknown as VNode;
    return;
  }

  // 步骤 2：初始化 data
  try {
    if (type.data) {
      const data = type.data.call(instance.ctx) ?? {};
      instance.data = reactive(data);
    }
  } catch (err) {
    if (__DEV__) {
      warn(
        `Failed to initialize data for ${(type as Record<string, unknown>).name || '(anonymous)'}: ${(err as Error).message}`,
      );
    }
    handleError(err as Error, instance, 'finishComponentSetup (data initialization)');
    instance.render = () => null as unknown as VNode;
    return;
  }

  // Props 冲突检测：创建 keys 集合以复用
  // FIX: P2-30 重命名为 devPropsKeys，避免与全局 __DEV__ 混淆
  const devPropsKeys = __DEV__ && instance.props ? new Set(Object.keys(instance.props)) : null;

  // 检查 data 与 props 冲突
  if (devPropsKeys && instance.data) {
    for (const key of Object.keys(instance.data)) {
      if (devPropsKeys.has(key)) {
        warn(`Data property "${key}" is already defined as a prop. Use default value in props instead.`);
      }
    }
  }

  const proxy = instance.ctx;

  // 步骤 3：初始化 methods
  try {
    if (type.methods) {
      for (const key in type.methods) {
        if (hasOwn(type.methods, key)) {
          const method = type.methods[key]!;
          if (__DEV__ && typeof method !== 'function') {
            warn(`Method "${key}" has type "${typeof method}" in component ${(type as Record<string, unknown>).name || '(anonymous)'}. Expected a function.`);
            continue;
          }
          instance.ctx[key as keyof ComponentPublicInstance] = method.bind(proxy) as never;
        }
      }
      // 检查 methods 与 props 冲突
      if (devPropsKeys) {
        for (const key of Object.keys(type.methods)) {
          if (devPropsKeys.has(key)) {
            warn(`Method "${key}" is already defined as a prop.`);
          }
        }
      }
    }
  } catch (err) {
    if (__DEV__) {
      warn(
        `Failed to initialize methods for ${(type as Record<string, unknown>).name || '(anonymous)'}: ${(err as Error).message}`,
      );
    }
    handleError(err as Error, instance, 'finishComponentSetup (methods initialization)');
    instance.render = () => null as unknown as VNode;
    return;
  }

  // 步骤 4：初始化 computed
  try {
    if (type.computed) {
      for (const key in type.computed) {
        if (hasOwn(type.computed, key)) {
          const opt = type.computed[key];
          let c;
          if (typeof opt === 'function') {
            // 函数形式 - 只有 getter
            c = computed(() => opt.call(proxy));
          } else if (opt && typeof opt === 'object') {
            // getter/setter 对象形式
            const { get, set } = opt as { get?: Function; set?: Function };
            if (__DEV__) {
              if (typeof get !== 'function') {
                warn(`Computed property "${key}" has no getter in component ${(type as Record<string, unknown>).name || '(anonymous)'}.`);
                continue;
              }
              if (set !== undefined && typeof set !== 'function') {
                warn(`Computed property "${key}" setter is not a function in component ${(type as Record<string, unknown>).name || '(anonymous)'}.`);
              }
            }
            c = computed({
              get: get ? () => get.call(proxy) : (() => undefined),
              set: set ? (v: unknown) => set.call(proxy, v) : undefined,
            } as Parameters<typeof computed>[0]);
          } else if (__DEV__) {
            warn(`Computed property "${key}" is not a function or object in component ${(type as Record<string, unknown>).name || '(anonymous)'}.`);
            continue;
          }
          if (__DEV__ && type.methods && hasOwn(type.methods, key)) {
            warn(`Computed property "${key}" conflicts with a method of the same name in component ${(type as Record<string, unknown>).name || '(anonymous)'}. The method will be overwritten.`);
          }
          instance.ctx[key as keyof ComponentPublicInstance] = c as never;
        }
      }
      // 检查 computed 与 props 冲突
      if (devPropsKeys) {
        for (const key of Object.keys(type.computed)) {
          if (devPropsKeys.has(key)) {
            warn(`Computed property "${key}" is already defined as a prop.`);
          }
        }
      }
    }
  } catch (err) {
    if (__DEV__) {
      warn(
        `Failed to initialize computed for ${(type as Record<string, unknown>).name || '(anonymous)'}: ${(err as Error).message}`,
      );
    }
    handleError(err as Error, instance, 'finishComponentSetup (computed initialization)');
    instance.render = () => null as unknown as VNode;
    return;
  }

  // 步骤 5：初始化 watch
  try {
    if (type.watch) {
      for (const key in type.watch) {
        if (hasOwn(type.watch, key)) {
          const raw = type.watch[key];
          // 标准化为 handler 数组
          const handlers: Function[] = [];
          if (Array.isArray(raw)) {
            for (const h of raw) {
              const normalized = normalizeWatchHandler(h, type.methods, proxy);
              if (normalized) handlers.push(normalized);
            }
          } else {
            const h = normalizeWatchHandler(raw, type.methods, proxy);
            if (h) handlers.push(h);
          }
          // 提取选项（仅对象形式）
          const options: { immediate?: boolean; deep?: boolean; flush?: 'pre' | 'post' | 'sync' } = {};
          if (!Array.isArray(raw) && raw !== null && typeof raw === 'object' && typeof (raw as Record<string, unknown>).handler !== 'undefined') {
            const watchObj = raw as Record<string, unknown>;
            if (typeof watchObj.immediate === 'boolean') options.immediate = watchObj.immediate;
            if (typeof watchObj.deep === 'boolean') options.deep = watchObj.deep;
            if (typeof watchObj.flush === 'string') options.flush = watchObj.flush as 'pre' | 'post' | 'sync';
          }
          for (const handler of handlers) {
            watch(() => proxy[key as keyof ComponentPublicInstance], handler as (...args: unknown[]) => void, options);
          }
        }
      }
    }
  } catch (err) {
    if (__DEV__) {
      warn(
        `Failed to initialize watch for ${(type as Record<string, unknown>).name || '(anonymous)'}: ${(err as Error).message}`,
      );
    }
    handleError(err as Error, instance, 'finishComponentSetup (watch initialization)');
    instance.render = () => null as unknown as VNode;
    return;
  }

  // 步骤 6：调用 created 钩子并注册渲染追踪钩子
  try {
    callCreatedHook(instance);

    // 注册选项式 API 的 renderTracked/renderTriggered 钩子
    if (type.renderTracked) {
      if (!instance.renderTrackedHooks) {
        instance.renderTrackedHooks = [];
      }
      instance.renderTrackedHooks.push(type.renderTracked.bind(proxy));
    }
    if (type.renderTriggered) {
      if (!instance.renderTriggeredHooks) {
        instance.renderTriggeredHooks = [];
      }
      instance.renderTriggeredHooks.push(type.renderTriggered.bind(proxy));
    }
  } catch (err) {
    if (__DEV__) {
      warn(
        `Failed during lifecycle hooks for ${(type as Record<string, unknown>).name || '(anonymous)'}: ${(err as Error).message}`,
      );
    }
    handleError(err as Error, instance, 'finishComponentSetup (lifecycle hooks)');
    instance.render = () => null as unknown as VNode;
    return;
  }

  // 步骤 7：设置渲染函数
  try {
    if (!instance.render) {
      if (type.render) {
        instance.render = type.render.bind(instance.ctx);
      }
    }
  } catch (err) {
    if (__DEV__) {
      warn(
        `Failed to set up render for ${(type as Record<string, unknown>).name || '(anonymous)'}: ${(err as Error).message}`,
      );
    }
    handleError(err as Error, instance, 'finishComponentSetup (render setup)');
    instance.render = () => null as unknown as VNode;
  }
}
