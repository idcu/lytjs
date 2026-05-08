# @lytjs/common-query

URL 查询字符串解析与构建工具，提供轻量级的 URL 处理能力。

## 安装

```bash
pnpm add @lytjs/common-query
```

## API

### `parseQueryString(search: string): Record<string, string>`

解析 URL 查询字符串为对象。

```typescript
import { parseQueryString } from '@lytjs/common-query';

parseQueryString('?key=value&key2=value2');
// { key: 'value', key2: 'value2' }

parseQueryString('key=value&key2=value2');
// { key: 'value', key2: 'value2' }

parseQueryString('?name=hello%20world');
// { name: 'hello world' }
```

### `stringifyQueryString(params: Record<string, string | number | boolean>): string`

将对象序列化为查询字符串。

```typescript
import { stringifyQueryString } from '@lytjs/common-query';

stringifyQueryString({ a: '1', b: '2' });
// 'a=1&b=2'

stringifyQueryString({ name: 'hello world' });
// 'name=hello%20world'
```

### `parseURL(url: string): ParsedURL`

解析完整 URL，返回结构化信息。

```typescript
import { parseURL } from '@lytjs/common-query';

parseURL('https://example.com:8080/path?name=test#section');
// {
//   protocol: 'https://',
//   host: 'example.com:8080',
//   hostname: 'example.com',
//   port: '8080',
//   pathname: '/path',
//   search: '?name=test',
//   hash: '#section',
//   searchParams: { name: 'test' },
//   origin: 'https://example.com:8080',
//   href: 'https://example.com:8080/path?name=test#section'
// }
```

### `buildURL(base: string, params?, hash?): string`

构建完整 URL，支持合并已有查询参数。

```typescript
import { buildURL } from '@lytjs/common-query';

buildURL('https://example.com/path', { a: '1', b: '2' });
// 'https://example.com/path?a=1&b=2'

buildURL('https://example.com/path?existing=1', { new: '2' });
// 'https://example.com/path?existing=1&new=2'

buildURL('/path', { page: 1 }, 'top');
// '/path?page=1#top'
```

## 特性

- 零运行时依赖
- 体积 < 2KB（min+gzip）
- 支持绝对 URL 和相对 URL
- 自动编解码 URI 组件
- TypeScript 类型完整

## License

MIT
