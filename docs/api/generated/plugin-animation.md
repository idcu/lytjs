# @lytjs/plugin-animation

官方动画插件，基于 CSS 动画与过渡

## 目录

- [GPUAccelerationOptions](#gpuaccelerationoptions)
- [to3DTransform](#to3dtransform)
- [canUseGPU](#canusegpu)
- [enableGPUAcceleration](#enablegpuacceleration)
- [disableGPUAcceleration](#disablegpuacceleration)
- [GPU_PRESETS](#gpu-presets)
- [PerformanceOptimizer](#performanceoptimizer)
- [globalOptimizer](#globaloptimizer)
- [getGlobalOptimizer](#getglobaloptimizer)
- [resetGlobalOptimizer](#resetglobaloptimizer)
- [EASING_FUNCTIONS](#easing-functions)
- [idCounter](#idcounter)
- [generateId](#generateid)
- [getEasingFunction](#geteasingfunction)
- [createAnimation](#createanimation)
- [transitionElement](#transitionelement)
- [createKeyframeAnimation](#createkeyframeanimation)
- [PRESETS](#presets)
- [createAnimationManager](#createanimationmanager)
- [animate](#animate)
- [applyPreset](#applypreset)
- [remove](#remove)
- [clear](#clear)
- [EasingFunction](#easingfunction)
- [AnimationOptions](#animationoptions)
- [TransitionOptions](#transitionoptions)
- [Keyframe](#keyframe)
- [AnimationInstance](#animationinstance)
- [AnimationPluginOptions](#animationpluginoptions)
- [TransitionGroupOptions](#transitiongroupoptions)
- [AnimationInstance](#animationinstance)
- [AnimationInstance](#animationinstance)

## GPUAccelerationOptions

**Interface**

GPU 加速配置

### 成员

| 名称                | 类型      | 描述        | 可选      |
| ------------------- | --------- | ----------- | --------- | ------------------ | --- | --- |
| enable3D            | `boolean` |             | 是        |
| willChange          | `'auto'   | 'transform' | 'opacity' | 'scroll-position'` |     | 是  |
| force3D             | `boolean` |             | 是        |
| compositorThreshold | `number`  |             | 是        |

## to3DTransform

**Function**

将 2D transform 转换为 3D（启用 GPU 加速）

### 签名

```typescript
to3DTransform: string;
```

### 参数

| 参数      | 类型     | 描述 | 可选 | 默认值 |
| --------- | -------- | ---- | ---- | ------ |
| transform | `string` |      | 否   | -      |

### 返回值

**类型:** `string`

## canUseGPU

**Function**

检测元素是否支持 GPU 加速

### 签名

```typescript
canUseGPU: boolean;
```

### 参数

| 参数    | 类型      | 描述 | 可选 | 默认值 |
| ------- | --------- | ---- | ---- | ------ |
| element | `Element` |      | 否   | -      |

### 返回值

**类型:** `boolean`

## enableGPUAcceleration

**Function**

为元素启用 GPU 加速

### 签名

```typescript
enableGPUAcceleration: void
```

### 参数

| 参数    | 类型                     | 描述 | 可选 | 默认值              |
| ------- | ------------------------ | ---- | ---- | ------------------- |
| element | `HTMLElement`            |      | 否   | -                   |
| options | `GPUAccelerationOptions` |      | 是   | DEFAULT_GPU_OPTIONS |

### 返回值

**类型:** `void`

## disableGPUAcceleration

**Function**

禁用元素的 GPU 加速

### 签名

```typescript
disableGPUAcceleration: void
```

### 参数

| 参数    | 类型          | 描述 | 可选 | 默认值 |
| ------- | ------------- | ---- | ---- | ------ |
| element | `HTMLElement` |      | 否   | -      |

### 返回值

**类型:** `void`

## GPU_PRESETS

**Variable**

GPU 加速的预设动画

## PerformanceOptimizer

**Class**

性能优化工具

### 成员

| 名称                    | 类型                      | 描述  | 可选 |
| ----------------------- | ------------------------- | ----- | ---- | --- |
| gpuEnabled              | `boolean`                 |       | 否   |
| options                 | `GPUAccelerationOptions`  |       | 否   |
| activeAnimations        | `Set<string>`             |       | 否   |
| rafId                   | `number                   | null` |      | 否  |
| batchedUpdates          | `Map<string, () => void>` |       | 否   |
| checkGPUAvailability    | -                         |       | 否   |
| isGPUAvailable          | -                         |       | 否   |
| shouldUseGPU            | -                         |       | 否   |
| optimizeElement         | -                         |       | 否   |
| batchAnimation          | -                         |       | 否   |
| flushBatchedUpdates     | -                         |       | 否   |
| trackAnimation          | -                         |       | 否   |
| untrackAnimation        | -                         |       | 否   |
| getActiveAnimationCount | -                         |       | 否   |
| cleanup                 | -                         |       | 否   |

## globalOptimizer

**Variable**

创建全局性能优化器实例

## getGlobalOptimizer

**Function**

### 签名

```typescript
getGlobalOptimizer: PerformanceOptimizer;
```

### 返回值

**类型:** `PerformanceOptimizer`

## resetGlobalOptimizer

**Function**

### 签名

```typescript
resetGlobalOptimizer: void
```

### 参数

| 参数    | 类型                     | 描述 | 可选 | 默认值 |
| ------- | ------------------------ | ---- | ---- | ------ |
| options | `GPUAccelerationOptions` |      | 是   | -      |

### 返回值

**类型:** `void`

## EASING_FUNCTIONS

**Variable**

缓动函数映射

## idCounter

**Variable**

生成唯一 ID

## generateId

**Function**

### 签名

```typescript
generateId: string;
```

### 返回值

**类型:** `string`

## getEasingFunction

**Function**

获取缓动函数

### 签名

```typescript
getEasingFunction: (t: number) => number;
```

### 参数

| 参数   | 类型             | 描述 | 可选 | 默认值 |
| ------ | ---------------- | ---- | ---- | ------ |
| easing | `EasingFunction` |      | 否   | -      |

### 返回值

**类型:** `(t: number) => number`

## createAnimation

**Function**

创建动画实例

### 签名

```typescript
createAnimation: AnimationInstance;
```

### 参数

| 参数      | 类型                         | 描述 | 可选 | 默认值 |
| --------- | ---------------------------- | ---- | ---- | ------ |
| animateFn | `(progress: number) => void` |      | 否   | -      |
| options   | `AnimationOptions`           |      | 是   | {}     |

### 返回值

**类型:** `AnimationInstance`

## transitionElement

**Function**

元素过渡动画

## createKeyframeAnimation

**Function**

创建 CSS 关键帧动画

### 签名

```typescript
createKeyframeAnimation: AnimationInstance;
```

### 参数

| 参数      | 类型               | 描述                      | 可选 | 默认值 |
| --------- | ------------------ | ------------------------- | ---- | ------ | --- |
| element   | `Element`          |                           | 否   | -      |
| keyframes | `Keyframe[]        | PropertyIndexedKeyframes` |      | 否     | -   |
| options   | `AnimationOptions` |                           | 是   | {}     |

### 返回值

**类型:** `AnimationInstance`

## PRESETS

**Variable**

预设动画集合

## createAnimationManager

**Function**

动画管理器

## animate

**Function**

创建动画

### 签名

```typescript
animate: AnimationInstance;
```

### 参数

| 参数      | 类型                         | 描述 | 可选 | 默认值 |
| --------- | ---------------------------- | ---- | ---- | ------ |
| animateFn | `(progress: number) => void` |      | 否   | -      |
| opts      | `AnimationOptions`           |      | 是   | -      |

### 返回值

**类型:** `AnimationInstance`

## applyPreset

**Function**

应用预设动画

### 签名

```typescript
applyPreset: AnimationInstance;
```

### 参数

| 参数       | 类型                   | 描述 | 可选 | 默认值 |
| ---------- | ---------------------- | ---- | ---- | ------ |
| element    | `Element`              |      | 否   | -      |
| presetName | `keyof typeof PRESETS` |      | 否   | -      |
| opts       | `AnimationOptions`     |      | 是   | -      |

### 返回值

**类型:** `AnimationInstance`

## remove

**Function**

移除动画

## clear

**Function**

清理所有动画

## EasingFunction

**Type**

### 签名

```typescript
EasingFunction: | 'linear'
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
  | ((t: number) => number)
```

## AnimationOptions

**Interface**

### 成员

| 名称       | 类型                         | 描述                      | 可选        |
| ---------- | ---------------------------- | ------------------------- | ----------- | -------------------- | -------- | ------------ | --- |
| duration   | `number`                     | 动画时长（毫秒）          | 是          |
| easing     | `EasingFunction`             | 缓动函数                  | 是          |
| delay      | `number`                     | 动画延迟（毫秒）          | 是          |
| iterations | `number`                     | 动画次数，-1 表示无限循环 | 是          |
| direction  | `'normal'                    | 'reverse'                 | 'alternate' | 'alternate-reverse'` | 动画方向 | 是           |
| fill       | `'none'                      | 'forwards'                | 'backwards' | 'both'               | 'auto'`  | 动画填充模式 | 是  |
| onStart    | `() => void`                 | 动画开始前的回调          | 是          |
| onUpdate   | `(progress: number) => void` | 动画更新时的回调          | 是          |
| onComplete | `() => void`                 | 动画完成时的回调          | 是          |
| onPause    | `() => void`                 | 动画暂停时的回调          | 是          |
| onCancel   | `() => void`                 | 动画取消时的回调          | 是          |

## TransitionOptions

**Interface**

### 成员

| 名称          | 类型             | 描述             | 可选               |
| ------------- | ---------------- | ---------------- | ------------------ | --- |
| property      | `string          | string[]`        | 过渡属性，默认 all | 是  |
| duration      | `number`         | 过渡时长（毫秒） | 是                 |
| easing        | `EasingFunction` | 缓动函数         | 是                 |
| delay         | `number`         | 过渡延迟（毫秒） | 是                 |
| onBeforeEnter | `() => void`     | 过渡开始前的回调 | 是                 |
| onEnter       | `() => void`     | 过渡进入中回调   | 是                 |
| onAfterEnter  | `() => void`     | 过渡进入完成回调 | 是                 |
| onBeforeLeave | `() => void`     | 过渡离开前回调   | 是                 |
| onLeave       | `() => void`     | 过渡离开中回调   | 是                 |
| onAfterLeave  | `() => void`     | 过渡离开完成回调 | 是                 |

## Keyframe

**Interface**

### 成员

| 名称   | 类型     | 描述       | 可选 |
| ------ | -------- | ---------- | ---- |
| offset | `number` | 进度百分比 | 否   |

## AnimationInstance

**Interface**

### 成员

| 名称     | 类型                         | 描述           | 可选     |
| -------- | ---------------------------- | -------------- | -------- | ----------- | ------------ | -------- | --- |
| id       | `string`                     | 动画 ID        | 否       |
| state    | `'idle'                      | 'playing'      | 'paused' | 'completed' | 'cancelled'` | 动画状态 | 否  |
| progress | `number`                     | 当前进度 0-1   | 否       |
| play     | `() => void`                 | 播放动画       | 否       |
| pause    | `() => void`                 | 暂停动画       | 否       |
| cancel   | `() => void`                 | 取消动画       | 否       |
| reset    | `() => void`                 | 重置动画       | 否       |
| seek     | `(progress: number) => void` | 跳转到指定进度 | 否       |
| reverse  | `() => void`                 | 反转动画方向   | 否       |

## AnimationPluginOptions

**Interface**

### 成员

| 名称            | 类型             | 描述             | 可选 |
| --------------- | ---------------- | ---------------- | ---- |
| defaultDuration | `number`         | 默认动画时长     | 是   |
| defaultEasing   | `EasingFunction` | 默认缓动函数     | 是   |
| autoCleanup     | `boolean`        | 是否启用自动清理 | 是   |

## TransitionGroupOptions

**Interface**

### 成员

| 名称       | 类型                | 描述                 | 可选 |
| ---------- | ------------------- | -------------------- | ---- |
| name       | `string`            | 过渡名称             | 是   |
| transition | `TransitionOptions` | 过渡选项             | 是   |
| move       | `AnimationOptions`  | 元素移动时的动画选项 | 是   |

## AnimationInstance

**Interface**

### 成员

| 名称     | 类型                         | 描述           | 可选     |
| -------- | ---------------------------- | -------------- | -------- | ----------- | ------------ | -------- | --- |
| id       | `string`                     | 动画 ID        | 否       |
| state    | `'idle'                      | 'playing'      | 'paused' | 'completed' | 'cancelled'` | 动画状态 | 否  |
| progress | `number`                     | 当前进度 0-1   | 否       |
| play     | `() => void`                 | 播放动画       | 否       |
| pause    | `() => void`                 | 暂停动画       | 否       |
| cancel   | `() => void`                 | 取消动画       | 否       |
| reset    | `() => void`                 | 重置动画       | 否       |
| seek     | `(progress: number) => void` | 跳转到指定进度 | 否       |
| reverse  | `() => void`                 | 反转动画方向   | 否       |

## AnimationInstance

**Interface**

### 成员

| 名称     | 类型                         | 描述           | 可选     |
| -------- | ---------------------------- | -------------- | -------- | ----------- | ------------ | -------- | --- |
| id       | `string`                     | 动画 ID        | 否       |
| state    | `'idle'                      | 'playing'      | 'paused' | 'completed' | 'cancelled'` | 动画状态 | 否  |
| progress | `number`                     | 当前进度 0-1   | 否       |
| play     | `() => void`                 | 播放动画       | 否       |
| pause    | `() => void`                 | 暂停动画       | 否       |
| cancel   | `() => void`                 | 取消动画       | 否       |
| reset    | `() => void`                 | 重置动画       | 否       |
| seek     | `(progress: number) => void` | 跳转到指定进度 | 否       |
| reverse  | `() => void`                 | 反转动画方向   | 否       |
