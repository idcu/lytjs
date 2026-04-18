/**
 * @lytjs/component/builtins — 内置组件子路径入口
 *
 * 按需导入内置组件 API：
 *   import { Transition, KeepAlive, Suspense, defineAsyncComponent } from '@lytjs/component/builtins'
 */

export {
  Transition,
  TransitionGroup,
  KeepAlive,
  Suspense,
  defineAsyncComponent,
} from '../index'

export type {
  TransitionProps,
  TransitionGroupProps,
  KeepAliveProps,
  SuspenseProps,
  AsyncComponentOptions,
} from '../index'
