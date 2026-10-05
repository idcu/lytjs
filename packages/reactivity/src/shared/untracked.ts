/**
 * untrack 标志的**唯一持有者**（中立模块）
 *
 * ## 为什么把它抽出来
 *
 * 2026-10-05：`check-circular --src` 报出唯一一条 `reactivity` 内部的**运行时**循环：
 *
 *     effect.ts → signal.ts     （为了 `_isSignalUntracked()`）
 *     signal.ts → effect.ts     （为了 track / trigger / batch）
 *
 * 而 `_isSignalUntracked()` 只是返回 `signal.ts` 里一个模块级布尔值。
 * ⇒ 把这个标志放到**两边都能导入的中立模块**，`effect.ts` 就不必再依赖
 * `signal.ts`，**环被打断**，且行为完全不变（同一个模块级绑定）。
 *
 * ⚠️ 这里**不能**把状态搬进某个类或用别的方式「重构」——
 * 它的语义就是「一段动态范围」内的全局开关，必须保持**单一模块级绑定**。
 */

/** 是否处于 untrack（取消追踪）模式 */
let isUntracked = false;

/** @internal 读取当前是否处于 untrack 模式 */
export function isSignalUntracked(): boolean {
  return isUntracked;
}

/** @internal 设置 untrack 模式（一般请用 `withSignalUntracked`） */
export function setSignalUntracked(value: boolean): void {
  isUntracked = value;
}

/**
 * @internal 在 untrack 模式中执行 `fn`（结束后恢复原状态，支持嵌套）
 *
 * 函数内读取 signal 不会建立依赖关系。
 */
export function withSignalUntracked<T>(fn: () => T): T {
  const prev = isUntracked;
  isUntracked = true;
  try {
    return fn();
  } finally {
    isUntracked = prev;
  }
}

/** @internal 仅测试用：重置为「非 untrack」 */
export function resetSignalUntracked(): void {
  isUntracked = false;
}
