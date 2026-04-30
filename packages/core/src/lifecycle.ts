// src/lifecycle.ts
// @lytjs/core - 生命周期钩子（代理到 @lytjs/component）

export {
  onMounted,
  onUnmounted,
  onUpdated,
  onBeforeMount,
  onBeforeUnmount,
  onBeforeUpdate,
  onErrorCaptured,
} from "@lytjs/component";

// onRenderTracked 和 onRenderTriggered 需要响应式系统的支持
// 这些钩子在 reactivity 的 effect 系统中触发

/**
 * 注册 renderTracked 钩子（调试用）
 */
export function onRenderTracked(_hook: (event: any) => void): void {
  // 当响应式依赖被追踪时调用
  // 需要在 effect 系统中集成
  if (__DEV__) {
    console.warn(
      "[lytjs] onRenderTracked is not yet implemented. " +
        "This hook requires integration with the reactivity effect system.",
    );
  }
}

/**
 * 注册 renderTriggered 钩子（调试用）
 */
export function onRenderTriggered(_hook: (event: any) => void): void {
  // 当响应式依赖被触发时调用
  // 需要在 effect 系统中集成
  if (__DEV__) {
    console.warn(
      "[lytjs] onRenderTriggered is not yet implemented. " +
        "This hook requires integration with the reactivity effect system.",
    );
  }
}
