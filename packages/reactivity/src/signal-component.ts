// src/signal-component.ts
// Signal 组件集成工具

import type { Signal, ComputedSignal } from './signal';

export interface SignalComponentOptions {
  signals?: Record<string, Signal<any>>;
  computed?: Record<string, ComputedSignal<any>>;
}

/**
 * 从组件选项中提取所有 signal 依赖
 */
export function extractSignals(options: SignalComponentOptions): (Signal<any> | ComputedSignal<any>)[] {
  const signals: (Signal<any> | ComputedSignal<any>)[] = [];
  if (options.signals) {
    signals.push(...Object.values(options.signals));
  }
  if (options.computed) {
    signals.push(...Object.values(options.computed));
  }
  return signals;
}

/**
 * 创建 signal 绑定辅助
 */
export function createSignalBinding<T>(
  signal: Signal<T>,
  onChange?: (value: T) => void
): { get: () => T; set: (value: T) => void } {
  return {
    get: () => signal(),
    set: (value: T) => {
      signal(value);
      onChange?.(value);
    },
  };
}

/**
 * 将 signal 值转换为响应式 props
 */
export function signalToProps(signals: Record<string, Signal<any>>): Record<string, any> {
  const props: Record<string, any> = {};
  for (const [key, sig] of Object.entries(signals)) {
    Object.defineProperty(props, key, {
      get: () => sig(),
      enumerable: true,
      configurable: true,
    });
  }
  return props;
}
