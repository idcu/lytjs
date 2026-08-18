# @lytjs/adapter-web

Web 平台适配器（DOM RendererHost）

## 目录

- [createWebHost](#createwebhost)
- [DOMOperation](#domoperation)
- [domOperationQueue](#domoperationqueue)
- [isBatchScheduled](#isbatchscheduled)
- [BATCH_INTERVAL](#batch-interval)
- [queueInsert](#queueinsert)
- [queueRemove](#queueremove)
- [queueSetText](#queuesettext)
- [queueSetElementText](#queuesetelementtext)
- [scheduleBatch](#schedulebatch)
- [flushDOMOperations](#flushdomoperations)
- [flushPendingDOMOperations](#flushpendingdomoperations)
- [defineCustomElement](#definecustomelement)
- [isCustomElementRegistered](#iscustomelementregistered)
- [getRegisteredCustomElements](#getregisteredcustomelements)
- [DOMRenderer](#domrenderer)
- [createDOMRenderer](#createdomrenderer)
- [cleanupVNodeResources](#cleanupvnoderesources)
- [wrapDOMEvent](#wrapdomevent)
- [ExtendedRendererHost](#extendedrendererhost)
- [HostCapabilities](#hostcapabilities)
- [detectHostCapabilities](#detecthostcapabilities)
- [CreateExtendedHostOptions](#createextendedhostoptions)
- [createExtendedWebHost](#createextendedwebhost)
- [cachedCapabilities](#cachedcapabilities)
- [supportsHostCapability](#supportshostcapability)
- [waitForHostReady](#waitforhostready)
- [ReflowCacheEntry](#reflowcacheentry)
- [reflowCache](#reflowcache)
- [REFLOW_CACHE_DURATION](#reflow-cache-duration)
- [pendingReflowElements](#pendingreflowelements)
- [isReflowScheduled](#isreflowscheduled)
- [scheduleForcedReflow](#scheduleforcedreflow)
- [WebRendererHost](#webrendererhost)
- [warnHydrationMismatch](#warnhydrationmismatch)
- [HydrationRenderer](#hydrationrenderer)
- [hydrateFragment](#hydratefragment)
- [hydrateText](#hydratetext)
- [hydrateComment](#hydratecomment)
- [hydrateMatchedElement](#hydratematchedelement)
- [hydrateMismatchedElement](#hydratemismatchedelement)
- [hydrateElement](#hydrateelement)
- [hydrateNode](#hydratenode)
- [createHydrationFunctions](#createhydrationfunctions)
- [ParsedEvent](#parsedevent)
- [EventInvoker](#eventinvoker)
- [InvokerCache](#invokercache)
- [veiCache](#veicache)
- [INVOKER_POOL_MAX_SIZE](#invoker-pool-max-size)
- [invokerPool](#invokerpool)
- [poolHitCount](#poolhitcount)
- [acquireInvoker](#acquireinvoker)
- [releaseInvoker](#releaseinvoker)
- [getInvokerPoolStats](#getinvokerpoolstats)
- [resetInvokerPoolStats](#resetinvokerpoolstats)
- [createInvoker](#createinvoker)
- [patchEvent](#patchevent)
- [removeAllEventListeners](#removealleventlisteners)
- [extractHandler](#extracthandler)
- [buildEventListenerOptions](#buildeventlisteneroptions)
- [patchProp](#patchprop)

## createWebHost

**Function**

创建 Web 平台的 RendererHost 实例。
便捷工厂函数，等价于 `new WebRendererHost()`。

### 签名

```typescript
createWebHost: RendererHost<Node, Element>;
```

### 返回值

**类型:** `RendererHost<Node, Element>`

## DOMOperation

**Type**

DOM 操作类型

### 签名

```typescript
DOMOperation: | { type: 'insert'; child: Node; parent: Node; anchor: Node | null }
  | { type: 'remove'; child: Node }
  | { type: 'setText'; node: Node; text: string }
  | { type: 'setElementText'; node: Element; text: string }
```

## domOperationQueue

**Variable**

DOM 操作队列

## isBatchScheduled

**Variable**

是否已调度批量处理

## BATCH_INTERVAL

**Variable**

最大批量处理间隔（毫秒）

## queueInsert

**Function**

将 insert 操作加入队列
FIX: P2-31 DOM 操作合并优化

### 签名

```typescript
queueInsert: void
```

### 参数

| 参数   | 类型   | 描述  | 可选 | 默认值 |
| ------ | ------ | ----- | ---- | ------ | --- |
| child  | `Node` |       | 否   | -      |
| parent | `Node` |       | 否   | -      |
| anchor | `Node  | null` |      | 是     | -   |

### 返回值

**类型:** `void`

## queueRemove

**Function**

将 remove 操作加入队列
FIX: P2-31 DOM 操作合并优化

### 签名

```typescript
queueRemove: void
```

### 参数

| 参数  | 类型   | 描述 | 可选 | 默认值 |
| ----- | ------ | ---- | ---- | ------ |
| child | `Node` |      | 否   | -      |

### 返回值

**类型:** `void`

## queueSetText

**Function**

将 setText 操作加入队列
FIX: P2-31 DOM 操作合并优化

### 签名

```typescript
queueSetText: void
```

### 参数

| 参数 | 类型     | 描述 | 可选 | 默认值 |
| ---- | -------- | ---- | ---- | ------ |
| node | `Node`   |      | 否   | -      |
| text | `string` |      | 否   | -      |

### 返回值

**类型:** `void`

## queueSetElementText

**Function**

将 setElementText 操作加入队列
FIX: P2-31 DOM 操作合并优化

### 签名

```typescript
queueSetElementText: void
```

### 参数

| 参数 | 类型      | 描述 | 可选 | 默认值 |
| ---- | --------- | ---- | ---- | ------ |
| node | `Element` |      | 否   | -      |
| text | `string`  |      | 否   | -      |

### 返回值

**类型:** `void`

## scheduleBatch

**Function**

调度批量 DOM 操作处理
FIX: P2-31 DOM 操作合并优化

### 签名

```typescript
scheduleBatch: void
```

### 返回值

**类型:** `void`

## flushDOMOperations

**Function**

批量处理 DOM 操作
FIX: P2-31 DOM 操作合并优化

### 签名

```typescript
flushDOMOperations: void
```

### 返回值

**类型:** `void`

## flushPendingDOMOperations

**Function**

同步刷新所有挂起的 DOM 操作
FIX: P2-31 DOM 操作合并优化

### 签名

```typescript
flushPendingDOMOperations: void
```

### 返回值

**类型:** `void`

## defineCustomElement

**Function**

注册自定义元素（Web Component）。
使用 registeredCustomElements Set 进行缓存，避免重复注册。

### 签名

```typescript
defineCustomElement: boolean;
```

### 参数

| 参数        | 类型                       | 描述 | 可选 | 默认值 |
| ----------- | -------------------------- | ---- | ---- | ------ |
| name        | `string`                   |      | 否   | -      |
| constructor | `CustomElementConstructor` |      | 否   | -      |
| options     | `ElementDefinitionOptions` |      | 是   | -      |

### 返回值

**类型:** `boolean`

是否成功注册（false 表示已存在或注册失败）

## isCustomElementRegistered

**Function**

检查自定义元素是否已注册。

### 签名

```typescript
isCustomElementRegistered: boolean;
```

### 参数

| 参数 | 类型     | 描述 | 可选 | 默认值 |
| ---- | -------- | ---- | ---- | ------ |
| name | `string` |      | 否   | -      |

### 返回值

**类型:** `boolean`

是否已注册

## getRegisteredCustomElements

**Function**

获取已注册的自定义元素名称列表。

### 签名

```typescript
getRegisteredCustomElements: string[]
```

### 返回值

**类型:** `string[]`

已注册的自定义元素名称数组

## DOMRenderer

**Interface**

### 成员

| 名称    | 类型 | 描述 | 可选 |
| ------- | ---- | ---- | ---- |
| render  | -    |      | 否   |
| patch   | -    |      | 否   |
| unmount | -    |      | 否   |
| mount   | -    |      | 否   |
| move    | -    |      | 否   |

## createDOMRenderer

**Function**

创建 DOM 渲染器。

使用 WebRendererHost 作为平台适配层，通过 vdom 的 createRenderer
创建完整的渲染器实例。vnodeMap 通过闭包作用域隔离。

### 签名

```typescript
createDOMRenderer: DOMRenderer;
```

### 参数

| 参数         | 类型                                                                 | 描述                 | 可选 | 默认值 |
| ------------ | -------------------------------------------------------------------- | -------------------- | ---- | ------ | --- |
| extraOptions | `Partial< Pick<RendererOptions<Node, Element>, 'setupChildComponent' | 'normalizeProps'> >` |      | 是     | -   |

### 返回值

**类型:** `DOMRenderer`

## cleanupVNodeResources

**Variable**

清理 VNode 关联的 Web 平台特有资源。
包括：取消动画帧、断开 IntersectionObserver / ResizeObserver / MutationObserver 等。

## wrapDOMEvent

**Function**

将原生 DOM Event 包装为 HostEvent。

纯翻译层，不做任何归一化或兼容处理。

### 签名

```typescript
wrapDOMEvent: HostEvent;
```

### 参数

| 参数 | 类型    | 描述 | 可选 | 默认值 |
| ---- | ------- | ---- | ---- | ------ |
| e    | `Event` |      | 否   | -      |

### 返回值

**类型:** `HostEvent`

HostEvent 实例

## ExtendedRendererHost

**Interface**

扩展的 RendererHost 接口
在基础 RendererHost 上添加了更多宿主操作方法

### 成员

| 名称                                     | 类型 | 描述                                 | 可选 |
| ---------------------------------------- | ---- | ------------------------------------ | ---- |
| insertBefore                             | -    | 在父节点的指定子节点之前插入新子节点 |
| 如果 referenceNode 为 null，则在末尾追加 | 否   |
| replaceChild                             | -    | 替换父节点中的子节点                 | 否   |
| firstChild                               | -    | 获取元素的第一个子节点               | 是   |
| lastChild                                | -    | 获取元素的最后一个子节点             | 是   |
| contains                                 | -    | 检查一个节点是否包含另一个节点       | 是   |
| getAttributeNames                        | -    | 获取元素的所有属性名                 | 是   |
| setAttributes                            | -    | 批量设置属性                         | 是   |
| removeAttributes                         | -    | 批量移除属性                         | 是   |
| setStyles                                | -    | 批量设置样式                         | 是   |
| getClassList                             | -    | 获取元素的所有 CSS 类名              | 是   |
| toggleClass                              | -    | 切换 CSS 类名                        | 是   |
| dispatchEvent                            | -    | 触发/分派事件                        | 是   |
| onceEventListener                        | -    | 一次性事件监听                       | 是   |
| querySelectorAll                         | -    | 查询所有匹配选择器的元素             | 是   |
| getElementById                           | -    | 通过 ID 获取元素                     | 是   |
| getElementsByClassName                   | -    | 通过类名获取元素                     | 是   |
| getElementsByTagName                     | -    | 通过标签名获取元素                   | 是   |
| scrollIntoView                           | -    | 滚动元素到视图                       | 是   |
| getScrollPosition                        | -    | 获取元素的滚动位置                   | 是   |
| setScrollPosition                        | -    | 设置元素的滚动位置                   | 是   |
| getElementSize                           | -    | 获取元素的尺寸信息                   | 是   |
| getElementOffset                         | -    | 获取元素相对于视口的位置             | 是   |

## HostCapabilities

**Interface**

宿主能力标志

### 成员

| 名称                 | 类型      | 描述                      | 可选 |
| -------------------- | --------- | ------------------------- | ---- |
| shadowDOM            | `boolean` | 支持 Shadow DOM           | 否   |
| customElements       | `boolean` | 支持自定义元素            | 否   |
| slots                | `boolean` | 支持插槽（Slot）          | 否   |
| template             | `boolean` | 支持模板（Template）      | 否   |
| cssVariables         | `boolean` | 支持 CSS 变量             | 否   |
| resizeObserver       | `boolean` | 支持 ResizeObserver       | 否   |
| intersectionObserver | `boolean` | 支持 IntersectionObserver | 否   |
| mutationObserver     | `boolean` | 支持 MutationObserver     | 否   |
| webAnimations        | `boolean` | 支持 Web Animations API   | 否   |
| cssAnimations        | `boolean` | 支持 CSS 动画             | 否   |
| cssTransitions       | `boolean` | 支持 CSS 过渡             | 否   |

## detectHostCapabilities

**Function**

检测宿主环境的能力

### 签名

```typescript
detectHostCapabilities: HostCapabilities;
```

### 返回值

**类型:** `HostCapabilities`

宿主能力标志对象

### 示例

````typescript
```ts
const caps = detectHostCapabilities()
if (caps.shadowDOM) {
  // 使用 Shadow DOM
}
````

````


## CreateExtendedHostOptions

**Interface**

创建扩展宿主适配器的选项

### 成员

| 名称 | 类型 | 描述 | 可选 |
|------|------|------|------|
| baseHost | `RendererHost` | 基础宿主实现 | 否 |
| enableExtendedNodeOps | `boolean` | 是否启用扩展的节点操作 | 是 |
| enableExtendedQuery | `boolean` | 是否启用扩展的查询操作 | 是 |
| enableExtendedScroll | `boolean` | 是否启用扩展的滚动操作 | 是 |


## createExtendedWebHost

**Function**

为 Web DOM 环境创建扩展宿主适配器

### 签名

```typescript
createExtendedWebHost: ExtendedRendererHost<Node, Element>
````

### 参数

| 参数    | 类型                        | 描述 | 可选 | 默认值 |
| ------- | --------------------------- | ---- | ---- | ------ |
| options | `CreateExtendedHostOptions` |      | 否   | -      |

### 返回值

**类型:** `ExtendedRendererHost<Node, Element>`

扩展的宿主适配器

## cachedCapabilities

**Variable**

检查宿主是否支持指定能力

FIX: P2-v11-32 缓存检测结果，避免每次调用都重新检测。
宿主能力在页面生命周期内不会变化，无需重复检测。

## supportsHostCapability

**Function**

### 签名

```typescript
supportsHostCapability: boolean;
```

### 参数

| 参数       | 类型                     | 描述 | 可选 | 默认值 |
| ---------- | ------------------------ | ---- | ---- | ------ |
| capability | `keyof HostCapabilities` |      | 否   | -      |

### 返回值

**类型:** `boolean`

## waitForHostReady

**Function**

等待宿主环境就绪

### 签名

```typescript
waitForHostReady: Promise<void>;
```

### 返回值

**类型:** `Promise<void>`

Promise

## ReflowCacheEntry

**Interface**

重排缓存项

### 成员

| 名称      | 类型     | 描述 | 可选 |
| --------- | -------- | ---- | ---- |
| width     | `number` |      | 否   |
| height    | `number` |      | 否   |
| timestamp | `number` |      | 否   |

## reflowCache

**Variable**

重排缓存

## REFLOW_CACHE_DURATION

**Variable**

缓存有效期（毫秒）

## pendingReflowElements

**Variable**

待处理的强制重排元素队列

## isReflowScheduled

**Variable**

是否已调度重排处理

## scheduleForcedReflow

**Function**

调度强制重排
FIX: P2-33 强制同步布局优化 - 批量处理避免重复读取

### 签名

```typescript
scheduleForcedReflow: void
```

### 参数

| 参数 | 类型      | 描述 | 可选 | 默认值 |
| ---- | --------- | ---- | ---- | ------ |
| el   | `Element` |      | 否   | -      |

### 返回值

**类型:** `void`

## WebRendererHost

**Class**

Web 平台渲染宿主实现。

实现 RendererHost<Node, Element> 接口，将所有操作直接翻译为浏览器 DOM API。

### 成员

| 名称                                                         | 类型 | 描述                               | 可选 |
| ------------------------------------------------------------ | ---- | ---------------------------------- | ---- |
| \_\_isRendererHost                                           | -    |                                    | 否   |
| wrappedHandlerMap                                            | -    |                                    | 否   |
| getWrappedHandler                                            | -    |                                    | 否   |
| setWrappedHandler                                            | -    |                                    | 否   |
| createElement                                                | -    | 创建元素节点。                     |
| SVG 标签使用 createElementNS，普通标签使用 createElement。   | 否   |
| createText                                                   | -    | 创建文本节点                       | 否   |
| createComment                                                | -    | 创建注释节点                       | 否   |
| setElementText                                               | -    | 设置元素文本内容（覆盖所有子节点） | 否   |
| setText                                                      | -    | 设置文本/注释节点的内容            | 否   |
| insert                                                       | -    | 在父节点的 anchor 前插入子节点。   |
| anchor 为 null 时追加到末尾。                                | 否   |
| remove                                                       | -    | 从父节点移除子节点                 | 否   |
| nextSibling                                                  | -    | 获取下一个兄弟节点                 | 否   |
| parentNode                                                   | -    | 获取父节点                         | 否   |
| querySelector                                                | -    | 查询选择器。                       | 否   |
| patchProp                                                    | -    | 统一属性 patch 入口。              |
| 委托给 web-patch-props.ts 处理 class/style/event/attr 分发。 | 否   |
| addClass                                                     | -    | 添加 CSS 类名                      | 否   |
| removeClass                                                  | -    | 移除 CSS 类名                      | 否   |
| hasClass                                                     | -    | 检查是否包含 CSS 类名              | 否   |
| setStyle                                                     | -    | 设置内联样式属性。                 |

value 为 null/undefined 时移除该样式属性。
FIX: P2-v11-35 添加 SVG 元素兼容检查，
SVG 元素的 style 属性是 CSSStyleDeclaration 但部分属性名不同，
使用 setProperty/removeProperty 统一处理 | 否 |
| removeStyle | - | 移除内联样式属性
FIX: P2-16 统一实现风格，与 setStyle 保持一致 | 否 |
| getComputedStyle | - | 获取计算样式。 | 否 |
| forceReflow | - | 强制回流/重排。
读取 offsetHeight 触发浏览器同步布局。
FIX: P2-33 强制同步布局优化 - 添加缓存避免重复读取 | 否 |
| getElementSize | - | 获取元素尺寸（带缓存）
FIX: P2-33 强制同步布局优化 | 否 |
| addEventListener | - | 添加事件监听器。
将原生 DOM Event 包装为 HostEvent 后传递给 handler。
返回一个取消监听的函数。 | 否 |
| removeEventListener | - | 移除事件监听器。 | 否 |
| getBoundingClientRect | - | 获取元素的几何边界信息。 | 否 |
| getAttribute | - | 获取元素的指定属性值 | 否 |
| getTransitionInfo | - | 获取过渡/动画时长信息。
通过读取计算样式中的 transition-duration / animation-duration 获取。 | 否 |
| nextFrame | - | 请求下一帧回调（双 rAF 确保浏览器已绘制）。 | 否 |
| setTimeout | - | 延迟执行。 | 否 |
| clearTimeout | - | 取消延迟执行 | 否 |
| getNamespaceURI | - | 获取元素的 namespaceURI（用于 SVG 检测）。 | 否 |
| replaceChild | - | 替换子节点（用于 hydration mismatch 处理）。 | 否 |
| getChildNodes | - | 获取子节点列表（用于 hydration）。 | 否 |
| getNodeType | - | 获取节点类型（用于 hydration 判断）。 | 否 |
| getTagName | - | 获取元素标签名（用于 hydration 匹配）。
返回小写标签名。 | 否 |

## warnHydrationMismatch

**Function**

### 签名

```typescript
warnHydrationMismatch: void
```

### 参数

| 参数     | 类型     | 描述 | 可选 | 默认值 |
| -------- | -------- | ---- | ---- | ------ |
| type     | `string` |      | 否   | -      |
| expected | `string` |      | 否   | -      |
| actual   | `string` |      | 否   | -      |

### 返回值

**类型:** `void`

## HydrationRenderer

**Interface**

### 成员

| 名称    | 类型 | 描述 | 可选 |
| ------- | ---- | ---- | ---- |
| hydrate | -    |      | 否   |

## hydrateFragment

**Function**

### 签名

```typescript
hydrateFragment: number;
```

### 参数

| 参数   | 类型              | 描述 | 可选 | 默认值 |
| ------ | ----------------- | ---- | ---- | ------ |
| vnode  | `VNode`           |      | 否   | -      |
| parent | `HTMLElement`     |      | 否   | -      |
| index  | `number`          |      | 否   | -      |
| host   | `WebRendererHost` |      | 否   | -      |

### 返回值

**类型:** `number`

## hydrateText

**Function**

### 签名

```typescript
hydrateText: number;
```

### 参数

| 参数   | 类型              | 描述 | 可选 | 默认值 |
| ------ | ----------------- | ---- | ---- | ------ |
| vnode  | `VNode`           |      | 否   | -      |
| parent | `HTMLElement`     |      | 否   | -      |
| index  | `number`          |      | 否   | -      |
| host   | `WebRendererHost` |      | 否   | -      |

### 返回值

**类型:** `number`

## hydrateComment

**Function**

### 签名

```typescript
hydrateComment: number;
```

### 参数

| 参数   | 类型              | 描述 | 可选 | 默认值 |
| ------ | ----------------- | ---- | ---- | ------ |
| vnode  | `VNode`           |      | 否   | -      |
| parent | `HTMLElement`     |      | 否   | -      |
| index  | `number`          |      | 否   | -      |
| host   | `WebRendererHost` |      | 否   | -      |

### 返回值

**类型:** `number`

## hydrateMatchedElement

**Function**

### 签名

```typescript
hydrateMatchedElement: number;
```

### 参数

| 参数         | 类型              | 描述 | 可选 | 默认值 |
| ------------ | ----------------- | ---- | ---- | ------ |
| vnode        | `VNode`           |      | 否   | -      |
| existingNode | `Node`            |      | 否   | -      |
| host         | `WebRendererHost` |      | 否   | -      |

### 返回值

**类型:** `number`

## hydrateMismatchedElement

**Function**

### 签名

```typescript
hydrateMismatchedElement: void
```

### 参数

| 参数         | 类型              | 描述       | 可选 | 默认值 |
| ------------ | ----------------- | ---------- | ---- | ------ | --- |
| vnode        | `VNode`           |            | 否   | -      |
| parent       | `HTMLElement`     |            | 否   | -      |
| existingNode | `Node             | undefined` |      | 否     | -   |
| host         | `WebRendererHost` |            | 否   | -      |

### 返回值

**类型:** `void`

## hydrateElement

**Function**

### 签名

```typescript
hydrateElement: number;
```

### 参数

| 参数   | 类型              | 描述 | 可选 | 默认值 |
| ------ | ----------------- | ---- | ---- | ------ |
| vnode  | `VNode`           |      | 否   | -      |
| parent | `HTMLElement`     |      | 否   | -      |
| index  | `number`          |      | 否   | -      |
| host   | `WebRendererHost` |      | 否   | -      |

### 返回值

**类型:** `number`

## hydrateNode

**Function**

### 签名

```typescript
hydrateNode: number;
```

### 参数

| 参数   | 类型              | 描述 | 可选 | 默认值 |
| ------ | ----------------- | ---- | ---- | ------ |
| vnode  | `VNode`           |      | 否   | -      |
| parent | `HTMLElement`     |      | 否   | -      |
| index  | `number`          |      | 否   | -      |
| host   | `WebRendererHost` |      | 否   | -      |

### 返回值

**类型:** `number`

## createHydrationFunctions

**Function**

创建水合函数，用于将现有 DOM 与 vnode 匹配。

### 签名

```typescript
createHydrationFunctions: HydrationRenderer;
```

### 参数

| 参数              | 类型                      | 描述   | 可选 | 默认值 |
| ----------------- | ------------------------- | ------ | ---- | ------ | --- |
| \_rendererOptions | `Record<string, unknown>` |        | 否   | -      |
| sharedVnodeMap    | `WeakMap<Element, VNode   | null>` |      | 是     | -   |

### 返回值

**类型:** `HydrationRenderer`

## ParsedEvent

**Interface**

事件修饰符解析结果

### 成员

| 名称    | 类型      | 描述                            | 可选 |
| ------- | --------- | ------------------------------- | ---- |
| name    | `string`  | 规范化后的事件名，如 'click'    | 否   |
| stop    | `boolean` | 是否调用 e.stopPropagation()    | 否   |
| prevent | `boolean` | 是否调用 e.preventDefault()     | 否   |
| capture | `boolean` | 是否使用 capture 模式           | 否   |
| once    | `boolean` | 是否使用 once 模式              | 否   |
| self    | `boolean` | 是否仅在 e.target === el 时触发 | 否   |
| passive | `boolean` | 是否使用 passive 模式           | 否   |

## EventInvoker

**Interface**

事件 invoker 函数，持有 value 属性用于更新

### 成员

| 名称     | 类型                            | 描述  | 可选                                         |
| -------- | ------------------------------- | ----- | -------------------------------------------- | --- |
| value    | `((...args: unknown[]) => void) | null` | 当前绑定的事件处理函数，更新时直接替换此属性 | 否  |
| \_parsed | `ParsedEvent`                   |       | 是                                           |

## InvokerCache

**Type**

el.\_vei 缓存类型

### 签名

```typescript
InvokerCache: Record<string, EventInvoker | undefined>;
```

## veiCache

**Variable**

事件 invoker 缓存 WeakMap，以 Element 为 key

## INVOKER_POOL_MAX_SIZE

**Variable**

对象池最大容量

## invokerPool

**Variable**

对象池

## poolHitCount

**Variable**

池化对象使用计数（用于调试）

## acquireInvoker

**Function**

从对象池获取一个 invoker 对象
FIX: P1-12 DOM-NEW-01 - 事件监听器池化

### 签名

```typescript
acquireInvoker: EventInvoker | null;
```

### 返回值

**类型:** `EventInvoker | null`

## releaseInvoker

**Function**

将 invoker 对象归还到对象池
FIX: P1-12 DOM-NEW-01 - 事件监听器池化
FIX: P2-v11-33 完善重置逻辑，清除所有可变状态确保复用时不会残留旧数据

### 签名

```typescript
releaseInvoker: void
```

### 参数

| 参数    | 类型           | 描述 | 可选 | 默认值 |
| ------- | -------------- | ---- | ---- | ------ |
| invoker | `EventInvoker` |      | 否   | -      |

### 返回值

**类型:** `void`

## getInvokerPoolStats

**Function**

获取池化统计信息（用于调试）
FIX: P1-12 DOM-NEW-01

### 签名

```typescript
getInvokerPoolStats: {
  hit: number;
  miss: number;
  size: number;
}
```

### 返回值

**类型:** `{ hit: number; miss: number; size: number }`

## resetInvokerPoolStats

**Function**

重置池化统计信息
FIX: P1-12 DOM-NEW-01

### 签名

```typescript
resetInvokerPoolStats: void
```

### 返回值

**类型:** `void`

## createInvoker

**Function**

创建事件 invoker 函数。
invoker 是一个持有 value 属性的闭包，调用时执行 invoker.value(event)。
FIX: P1-12 DOM-NEW-01 - 优先从对象池获取 invoker 对象

### 签名

```typescript
createInvoker: EventInvoker;
```

### 参数

| 参数         | 类型                           | 描述 | 可选 | 默认值 |
| ------------ | ------------------------------ | ---- | ---- | ------ |
| initialValue | `(...args: unknown[]) => void` |      | 否   | -      |

### 返回值

**类型:** `EventInvoker`

## patchEvent

**Function**

更新元素上的事件监听。

四种情况：

1. nextValue && existingInvoker → 直接替换 invoker.value（O(1) 赋值）
2. nextValue && !existingInvoker → 创建 invoker，addEventListener
3. !nextValue && existingInvoker → removeEventListener，清除缓存
4. !nextValue && !existingInvoker → 无操作

### 签名

```typescript
patchEvent: void
```

### 参数

| 参数        | 类型                            | 描述  | 可选 | 默认值 |
| ----------- | ------------------------------- | ----- | ---- | ------ | --- |
| el          | `Element`                       |       | 否   | -      |
| rawName     | `string`                        |       | 否   | -      |
| nextValue   | `((...args: unknown[]) => void) | null` |      | 否     | -   |
| \_prevValue | `((...args: unknown[]) => void) | null` |      | 是     | -   |

### 返回值

**类型:** `void`

## removeAllEventListeners

**Function**

移除元素上所有通过 invoker 缓存的事件监听。
用于组件卸载时的清理。
FIX: P1-12 DOM-NEW-01 - 将 invoker 对象归还到对象池以复用

### 签名

```typescript
removeAllEventListeners: void
```

### 参数

| 参数 | 类型      | 描述 | 可选 | 默认值 |
| ---- | --------- | ---- | ---- | ------ |
| el   | `Element` |      | 否   | -      |

### 返回值

**类型:** `void`

## extractHandler

**Function**

从值中提取事件处理函数。
兼容直接函数和 { handler, capture, ... } 对象格式。

### 签名

```typescript
extractHandler: ((...args: unknown[]) => void) | null
```

### 参数

| 参数  | 类型                            | 描述  | 可选 | 默认值 |
| ----- | ------------------------------- | ----- | ---- | ------ | --- |
| value | `((...args: unknown[]) => void) | null` |      | 否     | -   |

### 返回值

**类型:** `((...args: unknown[]) => void) | null`

## buildEventListenerOptions

**Function**

根据 ParsedEvent 构建 AddEventListenerOptions。

### 签名

```typescript
buildEventListenerOptions: AddEventListenerOptions | undefined;
```

### 参数

| 参数   | 类型          | 描述 | 可选 | 默认值 |
| ------ | ------------- | ---- | ---- | ------ |
| parsed | `ParsedEvent` |      | 否   | -      |

### 返回值

**类型:** `AddEventListenerOptions | undefined`

## patchProp

**Function**

Patch a prop on a DOM element.
Delegates class/style/attr/innerHTML/textContent to

### 签名

```typescript
patchProp: void
```

### 参数

| 参数      | 类型      | 描述 | 可选 | 默认值 |
| --------- | --------- | ---- | ---- | ------ |
| el        | `Element` |      | 否   | -      |
| key       | `string`  |      | 否   | -      |
| prevValue | `unknown` |      | 否   | -      |
| nextValue | `unknown` |      | 否   | -      |
| isSVG     | `boolean` |      | 是   | false  |

### 返回值

**类型:** `void`
