// src/component-init.ts
// 组件完成 setup：data、methods、computed、watch、render 初始化
/* eslint-disable @typescript-eslint/no-unsafe-function-type */

import { reactive, computed, watch } from '@lytjs/reactivity';
import { hasOwn } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import type { ComponentInternalInstance, ComponentPublicInstance, RenderFunction } from './types';
import type { VNode } from '@lytjs/common-vnode';
import { callCreatedHook, handleError } from './lifecycle';
import { createComponentPublicInstance } from './component-proxy';

// ==================== 模板编译器注入点 ====================

/**
 * 模板编译器注入点。
 *
 * `@lytjs/component` **不硬依赖 `@lytjs/compiler`**（那会把 200KB+ 的编译器拖进
 * 所有只用组件系统的场景）。运行时编译能力由上层注入：
 * `@lytjs/core` 在加载 createApp 时调用 `setTemplateCompiler(compileTemplateToRender)`。
 *
 * ⚠️ 若未注入而组件又提供了 `template`，会得到**明确警告 + 空渲染**，
 * 而不是 2026-09-26 之前那种「静默空白、无任何提示」。
 */
let templateCompiler: ((template: string, options?: { filename?: string }) => unknown) | null =
  null;

/** 注册模板编译器（由 `@lytjs/core` 调用；重复调用幂等） */
export function setTemplateCompiler(
  compiler: (template: string, options?: { filename?: string }) => unknown,
): void {
  templateCompiler = compiler;
}

/** 读取当前注入的模板编译器（测试/调试用） */
export function getTemplateCompiler(): typeof templateCompiler {
  return templateCompiler;
}

/**
 * 由组件的 `template` 选项得到一个可用的渲染函数。
 *
 * 编译产物形如 `function render(_ctx, _cache) { … }`，
 * 其第一个参数即组件公共实例代理（`patch-component` 以 `renderFn.call(ctx, ctx)` 调用），
 * 因此**无需 bind this**。
 */
function resolveTemplateRender(type: Record<string, unknown>): RenderFunction {
  const template = type.template as string;

  if (!templateCompiler) {
    if (__DEV__) {
      warn(
        `组件 "${(type.name as string) || '(anonymous)'}" 提供了 template，但没有可用的模板编译器。` +
          `请从 '@lytjs/core' 导入 createApp（它会自动注入编译器），` +
          `或显式调用 setTemplateCompiler()。`,
      );
    }
    return (() => null as unknown as VNode) as RenderFunction;
  }

  const render = templateCompiler(template) as RenderFunction & ((...a: unknown[]) => unknown);
  return render as RenderFunction;
}

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
  if (
    raw !== null &&
    typeof raw === 'object' &&
    typeof (raw as Record<string, unknown>).handler !== 'undefined'
  ) {
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
        warn(
          `Data property "${key}" is already defined as a prop. Use default value in props instead.`,
        );
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
            warn(
              `Method "${key}" has type "${typeof method}" in component ${(type as Record<string, unknown>).name || '(anonymous)'}. Expected a function.`,
            );
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
                warn(
                  `Computed property "${key}" has no getter in component ${(type as Record<string, unknown>).name || '(anonymous)'}.`,
                );
                continue;
              }
              if (set !== undefined && typeof set !== 'function') {
                warn(
                  `Computed property "${key}" setter is not a function in component ${(type as Record<string, unknown>).name || '(anonymous)'}.`,
                );
              }
            }
            c = computed({
              get: get ? () => get.call(proxy) : () => undefined,
              set: set ? (v: unknown) => set.call(proxy, v) : undefined,
            } as Parameters<typeof computed>[0]);
          } else if (__DEV__) {
            warn(
              `Computed property "${key}" is not a function or object in component ${(type as Record<string, unknown>).name || '(anonymous)'}.`,
            );
            continue;
          }
          if (__DEV__ && type.methods && hasOwn(type.methods, key)) {
            warn(
              `Computed property "${key}" conflicts with a method of the same name in component ${(type as Record<string, unknown>).name || '(anonymous)'}. The method will be overwritten.`,
            );
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
          const options: { immediate?: boolean; deep?: boolean; flush?: 'pre' | 'post' | 'sync' } =
            {};
          if (
            !Array.isArray(raw) &&
            raw !== null &&
            typeof raw === 'object' &&
            typeof (raw as Record<string, unknown>).handler !== 'undefined'
          ) {
            const watchObj = raw as Record<string, unknown>;
            if (typeof watchObj.immediate === 'boolean') options.immediate = watchObj.immediate;
            if (typeof watchObj.deep === 'boolean') options.deep = watchObj.deep;
            if (typeof watchObj.flush === 'string')
              options.flush = watchObj.flush as 'pre' | 'post' | 'sync';
          }
          for (const handler of handlers) {
            watch(
              () => proxy[key as keyof ComponentPublicInstance],
              handler as (...args: unknown[]) => void,
              options,
            );
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
  //
  // 优先级：setup 返回的渲染函数 > options.render > options.template（运行时编译）
  //
  // ⚠️ `template` 分支是 2026-09-26 补上的（P0）：此前这里只认 `render`，
  //    且全仓没有任何 VNode 路径调用 `compile()` ——
  //    于是 `createApp({ setup, template })` **静默渲染空白**（无报错、无警告），
  //    而 README 的「快速开始」首个示例正是这种写法。
  try {
    if (!instance.render) {
      if (type.render) {
        instance.render = type.render.bind(instance.ctx);
      } else if (typeof type.template === 'string' && type.template.length > 0) {
        instance.render = resolveTemplateRender(type as unknown as Record<string, unknown>);
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
