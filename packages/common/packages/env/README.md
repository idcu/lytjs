# @lytjs/common-env

环境检测工具，检测当前运行环境（浏览器/Node/SSR）。

## 安装

```bash
pnpm add @lytjs/common-env
```

## API

### `isBrowser(): boolean`

检测当前是否为浏览器环境。通过检查 `window`、`document`、`navigator` 是否存在来判断。

```typescript
import { isBrowser } from '@lytjs/common-env'

isBrowser() // 浏览器中: true, Node.js 中: false
```

### `isNode(): boolean`

检测当前是否为 Node.js 环境。通过检查 `process.versions.node` 是否存在来判断。

```typescript
import { isNode } from '@lytjs/common-env'

isNode() // Node.js 中: true, 浏览器中: false
```

### `isSSR(): boolean`

检测当前是否为 SSR 环境。

```typescript
import { isSSR } from '@lytjs/common-env'

isSSR() // 既非浏览器也非 Node.js 时: true
```

### `getEnvInfo(): EnvInfo`

获取完整的环境信息对象。

```typescript
import { getEnvInfo } from '@lytjs/common-env'

const info = getEnvInfo()
// { isBrowser: true, isNode: false, isSSR: false, userAgent: '...' }
```

## 边界行为与已知限制

### `isSSR()` 的语义说明

`isSSR()` 的当前实现定义为 **"非浏览器且非 Node.js 的环境"**（即 `!isBrowser() && !isNode()`）。这意味着：

| 环境 | `isBrowser()` | `isNode()` | `isSSR()` |
|---|---|---|---|
| 浏览器 | `true` | `false` | `false` |
| Node.js | `false` | `true` | `false` |
| Deno / Bun / Worker | `false` | `false` | `true` |

**注意**：在标准的 Node.js 服务端渲染（SSR）场景中，`isSSR()` 返回的是 `false`（因为 Node.js 环境被 `isNode()` 识别）。如果需要在 Node.js 中区分"SSR 模式"和"CLI 模式"，应使用其他方式（例如检查特定的环境变量或上下文标识），而非依赖 `isSSR()`。

## License

MIT
