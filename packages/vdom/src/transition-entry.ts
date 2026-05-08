/**
 * @lytjs/vdom/transition
 * Transition 和 TransitionGroup 子路径入口
 * 重新导出所有 transition 相关的公共 API
 */

// Transition
export {
  nextFrame,
  addTransitionClass,
  removeTransitionClass,
  getTransitionInfo,
  hasCSSTransition,
  performEnterTransition,
  performLeaveTransition,
  cancelTransition,
  createTransitionState,
} from './transition';

export type { TransitionProps, TransitionState, LegacyTransitionProps } from './transition';

// TransitionDurationInfo 已迁移到 @lytjs/host-contract
export type { TransitionDurationInfo } from '@lytjs/host-contract';

// TransitionGroup
export {
  recordPositions,
  applyFLIP,
  performGroupEnterTransition,
  performGroupLeaveTransition,
  createFLIPState,
  beforeUpdate as transitionGroupBeforeUpdate,
  afterUpdate as transitionGroupAfterUpdate,
} from './transition-group';

export type { TransitionGroupProps, LegacyTransitionGroupProps } from './transition-group';
