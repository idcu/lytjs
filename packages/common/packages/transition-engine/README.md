# @lytjs/common-transition-engine

过渡引擎：平台无关的过渡动画状态机，所有 DOM 操作通过 `RendererHost` 执行。

## 安装

```bash
pnpm add @lytjs/common-transition-engine
```

## 使用示例

```typescript
import { TransitionEngine } from '@lytjs/common-transition-engine';
import type { RendererHost } from '@lytjs/host-contract';

// 需要传入一个 RendererHost 实例
const host: RendererHost = /* ... */;
const engine = new TransitionEngine(host, {
  defaultName: 'v',
  timeout: 5000,
  enableFLIP: true,
});

// 执行进入过渡
engine.performEnter(el, {
  onBeforeEnter(el) {},
  onEnter(el, done) { done(); },
  onAfterEnter(el) {},
}, () => {});

// 执行离开过渡
engine.performLeave(el, {}, () => {});

// FLIP 动画
engine.flip(el, () => {
  // 更新元素位置
});

// 销毁引擎
engine.dispose();
```

## API

### 类型

| 类型                        | 说明                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `TransitionProps<T>`        | 过渡属性：类名前缀 + 各阶段钩子（`onBeforeEnter`、`onEnter`、`onAfterEnter`、`onEnterCancelled`，以及对应的 leave 版本） |
| `RuntimeTransitionState`    | 运行时过渡状态：`phase`（`idle`/`entering`/`leaving`）、`cancelled`、`doneCallback`                                      |
| `FLIPRecord<HE>`            | FLIP 动画四阶段记录：First/Last/Invert/Play                                                                              |
| `ResolvedTransitionClasses` | 过渡类名解析结果：`from`、`active`、`to`                                                                                 |
| `TransitionEngineOptions`   | 引擎配置项：`defaultName`（默认 `'v'`）、`timeout`（默认 5000）、`enableFLIP`（默认 `true`）                             |

### `TransitionEngine<HN, HE>` 主类

平台无关的过渡动画状态机，包含 enter/leave 过渡逻辑与 FLIP 动画逻辑。

| 方法                                     | 说明                                               |
| ---------------------------------------- | -------------------------------------------------- |
| `constructor(host, options?)`            | 创建引擎实例，需要传入 `RendererHost`              |
| `getState(el)`                           | 获取元素的过渡状态                                 |
| `isTransitioning(el)`                    | 检查元素是否正在进行过渡                           |
| `performEnter(el, props, done)`          | 执行进入过渡                                       |
| `performLeave(el, props, done)`          | 执行离开过渡                                       |
| `cancelTransition(el)`                   | 取消元素上正在进行的过渡，并调用对应的取消钩子     |
| `flipRecordFirst(el)`                    | 记录 FLIP 的 First 状态                            |
| `flipRecordLast(record)`                 | 记录 FLIP 的 Last 状态并计算 Invert                |
| `flipPlay(record, duration?, easing?)`   | 执行 FLIP 的 Play 阶段                             |
| `flip(el, updateFn, duration?, easing?)` | 执行完整 FLIP 动画（First → Last → Invert → Play） |
| `dispose()`                              | 销毁引擎，清理内部状态                             |

### 过渡类名

未指定自定义类名时，使用 `{name}-{enter|leave}-{from|active|to}` 约定的默认类名，例如 `v-enter-from`、`v-leave-active`。

## 相关包

- [@lytjs/common](../../README.md) - LytJS 通用工具聚合包

## 许可证

[MIT](../../../../LICENSE)
