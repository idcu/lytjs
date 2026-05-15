/**
 * @lytjs/plugin-animation
 *
 * LytJS official animation plugin with CSS transitions and animations
 *
 * @packageDocumentation
 */

import { definePlugin } from '@lytjs/core';
import { signal, signalComputed as computed } from '@lytjs/reactivity';
import type {
  AnimationOptions,
  AnimationInstance,
  EasingFunction,
  TransitionOptions,
  Keyframe,
  AnimationPluginOptions,
} from './types';

/**
 * 缓动函数映射
 */
const EASING_FUNCTIONS: Record<string, (t: number) => number> = {
  linear: (t: number) => t,
  ease: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  'ease-in': (t: number) => t * t * t,
  'ease-out': (t: number) => (--t) * t * t + 1,
  'ease-in-out': (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  'ease-in-quad': (t: number) => t * t,
  'ease-out-quad': (t: number) => t * (2 - t),
  'ease-in-out-quad': (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  'ease-in-cubic': (t: number) => t * t * t,
  'ease-out-cubic': (t: number) => (--t) * t * t + 1,
  'ease-in-out-cubic': (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  'ease-in-quart': (t: number) => t * t * t * t,
  'ease-out-quart': (t: number) => 1 - (--t) * t * t * t,
  'ease-in-out-quart': (t: number) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
  'ease-in-quint': (t: number) => t * t * t * t * t,
  'ease-out-quint': (t: number) => 1 + (--t) * t * t * t * t,
  'ease-in-out-quint': (t: number) => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t,
  'ease-in-sine': (t: number) => 1 - Math.cos(t * Math.PI / 2),
  'ease-out-sine': (t: number) => Math.sin(t * Math.PI / 2),
  'ease-in-out-sine': (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  'ease-in-expo': (t: number) => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  'ease-out-expo': (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  'ease-in-out-expo': (t: number) => t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  'ease-in-circ': (t: number) => 1 - Math.sqrt(1 - t * t),
  'ease-out-circ': (t: number) => Math.sqrt(1 - (--t) * t),
  'ease-in-out-circ': (t: number) => t < 0.5 ? (1 - Math.sqrt(1 - 4 * t * t)) / 2 : (Math.sqrt(1 - (2 * t - 2) * (2 * t - 2)) + 1) / 2,
  'ease-in-back': (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  'ease-out-back': (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  'ease-in-out-back': (t: number) => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },
  spring: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};

/**
 * 生成唯一 ID
 */
let idCounter = 0;
function generateId(): string {
  return `lyt-animation-${++idCounter}`;
}

/**
 * 获取缓动函数
 */
function getEasingFunction(easing: EasingFunction): (t: number) => number {
  if (typeof easing === 'function') {
    return easing;
  }
  return EASING_FUNCTIONS[easing] || EASING_FUNCTIONS.ease;
}

/**
 * 创建动画实例
 */
export function createAnimation(
  animateFn: (progress: number) => void,
  options: AnimationOptions = {},
): AnimationInstance {
  const {
    duration = 300,
    easing = 'ease',
    delay = 0,
    iterations = 1,
    direction = 'normal',
    fill = 'none',
    onStart,
    onUpdate,
    onComplete,
    onPause,
    onCancel,
  } = options;

  const id = generateId();
  const easingFn = getEasingFunction(easing);

  let state: 'idle' | 'playing' | 'paused' | 'completed' | 'cancelled' = 'idle';
  let progress = 0;
  let startTime = 0;
  let pausedTime = 0;
  let animationFrameId: number | null = null;
  let currentIteration = 0;
  let isReversed = direction === 'reverse' || direction === 'alternate-reverse';

  const progressSignal = signal(0);

  function animate(timestamp: number) {
    if (state !== 'playing') return;

    if (!startTime) {
      startTime = timestamp;
    }

    const elapsed = timestamp - startTime - delay;

    if (elapsed >= 0) {
      const rawProgress = Math.min(elapsed / duration, 1);

      let adjustedProgress = rawProgress;

      if (isReversed) {
        adjustedProgress = 1 - rawProgress;
      }

      if (direction === 'alternate' || direction === 'alternate-reverse') {
        const cycleProgress = rawProgress * iterations;
        const currentCycle = Math.floor(cycleProgress);
        const cycleProgressRemainder = cycleProgress - currentCycle;
        adjustedProgress = currentCycle % 2 === 0 ? cycleProgressRemainder : 1 - cycleProgressRemainder;
      }

      progress = adjustedProgress;
      progressSignal.set(adjustedProgress);

      const easedProgress = easingFn(adjustedProgress);

      animateFn(easedProgress);

      if (onUpdate) {
        onUpdate(easedProgress);
      }

      if (rawProgress >= 1) {
        currentIteration++;

        if (iterations === -1 || currentIteration < iterations) {
          // 继续下一个迭代
          startTime = timestamp - (elapsed - duration);
          animationFrameId = requestAnimationFrame(animate);
          return;
        } else {
          state = 'completed';
          if (onComplete) {
            onComplete();
          }
        }
      } else {
        animationFrameId = requestAnimationFrame(animate);
      }
    } else {
      // 还在延迟中
      animationFrameId = requestAnimationFrame(animate);
    }
  }

  function play() {
    if (state === 'completed' || state === 'cancelled') {
      reset();
    }

    state = 'playing';

    if (onStart) {
      onStart();
    }

    animationFrameId = requestAnimationFrame(animate);
  }

  function pause() {
    if (state !== 'playing') return;

    state = 'paused';
    pausedTime = performance.now();

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    if (onPause) {
      onPause();
    }
  }

  function cancel() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    state = 'cancelled';

    if (onCancel) {
      onCancel();
    }
  }

  function reset() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    state = 'idle';
    progress = 0;
    currentIteration = 0;
    progressSignal.set(0);
    startTime = 0;
    pausedTime = 0;
    isReversed = direction === 'reverse' || direction === 'alternate-reverse';
  }

  function seek(newProgress: number) {
    progress = Math.max(0, Math.min(1, newProgress));
    progressSignal.set(progress);
    const easedProgress = easingFn(progress);
    animateFn(easedProgress);
    if (onUpdate) {
      onUpdate(easedProgress);
    }
  }

  function reverse() {
    isReversed = !isReversed;
  }

  return {
    id,
    get state() {
      return state;
    },
    get progress() {
      return progressSignal();
    },
    play,
    pause,
    cancel,
    reset,
    seek,
    reverse,
  };
}

/**
 * 元素过渡动画
 */
export function transitionElement(
  element: Element,
  toggle: boolean,
  options: TransitionOptions = {},
) {
  const {
    property = 'all',
    duration = 300,
    easing = 'ease',
    delay = 0,
    onBeforeEnter,
    onEnter,
    onAfterEnter,
    onBeforeLeave,
    onLeave,
    onAfterLeave,
  } = options;

  const propertyStr = Array.isArray(property) ? property.join(', ') : property;
  const easingFn = getEasingFunction(easing);

  if (toggle) {
    // 显示元素
    if (onBeforeEnter) {
      onBeforeEnter();
    }

    // 应用过渡样式
    (element as HTMLElement).style.transition = `${propertyStr} ${duration}ms ${typeof easing === 'string' ? easing : 'ease'} ${delay}ms`;

    requestAnimationFrame(() => {
      if (onEnter) {
        onEnter();
      }

      setTimeout(() => {
        if (onAfterEnter) {
          onAfterEnter();
        }
      }, duration + delay);
    });
  } else {
    // 隐藏元素
    if (onBeforeLeave) {
      onBeforeLeave();
    }

    (element as HTMLElement).style.transition = `${propertyStr} ${duration}ms ${typeof easing === 'string' ? easing : 'ease'} ${delay}ms`;

    requestAnimationFrame(() => {
      if (onLeave) {
        onLeave();
      }

      setTimeout(() => {
        if (onAfterLeave) {
          onAfterLeave();
        }
      }, duration + delay);
    });
  }
}

/**
 * 创建 CSS 关键帧动画
 */
export function createKeyframeAnimation(
  element: Element,
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  options: AnimationOptions = {},
): AnimationInstance {
  const {
    duration = 300,
    easing = 'ease',
    delay = 0,
    iterations = 1,
    direction = 'normal',
    fill = 'forwards',
    onStart,
    onUpdate,
    onComplete,
    onPause,
    onCancel,
  } = options;

  // 首先尝试使用 Web Animations API
  if (typeof (element as HTMLElement).animate === 'function') {
    let webAnimation: Animation | null = null;
    let updateInterval: number | null = null;

    const id = generateId();
    let isPlaying = false;

    const progressSignal = signal(0);

    const play = () => {
      if (!webAnimation) {
        webAnimation = (element as HTMLElement).animate(keyframes, {
          duration,
          easing: typeof easing === 'string' ? easing : 'ease',
          delay,
          iterations: iterations === -1 ? Infinity : iterations,
          direction,
          fill: fill as FillMode,
        });

        webAnimation.onfinish = () => {
          if (onComplete) {
            onComplete();
          }
        };

        webAnimation.oncancel = () => {
          if (onCancel) {
            onCancel();
          }
        };

        if (onUpdate) {
          updateInterval = window.setInterval(() => {
            if (webAnimation && webAnimation.currentTime !== null && webAnimation.currentTime !== undefined) {
              const progress = (webAnimation.currentTime as number) / duration;
              progressSignal.set(progress);
              onUpdate(progress);
            }
          }, 16);
        }
      } else {
        webAnimation.play();
      }

      isPlaying = true;
      if (onStart) {
        onStart();
      }
    };

    const pause = () => {
      if (webAnimation) {
        webAnimation.pause();
        isPlaying = false;
        if (onPause) {
          onPause();
        }
        if (updateInterval) {
          clearInterval(updateInterval);
          updateInterval = null;
        }
      }
    };

    const cancel = () => {
      if (webAnimation) {
        webAnimation.cancel();
        webAnimation = null;
        if (updateInterval) {
          clearInterval(updateInterval);
          updateInterval = null;
        }
      }
    };

    const reset = () => {
      if (webAnimation) {
        webAnimation.cancel();
        webAnimation = null;
        progressSignal.set(0);
        if (updateInterval) {
          clearInterval(updateInterval);
          updateInterval = null;
        }
      }
    };

    const seek = (progress: number) => {
      if (webAnimation) {
        webAnimation.currentTime = progress * duration;
        progressSignal.set(progress);
      }
    };

    const reverse = () => {
      if (webAnimation) {
        webAnimation.reverse();
      }
    };

    return {
      id,
      get state() {
        return isPlaying ? 'playing' : webAnimation ? 'paused' : 'idle';
      },
      get progress() {
        return progressSignal();
      },
      play,
      pause,
      cancel,
      reset,
      seek,
      reverse,
    };
  }

  // 降级使用简单的 JS 动画
  return createAnimation(() => {}, options);
}

/**
 * 预设动画集合
 */
export const PRESETS = {
  /** 淡入 */
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  /** 淡出 */
  fadeOut: {
    from: { opacity: 1 },
    to: { opacity: 0 },
  },
  /** 滑入（上方） */
  slideInUp: {
    from: { transform: 'translateY(100%)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 },
  },
  /** 滑入（下方） */
  slideInDown: {
    from: { transform: 'translateY(-100%)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 },
  },
  /** 滑入（左侧） */
  slideInLeft: {
    from: { transform: 'translateX(-100%)', opacity: 0 },
    to: { transform: 'translateX(0)', opacity: 1 },
  },
  /** 滑入（右侧） */
  slideInRight: {
    from: { transform: 'translateX(100%)', opacity: 0 },
    to: { transform: 'translateX(0)', opacity: 1 },
  },
  /** 缩放进入 */
  zoomIn: {
    from: { transform: 'scale(0)', opacity: 0 },
    to: { transform: 'scale(1)', opacity: 1 },
  },
  /** 缩放离开 */
  zoomOut: {
    from: { transform: 'scale(1)', opacity: 1 },
    to: { transform: 'scale(0)', opacity: 0 },
  },
  /** 弹跳进入 */
  bounceIn: {
    from: { transform: 'scale(0.3)', opacity: 0 },
    '40%': { transform: 'scale(1.1)' },
    '70%': { transform: 'scale(0.9)' },
    to: { transform: 'scale(1)', opacity: 1 },
  },
  /** 摇摆进入 */
  shake: {
    '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
    '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
    '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
    '40%, 60%': { transform: 'translate3d(4px, 0, 0)' },
  },
};

/**
 * 动画管理器
 */
function createAnimationManager(options: AnimationPluginOptions = {}) {
  const {
    defaultDuration = 300,
    defaultEasing = 'ease',
    autoCleanup = true,
  } = options;

  const animations = new Map<string, AnimationInstance>();

  /**
   * 创建动画
   */
  function animate(
    animateFn: (progress: number) => void,
    opts?: AnimationOptions,
  ): AnimationInstance {
    const animation = createAnimation(animateFn, {
      duration: defaultDuration,
      easing: defaultEasing,
      ...opts,
    });

    animations.set(animation.id, animation);

    return animation;
  }

  /**
   * 应用预设动画
   */
  function applyPreset(
    element: Element,
    presetName: keyof typeof PRESETS,
    opts?: AnimationOptions,
  ): AnimationInstance {
    const preset = PRESETS[presetName];
    if (!preset) {
      throw new Error(`Preset "${presetName}" not found`);
    }

    const keyframes: Keyframe[] = [];

    for (const key in preset) {
      const keyframe = preset[key as keyof typeof preset];
      let offset: number;

      if (key === 'from') offset = 0;
      else if (key === 'to') offset = 1;
      else {
        const match = key.match(/^(\d+)%$/);
        if (match) offset = parseInt(match[1], 10) / 100;
        else continue;
      }

      keyframes.push({
        offset,
        ...(keyframe as object),
      });
    }

    const animation = createKeyframeAnimation(element, keyframes, {
      duration: defaultDuration,
      easing: defaultEasing,
      ...opts,
    });

    animations.set(animation.id, animation);

    return animation;
  }

  /**
   * 移除动画
   */
  function remove(id: string) {
    const animation = animations.get(id);
    if (animation) {
      animation.cancel();
      animations.delete(id);
    }
  }

  /**
   * 清理所有动画
   */
  function clear() {
    for (const [id, animation] of animations) {
      animation.cancel();
    }
    animations.clear();
  }

  return {
    animate,
    applyPreset,
    transitionElement,
    remove,
    clear,
  };
}

const pluginAnimation = definePlugin({
  name: 'animation',
  version: '6.0.0',
  description: 'LytJS official animation plugin with CSS transitions and animations',
  author: 'LytJS Team',
  keywords: ['lytjs', 'animation', 'transition', 'css-animation'],
  schema: {
    type: 'object',
    object: {
      properties: {
        defaultDuration: { type: 'number', default: 300 },
        defaultEasing: { type: 'string', default: 'ease' },
        autoCleanup: { type: 'boolean', default: true },
      },
    },
  },
  install(app, options) {
    const animationManager = createAnimationManager(options as AnimationPluginOptions);

    app.config.globalProperties.$animation = animationManager;

    app.provide('lyt-animation', animationManager);
  },
});

export default pluginAnimation;
export type {
  AnimationOptions,
  AnimationInstance,
  AnimationPluginOptions,
  EasingFunction,
  TransitionOptions,
  Keyframe,
};
export {
  createAnimationManager,
};
