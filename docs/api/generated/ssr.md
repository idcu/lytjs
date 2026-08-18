# @lytjs/ssr

服务端渲染（SSR）支持

## 目录

- [HydrationStrategy](#hydrationstrategy)
- [HydrationHints](#hydrationhints)
- [HydrationState](#hydrationstate)
- [HYDRATE_ATTR](#hydrate-attr)
- [HYDRATE_STRATEGY_ATTR](#hydrate-strategy-attr)
- [DEHYDRATED_STATE_ID](#dehydrated-state-id)
- [componentIdCounter](#componentidcounter)
- [generateComponentId](#generatecomponentid)
- [resetComponentIdCounter](#resetcomponentidcounter)
- [isElementVNode](#iselementvnode)
- [isComponentVNode](#iscomponentvnode)
- [getVNodeProps](#getvnodeprops)
- [getVNodeChildren](#getvnodechildren)
- [createHydrationMarkers](#createhydrationmarkers)
- [isValidStrategy](#isvalidstrategy)
- [getHydrationStrategy](#gethydrationstrategy)
- [collectHydrationHints](#collecthydrationhints)
- [serializeHydrationState](#serializehydrationstate)
- [createDehydratedState](#createdehydratedstate)
- [escapeHtml](#escapehtml)
- [renderToString](#rendertostring)
- [renderAttributes](#renderattributes)
- [renderToHtml](#rendertohtml)
- [ServerLifecycleHook](#serverlifecyclehook)
- [ServerComponentContext](#servercomponentcontext)
- [ServerComponentRegistration](#servercomponentregistration)
- [ServerComponentStateManager](#servercomponentstatemanager)
- [stateManager](#statemanager)
- [registerServerComponent](#registerservercomponent)
- [unregisterServerComponent](#unregisterservercomponent)
- [collectPrefetchComponents](#collectprefetchcomponents)
- [collectComponentsRecursive](#collectcomponentsrecursive)
- [prefetchAllComponents](#prefetchallcomponents)
- [safeSerializeState](#safeserializestate)
- [safeDeserializeState](#safedeserializestate)
- [ComponentDehydratedState](#componentdehydratedstate)
- [buildDehydratedState](#builddehydratedstate)
- [ServerComponent](#servercomponent)
- [SSGPage](#ssgpage)
- [SSGOptions](#ssgoptions)
- [DEFAULT_SSG_OPTIONS](#default-ssg-options)
- [normalizePath](#normalizepath)
- [pathToFilePath](#pathtofilepath)
- [renderMetaTags](#rendermetatags)
- [renderPage](#renderpage)
- [generateSitemapXml](#generatesitemapxml)
- [writeStaticFiles](#writestaticfiles)
- [generateStaticPages](#generatestaticpages)
- [generateRouteManifest](#generateroutemanifest)
- [validatePages](#validatepages)
- [ISRCacheEntry](#isrcacheentry)
- [ISRCacheManager](#isrcachemanager)
- [createISRMiddleware](#createisrmiddleware)
- [revalidateOnDemand](#revalidateondemand)
- [getISRCacheStats](#getisrcachestats)
- [clearISRCache](#clearisrcache)
- [StreamRenderOptions](#streamrenderoptions)
- [DataPrefetchContext](#dataprefetchcontext)
- [PrefetchResult](#prefetchresult)
- [PrefetchableComponent](#prefetchablecomponent)
- [EnhancedStreamRenderOptions](#enhancedstreamrenderoptions)
- [DEFAULT_CHUNK_SIZE](#default-chunk-size)
- [DEFAULT_TIMEOUT](#default-timeout)
- [DEFAULT_FALLBACK_HTML](#default-fallback-html)
- [StreamTimeoutError](#streamtimeouterror)
- [FlowController](#flowcontroller)
- [SUSPENSE_TYPE](#suspense-type)
- [isSuspenseVNode](#issuspensevnode)
- [collectChunks](#collectchunks)
- [splitIntoByteChunks](#splitintobytechunks)
- [renderToStream](#rendertostream)
- [sendChunk](#sendchunk)
- [renderToStreamAsync](#rendertostreamasync)
- [collectAndPrefetchData](#collectandprefetchdata)
- [renderToStringAsync](#rendertostringasync)
- [renderToStreamEnhanced](#rendertostreamenhanced)
- [VirtualList](#virtuallist)

## HydrationStrategy

**Type**

水合策略类型

### 签名

```typescript
HydrationStrategy: 'lazy' | 'eager' | 'idle';
```

## HydrationHints

**Interface**

水合提示信息

### 成员

| 名称        | 类型                      | 描述            | 可选 |
| ----------- | ------------------------- | --------------- | ---- |
| componentId | `string`                  | 组件唯一标识    | 否   |
| strategy    | `HydrationStrategy`       | 水合策略        | 否   |
| props       | `Record<string, unknown>` | 组件 props 快照 | 否   |

## HydrationState

**Interface**

水合状态数据结构

### 成员

| 名称         | 类型                      | 描述             | 可选 |
| ------------ | ------------------------- | ---------------- | ---- |
| hints        | `HydrationHints[]`        | 组件水合提示列表 | 否   |
| initialState | `Record<string, unknown>` | 全局初始状态     | 是   |

## HYDRATE_ATTR

**Variable**

水合标记属性名

## HYDRATE_STRATEGY_ATTR

**Variable**

水合策略属性名

## DEHYDRATED_STATE_ID

**Variable**

脱水状态 script 标记

## componentIdCounter

**Variable**

组件 ID 计数器

## generateComponentId

**Function**

生成唯一的组件 ID

### 签名

```typescript
generateComponentId: string;
```

### 返回值

**类型:** `string`

唯一标识字符串

## resetComponentIdCounter

**Function**

重置组件 ID 计数器（仅用于测试）

### 签名

```typescript
resetComponentIdCounter: void
```

### 返回值

**类型:** `void`

## isElementVNode

**Function**

判断 VNode 是否为元素类型

### 签名

```typescript
isElementVNode: boolean;
```

### 参数

| 参数  | 类型    | 描述 | 可选 | 默认值 |
| ----- | ------- | ---- | ---- | ------ |
| vnode | `VNode` |      | 否   | -      |

### 返回值

**类型:** `boolean`

## isComponentVNode

**Function**

判断 VNode 是否为组件类型

### 签名

```typescript
isComponentVNode: boolean;
```

### 参数

| 参数  | 类型    | 描述 | 可选 | 默认值 |
| ----- | ------- | ---- | ---- | ------ |
| vnode | `VNode` |      | 否   | -      |

### 返回值

**类型:** `boolean`

## getVNodeProps

**Function**

获取 VNode 的 props（安全访问）

### 签名

```typescript
getVNodeProps: Record<string, unknown>;
```

### 参数

| 参数  | 类型    | 描述 | 可选 | 默认值 |
| ----- | ------- | ---- | ---- | ------ |
| vnode | `VNode` |      | 否   | -      |

### 返回值

**类型:** `Record<string, unknown>`

## getVNodeChildren

**Function**

获取 VNode 的 children（安全访问）

### 签名

```typescript
getVNodeChildren: VNode[] | string | number | null
```

### 参数

| 参数  | 类型    | 描述 | 可选 | 默认值 |
| ----- | ------- | ---- | ---- | ------ |
| vnode | `VNode` |      | 否   | -      |

### 返回值

**类型:** `VNode[] | string | number | null`

## createHydrationMarkers

**Function**

为 VNode 树添加水合标记

### 签名

```typescript
createHydrationMarkers: VNode;
```

### 参数

| 参数  | 类型    | 描述 | 可选 | 默认值 |
| ----- | ------- | ---- | ---- | ------ |
| vnode | `VNode` |      | 否   | -      |

### 返回值

**类型:** `VNode`

添加了水合标记的新 VNode（浅拷贝）

### 示例

````typescript
```typescript
const marked = createHydrationMarkers(vnode);
// marked 的每个元素节点都带有 data-hydrate="lyt-hydrate-1" 等属性
````

````


## isValidStrategy

**Function**

验证水合策略是否合法

### 签名

```typescript
isValidStrategy: strategy is HydrationStrategy
````

### 参数

| 参数     | 类型     | 描述 | 可选 | 默认值 |
| -------- | -------- | ---- | ---- | ------ |
| strategy | `string` |      | 否   | -      |

### 返回值

**类型:** `strategy is HydrationStrategy`

## getHydrationStrategy

**Function**

获取组件的水合策略

### 签名

```typescript
getHydrationStrategy: HydrationStrategy;
```

### 参数

| 参数  | 类型    | 描述 | 可选 | 默认值 |
| ----- | ------- | ---- | ---- | ------ |
| vnode | `VNode` |      | 否   | -      |

### 返回值

**类型:** `HydrationStrategy`

水合策略（lazy / eager / idle）

### 示例

````typescript
```typescript
const strategy = getHydrationStrategy(vnode);
// 'eager' | 'lazy' | 'idle'
````

````


## collectHydrationHints

**Function**

从 VNode 树中收集所有水合提示

### 签名

```typescript
collectHydrationHints: HydrationHints[]
````

### 参数

| 参数  | 类型               | 描述 | 可选 | 默认值 |
| ----- | ------------------ | ---- | ---- | ------ |
| vnode | `VNode`            |      | 否   | -      |
| hints | `HydrationHints[]` |      | 是   | []     |

### 返回值

**类型:** `HydrationHints[]`

## serializeHydrationState

**Function**

序列化客户端水合所需的初始状态

### 签名

```typescript
serializeHydrationState: string;
```

### 参数

| 参数  | 类型      | 描述 | 可选 | 默认值 |
| ----- | --------- | ---- | ---- | ------ |
| state | `unknown` |      | 否   | -      |

### 返回值

**类型:** `string`

JSON 字符串

### 示例

````typescript
```typescript
const serialized = serializeHydrationState({
  user: { name: 'Alice', age: 30 },
  items: [1, 2, 3],
});
// '{"user":{"name":"Alice","age":30},"items":[1,2,3]}'
````

````


## createDehydratedState

**Function**

创建脱水状态（SSR 时序列化到 HTML 中的状态）

### 签名

```typescript
createDehydratedState: string
````

### 参数

| 参数         | 类型                      | 描述 | 可选 | 默认值 |
| ------------ | ------------------------- | ---- | ---- | ------ |
| vnode        | `VNode`                   |      | 否   | -      |
| initialState | `Record<string, unknown>` |      | 是   | -      |

### 返回值

**类型:** `string`

可嵌入 HTML 的 script 标签字符串

### 示例

````typescript
```typescript
const script = createDehydratedState(vnode, {
  user: { name: 'Alice' },
});
// <script id="__LYT_DEHYDRATED_STATE__" type="application/json">...</script>
````

````


## escapeHtml

**Function**

转义 HTML 特殊字符

### 签名

```typescript
escapeHtml: string
````

### 参数

| 参数 | 类型     | 描述 | 可选 | 默认值 |
| ---- | -------- | ---- | ---- | ------ |
| str  | `string` |      | 否   | -      |

### 返回值

**类型:** `string`

## renderToString

**Function**

渲染 VNode 为 HTML 字符串

### 签名

```typescript
renderToString: string;
```

### 参数

| 参数  | 类型   | 描述    | 可选   | 默认值 |
| ----- | ------ | ------- | ------ | ------ | ---- | ---------- | --- | --- | --- |
| vnode | `VNode | VNode[] | string | number | null | undefined` |     | 否  | -   |

### 返回值

**类型:** `string`

## renderAttributes

**Function**

渲染属性为 HTML 属性字符串

### 签名

```typescript
renderAttributes: string;
```

### 参数

| 参数  | 类型                      | 描述 | 可选 | 默认值 |
| ----- | ------------------------- | ---- | ---- | ------ |
| props | `Record<string, unknown>` |      | 否   | -      |

### 返回值

**类型:** `string`

## renderToHtml

**Function**

渲染完整的 HTML 页面

### 签名

```typescript
renderToHtml: string;
```

### 参数

| 参数    | 类型                                                                                    | 描述     | 可选 | 默认值 |
| ------- | --------------------------------------------------------------------------------------- | -------- | ---- | ------ | --- |
| vnode   | `VNode                                                                                  | VNode[]` |      | 否     | -   |
| options | `{ title?: string; lang?: string; head?: string; bodyAttrs?: Record<string, string>; }` |          | 是   | {}     |

### 返回值

**类型:** `string`

## ServerLifecycleHook

**Type**

服务端组件生命周期钩子类型

### 签名

```typescript
ServerLifecycleHook: (context: ServerComponentContext) => Promise<void> | void
```

## ServerComponentContext

**Interface**

服务端组件上下文

### 成员

| 名称        | 类型                                                                               | 描述                                            | 可选       |
| ----------- | ---------------------------------------------------------------------------------- | ----------------------------------------------- | ---------- | --- |
| componentId | `string`                                                                           | 组件唯一 ID                                     | 否         |
| route       | `{ path: string; params: Record<string, string>; query: Record<string, string>; }` | 路由信息                                        | 是         |
| request     | `{ headers: Record<string, string                                                  | undefined>; cookies: Record<string, string>; }` | 请求上下文 | 是  |

## ServerComponentRegistration

**Interface**

服务端组件注册信息

### 成员

| 名称            | 类型                                                        | 描述             | 可选 |
| --------------- | ----------------------------------------------------------- | ---------------- | ---- |
| name            | `string`                                                    | 组件名称         | 否   |
| render          | `() => VNode`                                               | 组件渲染函数     | 否   |
| onServerInit    | `ServerLifecycleHook`                                       | 服务端初始化钩子 | 是   |
| prefetch        | `(context: DataPrefetchContext) => Promise<PrefetchResult>` | 数据预取钩子     | 是   |
| onServerCleanup | `ServerLifecycleHook`                                       | 服务端清理钩子   | 是   |

## ServerComponentStateManager

**Class**

服务端组件状态管理器

### 成员

| 名称                  | 类型                                       | 描述                   | 可选 |
| --------------------- | ------------------------------------------ | ---------------------- | ---- |
| registrations         | `Map<string, ServerComponentRegistration>` | 注册的组件             | 否   |
| pendingPrefetches     | `Map<string, Promise<PrefetchResult>>`     | 正在执行的预取请求     | 否   |
| initializationStates  | `Map<string, boolean>`                     | 组件初始化状态         | 否   |
| register              | -                                          | 注册服务端组件         | 否   |
| unregister            | -                                          | 取消注册服务端组件     | 否   |
| getRegistration       | -                                          | 获取已注册的组件       | 否   |
| initializeComponent   | -                                          | 初始化服务端组件       | 否   |
| cleanupComponent      | -                                          | 清理服务端组件         | 否   |
| prefetchComponentData | -                                          | 预取组件数据（带缓存） | 否   |
| clearAll              | -                                          | 清除所有缓存           | 否   |

## stateManager

**Variable**

全局状态管理器实例

## registerServerComponent

**Function**

注册服务端组件

### 签名

```typescript
registerServerComponent: void
```

### 参数

| 参数         | 类型                          | 描述 | 可选 | 默认值 |
| ------------ | ----------------------------- | ---- | ---- | ------ |
| name         | `string`                      |      | 否   | -      |
| registration | `ServerComponentRegistration` |      | 否   | -      |

### 返回值

**类型:** `void`

## unregisterServerComponent

**Function**

取消注册服务端组件

### 签名

```typescript
unregisterServerComponent: void
```

### 参数

| 参数 | 类型     | 描述 | 可选 | 默认值 |
| ---- | -------- | ---- | ---- | ------ |
| name | `string` |      | 否   | -      |

### 返回值

**类型:** `void`

## collectPrefetchComponents

**Function**

从 VNode 树中收集需要预取数据的组件

### 签名

```typescript
collectPrefetchComponents: string[]
```

### 参数

| 参数  | 类型   | 描述    | 可选   | 默认值 |
| ----- | ------ | ------- | ------ | ------ | ---- | ---------- | --- | --- | --- |
| vnode | `VNode | VNode[] | string | number | null | undefined` |     | 否  | -   |

### 返回值

**类型:** `string[]`

## collectComponentsRecursive

**Function**

### 签名

```typescript
collectComponentsRecursive: void
```

### 参数

| 参数   | 类型       | 描述    | 可选   | 默认值 |
| ------ | ---------- | ------- | ------ | ------ | ---- | ---------- | --- | --- | --- |
| vnode  | `VNode     | VNode[] | string | number | null | undefined` |     | 否  | -   |
| result | `string[]` |         | 否     | -      |

### 返回值

**类型:** `void`

## prefetchAllComponents

**Function**

并发预取多个组件的数据

### 签名

```typescript
prefetchAllComponents: Promise<Record<string, PrefetchResult>>;
```

### 参数

| 参数       | 类型                  | 描述 | 可选 | 默认值 |
| ---------- | --------------------- | ---- | ---- | ------ |
| components | `string[]`            |      | 否   | -      |
| context    | `DataPrefetchContext` |      | 否   | -      |

### 返回值

**类型:** `Promise<Record<string, PrefetchResult>>`

## safeSerializeState

**Function**

安全的状态序列化
处理循环引用、日期、正则表达式等特殊类型

### 签名

```typescript
safeSerializeState: string;
```

### 参数

| 参数  | 类型      | 描述 | 可选 | 默认值 |
| ----- | --------- | ---- | ---- | ------ |
| state | `unknown` |      | 否   | -      |

### 返回值

**类型:** `string`

## safeDeserializeState

**Function**

安全的状态反序列化
恢复特殊类型

### 签名

```typescript
safeDeserializeState: unknown;
```

### 参数

| 参数       | 类型     | 描述 | 可选 | 默认值 |
| ---------- | -------- | ---- | ---- | ------ |
| serialized | `string` |      | 否   | -      |

### 返回值

**类型:** `unknown`

## ComponentDehydratedState

**Interface**

创建组件脱水状态

### 成员

| 名称          | 类型                      | 描述       | 可选 |
| ------------- | ------------------------- | ---------- | ---- |
| componentName | `string`                  | 组件名称   | 否   |
| props         | `Record<string, unknown>` | 组件 Props | 否   |
| data          | `Record<string, unknown>` | 预取的数据 | 是   |
| error         | `string`                  | 错误信息   | 是   |

## buildDehydratedState

**Function**

构建完整的脱水状态

### 签名

```typescript
buildDehydratedState: Record<string, ComponentDehydratedState>;
```

### 参数

| 参数            | 类型                             | 描述 | 可选 | 默认值 |
| --------------- | -------------------------------- | ---- | ---- | ------ |
| prefetchResults | `Record<string, PrefetchResult>` |      | 否   | -      |

### 返回值

**类型:** `Record<string, ComponentDehydratedState>`

## ServerComponent

**Function**

服务端组件管理器装饰器

## SSGPage

**Interface**

SSG 页面配置

### 成员

| 名称      | 类型                                                                                     | 描述                         | 可选 |
| --------- | ---------------------------------------------------------------------------------------- | ---------------------------- | ---- |
| path      | `string`                                                                                 | 页面路径，如 '/' 或 '/about' | 否   |
| component | `VNode`                                                                                  | 页面组件 VNode               | 否   |
| layout    | `VNode`                                                                                  | 可选布局组件                 | 是   |
| head      | `{ /** 页面标题 */ title?: string; /** 元信息键值对 */ meta?: Record<string, string>; }` | 页面头部信息                 | 是   |
| scripts   | `string[]`                                                                               | 额外的脚本标签               | 是   |
| styles    | `string[]`                                                                               | 额外的样式标签               | 是   |

## SSGOptions

**Interface**

SSG 生成选项

### 成员

| 名称            | 类型                                                                                                                                                                        | 描述                     | 可选                       |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | -------------------------- | --- |
| baseUrl         | `string`                                                                                                                                                                    | 站点基础 URL，默认 '/'   | 是                         |
| outDir          | `string`                                                                                                                                                                    | 输出目录，默认 'dist'    | 是                         |
| defaultTitle    | `string`                                                                                                                                                                    | 默认页面标题             | 是                         |
| lang            | `string`                                                                                                                                                                    | 默认语言                 | 是                         |
| generateSitemap | `boolean`                                                                                                                                                                   | 是否生成 sitemap         | 是                         |
| siteName        | `string`                                                                                                                                                                    | 站点名称（用于 sitemap） | 是                         |
| hashMode        | `boolean`                                                                                                                                                                   | 是否使用哈希路由         | 是                         |
| globalScripts   | `string[]`                                                                                                                                                                  | 全局额外脚本             | 是                         |
| globalStyles    | `string[]`                                                                                                                                                                  | 全局额外样式             | 是                         |
| isr             | `{ /** 重新验证间隔（秒），0 表示按需重新验证 \*/ revalidate?: number; /** 是否启用增量静态再生成 _/ enabled?: boolean; /\*\* 预渲染 fallback 页面 _/ fallback?: 'blocking' | boolean; }`              | ISR 配置（增量静态再生成） | 是  |

## DEFAULT_SSG_OPTIONS

**Variable**

默认 SSG 选项

## normalizePath

**Function**

规范化页面路径

### 签名

```typescript
normalizePath: string;
```

### 参数

| 参数 | 类型     | 描述 | 可选 | 默认值 |
| ---- | -------- | ---- | ---- | ------ |
| path | `string` |      | 否   | -      |

### 返回值

**类型:** `string`

规范化后的路径

## pathToFilePath

**Function**

将路径转换为文件路径

### 签名

```typescript
pathToFilePath: string;
```

### 参数

| 参数 | 类型     | 描述 | 可选 | 默认值 |
| ---- | -------- | ---- | ---- | ------ |
| path | `string` |      | 否   | -      |

### 返回值

**类型:** `string`

文件路径

## renderMetaTags

**Function**

生成 meta 标签 HTML 字符串

### 签名

```typescript
renderMetaTags: string;
```

### 参数

| 参数 | 类型                     | 描述 | 可选 | 默认值 |
| ---- | ------------------------ | ---- | ---- | ------ |
| meta | `Record<string, string>` |      | 否   | -      |

### 返回值

**类型:** `string`

meta 标签 HTML 字符串

## renderPage

**Function**

渲染单个页面为完整 HTML

### 签名

```typescript
renderPage: string;
```

### 参数

| 参数    | 类型                   | 描述 | 可选 | 默认值 |
| ------- | ---------------------- | ---- | ---- | ------ |
| page    | `SSGPage`              |      | 否   | -      |
| options | `Required<SSGOptions>` |      | 否   | -      |

### 返回值

**类型:** `string`

完整的 HTML 字符串

## generateSitemapXml

**Function**

生成 sitemap.xml

### 签名

```typescript
generateSitemapXml: string;
```

### 参数

| 参数    | 类型                   | 描述 | 可选 | 默认值 |
| ------- | ---------------------- | ---- | ---- | ------ |
| pages   | `SSGPage[]`            |      | 否   | -      |
| options | `Required<SSGOptions>` |      | 否   | -      |

### 返回值

**类型:** `string`

sitemap XML 字符串

## writeStaticFiles

**Function**

将生成的 HTML 写入文件系统

### 签名

```typescript
writeStaticFiles: Promise<void>;
```

### 参数

| 参数    | 类型         | 描述 | 可选 | 默认值 |
| ------- | ------------ | ---- | ---- | ------ |
| pages   | `SSGPage[]`  |      | 否   | -      |
| options | `SSGOptions` |      | 是   | -      |

### 返回值

**类型:** `Promise<void>`

Promise<void>

### 示例

````typescript
```typescript
await writeStaticFiles(pages, { outDir: 'build' });
````

````


## generateStaticPages

**Function**

预渲染页面配置数组为静态 HTML

### 签名

```typescript
generateStaticPages: Map<string, string>
````

### 参数

| 参数    | 类型         | 描述 | 可选 | 默认值 |
| ------- | ------------ | ---- | ---- | ------ |
| pages   | `SSGPage[]`  |      | 否   | -      |
| options | `SSGOptions` |      | 是   | -      |

### 返回值

**类型:** `Map<string, string>`

Map<string, string> 文件路径 -> HTML 内容

### 示例

````typescript
```typescript
const pages: SSGPage[] = [
  {
    path: '/',
    component: h('div', {}, 'Home'),
    head: { title: '首页', meta: { description: '欢迎' } },
  },
  {
    path: '/about',
    component: h('div', {}, 'About'),
  },
];

const results = generateStaticPages(pages, {
  baseUrl: 'https://example.com',
  defaultTitle: 'My Site',
});

for (const [filePath, html] of results) {
  console.log(filePath, html);
}
````

````


## generateRouteManifest

**Function**

生成页面路由清单

### 签名

```typescript
generateRouteManifest: Array<{ path: string; filePath: string; title?: string }>
````

### 参数

| 参数    | 类型        | 描述 | 可选 | 默认值 |
| ------- | ----------- | ---- | ---- | ------ |
| pages   | `SSGPage[]` |      | 否   | -      |
| baseUrl | `string`    |      | 是   | '/'    |

### 返回值

**类型:** `Array<{ path: string; filePath: string; title?: string }>`

路由信息数组

## validatePages

**Function**

验证页面配置数组的合法性

### 签名

```typescript
validatePages: string[]
```

### 参数

| 参数  | 类型        | 描述 | 可选 | 默认值 |
| ----- | ----------- | ---- | ---- | ------ |
| pages | `SSGPage[]` |      | 否   | -      |

### 返回值

**类型:** `string[]`

错误信息数组，空数组表示全部合法

## ISRCacheEntry

**Interface**

ISR 缓存条目

### 成员

| 名称           | 类型      | 描述             | 可选 |
| -------------- | --------- | ---------------- | ---- |
| html           | `string`  | HTML 内容        | 否   |
| timestamp      | `number`  | 生成时间戳       | 否   |
| isRevalidating | `boolean` | 是否正在重新生成 | 否   |

## ISRCacheManager

**Class**

ISR 缓存管理器

### 成员

| 名称               | 类型                           | 描述                       | 可选 |
| ------------------ | ------------------------------ | -------------------------- | ---- |
| cache              | `Map<string, ISRCacheEntry>`   |                            | 否   |
| revalidateTasks    | `Map<string, Promise<string>>` |                            | 否   |
| get                | -                              | 获取缓存的页面             | 否   |
| set                | -                              | 设置缓存                   | 否   |
| needsRevalidation  | -                              | 检查是否需要重新验证       | 否   |
| markRevalidating   | -                              | 标记为正在重新生成         | 否   |
| finishRevalidation | -                              | 完成重新生成               | 否   |
| getRevalidateTask  | -                              | 获取正在进行的重新生成任务 | 否   |
| setRevalidateTask  | -                              | 设置重新生成任务           | 否   |
| clearExpired       | -                              | 清除过期的缓存             | 否   |
| getStats           | -                              | 获取缓存统计信息           | 否   |

## createISRMiddleware

**Function**

创建 ISR 中间件

### 示例

````typescript
```typescript
import express from 'express';
import { createISRMiddleware, generateStaticPages } from '@lytjs/ssr';

const app = express();

// 预生成的页面
const pages = [
  { path: '/', component: homeComponent },
];

const staticPages = generateStaticPages(pages);

app.use(createISRMiddleware({
  staticPages,
  revalidate: 60, // 60秒后重新验证
  async regenerate(path) {
    const page = pages.find(p => p.path === path);
    if (page) {
      return generateStaticPages([page]).get('/index.html')!;
    }
    throw new Error('Page not found');
  }
}));
````

````


## revalidateOnDemand

**Function**

触发按需重新验证

### 签名

```typescript
revalidateOnDemand: Promise<string>
````

### 参数

| 参数       | 类型                    | 描述 | 可选 | 默认值 |
| ---------- | ----------------------- | ---- | ---- | ------ |
| path       | `string`                |      | 否   | -      |
| regenerate | `() => Promise<string>` |      | 否   | -      |

### 返回值

**类型:** `Promise<string>`

Promise<string> 新生成的 HTML

### 示例

````typescript
```typescript
// 当博客文章更新时
await revalidateOnDemand(
  '/blog/my-post',
  async () => generatePostHTML('my-post')
);
````

````


## getISRCacheStats

**Function**

获取 ISR 缓存统计信息


## clearISRCache

**Function**

清除 ISR 缓存

### 签名

```typescript
clearISRCache: void
````

### 参数

| 参数   | 类型     | 描述 | 可选 | 默认值 |
| ------ | -------- | ---- | ---- | ------ |
| path   | `string` |      | 是   | -      |
| maxAge | `number` |      | 是   | -      |

### 返回值

**类型:** `void`

## StreamRenderOptions

**Interface**

流式渲染配置选项

### 成员

| 名称              | 类型                     | 描述                                                | 可选 |
| ----------------- | ------------------------ | --------------------------------------------------- | ---- |
| chunkSize         | `number`                 | 每个分块的最大字节数，默认 4096                     | 是   |
| onShellReady      | `() => void`             | Shell 就绪回调（Suspense 边界之前的初始内容已发送） | 是   |
| onError           | `(error: Error) => void` | 错误回调                                            | 是   |
| timeout           | `number`                 | 流式渲染超时时间（毫秒），默认 30000                | 是   |
| fallbackHtml      | `string`                 | 当渲染超时时的回退 HTML 内容                        | 是   |
| maxBytesPerSecond | `number`                 | 流控制：每秒最大字节数，用于防止突发流量            | 是   |
| errorRecovery     | `boolean`                | 是否启用错误恢复模式，默认 true                     | 是   |
| componentTimeout  | `number`                 | 单个组件渲染超时（毫秒），默认 5000                 | 是   |

## DataPrefetchContext

**Interface**

异步数据预取上下文

### 成员

| 名称   | 类型                     | 描述     | 可选 |
| ------ | ------------------------ | -------- | ---- |
| path   | `string`                 | 路由路径 | 是   |
| params | `Record<string, string>` | 路由参数 | 是   |
| query  | `Record<string, string>` | 查询参数 | 是   |

## PrefetchResult

**Interface**

异步数据预取结果

### 成员

| 名称 | 类型                      | 描述                 | 可选 |
| ---- | ------------------------- | -------------------- | ---- |
| data | `Record<string, unknown>` | 预取的数据           | 否   |
| ttl  | `number`                  | 数据过期时间（毫秒） | 是   |

## PrefetchableComponent

**Interface**

支持数据预取的组件接口

### 成员

| 名称     | 类型                                                        | 描述         | 可选 |
| -------- | ----------------------------------------------------------- | ------------ | ---- |
| prefetch | `(context: DataPrefetchContext) => Promise<PrefetchResult>` | 预取数据方法 | 是   |

## EnhancedStreamRenderOptions

**Interface**

流式渲染增强选项

### 成员

| 名称                 | 类型                                      | 描述               | 可选 |
| -------------------- | ----------------------------------------- | ------------------ | ---- |
| prefetchContext      | `DataPrefetchContext`                     | 数据预取上下文     | 是   |
| onDataPrefetched     | `(data: Record<string, unknown>) => void` | 数据预取完成回调   | 是   |
| progressiveHydration | `boolean`                                 | 是否启用渐进式水合 | 是   |

## DEFAULT_CHUNK_SIZE

**Variable**

默认分块大小

## DEFAULT_TIMEOUT

**Variable**

默认流式渲染超时时间

## DEFAULT_FALLBACK_HTML

**Variable**

默认错误恢复 HTML

## StreamTimeoutError

**Class**

超时错误类型

## FlowController

**Class**

流速率控制

### 成员

| 名称                | 类型     | 描述                           | 可选 |
| ------------------- | -------- | ------------------------------ | ---- |
| maxBytesPerSecond   | `number` |                                | 否   |
| bytesSentInSecond   | `number` |                                | 否   |
| lastSecondTimestamp | `number` |                                | 否   |
| waitForRateLimit    | -        | 尝试发送字节，如超出速率则等待 | 否   |

## SUSPENSE_TYPE

**Variable**

Suspense 组件标记名称

## isSuspenseVNode

**Function**

判断 VNode 是否为 Suspense 边界

### 签名

```typescript
isSuspenseVNode: boolean;
```

### 参数

| 参数  | 类型    | 描述 | 可选 | 默认值 |
| ----- | ------- | ---- | ---- | ------ |
| vnode | `VNode` |      | 否   | -      |

### 返回值

**类型:** `boolean`

## collectChunks

**Function**

从 VNode 树中收集所有组件边界，用于分块

### 签名

```typescript
collectChunks: string[]
```

### 参数

| 参数                  | 类型       | 描述 | 可选 | 默认值 |
| --------------------- | ---------- | ---- | ---- | ------ |
| vnode                 | `VNode`    |      | 否   | -      |
| suspenseBoundaryIndex | `number[]` |      | 是   | []     |

### 返回值

**类型:** `string[]`

## splitIntoByteChunks

**Function**

将 HTML 字符串按指定大小分块

### 签名

```typescript
splitIntoByteChunks: string[]
```

### 参数

| 参数      | 类型     | 描述 | 可选 | 默认值 |
| --------- | -------- | ---- | ---- | ------ |
| html      | `string` |      | 否   | -      |
| chunkSize | `number` |      | 否   | -      |

### 返回值

**类型:** `string[]`

分块后的字符串数组

## renderToStream

**Function**

将 VNode 渲染为 ReadableStream（流式服务端渲染）

### 签名

```typescript
renderToStream: ReadableStream<Uint8Array>;
```

### 参数

| 参数    | 类型                  | 描述 | 可选 | 默认值 |
| ------- | --------------------- | ---- | ---- | ------ |
| vnode   | `VNode`               |      | 否   | -      |
| options | `StreamRenderOptions` |      | 是   | -      |

### 返回值

**类型:** `ReadableStream<Uint8Array>`

ReadableStream<Uint8Array>

### 示例

````typescript
```typescript
const stream = renderToStream(vnode, {
  chunkSize: 2048,
  onShellReady: () => console.log('Shell 已发送'),
  onError: (err) => console.error(err),
  timeout: 30000,
});

for await (const chunk of stream) {
  response.write(chunk);
}
````

````


## sendChunk

**Function**

发送单个分块，应用流速率控制


## renderToStreamAsync

**Function**

将 VNode 渲染为异步 ReadableStream（支持异步组件和数据预取）

### 签名

```typescript
renderToStreamAsync: ReadableStream<Uint8Array>
````

### 参数

| 参数    | 类型                          | 描述 | 可选 | 默认值 |
| ------- | ----------------------------- | ---- | ---- | ------ |
| vnode   | `VNode`                       |      | 否   | -      |
| options | `EnhancedStreamRenderOptions` |      | 是   | -      |

### 返回值

**类型:** `ReadableStream<Uint8Array>`

ReadableStream<Uint8Array>

## collectAndPrefetchData

**Function**

收集并预取 VNode 树中的所有数据

### 签名

```typescript
collectAndPrefetchData: Promise<Record<string, unknown>>;
```

### 参数

| 参数    | 类型                  | 描述    | 可选   | 默认值 |
| ------- | --------------------- | ------- | ------ | ------ | ---- | ---------- | --- | --- | --- |
| vnode   | `VNode                | VNode[] | string | number | null | undefined` |     | 否  | -   |
| context | `DataPrefetchContext` |         | 是     | -      |

### 返回值

**类型:** `Promise<Record<string, unknown>>`

预取的数据对象

## renderToStringAsync

**Function**

异步渲染 VNode 为 HTML 字符串（支持预取数据）

### 签名

```typescript
renderToStringAsync: Promise<string>;
```

### 参数

| 参数         | 类型                      | 描述    | 可选   | 默认值 |
| ------------ | ------------------------- | ------- | ------ | ------ | ---- | ---------- | --- | --- | --- |
| vnode        | `VNode                    | VNode[] | string | number | null | undefined` |     | 否  | -   |
| prefetchData | `Record<string, unknown>` |         | 是     | -      |

### 返回值

**类型:** `Promise<string>`

HTML 字符串

## renderToStreamEnhanced

**Function**

增强型流式渲染（包含数据预取和渐进式水合）

### 签名

```typescript
renderToStreamEnhanced: Promise<{
  stream: ReadableStream<Uint8Array>;
  dehydratedState: Record<string, unknown>;
}>;
```

### 参数

| 参数    | 类型                          | 描述 | 可选 | 默认值 |
| ------- | ----------------------------- | ---- | ---- | ------ |
| vnode   | `VNode`                       |      | 否   | -      |
| options | `EnhancedStreamRenderOptions` |      | 是   | -      |

### 返回值

**类型:** `Promise<{ stream: ReadableStream<Uint8Array>; dehydratedState: Record<string, unknown>; }>`

Promise<{ stream: ReadableStream<Uint8Array>; dehydratedState: Record<string, any> }>

## VirtualList

**Variable**
