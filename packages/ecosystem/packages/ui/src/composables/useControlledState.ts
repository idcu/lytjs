/**
 * @lytjs/ui - useControlledState
 *
 * 把「受控 prop → 内部 signal，并在 prop 变化时跟随」的重复写法收敛到一处。
 *
 * 组件仍自行决定要 emit 哪个更新事件、在什么时机 emit —— 不同组件的更新事件名
 * 与调用顺序不同（例如分页同时更新 `current` / `pageSize`），这里**不隐式 emit**。
 */

import { signal, watch } from '@lytjs/reactivity';

export interface UseControlledStateOptions<T> {
  /** 读取受控 prop（在 render / setup 中调用时保持响应式） */
  get: () => T;
}

export interface ControlledState<T> {
  value: () => T;
  set: (next: T) => void;
}

export function useControlledState<T>(options: UseControlledStateOptions<T>): ControlledState<T> {
  const state = signal<T>(options.get());

  // 受控组件的 prop 变化必须跟随：只在值确实不同时写入，避免无意义的重渲染。
  watch(options.get, (next) => {
    if (next !== state()) state.set(next);
  });

  return {
    value: () => state(),
    set: (next: T) => state.set(next),
  };
}
