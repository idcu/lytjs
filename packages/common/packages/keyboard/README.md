# @lytjs/common-keyboard

轻量级键盘快捷键工具，提供快捷键字符串解析、事件匹配与按键序列监听能力。

## 安装

```bash
pnpm add @lytjs/common-keyboard
```

## 使用

```typescript
import { matchShortcut, parseShortcut, createKeySequence } from '@lytjs/common-keyboard';

// 匹配单次快捷键
window.addEventListener('keydown', (e) => {
  if (matchShortcut(e, 'ctrl+s')) {
    e.preventDefault();
    save();
  }
});
```

## API

### `parseShortcut(shortcut: string): ParsedShortcut`

将快捷键字符串解析为结构化对象，支持 `ctrl`/`shift`/`alt`/`meta`（含 `control`、`cmd`、`command` 别名）修饰键与特殊键名。

```typescript
parseShortcut('shift+alt+t');
// { key: 'T', ctrl: false, shift: true, alt: true, meta: false }
```

### `matchShortcut(event: KeyboardEvent, shortcut: string): boolean`

判断一次键盘事件是否匹配指定快捷键字符串。

```typescript
matchShortcut(event, 'ctrl+s'); // 是否按下 Ctrl+S
```

### `createKeySequence(keys: string[]): (event: KeyboardEvent) => boolean`

创建按键**序列**匹配器，按顺序匹配多次按键（如先 Ctrl+K 再 S），任一环节失配则重置；完整匹配后返回 `true` 并自动重置。

```typescript
const isSaveSeq = createKeySequence(['ctrl+k', 's']);
window.addEventListener('keydown', (e) => {
  if (isSaveSeq(e)) {
    save();
  }
});
```

### 常量

| 常量            | 说明                                                                             |
| :-------------- | :------------------------------------------------------------------------------- |
| `MODIFIER_KEYS` | 修饰键名称集合（`ctrl`/`shift`/`alt`/`meta`）                                    |
| `SPECIAL_KEYS`  | 特殊键名到 `KeyboardEvent.key` 的映射（如 `enter`→`Enter`、`arrowup`→`ArrowUp`） |

## 相关包

- [`@lytjs/common`](../common/README.md) - 聚合包，统一导出所有 common 子包

## 许可证

[MIT](../../../../LICENSE)
