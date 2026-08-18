# @lytjs/plugin-animation

LytJS 官方动画插件，基于 CSS 过渡与关键帧动画，提供高性能的动画控制能力与 GPU 加速优化。

## 安装

```bash
pnpm add @lytjs/plugin-animation
```

## 快速开始

### 作为插件使用

```typescript
import { createApp } from '@lytjs/core';
import pluginAnimation from '@lytjs/plugin-animation';

const app = createApp();
app.use(pluginAnimation, {
  defaultDuration: 300,
  defaultEasing: 'ease',
});
```

安装后可通过 `$animation`（或 provide 注入的 `lyt-animation`）管理动画，支持：

```typescript
// 创建动画
const animation = app.config.globalProperties.$animation.animate(
  (progress) => {
    el.style.opacity = String(progress);
  },
  { duration: 500 },
);

// 应用预设动画
app.config.globalProperties.$animation.applyPreset(el, 'fadeIn');

// 清理
$animation.clear();
```

### 独立使用

```typescript
import {
  createAnimation,
  transitionElement,
  createKeyframeAnimation,
} from '@lytjs/plugin-animation';

// 创建动画
const anim = createAnimation(
  (progress) => {
    el.style.opacity = String(progress);
  },
  { duration: 300, easing: 'ease-in-out' },
);
anim.play();
anim.pause();
anim.seek(0.5);
anim.reverse();

// 元素过渡
transitionElement(el, true, { property: 'opacity', duration: 300 });

// 关键帧动画
createKeyframeAnimation(el, [{ opacity: 0 }, { opacity: 1 }], {
  duration: 500,
  iterations: Infinity,
});
```

## 特性

- 丰富的内置缓动函数（`ease`、`ease-in-out`、`back`、`spring` 等）
- 支持 Web Animations API 与 JS 降级
- 预设动画集合（淡入淡出、滑动、缩放、弹跳、摇摆等）
- GPU 硬件加速优化工具（`to3DTransform`、`canUseGPU`、`enableGPUAcceleration` 等）
- 动画管理器（`$animation`），支持批量创建、移除与清理
- 零外部依赖

## API

### 核心函数

| 函数                                                   | 说明                                                                                   |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `createAnimation(animateFn, options)`                  | 创建基于 progress 回调的动画实例                                                       |
| `transitionElement(element, toggle, options)`          | 触发元素进入/离开过渡动画                                                              |
| `createKeyframeAnimation(element, keyframes, options)` | 基于关键帧创建动画，优先使用 Web Animations API                                        |
| `PRESETS`                                              | 内置预设动画集合（`fadeIn`、`fadeOut`、`slideInUp`、`zoomIn`、`bounceIn`、`shake` 等） |

### 动画实例（`AnimationInstance`）

包含 `id`、`state`、`progress`，以及 `play()`、`pause()`、`cancel()`、`reset()`、`seek(progress)`、`reverse()` 等方法。

### GPU 加速 API

`canUseGPU()`、`enableGPUAcceleration()`、`disableGPUAcceleration()`、`to3DTransform()`、`GPU_PRESETS`、`PerformanceOptimizer`、`getGlobalOptimizer()`、`resetGlobalOptimizer()`。

## 相关包

- [@lytjs/core](../../../core)：应用核心，提供 `definePlugin` 与 `createApp`。
- [@lytjs/reactivity](../../../reactivity)：响应式信号机制。

## 许可证

[MIT](../../../../LICENSE)
