// src/lifecycle.ts
// @lytjs/core-signal - 生命周期钩子（代理到 @lytjs/component）

// Signal 模式支持的生命周期钩子
// 注意：Signal 模式不支持 onUpdated、onBeforeUpdate、onRenderTracked、onRenderTriggered
// 因为这些钩子与 VNode diff 渲染周期相关
export {
  onMounted,
  onUnmounted,
  onBeforeMount,
  onBeforeUnmount,
  onErrorCaptured,
} from '@lytjs/component';
