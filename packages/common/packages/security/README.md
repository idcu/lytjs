# @lytjs/common-security

Security utilities：HTML 净化、危险属性检测与 URL 安全检查工具。

## 安装

```bash
pnpm add @lytjs/common-security
```

## 使用示例

```typescript
import { sanitizeHTML, isSafeAttribute, DANGEROUS_EVENT_ATTRS } from '@lytjs/common-security';

// 净化 HTML，移除危险标签、事件属性与危险 URL scheme
const clean = sanitizeHTML('<script>alert(1)</script><p onclick="x()">hi</p>');
// '<p>hi</p>'

// 检查单个属性是否安全
isSafeAttribute('onclick', 'alert(1)'); // false
isSafeAttribute('href', 'javascript:alert(1)'); // false
isSafeAttribute('href', 'https://example.com'); // true

// 危险事件属性名单
DANGEROUS_EVENT_ATTRS.has('onpointerdown'); // true
```

## API

### `sanitizeHTML(str: string): string`

对 `innerHTML`（v-html 指令）进行运行时 HTML 净化，采用正则方式处理：

1. **实体解码**：先解码 HTML 实体，确保编码过的载荷不被漏检。
2. **危险标签移除**：移除 `script`、`iframe`、`object`、`embed`、`form`、`input` 等危险标签。
3. **事件属性剥离**：移除所有 `on*` 事件处理属性。
4. **危险 URI 中和**：检查 URL 类型属性并中和 `javascript:`、`vbscript:` 等危险 scheme。
5. **CSS expression 移除**：清除 `style` 属性中的 `expression()` 表达式。

> **注意**：这是一个尽力而为（best-effort）的净化器，不应作为唯一的 XSS 防御手段。它不解析 DOM 树，正则方案存在固有盲区；生产环境可考虑 DOMPurify 等专门库。

### `isSafeAttribute(attrName: string, attrValue: string): boolean`

检查一个属性是否安全：

- 命中危险事件属性名单（`on*`）返回 `false`。
- 命中危险 URL 属性（`src`、`href`、`action`、`formaction`、`xlink:href`、`data`、`srcdoc`、`poster`、`background`）时校验协议白名单，不在 `http:`、`https:`、`mailto:`、`tel:`、`#`、空协议中则返回 `false`。
- 其他情况返回 `true`。

### `DANGEROUS_EVENT_ATTRS: Set<string>`

危险的内联事件处理属性黑名单，包含 `onclick`、`onerror` 等大量 `on*` 属性。这些属性可在净化时被执行任意脚本，应当被移除。

## 相关包

- [@lytjs/common](../../README.md) - LytJS 通用工具聚合包

## 许可证

[MIT](../../../../LICENSE)
