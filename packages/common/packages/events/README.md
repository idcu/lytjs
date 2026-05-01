# @lytjs/common-events

事件发射器与订阅管理工具，提供 DOM 事件名称映射和通用事件系统。

## 安装

```bash
pnpm add @lytjs/common-events
```

## API

### `getDOMEventName(rawName: string): string`

将 camelCase 事件属性名（如 `onClick`）转换为 DOM 事件名称（如 `click`）。

```typescript
import { getDOMEventName } from '@lytjs/common-events'

getDOMEventName('onClick') // 'click'
getDOMEventName('onDoubleClick') // 'dblclick'
getDOMEventName('onMouseEnter') // 'mouseenter'
```

### `extractDOMEventHandler(value: unknown): EventListener | null`

从属性值中提取事件处理函数。支持普通函数和 `{ handler: Function }` 形式。

### `extractDOMEventOptions(value: unknown): AddEventListenerOptions | undefined`

从属性值中提取事件选项（capture、passive、once）。

### `EventEmitter`

通用事件发射器，支持注册、移除和触发事件。

```typescript
import { EventEmitter } from '@lytjs/common-events'

const emitter = new EventEmitter()
emitter.on('data', (payload) => console.log(payload))
emitter.emit('data', { value: 42 })
emitter.off('data', handler)
```

### `SubscriptionManager`

订阅管理器，管理多个取消订阅函数的生命周期。

### `TopicSubscriptionManager`

基于主题的发布/订阅管理器。

## 边界行为与已知限制

### `getDOMEventName()` 的适用范围

`getDOMEventName()` 仅适用于 React 风格的 `onXxx` 标准事件属性名到 DOM 事件名称的映射。其工作方式如下：

1. 首先查找内置的 `DOM_EVENT_NAME_MAP` 映射表（覆盖 `onDoubleClick` -> `dblclick`、`onMouseEnter` -> `mouseenter` 等非简单小写的特殊情况）
2. 如果映射表中没有匹配项，则回退到简单的 `rawName.slice(2).toLowerCase()` 转换

**已知限制**：

| 场景 | 行为 | 说明 |
|---|---|---|
| 标准事件名（`onClick`、`onChange`） | 正确转换 | `click`、`change` |
| 映射表中的特殊名称 | 正确转换 | `onDoubleClick` -> `dblclick` |
| 非标准/自定义名称 | 可能产生错误结果 | `onMyCustomEvent` -> `mycustomevent` |
| 非 `on` 开头的名称 | 产生无意义结果 | `click` -> `ick`（截取前两个字符后转小写） |
| 短于 2 字符的名称 | 返回空字符串 | `on` -> `''` |

### `EventEmitter.emit()` 遍历安全

`EventEmitter.emit()` 内部使用 `Set.forEach()` 遍历事件处理器，而非 `for...of`。这一实现选择确保了以下行为：

- 在遍历期间通过 `on()` 添加的新处理器**不会被**当前 `emit()` 调用触发
- 在遍历期间通过 `off()` 移除的处理器**可能仍会被**当前 `emit()` 调用触发（取决于 `Set.forEach` 的内部迭代状态）
- 处理器执行时抛出的异常会被 `try/catch` 捕获并输出到 `console.error`，不会中断其他处理器的执行

```typescript
const emitter = new EventEmitter()
emitter.on('event', () => {
  emitter.on('event', () => console.log('不会在本次 emit 中执行'))
  emitter.off('event', handlerB) // handlerB 可能仍会执行
})
```

## License

MIT
