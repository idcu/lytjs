# @lytjs/web

> Web 平台工具包，提供 CSS 变量管理、ResizeObserver、Web Components 等 Web 特定功能

## 安装

```bash
npm install @lytjs/web
```

## 核心功能

### CSS 变量管理

```typescript
import { setCssVar, getCssVar, removeCssVar, setCssVars, watchCssVar } from '@lytjs/web';

// 设置 CSS 变量
setCssVar('--primary-color', '#1890ff');
setCssVar('--font-size', '14px', document.documentElement);

// 获取 CSS 变量
const color = getCssVar('--primary-color');

// 移除 CSS 变量
removeCssVar('--primary-color');

// 批量设置
setCssVars({
  '--primary-color': '#1890ff',
  '--secondary-color': '#52c41a',
  '--font-size': '14px',
});

// 监听 CSS 变量变化
const unwatch = watchCssVar('--primary-color', (newVal, oldVal) => {
  console.log('CSS 变量变化:', oldVal, '->', newVal);
});
```

### ResizeObserver

```typescript
import { useResizeObserver, createResizeObserver, type ResizeObserverEntry } from '@lytjs/web';

// 使用 ResizeObserver
const cleanup = useResizeObserver(
  document.getElementById('container'),
  (entries: ResizeObserverEntry[]) => {
    for (const entry of entries) {
      console.log('尺寸变化:', entry.contentRect);
    }
  },
);

// 停止监听
cleanup();

// 创建可复用的 ResizeObserver
const observer = createResizeObserver((entries) => {
  // 处理尺寸变化
});

observer.observe(element1);
observer.observe(element2);
observer.disconnect();
```

### Web Components

```typescript
import {
  defineLytElement,
  useShadowRoot,
  useHost,
  useWebComponentSlots,
  injectChildStyles,
} from '@lytjs/web';

// 定义 Web Component
const MyElement = defineLytElement({
  name: 'my-element',
  props: {
    title: String,
    count: Number,
  },
  setup(props) {
    const shadowRoot = useShadowRoot();
    const host = useHost();
    const slots = useWebComponentSlots();

    return () => h('div', [h('h1', props.title), h('p', `Count: ${props.count}`), h('slot')]);
  },
});

// 注册自定义元素
customElements.define('my-element', MyElement);
```

### 媒体查询

```typescript
import { useMediaQuery, usePreferredColorScheme, usePreferredReducedMotion } from '@lytjs/web';

// 响应式断点
const isMobile = useMediaQuery('(max-width: 768px)');
const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
const isDesktop = useMediaQuery('(min-width: 1025px)');

// 系统主题偏好
const colorScheme = usePreferredColorScheme(); // 'light' | 'dark'
const reducedMotion = usePreferredReducedMotion(); // boolean
```

### 网络状态

```typescript
import { useOnline, useNetworkStatus } from '@lytjs/web';

// 在线状态
const isOnline = useOnline();

// 详细网络状态
const network = useNetworkStatus();
// {
//   online: boolean,
//   type: 'wifi' | '4g' | '3g' | '2g' | 'slow-2g',
//   downlink: number,
//   rtt: number,
// }
```

### 页面可见性

```typescript
import { usePageVisibility } from '@lytjs/web';

const isVisible = usePageVisibility();

// 页面可见性变化时
if (isVisible) {
  // 恢复动画、轮询等
} else {
  // 暂停动画、轮询等
}
```

### 鼠标/触摸位置

```typescript
import { useMousePosition, useMouseInElement, useWindowScroll } from '@lytjs/web';

// 鼠标位置
const { x, y } = useMousePosition();

// 元素内相对位置
const { x: elX, y: elY, isOutside } = useMouseInElement(elementRef);

// 窗口滚动
const { x: scrollX, y: scrollY } = useWindowScroll();
```

## 类型定义

```typescript
import type {
  ResizeObserverEntry,
  ResizeObserverCallback,
  LytElementOptions,
  LytElementConstructor,
  NetworkStatus,
} from '@lytjs/web';
```

## 相关包

- [@lytjs/core](../core) - 框架核心
- [@lytjs/adapter-web](../adapter-web) - Web 平台适配器
- [@lytjs/common-dom](../common/packages/dom) - DOM 工具

## 依赖版本

本包为纯工具包，无外部 @lytjs 依赖
