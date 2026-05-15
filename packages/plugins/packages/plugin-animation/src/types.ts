/**
 * @lytjs/plugin-animation - 类型定义
 */

export type EasingFunction =
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'ease-in-quad'
  | 'ease-out-quad'
  | 'ease-in-out-quad'
  | 'ease-in-cubic'
  | 'ease-out-cubic'
  | 'ease-in-out-cubic'
  | 'ease-in-quart'
  | 'ease-out-quart'
  | 'ease-in-out-quart'
  | 'ease-in-quint'
  | 'ease-out-quint'
  | 'ease-in-out-quint'
  | 'ease-in-sine'
  | 'ease-out-sine'
  | 'ease-in-out-sine'
  | 'ease-in-expo'
  | 'ease-out-expo'
  | 'ease-in-out-expo'
  | 'ease-in-circ'
  | 'ease-out-circ'
  | 'ease-in-out-circ'
  | 'ease-in-back'
  | 'ease-out-back'
  | 'ease-in-out-back'
  | 'spring'
  | ((t: number) => number);

export interface AnimationOptions {
  /** 动画时长（毫秒） */
  duration?: number;
  /** 缓动函数 */
  easing?: EasingFunction;
  /** 动画延迟（毫秒） */
  delay?: number;
  /** 动画次数，-1 表示无限循环 */
  iterations?: number;
  /** 动画方向 */
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  /** 动画填充模式 */
  fill?: 'none' | 'forwards' | 'backwards' | 'both' | 'auto';
  /** 动画开始前的回调 */
  onStart?: () => void;
  /** 动画更新时的回调 */
  onUpdate?: (progress: number) => void;
  /** 动画完成时的回调 */
  onComplete?: () => void;
  /** 动画暂停时的回调 */
  onPause?: () => void;
  /** 动画取消时的回调 */
  onCancel?: () => void;
}

export interface TransitionOptions {
  /** 过渡属性，默认 all */
  property?: string | string[];
  /** 过渡时长（毫秒） */
  duration?: number;
  /** 缓动函数 */
  easing?: EasingFunction;
  /** 过渡延迟（毫秒） */
  delay?: number;
  /** 过渡开始前的回调 */
  onBeforeEnter?: () => void;
  /** 过渡进入中回调 */
  onEnter?: () => void;
  /** 过渡进入完成回调 */
  onAfterEnter?: () => void;
  /** 过渡离开前回调 */
  onBeforeLeave?: () => void;
  /** 过渡离开中回调 */
  onLeave?: () => void;
  /** 过渡离开完成回调 */
  onAfterLeave?: () => void;
}

export interface Keyframe {
  /** 进度百分比 */
  offset: number;
  /** CSS 属性 */
  [property: string]: string | number;
}

export interface AnimationInstance {
  /** 动画 ID */
  id: string;
  /** 动画状态 */
  state: 'idle' | 'playing' | 'paused' | 'completed' | 'cancelled';
  /** 当前进度 0-1 */
  progress: number;
  /** 播放动画 */
  play: () => void;
  /** 暂停动画 */
  pause: () => void;
  /** 取消动画 */
  cancel: () => void;
  /** 重置动画 */
  reset: () => void;
  /** 跳转到指定进度 */
  seek: (progress: number) => void;
  /** 反转动画方向 */
  reverse: () => void;
}

export interface AnimationPluginOptions {
  /** 默认动画时长 */
  defaultDuration?: number;
  /** 默认缓动函数 */
  defaultEasing?: EasingFunction;
  /** 是否启用自动清理 */
  autoCleanup?: boolean;
}

export interface TransitionGroupOptions {
  /** 过渡名称 */
  name?: string;
  /** 过渡选项 */
  transition?: TransitionOptions;
  /** 元素移动时的动画选项 */
  move?: AnimationOptions;
}

export interface AnimationInstance {
  /** 动画 ID */
  id: string;
  /** 动画状态 */
  state: 'idle' | 'playing' | 'paused' | 'completed' | 'cancelled';
  /** 当前进度 0-1 */
  progress: number;
  /** 播放动画 */
  play: () => void;
  /** 暂停动画 */
  pause: () => void;
  /** 取消动画 */
  cancel: () => void;
  /** 重置动画 */
  reset: () => void;
  /** 跳转到指定进度 */
  seek: (progress: number) => void;
  /** 反转动画方向 */
  reverse: () => void;
}

export interface AnimationInstance {
  /** 动画 ID */
  id: string;
  /** 动画状态 */
  state: 'idle' | 'playing' | 'paused' | 'completed' | 'cancelled';
  /** 当前进度 0-1 */
  progress: number;
  /** 播放动画 */
  play: () => void;
  /** 暂停动画 */
  pause: () => void;
  /** 取消动画 */
  cancel: () => void;
  /** 重置动画 */
  reset: () => void;
  /** 跳转到指定进度 */
  seek: (progress: number) => void;
  /** 反转动画方向 */
  reverse: () => void;
}
