# SSR 服务端渲染

@lytjs/ssr 提供 LytJS 应用的服务端渲染支持。

## 安装

```bash
pnpm add @lytjs/ssr
```

## 基础用法

### 渲染为字符串

```typescript
import { renderToString, renderToHtml } from '@lytjs/ssr';
import { createVNode } from '@lytjs/vdom';

// 创建 VNode
const vnode = createVNode('div', { class: 'app' }, [
  createVNode('h1', {}, 'Hello SSR'),
  createVNode('p', {}, '服务端渲染的内容'),
]);

// 渲染为 HTML 字符串
const html = renderToString(vnode);
console.log(html);
// 输出: <div class="app"><h1>Hello SSR</h1><p>服务端渲染的内容</p></div>

// 渲染完整 HTML 页面
const page = renderToHtml(vnode, {
  title: 'My SSR App',
  lang: 'zh-CN',
  head: '<meta name="description" content="LytJS SSR App">',
});
```

### Express 集成示例

```typescript
import express from 'express';
import { renderToHtml } from '@lytjs/ssr';
import { App } from './App';

const app = express();

app.get('*', (req, res) => {
  const html = renderToHtml(App, {
    title: 'LytJS SSR',
    lang: 'zh-CN',
  });
  
  res.send(html);
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
```

## 虚拟列表

@lytjs/ssr 还提供高性能的虚拟列表组件：

```typescript
import { VirtualList } from '@lytjs/ssr';

// 大数据列表渲染
createVNode(VirtualList, {
  data: largeDataArray, // 10000+ 条数据
  itemHeight: 50,       // 每项高度
  height: 400,          // 容器高度
  buffer: 5,            // 缓冲区大小
}, {
  default: ({ item, index }) => 
    createVNode('div', {}, `Item ${index}: ${item.name}`)
});
```

## API

### renderToString

```typescript
function renderToString(
  vnode: VNode | VNode[] | string | number | null
): string;
```

将 VNode 渲染为 HTML 字符串。

### renderToHtml

```typescript
function renderToHtml(
  vnode: VNode | VNode[],
  options?: {
    title?: string;
    lang?: string;
    head?: string;
    bodyAttrs?: Record<string, string>;
  }
): string;
```

渲染完整的 HTML 页面。

## 安全性

- 自动转义 HTML 特殊字符，防止 XSS 攻击
- 支持 class/style 对象语法
- 正确处理自闭合标签
