# @lytjs/web

> Web 平台工具包，提供 CSS 变量管理与 ResizeObserver 支持。

## 安装

```bash
npm install @lytjs/web
```

## CSS 变量管理

`@lytjs/web` 导出的核心函数：`setCSSVar`、`getCSSVar`、`setCSSVars`、`getCSSVars`、
`removeCSSVar`、`removeCSSVars`、`hasCSSVar`、`getAllCSSVars`、`toggleCSSVar`、
`normalizeVarName`、`stripVarPrefix`，以及类 `CSSVarObserver`、`ThemeManager`。
类型：`CSSVarValue`、`CSSVarChangeCallback`、`CSSVarOptions`、`ThemeConfig`。

```typescript
import { setCSSVar, getCSSVar, setCSSVars, removeCSSVar, toggleCSSVar } from '@lytjs/web';

// 设置全局 CSS 变量（元素为 document.documentElement）
setCSSVar({ name: '--primary-color', value: '#1890ff' });
setCSSVar({ element: document.body, name: '--font-size', value: 16, options: { unit: 'px' } });

// 读取
const color = getCSSVar('--primary-color');

// 批量设置
setCSSVars({ '--primary-color': '#1890ff', '--secondary-color': '#52c41a' });

// 移除（value 传 null 亦可移除）
removeCSSVar('--primary-color');

// 在两组取值间切换
const next = toggleCSSVar('--theme', 'light', 'dark');
```

> 兼容说明：`setCSSVar(element, name, value, options)` 位置参数形式**仍可用但已标记 `@deprecated`**，
> 推荐改用对象参数形式 `setCSSVar({ element, name, value, options })`。

### CSSVarObserver

`CSSVarObserver` 用于监听元素上 CSS 变量的变化（内部基于 `MutationObserver`）。
参数/回调类型见 `CSSVarOptions` 与 `CSSVarChangeCallback`。

```typescript
import { CSSVarObserver } from '@lytjs/web';

const observer = new CSSVarObserver((changes) => {
  for (const c of changes) console.log(c.name, c.oldValue, '->', c.newValue);
});
observer.observe(document.documentElement, ['--primary-color']);
// 不需要时：
observer.disconnect();
```

### ThemeManager

`ThemeManager` 基于 CSS 变量管理主题（构造参数为 `ThemeConfig`）。

```typescript
import { ThemeManager } from '@lytjs/web';

const themes = new ThemeManager({
  /* ThemeConfig */
});
```

## ResizeObserver

导出的函数/类：`useResizeObserver`、`supportsResizeObserver`、`ResizeObserverManager`；
类型：`ResizeObserverCallback`、`ResizeObserverOptions`、`ResizeObserverStats`。

```typescript
import { useResizeObserver, supportsResizeObserver, ResizeObserverManager } from '@lytjs/web';

// 一次性监听：返回清理函数
const cleanup = useResizeObserver(document.getElementById('container')!, (entries) => {
  for (const entry of entries) console.log('尺寸变化:', entry.contentRect);
});
cleanup();

// 可复用管理器（可 observe 多个元素）
if (supportsResizeObserver()) {
  const manager = new ResizeObserverManager((entries) => {
    /* 处理尺寸变化 */
  });
  manager.observe(element1);
  manager.observe(element2);
  manager.disconnect();
}
```

> 注意：`ResizeObserverEntry` 是 **DOM 原生类型**，并非 `@lytjs/web` 的导出。

## 未实现 / 规划中

以下 API 在本仓**不存在**（历史文档曾承诺，勿直接使用）：

- Web Components 辅助：`defineLytElement`、`useShadowRoot`、`useHost`、`useWebComponentSlots`、`injectChildStyles`
- 媒体查询/系统偏好：`useMediaQuery`、`usePreferredColorScheme`、`usePreferredReducedMotion`
- 网络与可见性：`useOnline`、`useNetworkStatus`、`usePageVisibility`
- 指针/滚动：`useMousePosition`、`useMouseInElement`、`useWindowScroll`
- 低层工厂：`createResizeObserver`、`watchCssVar`（请改用 `ResizeObserverManager` 与 `CSSVarObserver`）

## 相关包

- [@lytjs/core](../core/) - 框架核心
- [@lytjs/adapter-web](./adapter-web.md) - Web 平台适配器
- [@lytjs/common-dom](../common/overview.md) - DOM 工具

## 依赖版本

本包为纯工具包，无外部 @lytjs 依赖。
