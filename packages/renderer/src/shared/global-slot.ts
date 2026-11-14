// packages/renderer/src/shared/global-slot.ts
/**
 * 跨入口单例状态槽。
 *
 * 各包 tsup 是 `splitting: false`：同一模块会被逐入口内联，模块级 `let` / `Map` /
 * `Set` 在每个入口各有一份副本。需要跨入口共享的状态统一放这里 —— 以
 * `globalThis` 为存储、`Symbol.for` 为键，避免主入口内联副本与 `/client`、`/ssr`、
 * `/vapor` 等入口各记一套。
 *
 * 只放「进程内应当唯一」的状态；按实例/App 隔离的数据不要放进来。
 */
export function globalSlot<T extends object>(key: string, init: () => T): T {
  const symbol = Symbol.for(key);
  const existing = Reflect.get(globalThis, symbol) as T | undefined;
  if (existing) return existing;
  const created = init();
  Reflect.set(globalThis, symbol, created);
  return created;
}
