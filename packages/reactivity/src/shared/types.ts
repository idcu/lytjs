/**
 * @lytjs/reactivity - Shared Types
 * 响应式系统公共类型定义。
 */

/** 订阅者回调函数 */
export type Subscriber = () => void;

/** DEV 模式标记 */
export const __DEV__: boolean =
  typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';
