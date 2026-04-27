# MiniApp 渲染器

## 概述

Lyt.js MiniApp 渲染器是一个编译时方案，将 Lyt.js 应用编译为微信小程序可运行的代码。它将 Lyt.js 的模板语法、响应式系统和事件系统映射为小程序原生对应的实现。

### 核心思路

```
Lyt.js 模板  -->  编译  -->  WXML（小程序模板）
Lyt.js 样式  -->  转换  -->  WXSS（小程序样式）
Lyt.js 响应式 --> 映射  -->  setData（小程序数据更新）
Lyt.js 事件  -->  映射  -->  bindtap / bindinput（小程序事件）
```

## 支持的平台

| 平台 | 状态 | 模板格式 | 事件前缀 |
|------|------|----------|----------|
| 微信小程序 | 完整支持 | WXML | `bind` / `catch` |
| 支付宝小程序 | 基础支持 | AXML | `on` / `catchEvent` |
| 字节跳动小程序 | 基础支持 | TTML | `bind` / `catch` |

## 模块组成

| 模块 | 文件 | 说明 |
|------|------|------|
| MiniAppRenderer | `miniapp-renderer.ts` | 核心渲染器，实现 LytRenderer 接口 |
| MiniAppCompiler | `miniapp-compiler.ts` | 模板编译器，模板语法转换 |
| MiniAppStyleCompiler | `style-compiler.ts` | 样式编译器，CSS 转 WXSS |
| MiniAppEventBridge | `miniapp-event-bridge.ts` | 事件桥接，事件名映射和参数解析 |
| MiniAppLifecycleAdapter | `miniapp-lifecycle.ts` | 生命周期适配器 |
| MiniAppApiAdapter | `api-adapter.ts` | API 适配器，Promise 化封装 |

## 快速开始

### 安装

```bash
npm install @lytjs/renderer
```

### 基本使用

```ts
import { MiniAppCompiler, MiniAppStyleCompiler } from '@lytjs/renderer/miniapp'

// 1. 编译模板
const compiler = new MiniAppCompiler()
const result = compiler.compile(
  '<div lyt:if="show" @click="handleClick">{{ message }}</div>',
  'wechat'
)
console.log(result.template)
// => '<view wx:if="{{show}}" bindtap="handleClick">{{message}}</view>'

// 2. 编译样式
const styleCompiler = new MiniAppStyleCompiler()
const styleResult = styleCompiler.compile('.container { padding: 16px; color: var(--primary); }', {
  pxToRpx: true,
  cssVariables: { '--primary': '#1890ff' },
})
console.log(styleResult.code)
// => '.container { padding: 32rpx; color: #1890ff; }'

// 3. 编译页面
const page = compiler.compilePage({
  template: '<view>{{title}}</view>',
  data: { title: 'Hello' },
  methods: {
    handleClick() { console.log('clicked') },
  },
}, 'wechat')
// page.wxml / page.wxss / page.js / page.json
```

### 编译组件

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

## 模板语法映射表

### 指令映射

| Lyt.js 语法 | 微信小程序 | 支付宝小程序 | 字节跳动小程序 |
|---|---|---|---|
| `v-if="expr"` / `lyt:if="expr"` | `wx:if="{{expr}}"` | `a:if="{{expr}}"` | `tt:if="{{expr}}"` |
| `v-else-if="expr"` / `lyt:elif="expr"` | `wx:elif="{{expr}}"` | `a:elif="{{expr}}"` | `tt:elif="{{expr}}"` |
| `v-else` / `lyt:else` | `wx:else` | `a:else` | `tt:else` |
| `v-for="item in list"` / `lyt:each="item in list"` | `wx:for="{{list}}" wx:for-item="item" wx:key="item"` | `a:for="{{list}}" a:for-item="item" a:key="item"` | `tt:for="{{list}}" tt:for-item="item" tt:key="item"` |
| `v-for="(item, i) in list"` | `wx:for="{{list}}" wx:for-item="item" wx:for-index="i" wx:key="item"` | 同左（前缀不同） | 同左（前缀不同） |
| `v-show="expr"` / `lyt:show="expr"` | `hidden="{{!expr}}"` | `hidden="{{!expr}}"` | `hidden="{{!expr}}"` |
| `v-model="data"` | `model:value="{{data}}"` | `model:value="{{data}}"` | `model:value="{{data}}"` |
| `v-html="html"` | `<rich-text nodes="{{html}}">` | `<rich-text nodes="{{html}}">` | `<rich-text nodes="{{html}}">` |
| `ref="name"` | `id="name"` | `id="name"` | `id="name"` |

### 属性绑定映射

| Lyt.js 语法 | 小程序语法 |
|---|---|
| `:class="expr"` | `class="{{expr}}"` |
| `:style="expr"` | `style="{{expr}}"` |
| `:src="expr"` | `src="{{expr}}"` |
| `:disabled="expr"` | `disabled="{{expr}}"` |
| `:attr="expr"` | `attr="{{expr}}"` |

### 标签映射

| HTML 标签 | 小程序组件 |
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

## 事件映射表

| Lyt.js / DOM 事件 | 微信小程序事件 | 支付宝小程序事件 | 说明 |
|---|---|---|---|
| `@click` / `onClick` | `bindtap` | `onTap` | 点击事件 |
| `@dblclick` | `bindtap` | `onTap` | 双击（小程序无对应，映射为 tap） |
| `@input` | `bindinput` | `onInput` | 输入事件 |
| `@change` | `bindchange` | `onChange` | 变更事件 |
| `@submit` | `bindsubmit` | `onSubmit` | 提交事件 |
| `@focus` | `bindfocus` | `onFocus` | 获焦事件 |
| `@blur` | `bindblur` | `onBlur` | 失焦事件 |
| `@touchstart` | `bindtouchstart` | `onTouchStart` | 触摸开始 |
| `@touchend` | `bindtouchend` | `onTouchEnd` | 触摸结束 |
| `@touchmove` | `bindtouchmove` | `onTouchMove` | 触摸移动 |
| `@longpress` | `bindlongpress` | `onLongTap` | 长按事件 |
| `@scroll` | `bindscroll` | `onScroll` | 滚动事件 |
| `@keydown` | `bindconfirm` | `onConfirm` | 键盘按下（映射为确认） |
| `@keyup` | `bindconfirm` | `onConfirm` | 键盘抬起（映射为确认） |

### 事件修饰符

| Lyt.js 修饰符 | 微信小程序 | 说明 |
|---|---|---|
| `@click.stop` | `catchtap` | 阻止冒泡 |
| `@click.prevent` | `catchtap` | 阻止默认行为 |
| `@click.capture` | `capture-bind:tap` | 捕获阶段 |

## 生命周期映射

### 页面生命周期

| Lyt.js 生命周期 | 微信小程序 | 说明 |
|---|---|---|
| `onBeforeMount` | `onLoad` | 页面加载 |
| `onMounted` | `onReady` | 页面初次渲染完成 |
| `onShow` | `onShow` | 页面显示 |
| `onHide` | `onHide` | 页面隐藏 |
| `onUnmounted` | `onUnload` | 页面卸载 |

### 组件生命周期

| Lyt.js 生命周期 | 微信小程序 | 说明 |
|---|---|---|
| `setup()` | `data` + `attached` | setup 返回值作为 data |
| `onBeforeMount` | `created` | 组件实例创建 |
| `onMounted` | `ready` | 组件布局完成 |
| `onUnmounted` | `detached` | 组件离开页面 |
| `onUpdated` | 无直接对应 | 可通过 observers 模拟 |

## API 适配

### 网络请求

```ts
import { createApiAdapter } from '@lytjs/renderer/miniapp'

const api = createApiAdapter('wechat', wx)

// GET 请求
const users = await api.get('/api/users')

// POST 请求
const result = await api.post('/api/users', { name: 'Alice' })

// 完整配置
const response = await api.fetch('/api/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  data: { key: 'value' },
  timeout: 10000,
})
```

### 存储

```ts
// localStorage 风格 API
api.storage.setItem('token', 'abc123')
const token = api.storage.getItem('token')
api.storage.removeItem('token')
api.storage.clear()
const keys = api.storage.keys()
```

### 路由

```ts
// Vue Router 风格 API
api.router.push('/pages/detail/index?id=1')
api.router.replace('/pages/login/index')
api.router.back()
api.router.switchTab('/pages/home/index')
api.router.replaceAll('/pages/index/index')
```

### 界面交互

```ts
// 消息提示
api.showToast('操作成功', { icon: 'success' })

// 加载提示
api.showLoading('加载中...')
api.hideLoading()

// 模态对话框
const confirmed = await api.showModal({
  title: '确认删除',
  content: '确定要删除这条记录吗？',
})
```

### 全局状态管理

```ts
import { createGlobalState } from '@lytjs/renderer/miniapp'

// 创建全局状态（支持持久化）
const store = createGlobalState({ count: 0, user: null }, wx)

// 读写状态
store.set('count', 1)
const count = store.get('count')

// 监听变化
const unsubscribe = store.on('count', (newValue, oldValue) => {
  console.log(`count: ${oldValue} -> ${newValue}`)
})
unsubscribe() // 取消监听
```

## 样式编译

### CSS 变量转换

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

### px 转 rpx

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

## 限制和注意事项

1. **编译时方案**：小程序渲染器是编译时方案，模板在构建阶段转换为 WXML，不支持运行时动态模板。

2. **不支持的功能**：
   - `position: fixed` 和 `position: sticky` 在部分小程序版本中表现不一致
   - CSS 变量（`var()`）需要预编译为静态值
   - 不支持 `::before` 和 `::after` 伪元素
   - 不支持 `:nth-child()`、`:first-child` 等复杂伪选择器
   - 不支持 `backdrop-filter`、`clip-path` 等高级 CSS 属性

3. **事件差异**：
   - 小程序没有 `click` 事件，使用 `tap` 代替
   - 小程序没有 `dblclick` 事件
   - 事件修饰符支持有限（仅 `.stop`、`.prevent`、`.capture`）

4. **组件差异**：
   - 小程序使用自定义组件（`view`、`text`、`image` 等），不支持 HTML 标签
   - `v-html` 需要使用 `rich-text` 组件替代
   - 表单元素的双向绑定使用 `model:value`

5. **路由差异**：
   - 小程序页面需要在 `app.json` 中预先注册
   - 不支持动态路由参数，使用 query string 传参
   - 页面栈最多 10 层

6. **性能建议**：
   - 避免频繁调用 `setData`，尽量批量更新
   - 长列表使用 `wx:for` 的 `wx:key` 提升渲染性能
   - 使用 `hidden` 替代 `wx:if` 进行频繁切换的显示/隐藏
