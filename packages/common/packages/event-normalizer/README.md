# @lytjs/common-event-normalizer

事件归一化工具，解析事件名与修饰符，提供 invoker 缓存模式，并通过 RendererHost 接口执行平台无关的事件操作。

## 安装

```bash
pnpm add @lytjs/common-event-normalizer
```

## 使用示例

```typescript
import { EventNormalizer } from '@lytjs/common-event-normalizer';

const normalizer = new EventNormalizer(rendererHost);

// 解析事件名
const parsed = normalizer.parseEventName('onClick.stop.prevent');
// => { name: 'click', modifiers: { stop: true, prevent: true, ... } }

// 规范化为标准事件名
normalizer.normalizeEventName('@click'); // 'click'
normalizer.normalizeEventName('onClick'); // 'click'

// 更新元素上的事件监听（invoker 缓存模式）
normalizer.patchEvent(el, 'onClick', handleClick);
normalizer.patchEvent(el, 'onClick', null); // 移除监听

// 移除元素上所有事件监听
normalizer.removeAllEventListeners(el);
```

### 事件名与修饰符

`parseEventName` / `normalizeEventName` 支持以下格式：

- `@click`、`onClick`、`click` → 规范化为 `click`
- 支持修饰符 `.stop` / `.prevent` / `.capture` / `.once` / `.self` / `.passive`

```typescript
// onClick.stop.prevent → { name: 'click', modifiers: { stop: true, prevent: true } }
// @click.capture      → { name: 'click', modifiers: { capture: true } }
```

## API 说明

### `EventNormalizer<HN, HE>` 类

需传入一个 [`RendererHost`](https://www.npmjs.com/package/@lytjs/host-contract) 实例完成事件绑定与移除。

| 方法                             | 作用                                                           |
| -------------------------------- | -------------------------------------------------------------- |
| `parseEventName(rawName)`        | 解析事件名与修饰符，返回 `ParsedEventInfo`                     |
| `normalizeEventName(rawName)`    | 将事件名规范化为标准格式（去除 `@`/`on` 前缀、修饰符、转小写） |
| `parseModifiers(rawName)`        | 解析出修饰符集合 `ParsedModifiers`                             |
| `getEventKey(rawName)`           | 将事件名转为 invoker 缓存 key（`click` → `onClick`）           |
| `patchEvent(el, rawName, value)` | 更新元素上的事件监听（invoker 缓存模式）                       |
| `removeAllEventListeners(el)`    | 移除元素上所有事件监听                                         |

### 调用约定

`patchEvent` 采用 invoker 缓存模式，处理四种情况：

1. 有新值 + 有旧 invoker → 仅替换 `invoker.value`（O(1)）
2. 有新值 + 无旧 invoker → 创建 invoker 并绑定事件
3. 无新值 + 有旧 invoker → 移除监听并清理缓存
4. 无新值 + 无旧 invoker → 无操作

### 类型

| 类型                     | 说明               |
| ------------------------ | ------------------ |
| `ParsedModifiers`        | 修饰符解析结果     |
| `ParsedEventInfo`        | 解析后的事件信息   |
| `EventInvoker<HE>`       | 事件 invoker 接口  |
| `EventListenerEntry<HE>` | 事件监听器注册条目 |

修饰符在 invoker 内部处理，更新时仅需替换 `value`，避免重复 `addEventListener`。

## 相关包

- 依赖 `@lytjs/host-contract`（RendererHost 接口）与 `@lytjs/common-events`
- [`@lytjs/common`](https://www.npmjs.com/package/@lytjs/common) 聚合包，统一导出各模块 API

## License

[MIT](../../../../LICENSE)
