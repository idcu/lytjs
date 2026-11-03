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

// 取消进行中的过渡（会清掉 from / active / to 类名，并调用 *Cancelled 钩子）
engine.cancelTransition(el);

// 销毁引擎（撤掉所有挂起的定时器与 transitionend / animationend 监听）
engine.dispose();
```

### 收敛语义

- 过渡的结束以 `transitionend` / `animationend` 为准，`duration + 50ms` 作为兜底；
  子元素冒泡上来的事件不算（`target` 必须是被过渡的元素）。
- 时长为 0 或没有过渡声明 ⇒ **立即完成**（不会等 `timeout`）。
- `onAfterEnter` / `onAfterLeave` 抛错**不会**阻断 `done()` —— 否则调用方等不到结束、
  元素永不移除；错误会打到 `console.error`，状态机照常收敛。
- 取消过渡不调用 `done`（元素不因此被移除），但会调用 `onEnterCancelled` / `onLeaveCancelled`。

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
