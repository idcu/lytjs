/**
 * Lyt.js Signal 组件集成 — 子路径入口
 *
 * 提供 Signal 与组件渲染函数之间的桥接工具。
 * 通过 `@lytjs/reactivity/signal-component` 引入。
 */
export {
  useSignal,
  useSignalState,
  enterSignalComponentContext,
  onSignalCleanup,
} from './signal-component';
