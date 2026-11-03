# @lytjs/runtime-edge

LytJS 边缘运行时支持，为边缘计算环境提供完整的支持。

## 安装

```bash
pnpm add @lytjs/runtime-edge
```

## 快速开始

### 边缘路由器

```typescript
import { createEdgeRouter, jsonResponse, textResponse } from '@lytjs/runtime-edge';

const router = createEdgeRouter({
  basePath: '/api',
});

router.get('/users', () => {
  return new Response(JSON.stringify({ users: [] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

// 路径参数（第三个实参；已做百分号解码）
router.get('/users/:id', (req, ctx, params) => {
  return jsonResponse({ id: params.id });
});

// 通配符：吞掉剩余全部段，捕获到 params['*']
router.get('/assets/*', (req, ctx, params) => {
  return textResponse(`asset: ${params['*']}`);
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

- `options.basePath`：所有路由的公共前缀（尾斜杠会被归一化，`'/api/'` 与 `'/api'` 等价）。
- 路由匹配规则：**逐段**比较优先级（静态 > 参数 > 通配符），不是分数求和 ——
  因此 `/a/b/*` 会胜过 `/a/:x/:y`；请求尾斜杠与重复斜杠都会被归一化。
- 匹配不到路径回 `404`，路径存在但方法不对回 `405` 并带 `Allow`（`GET` 隐含 `HEAD`），
  `HEAD` 自动回落 `GET`。
- `handle()` 的返回值**一定是真正的 `Response`**：handler 返回普通对象
  （`{ status, headers, body }`）时会被归一化，不会把鸭子类型对象泄漏给运行时。

### createEdgeCache(config)

创建边缘缓存实例。

- `config.maxSize`：最多保留多少个条目（默认 1000）。边缘 isolate 长期存活，
  没有上限的 Map 会一直涨到 OOM。
- `config.defaultTtl`：默认 TTL（毫秒，默认 60 000）。
- 另外提供 `size()` 用于观测当前条目数。

### jsonResponse(data, status)

创建 JSON 响应。

### textResponse(text, status, extraHeaders?)

创建文本响应。`extraHeaders` 用于附加响应头（如 405 的 `Allow`）。

### htmlResponse(html, status)

创建 HTML 响应。

### redirectResponse(url, status)

创建重定向响应。

## 许可证

MIT
