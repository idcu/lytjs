# @lytjs/renderer

> LytJS 渲染后端，提供 DOM 渲染、SSR 渲染和 Hydration 支持

## 安装

```bash
npm install @lytjs/renderer
```

## 核心 API

### createDOMRenderer

创建 DOM 渲染器实例

```typescript
import { createDOMRenderer } from '@lytjs/renderer';
```

### patchProp / patchClass / patchStyle / patchEvent / patchAttr

DOM 属性更新工具函数

```typescript
import { patchProp, patchClass, patchStyle, patchEvent } from '@lytjs/renderer';
```

### createHydrationFunctions

创建服务端渲染 Hydration 函数

```typescript
import { createHydrationFunctions } from '@lytjs/renderer';
```

### renderToString

服务端渲染为字符串

```typescript
import { renderToString } from '@lytjs/renderer';
```

### escapeHtml / isBooleanAttr / isVoidElement

渲染工具函数

```typescript
import { escapeHtml, isBooleanAttr, isVoidElement } from '@lytjs/renderer';
```

## 相关包

- [@lytjs/vdom](../vdom) - 虚拟 DOM 实现，渲染器的基础
- [@lytjs/core](../core) - 框架核心入口，整合所有子包
