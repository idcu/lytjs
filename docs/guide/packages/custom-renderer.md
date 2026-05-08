# 自定义渲染器开发

通过 `@lytjs/host-contract` 接口，开发自定义渲染器将 LytJS 运行在任何平台上。

---

## 概念

### 为什么需要自定义渲染器？

```
传统框架：框架 → DOM API → 浏览器

LytJS：框架 → RendererHost → 任何平台
                              ├── Web (DOM)
                              ├── SSR (字符串)
                              ├── 小程序
                              ├── Native (React Native / Weex)
                              ├── Canvas / WebGL
                              └── CLI 工具
```

---

## 接口实现

### 最小实现

```ts
import type { RendererHost } from '@lytjs/host-contract';

// 创建一个极简的 Console 渲染器（用于 SSR 测试）
export const consoleHost: RendererHost<ConsoleNode, ConsoleNode> = {
  createElement(tag) {
    return { tag, children: [], attrs: {} };
  },
  createText(text) {
    return { tag: '#text', children: text, attrs: {} };
  },
  insert(child, parent) {
    parent.children.push(child);
    console.log(`${'>'.repeat(parent.depth || 1)} <${child.tag}>${child.children || ''}`);
  },
  // ... 其他方法
};
```

---

## 实现清单

### 必需方法

| 方法                                      | 说明               |
| ----------------------------------------- | ------------------ |
| `createElement(tag, isSVG?)`              | 创建元素           |
| `createText(text)`                        | 创建文本节点       |
| `createComment(text)`                     | 创建注释节点       |
| `insert(child, parent, anchor?)`          | 插入节点           |
| `remove(child)`                           | 移除节点           |
| `nextSibling(node)`                       | 获取下一个兄弟节点 |
| `parentNode(node)`                        | 获取父节点         |
| `querySelector(selector)`                 | 查询选择器         |
| `patchProp(el, key, prev, next)`          | 更新属性           |
| `addClass(el, cls)`                       | 添加类名           |
| `removeClass(el, cls)`                    | 移除类名           |
| `setStyle(el, key, value)`                | 设置样式           |
| `removeStyle(el, key)`                    | 移除样式           |
| `addEventListener(el, event, handler)`    | 添加事件           |
| `removeEventListener(el, event, handler)` | 移除事件           |

### 可选方法

| 方法                          | 说明         |
| ----------------------------- | ------------ |
| `getBoundingClientRect(el)`   | 获取元素位置 |
| `getComputedStyle(el)`        | 获取计算样式 |
| `getTransitionInfo(el, type)` | 获取过渡信息 |
| `nextFrame(fn)`               | 下一帧执行   |
| `forceReflow(el)`             | 强制回流     |

---

## 示例：React Native 渲染器

```ts
import { createRenderer } from '@lytjs/vdom';
import { View, Text } from 'react-native';
import type { RendererHost } from '@lytjs/host-contract';

const reactNativeHost: RendererHost<RNNode, RNElement> = {
  createElement(tag, isSVG) {
    if (tag === 'View') return View;
    if (tag === 'Text') return Text;
    return View; // 默认
  },
  createText(text) {
    return text;
  },
  insert(child, parent) {
    // React Native 的子节点管理
  },
  patchProp(el, key, prev, next) {
    // 映射到 React Native 属性
    el.props = { ...el.props, [key]: next };
  },
  // ...
};

const renderer = createRenderer(reactNativeHost);
renderer.render(vnode, rootElement);
```

---

## 平台适配检查清单

| 检查项      | 说明                                           |
| ----------- | ---------------------------------------------- |
| ✅ 节点创建 | `createElement`, `createText`, `createComment` |
| ✅ 节点操作 | `insert`, `remove`, `replaceChild`             |
| ✅ 节点查询 | `parentNode`, `nextSibling`, `querySelector`   |
| ✅ 属性更新 | `patchProp` 分发到 class/style/event           |
| ✅ 样式     | `setStyle`, `getComputedStyle`                 |
| ✅ 事件     | `addEventListener` 的跨浏览器兼容              |
| ✅ 过渡动画 | `getTransitionInfo`, `forceReflow`             |
| ✅ 性能     | 是否需要批量操作、对象池                       |

---

## 扩展阅读

- [API 参考 - host-contract](../api/host-contract) — 完整接口文档
- [API 参考 - vdom](../api/vdom) — `createRenderer` 文档
- [SSR](../guide/ssr) — SSR 渲染器实现参考
