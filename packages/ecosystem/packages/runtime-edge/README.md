# @lytjs/runtime-edge

LytJS 边缘运行时支持，为边缘计算环境提供完整的支持。

## 安装

```bash
pnpm add @lytjs/runtime-edge
```

## 快速开始

### 边缘路由器

```typescript
import { createEdgeRouter } from '@lytjs/runtime-edge';

const router = createEdgeRouter({
  basePath: '/api',
});

router.get('/users', (req, ctx) => {
  return new Response(JSON.stringify({ users: [] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

export default {
  async fetch(request, env, ctx) {
    return router.handle(request, ctx);
  },
};
```

### 边缘缓存

```typescript
import { createEdgeCache } from '@lytjs/runtime-edge';

const cache = createEdgeCache();

// 设置缓存
await cache.set('key', { data: 'value' }, { ttl: 60000 });

// 获取缓存
const value = await cache.get('key');
```

### 响应辅助工具

```typescript
import { jsonResponse, textResponse, htmlResponse, redirectResponse } from '@lytjs/runtime-edge';

// JSON 响应
return jsonResponse({ success: true }, 200);

// 文本响应
return textResponse('Hello World', 200);

// HTML 响应
return htmlResponse('<html><body>Hello</body></html>', 200);

// 重定向响应
return redirectResponse('https://example.com', 302);
```

## 特性

- 边缘函数支持
- 边缘路由器
- 内存缓存
- 响应辅助工具
- 零外部依赖

## API

### createEdgeRouter(options)

创建边缘路由器实例。

### createEdgeCache()

创建边缘缓存实例。

### jsonResponse(data, status)

创建 JSON 响应。

### textResponse(text, status)

创建文本响应。

### htmlResponse(html, status)

创建 HTML 响应。

### redirectResponse(url, status)

创建重定向响应。

## 许可证

MIT
