/**
 * @lytjs/reactivity - Shared Types
 * 响应式系统公共类型定义。
 */

/** 订阅者回调函数 */
export type Subscriber = () => void;

/** DEV 模式标记 - 由构建工具注入 */
declare const __DEV__: boolean;
