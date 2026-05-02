# @lytjs/common-dom-helpers

轻量级 DOM 操作辅助工具，提供常用的 DOM 创建、修改和查询方法。

## 安装

```bash
pnpm add @lytjs/common-dom-helpers
```

## API

### `createElement(tag, attrs?, children?): Element`

创建 DOM 元素，支持设置属性和子元素。

```typescript
import { createElement } from '@lytjs/common-dom-helpers';

const el = createElement('div', { id: 'app', class: 'container' }, [
  'Hello',
  createElement('span', {}, ['World']),
]);
```

### `insertBefore(parent, child, ref): void`

在参考节点前插入子节点，ref 为 null 时等同于 appendChild。

```typescript
import { insertBefore } from '@lytjs/common-dom-helpers';

insertBefore(parent, newChild, refChild);
insertBefore(parent, newChild, null); // appendChild
```

### `removeChild(parent, child): boolean`

移除子节点，成功返回 true，失败返回 false。

```typescript
import { removeChild } from '@lytjs/common-dom-helpers';

const success = removeChild(parent, child); // true or false
```

### `nextSibling(node, skipComments?): Node | null`

获取下一个兄弟节点，可通过参数控制是否跳过注释节点。

```typescript
import { nextSibling } from '@lytjs/common-dom-helpers';

const next = nextSibling(node); // includes comments
const next = nextSibling(node, true); // skips comments
```

### `createTextNode(text): Text`

创建文本节点。

```typescript
import { createTextNode } from '@lytjs/common-dom-helpers';

const text = createTextNode('Hello World');
```

### `createComment(text): Comment`

创建注释节点。

```typescript
import { createComment } from '@lytjs/common-dom-helpers';

const comment = createComment('this is a comment');
```

### `setStyle(el, styles): void`

批量设置元素样式。

```typescript
import { setStyle } from '@lytjs/common-dom-helpers';

setStyle(el, { color: 'red', fontSize: '16px', zIndex: 10 });
```

### `hasClass(el, cls): boolean`

检查元素是否有指定 class。

```typescript
import { hasClass } from '@lytjs/common-dom-helpers';

hasClass(el, 'active'); // true or false
```

### `addClass(el, ...cls): void`

添加 class。

```typescript
import { addClass } from '@lytjs/common-dom-helpers';

addClass(el, 'active', 'visible');
```

### `removeClass(el, ...cls): void`

移除 class。

```typescript
import { removeClass } from '@lytjs/common-dom-helpers';

removeClass(el, 'active', 'hidden');
```

## 特性

- 零运行时依赖
- 体积 < 3KB（min+gzip）
- Node.js 环境安全（非浏览器环境不会崩溃）
- TypeScript 类型完整

## License

MIT
