# plugin-animation 动画插件

> 基于 `@lytjs/plugin-animation` 的官方动画解决方案

## 特性

- 🎬 **丰富的动画 API** - 支持 CSS 动画、关键帧动画、过渡效果
- ⚡ **GPU 加速** - 使用 transform 和 opacity 实现高性能动画
- 🌊 **20+ 缓动函数** - 内置多种缓动曲线，支持自定义
- 🎯 **Web Animations API** - 自动降级，兼容所有浏览器
- 📦 **零第三方依赖** - 遵循 LytJS 零依赖原则

## 安装

```bash
npm install @lytjs/plugin-animation
# 或
pnpm add @lytjs/plugin-animation
```

## 基础用法

### 创建简单动画

```typescript
import { createAnimation } from '@lytjs/plugin-animation';

// 创建一个淡入动画
const animation = createAnimation(
  (progress) => {
    element.style.opacity = String(progress);
  },
  {
    duration: 1000,
    easing: 'ease'
  }
);

// 播放动画
animation.play();

// 暂停动画
animation.pause();

// 取消动画
animation.cancel();

// 重置动画
animation.reset();
```

### 动画回调

```typescript
const animation = createAnimation(
  (progress) => {
    element.style.opacity = String(progress);
  },
  {
    duration: 1000,
    onStart: () => {
      console.log('动画开始');
    },
    onUpdate: (progress) => {
      console.log('进度:', progress);
    },
    onComplete: () => {
      console.log('动画完成');
    },
    onPause: () => {
      console.log('动画暂停');
    },
    onCancel: () => {
      console.log('动画取消');
    }
  }
);
```

## 缓动函数

### 内置缓动函数

```typescript
import { createAnimation } from '@lytjs/plugin-animation';

// 线性动画
const anim1 = createAnimation(callback, { easing: 'linear' });

// 普通缓动
const anim2 = createAnimation(callback, { easing: 'ease' });

// 加速缓动
const anim3 = createAnimation(callback, { easing: 'ease-in' });

// 减速缓动
const anim4 = createAnimation(callback, { easing: 'ease-out' });

// 先加速后减速
const anim5 = createAnimation(callback, { easing: 'ease-in-out' });
```

### 更多缓动函数

```typescript
// 二次缓动
const easeInQuad = createAnimation(callback, { easing: 'ease-in-quad' });
const easeOutQuad = createAnimation(callback, { easing: 'ease-out-quad' });

// 三次缓动
const easeInCubic = createAnimation(callback, { easing: 'ease-in-cubic' });
const easeOutCubic = createAnimation(callback, { easing: 'ease-out-cubic' });

// 四次缓动
const easeInQuart = createAnimation(callback, { easing: 'ease-in-quart' });
const easeOutQuart = createAnimation(callback, { easing: 'ease-out-quart' });

// 五次缓动
const easeInQuint = createAnimation(callback, { easing: 'ease-in-quint' });
const easeOutQuint = createAnimation(callback, { easing: 'ease-out-quint' });

// 正弦缓动
const easeInSine = createAnimation(callback, { easing: 'ease-in-sine' });
const easeOutSine = createAnimation(callback, { easing: 'ease-out-sine' });

// 指数缓动
const easeInExpo = createAnimation(callback, { easing: 'ease-in-expo' });
const easeOutExpo = createAnimation(callback, { easing: 'ease-out-expo' });

// 圆弧缓动
const easeInCirc = createAnimation(callback, { easing: 'ease-in-circ' });
const easeOutCirc = createAnimation(callback, { easing: 'ease-out-circ' });

// 回弹缓动
const easeInBack = createAnimation(callback, { easing: 'ease-in-back' });
const easeOutBack = createAnimation(callback, { easing: 'ease-out-back' });

// 弹簧效果
const spring = createAnimation(callback, { easing: 'spring' });
```

### 自定义缓动函数

```typescript
// 使用自定义函数
const animation = createAnimation(
  callback,
  {
    easing: (t) => {
      // 自定义缓动逻辑
      return t * t * t; // 相当于 ease-in-cubic
    }
  }
);
```

## 关键帧动画

### 创建关键帧动画

```typescript
import { createKeyframeAnimation } from '@lytjs/plugin-animation';

const element = document.getElementById('box');

// 定义关键帧
const keyframes = [
  { offset: 0, transform: 'translateX(0)', opacity: 0 },
  { offset: 0.5, transform: 'translateX(100px)', opacity: 1 },
  { offset: 1, transform: 'translateX(200px)', opacity: 0 }
];

const animation = createKeyframeAnimation(element, keyframes, {
  duration: 2000,
  iterations: 3,
  direction: 'alternate'
});

animation.play();
```

### 关键帧选项

```typescript
const animation = createKeyframeAnimation(element, keyframes, {
  duration: 1000,          // 动画时长（毫秒）
  delay: 0,                // 延迟开始时间
  easing: 'ease',          // 缓动函数
  iterations: 1,            // 重复次数（Infinity 表示无限）
  direction: 'normal',     // 播放方向
  fill: 'forwards',        // 填充模式
  onStart: () => {},       // 开始回调
  onUpdate: () => {},      // 更新回调
  onComplete: () => {},    // 完成回调
  onPause: () => {},       // 暂停回调
  onCancel: () => {}       // 取消回调
});
```

## 预设动画

### 淡入淡出

```typescript
import { PRESETS, createKeyframeAnimation } from '@lytjs/plugin-animation';

const element = document.getElementById('box');

// 淡入
const fadeIn = createKeyframeAnimation(element, [
  { offset: 0, opacity: 0 },
  { offset: 1, opacity: 1 }
], { duration: 500 });

// 淡出
const fadeOut = createKeyframeAnimation(element, [
  { offset: 0, opacity: 1 },
  { offset: 1, opacity: 0 }
], { duration: 500 });
```

### 滑入滑出

```typescript
// 从上方滑入
const slideInDown = createKeyframeAnimation(element, [
  { offset: 0, transform: 'translateY(-100%)', opacity: 0 },
  { offset: 1, transform: 'translateY(0)', opacity: 1 }
], { duration: 300 });

// 从下方滑入
const slideInUp = createKeyframeAnimation(element, [
  { offset: 0, transform: 'translateY(100%)', opacity: 0 },
  { offset: 1, transform: 'translateY(0)', opacity: 1 }
], { duration: 300 });

// 从左侧滑入
const slideInLeft = createKeyframeAnimation(element, [
  { offset: 0, transform: 'translateX(-100%)', opacity: 0 },
  { offset: 1, transform: 'translateX(0)', opacity: 1 }
], { duration: 300 });

// 从右侧滑入
const slideInRight = createKeyframeAnimation(element, [
  { offset: 0, transform: 'translateX(100%)', opacity: 0 },
  { offset: 1, transform: 'translateX(0)', opacity: 1 }
], { duration: 300 });
```

### 缩放动画

```typescript
// 放大进入
const zoomIn = createKeyframeAnimation(element, [
  { offset: 0, transform: 'scale(0)', opacity: 0 },
  { offset: 1, transform: 'scale(1)', opacity: 1 }
], { duration: 300 });

// 缩小退出
const zoomOut = createKeyframeAnimation(element, [
  { offset: 0, transform: 'scale(1)', opacity: 1 },
  { offset: 1, transform: 'scale(0)', opacity: 0 }
], { duration: 300 });
```

### 弹跳效果

```typescript
const bounceIn = createKeyframeAnimation(element, [
  { offset: 0, transform: 'scale(0.3)', opacity: 0 },
  { offset: 0.4, transform: 'scale(1.1)' },
  { offset: 0.7, transform: 'scale(0.9)' },
  { offset: 1, transform: 'scale(1)', opacity: 1 }
], { duration: 500 });
```

### 抖动效果

```typescript
const shake = createKeyframeAnimation(element, [
  { offset: 0, transform: 'translateX(0)' },
  { offset: 0.1, transform: 'translateX(-1px)' },
  { offset: 0.2, transform: 'translateX(2px)' },
  { offset: 0.3, transform: 'translateX(-4px)' },
  { offset: 0.4, transform: 'translateX(4px)' },
  { offset: 0.5, transform: 'translateX(-4px)' },
  { offset: 0.6, transform: 'translateX(4px)' },
  { offset: 0.7, transform: 'translateX(-4px)' },
  { offset: 0.8, transform: 'translateX(2px)' },
  { offset: 0.9, transform: 'translateX(-1px)' },
  { offset: 1, transform: 'translateX(0)' }
], { duration: 500 });
```

## 动画控制

### 播放控制

```typescript
const animation = createAnimation(callback, { duration: 1000 });

// 开始播放
animation.play();

// 暂停
animation.pause();

// 取消
animation.cancel();

// 重置
animation.reset();

// 反转方向
animation.reverse();

// 跳转到指定进度（0-1）
animation.seek(0.5);
```

### 动画状态

```typescript
console.log(animation.state); // 'idle' | 'playing' | 'paused' | 'completed' | 'cancelled'
console.log(animation.progress); // 0-1 之间的进度值
console.log(animation.id); // 唯一标识符
```

### 动画方向

```typescript
const animation = createAnimation(callback, {
  duration: 1000,
  direction: 'normal'        // 正常方向播放
  // direction: 'reverse'    // 反向播放
  // direction: 'alternate' // 交替播放
  // direction: 'alternate-reverse' // 反向交替播放
});
```

### 动画迭代

```typescript
const animation = createAnimation(callback, {
  duration: 1000,
  iterations: 1,    // 播放1次
  // iterations: 3, // 播放3次
  // iterations: Infinity, // 无限循环
});
```

## 过渡效果

### 元素过渡

```typescript
import { transitionElement } from '@lytjs/plugin-animation';

const element = document.getElementById('modal');

// 显示过渡
transitionElement(element, true, {
  property: 'opacity',
  duration: 300,
  easing: 'ease',
  onBeforeEnter: () => {
    element.style.display = 'block';
  },
  onAfterEnter: () => {
    console.log('显示完成');
  }
});

// 隐藏过渡
transitionElement(element, false, {
  property: 'opacity',
  duration: 300,
  onAfterLeave: () => {
    element.style.display = 'none';
  }
});
```

### 多个属性过渡

```typescript
transitionElement(element, true, {
  property: ['opacity', 'transform'],
  duration: 500,
  easing: 'ease-out',
  onBeforeEnter: () => {
    element.style.display = 'flex';
  }
});
```

## 动画管理器

### 创建管理器

```typescript
import { createAnimationManager } from '@lytjs/plugin-animation';

const manager = createAnimationManager({
  defaultDuration: 300,
  defaultEasing: 'ease',
  autoCleanup: true
});
```

### 使用管理器

```typescript
// 创建自定义动画
const animation = manager.animate((progress) => {
  element.style.opacity = String(progress);
}, {
  duration: 1000
});

// 应用预设动画
const preset = manager.applyPreset(element, 'fadeIn', {
  duration: 500
});

// 移除动画
manager.remove(animation.id);

// 清理所有动画
manager.clear();
```

## 性能优化

### 使用 transform 和 opacity

```typescript
// ✅ 推荐：使用 transform
const animation = createAnimation(
  (progress) => {
    element.style.transform = `translateX(${progress * 100}px)`;
  },
  { duration: 1000 }
);

// ❌ 不推荐：使用 top/left
const badAnimation = createAnimation(
  (progress) => {
    element.style.left = `${progress * 100}px`; // 触发重排
  },
  { duration: 1000 }
);
```

### GPU 加速

```typescript
// 启用 GPU 加速
element.style.willChange = 'transform';
element.style.backfaceVisibility = 'hidden';

// 动画完成后清理
animation.onComplete = () => {
  element.style.willChange = 'auto';
};
```

### 批量动画

```typescript
// 同时播放多个动画
const animations = [
  createAnimation(callback1, { duration: 1000 }),
  createAnimation(callback2, { duration: 1000 }),
  createAnimation(callback3, { duration: 1000 })
];

// 播放所有动画
animations.forEach(anim => anim.play());
```

### 动画防抖

```typescript
let animationTimeout: number;

function handleHover() {
  clearTimeout(animationTimeout);
  animationTimeout = setTimeout(() => {
    element.classList.add('hover-animation');
  }, 100);
}
```

## 最佳实践

### 1. 清理动画资源

```typescript
const animation = createAnimation(callback, { duration: 1000 });

// 在组件卸载时清理
animation.onComplete = () => {
  animation.reset();
  // 清理相关资源
};
```

### 2. 合理使用时长

```typescript
// 快速交互反馈：100-200ms
const quickFeedback = createAnimation(callback, {
  duration: 150
});

// 常规过渡：200-400ms
const normalTransition = createAnimation(callback, {
  duration: 300
});

// 复杂动画：400-800ms
const complexAnimation = createAnimation(callback, {
  duration: 600
});
```

### 3. 动画可访问性

```typescript
// 检测用户偏好
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (prefersReducedMotion.matches) {
  // 使用更短或无动画
  createAnimation(callback, { duration: 50 });
} else {
  // 使用完整动画
  createAnimation(callback, { duration: 500 });
}
```

### 4. 动画队列

```typescript
class AnimationQueue {
  private queue: AnimationInstance[] = [];

  add(animation: AnimationInstance) {
    this.queue.push(animation);
    this.playNext();
  }

  private async playNext() {
    const next = this.queue.shift();
    if (next) {
      next.onComplete = () => this.playNext();
      next.play();
    }
  }
}

const queue = new AnimationQueue();
queue.add(animation1);
queue.add(animation2);
queue.add(animation3);
```

## 实际应用示例

### 模态框动画

```typescript
function showModal(element: HTMLElement) {
  // 显示动画
  const showAnim = createKeyframeAnimation(element, [
    { offset: 0, opacity: 0, transform: 'scale(0.9)' },
    { offset: 1, opacity: 1, transform: 'scale(1)' }
  ], {
    duration: 200,
    easing: 'ease-out'
  });

  element.style.display = 'flex';
  showAnim.play();
}

function hideModal(element: HTMLElement) {
  // 隐藏动画
  const hideAnim = createKeyframeAnimation(element, [
    { offset: 0, opacity: 1, transform: 'scale(1)' },
    { offset: 1, opacity: 0, transform: 'scale(0.9)' }
  ], {
    duration: 150,
    easing: 'ease-in',
    onComplete: () => {
      element.style.display = 'none';
    }
  });

  hideAnim.play();
}
```

### 列表项动画

```typescript
function animateListItem(element: HTMLElement) {
  const animation = createKeyframeAnimation(element, [
    { offset: 0, transform: 'translateY(-20px)', opacity: 0 },
    { offset: 1, transform: 'translateY(0)', opacity: 1 }
  ], {
    duration: 300,
    easing: 'ease-out'
  });

  animation.play();
}

// 为列表中的每个项添加动画
items.forEach((item, index) => {
  setTimeout(() => {
    animateListItem(item);
  }, index * 50); // 交错动画
});
```

### 加载动画

```typescript
function createLoadingAnimation(element: HTMLElement) {
  const animation = createAnimation(
    (progress) => {
      element.style.transform = `rotate(${progress * 360}deg)`;
    },
    {
      duration: 1000,
      iterations: Infinity,
      easing: 'linear'
    }
  );

  return animation;
}
```

## API 参考

### createAnimation

```typescript
function createAnimation(
  animateFn: (progress: number) => void,
  options?: AnimationOptions
): AnimationInstance
```

### AnimationOptions

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `duration` | `number` | `300` | 动画时长（毫秒） |
| `easing` | `EasingFunction` | `'ease'` | 缓动函数 |
| `delay` | `number` | `0` | 延迟时间（毫秒） |
| `iterations` | `number` | `1` | 重复次数 |
| `direction` | `string` | `'normal'` | 播放方向 |
| `fill` | `string` | `'none'` | 填充模式 |
| `onStart` | `Function` | - | 开始回调 |
| `onUpdate` | `Function` | - | 更新回调 |
| `onComplete` | `Function` | - | 完成回调 |
| `onPause` | `Function` | - | 暂停回调 |
| `onCancel` | `Function` | - | 取消回调 |

### AnimationInstance

| 属性/方法 | 类型 | 说明 |
|-----------|------|------|
| `id` | `string` | 唯一标识符 |
| `state` | `string` | 动画状态 |
| `progress` | `number` | 当前进度（0-1） |
| `play()` | `void` | 开始播放 |
| `pause()` | `void` | 暂停 |
| `cancel()` | `void` | 取消 |
| `reset()` | `void` | 重置 |
| `seek(progress)` | `void` | 跳转到指定进度 |
| `reverse()` | `void` | 反转方向 |

## 下一步

- 查看 [官方插件使用指南](./官方插件使用指南.md)
- 查看 [plugin-form 表单插件](./form.md)
- 查看 [实战案例：天气仪表盘](../examples/weather-dashboard.md)
