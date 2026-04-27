# MiniApp Renderer

## Overview

The Lyt.js MiniApp Renderer is a compile-time solution that compiles Lyt.js applications into WeChat Mini Programs. It maps Lyt.js template syntax, reactivity system, and event system to their native MiniApp counterparts.

### Core Concept

```
Lyt.js Templates  -->  Compile  -->  WXML (MiniApp Templates)
Lyt.js Styles     -->  Transform  -->  WXSS (MiniApp Styles)
Lyt.js Reactivity -->  Map      -->  setData (MiniApp Data Updates)
Lyt.js Events     -->  Map      -->  bindtap / bindinput (MiniApp Events)
```

## Supported Platforms

| Platform | Status | Template Format | Event Prefix |
|----------|--------|-----------------|--------------|
| WeChat Mini Program | Full Support | WXML | `bind` / `catch` |
| Alipay Mini Program | Basic Support | AXML | `on` / `catchEvent` |
| ByteDance Mini Program | Basic Support | TTML | `bind` / `catch` |

## Module Architecture

| Module | File | Description |
|--------|------|-------------|
| MiniAppRenderer | `miniapp-renderer.ts` | Core renderer implementing LytRenderer interface |
| MiniAppCompiler | `miniapp-compiler.ts` | Template compiler for syntax transformation |
| MiniAppStyleCompiler | `style-compiler.ts` | Style compiler for CSS to WXSS conversion |
| MiniAppEventBridge | `miniapp-event-bridge.ts` | Event bridge for event name mapping and parameter parsing |
| MiniAppLifecycleAdapter | `miniapp-lifecycle.ts` | Lifecycle adapter for mapping Lyt.js lifecycle hooks |
| MiniAppApiAdapter | `api-adapter.ts` | API adapter providing Promise-based wrappers |

## Quick Start

### Installation

```bash
npm install @lytjs/renderer
```

### Basic Usage

```ts
import { MiniAppCompiler, MiniAppStyleCompiler } from '@lytjs/renderer/miniapp'

// 1. Compile template
const compiler = new MiniAppCompiler()
const result = compiler.compile(
  '<div lyt:if="show" @click="handleClick">{{ message }}</div>',
  'wechat'
)
console.log(result.template)
// => '<view wx:if="{{show}}" bindtap="handleClick">{{message}}</view>'

// 2. Compile styles
const styleCompiler = new MiniAppStyleCompiler()
const styleResult = styleCompiler.compile('.container { padding: 16px; color: var(--primary); }', {
  pxToRpx: true,
  cssVariables: { '--primary': '#1890ff' },
})
console.log(styleResult.code)
// => '.container { padding: 32rpx; color: #1890ff; }'

// 3. Compile page
const page = compiler.compilePage({
  template: '<view>{{title}}</view>',
  data: { title: 'Hello' },
  methods: {
    handleClick() { console.log('clicked') },
  },
}, 'wechat')
// page.wxml / page.wxss / page.js / page.json
```

### Compile Component

```ts
const component = compiler.compileComponent({
  template: '<view><slot></slot></view>',
  props: ['title', 'count'],
  data: { internal: 0 },
  methods: {
    increment() { this.setData({ internal: this.data.internal + 1 }) },
  },
}, 'wechat')
```

## Template Syntax Mapping

### Directive Mapping

| Lyt.js Syntax | WeChat MiniApp | Alipay MiniApp | ByteDance MiniApp |
|---|---|---|---|
| `v-if="expr"` / `lyt:if="expr"` | `wx:if="{{expr}}"` | `a:if="{{expr}}"` | `tt:if="{{expr}}"` |
| `v-else-if="expr"` / `lyt:elif="expr"` | `wx:elif="{{expr}}"` | `a:elif="{{expr}}"` | `tt:elif="{{expr}}"` |
| `v-else` / `lyt:else` | `wx:else` | `a:else` | `tt:else` |
| `v-for="item in list"` / `lyt:each="item in list"` | `wx:for="{{list}}" wx:for-item="item" wx:key="item"` | `a:for="{{list}}" a:for-item="item" a:key="item"` | `tt:for="{{list}}" tt:for-item="item" tt:key="item"` |
| `v-for="(item, i) in list"` | `wx:for="{{list}}" wx:for-item="item" wx:for-index="i" wx:key="item"` | Same (different prefix) | Same (different prefix) |
| `v-show="expr"` / `lyt:show="expr"` | `hidden="{{!expr}}"` | `hidden="{{!expr}}"` | `hidden="{{!expr}}"` |
| `v-model="data"` | `model:value="{{data}}"` | `model:value="{{data}}"` | `model:value="{{data}}"` |
| `v-html="html"` | `<rich-text nodes="{{html}}">` | `<rich-text nodes="{{html}}">` | `<rich-text nodes="{{html}}">` |
| `ref="name"` | `id="name"` | `id="name"` | `id="name"` |

### Attribute Binding Mapping

| Lyt.js Syntax | MiniApp Syntax |
|---|---|
| `:class="expr"` | `class="{{expr}}"` |
| `:style="expr"` | `style="{{expr}}"` |
| `:src="expr"` | `src="{{expr}}"` |
| `:disabled="expr"` | `disabled="{{expr}}"` |
| `:attr="expr"` | `attr="{{expr}}"` |

### Tag Mapping

| HTML Tag | MiniApp Component |
|---|---|
| `div`, `section`, `header`, `footer`, `nav`, `main`, `article`, `aside` | `view` |
| `span`, `p`, `h1` ~ `h6` | `text` |
| `img` | `image` |
| `a` | `navigator` |
| `input` | `input` |
| `textarea` | `textarea` |
| `button` | `button` |
| `form` | `form` |
| `ul`, `ol`, `li` | `view` |
| `scroll` | `scroll-view` |

## Event Mapping

| Lyt.js / DOM Event | WeChat MiniApp | Alipay MiniApp | Description |
|---|---|---|---|
| `@click` / `onClick` | `bindtap` | `onTap` | Tap event |
| `@dblclick` | `bindtap` | `onTap` | Double tap (mapped to tap) |
| `@input` | `bindinput` | `onInput` | Input event |
| `@change` | `bindchange` | `onChange` | Change event |
| `@submit` | `bindsubmit` | `onSubmit` | Submit event |
| `@focus` | `bindfocus` | `onFocus` | Focus event |
| `@blur` | `bindblur` | `onBlur` | Blur event |
| `@touchstart` | `bindtouchstart` | `onTouchStart` | Touch start |
| `@touchend` | `bindtouchend` | `onTouchEnd` | Touch end |
| `@touchmove` | `bindtouchmove` | `onTouchMove` | Touch move |
| `@longpress` | `bindlongpress` | `onLongTap` | Long press |
| `@scroll` | `bindscroll` | `onScroll` | Scroll event |
| `@keydown` | `bindconfirm` | `onConfirm` | Key down (mapped to confirm) |
| `@keyup` | `bindconfirm` | `onConfirm` | Key up (mapped to confirm) |

### Event Modifiers

| Lyt.js Modifier | WeChat MiniApp | Description |
|---|---|---|
| `@click.stop` | `catchtap` | Stop bubbling |
| `@click.prevent` | `catchtap` | Prevent default |
| `@click.capture` | `capture-bind:tap` | Capture phase |

## Lifecycle Mapping

### Page Lifecycle

| Lyt.js Lifecycle | WeChat MiniApp | Description |
|---|---|---|
| `onBeforeMount` | `onLoad` | Page loaded |
| `onMounted` | `onReady` | Page initial render complete |
| `onShow` | `onShow` | Page shown |
| `onHide` | `onHide` | Page hidden |
| `onUnmounted` | `onUnload` | Page unloaded |

### Component Lifecycle

| Lyt.js Lifecycle | WeChat MiniApp | Description |
|---|---|---|
| `setup()` | `data` + `attached` | setup return value becomes data |
| `onBeforeMount` | `created` | Component instance created |
| `onMounted` | `ready` | Component layout complete |
| `onUnmounted` | `detached` | Component removed from page |
| `onUpdated` | No direct mapping | Can be simulated with observers |

## API Adaptation

### Network Requests

```ts
import { createApiAdapter } from '@lytjs/renderer/miniapp'

const api = createApiAdapter('wechat', wx)

// GET request
const users = await api.get('/api/users')

// POST request
const result = await api.post('/api/users', { name: 'Alice' })

// Full configuration
const response = await api.fetch('/api/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  data: { key: 'value' },
  timeout: 10000,
})
```

### Storage

```ts
// localStorage-style API
api.storage.setItem('token', 'abc123')
const token = api.storage.getItem('token')
api.storage.removeItem('token')
api.storage.clear()
const keys = api.storage.keys()
```

### Router

```ts
// Vue Router-style API
api.router.push('/pages/detail/index?id=1')
api.router.replace('/pages/login/index')
api.router.back()
api.router.switchTab('/pages/home/index')
api.router.replaceAll('/pages/index/index')
```

### UI Interaction

```ts
// Toast
api.showToast('Success', { icon: 'success' })

// Loading
api.showLoading('Loading...')
api.hideLoading()

// Modal dialog
const confirmed = await api.showModal({
  title: 'Confirm Delete',
  content: 'Are you sure you want to delete this item?',
})
```

### Global State Management

```ts
import { createGlobalState } from '@lytjs/renderer/miniapp'

// Create global state (with persistence)
const store = createGlobalState({ count: 0, user: null }, wx)

// Read/write
store.set('count', 1)
const count = store.get('count')

// Watch changes
const unsubscribe = store.on('count', (newValue, oldValue) => {
  console.log(`count: ${oldValue} -> ${newValue}`)
})
unsubscribe() // Unsubscribe
```

## Style Compilation

### CSS Variable Transformation

```ts
const compiler = new MiniAppStyleCompiler()
const result = compiler.compile(
  '.btn { background: var(--primary-color); color: var(--text-color, #333); }',
  {
    cssVariables: {
      '--primary-color': '#1890ff',
      '--text-color': '#333',
    },
  }
)
// => '.btn { background: #1890ff; color: #333; }'
```

### px to rpx Conversion

```ts
const result = compiler.compile(
  '.container { padding: 16px; margin: 8px 16px; font-size: 14px; }',
  { pxToRpx: true, rpxRatio: 2 }
)
// => '.container { padding: 32rpx; margin: 16rpx 32rpx; font-size: 28rpx; }'
```

### Scoped CSS

```ts
const result = compiler.compileScoped(
  '.container { padding: 16px; } .item { margin: 8px; }',
  'data-v-abc123'
)
// => '.container[data-v-abc123] { padding: 16px; } .item[data-v-abc123] { margin: 8px; }'
```

## Limitations and Notes

1. **Compile-time approach**: The MiniApp renderer is a compile-time solution. Templates are converted to WXML during the build phase; runtime dynamic templates are not supported.

2. **Unsupported features**:
   - `position: fixed` and `position: sticky` have inconsistent behavior across MiniApp versions
   - CSS variables (`var()`) must be pre-compiled to static values
   - `::before` and `::after` pseudo-elements are not supported
   - Complex pseudo-selectors like `:nth-child()`, `:first-child` are not supported
   - Advanced CSS properties like `backdrop-filter`, `clip-path` are not supported

3. **Event differences**:
   - MiniApp has no `click` event; use `tap` instead
   - MiniApp has no `dblclick` event
   - Limited event modifier support (only `.stop`, `.prevent`, `.capture`)

4. **Component differences**:
   - MiniApp uses custom components (`view`, `text`, `image`, etc.), not HTML tags
   - `v-html` must use the `rich-text` component as a replacement
   - Two-way binding on form elements uses `model:value`

5. **Routing differences**:
   - MiniApp pages must be pre-registered in `app.json`
   - Dynamic route parameters are not supported; use query strings
   - Page stack is limited to 10 levels

6. **Performance recommendations**:
   - Avoid frequent `setData` calls; batch updates when possible
   - Use `wx:key` with `wx:for` for better list rendering performance
   - Use `hidden` instead of `wx:if` for frequently toggled visibility
