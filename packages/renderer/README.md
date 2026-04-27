# @lytjs/renderer

Lyt.js 渲染器 - 提供 DOM、SSR、Vapor 等多种渲染模式。

## 安装

```bash
npm install @lytjs/renderer

# 或使用 pnpm
pnpm add @lytjs/renderer
```

## 特性

- 🌐 DOM 渲染器
- 🚀 SSR 渲染器
- ⚡ Vapor 无虚拟 DOM 渲染器
- 🔌 可扩展的渲染器架构
- 🎯 零运行时依赖

## 快速开始

### DOM 渲染

```javascript
import { createApp, defineComponent } from '@lytjs/core';
import { render } from '@lytjs/renderer';

const App = defineComponent({
  setup() {
    return { count: 0 };
  },
  template: `
    <div>
      <h1>{{ count }}</h1>
      <button @click="count++">Increment</button>
    </div>
  `
});

const app = createApp(App);
app.mount('#app');
```

### SSR 渲染

```javascript
import { createSSRApp, defineComponent } from '@lytjs/core';
import { renderToString } from '@lytjs/renderer/ssr';

const App = defineComponent({
  template: '<div>Hello SSR!</div>'
});

const app = createSSRApp(App);
const html = await renderToString(app);
console.log(html);
```

### Vapor 模式

Vapor 是无虚拟 DOM 的编译优化模式，性能更优：

```javascript
import { defineVaporComponent } from '@lytjs/renderer/vapor';

const App = defineVaporComponent({
  setup() {
    const count = signal(0);
    return { count };
  },
  template: `
    <div>
      <h1><span bind:text="count"></span></h1>
      <button bind:onclick="() => count.set(count() + 1)">
        Increment
      </button>
    </div>
  `
});
```

## API 参考

### DOM 渲染器

| API | 说明 |
|------|------|
| `render(vnode, container)` | 渲染 VNode 到容器 |
| `hydrate(vnode, container)` | 激活 SSR 渲染的内容 |
| `createRenderer(options)` | 创建自定义渲染器 |

### SSR 渲染器

| API | 说明 |
|------|------|
| `renderToString(app)` | 渲染应用到字符串 |
| `renderToNodeStream(app)` | 渲染到 Node.js 流 |
| `renderToWebStream(app)` | 渲染到 Web Stream |

### Vapor 渲染器

| API | 说明 |
|------|------|
| `defineVaporComponent(options)` | 定义 Vapor 组件 |
| `createVaporApp(rootComponent)` | 创建 Vapor 应用 |

## 渲染器架构

### 自定义渲染器

```javascript
import { createRenderer } from '@lytjs/renderer';

const { render, createApp } = createRenderer({
  // 节点操作
  insert: (child, parent, anchor) => { /* 自定义 */ },
  remove: (child) => { /* 自定义 */ },
  createElement: (tag) => { /* 自定义 */ },
  createText: (text) => { /* 自定义 */ },
  setElementText: (el, text) => { /* 自定义 */ },
  patchProp: (el, key, prevValue, nextValue) => { /* 自定义 */ },
  // ...其他钩子
});
```

## Vapor 模式

Vapor 模式通过编译时分析直接生成 DOM 操作代码，绕过虚拟 DOM：

```javascript
// Vapor 编译输出示例
function render() {
  const el1 = document.createElement('div');
  const el2 = document.createElement('h1');
  const textNode = document.createTextNode(count());
  el2.appendChild(textNode);
  el1.appendChild(el2);

  // 响应式更新
  effect(() => {
    textNode.data = count();
  });

  return el1;
}
```

## 示例

### 自定义渲染器

```javascript
import { createRenderer } from '@lytjs/renderer';

// Canvas 渲染器示例
const canvasRenderer = createRenderer({
  createElement(tag) {
    return { type: tag };
  },
  insert(child, parent) {
    parent.children = parent.children || [];
    parent.children.push(child);
  }
  // ...其他实现
});
```

### 流式 SSR

```javascript
import { createSSRApp } from '@lytjs/core';
import { renderToNodeStream } from '@lytjs/renderer/ssr';
import { createServer } from 'http';

const App = defineComponent({ /* ... */ });

createServer(async (req, res) => {
  const app = createSSRApp(App);
  const stream = renderToNodeStream(app);
  res.setHeader('Content-Type', 'text/html');
  stream.pipe(res);
}).listen(3000);
```

## 性能

- 体积：5.00 KB (ESM gzip)
- 零运行时依赖
- Vapor 模式性能接近原生 JS
- SSR 支持流式渲染

## 兼容性

- Node.js >= 18.0.0
- Chrome 64+
- Firefox 63+
- Safari 12+
- Edge 79+

## License

MIT
