# @lytjs/plugin-highlight

Lyt.js 代码高亮插件 - 支持 JavaScript/TypeScript/HTML/CSS/JSON 语法高亮，使用正则表达式实现，零运行时依赖。

## 特性

- 支持 5 种语言：JavaScript、TypeScript、HTML、CSS、JSON
- 基于正则表达式的词法分析，零运行时依赖
- 内置 Light / Dark 双主题
- 可选行号显示
- 自定义 CSS 类名前缀
- HTML 注入样式 API
- XSS 安全（自动 HTML 转义）

## 安装

```bash
npm install @lytjs/plugin-highlight
```

## 使用

### 基础高亮

```js
import { highlight, highlightBlock, injectStyles } from '@lytjs/plugin-highlight'

// 注入样式（只需调用一次）
injectStyles('light')

// 高亮代码字符串
const html = highlight('const x = 42;', 'javascript')
document.getElementById('code').innerHTML = html
```

### 带行号的代码块

```js
const result = highlightBlock(
  `function add(a: number, b: number): number {
  return a + b;
}`,
  'typescript',
  { lineNumbers: true, theme: 'dark' }
)

document.getElementById('code-block').innerHTML = result.html
// result.html, result.language, result.lines
```

### 暗色主题

```js
injectStyles('dark')

const html = highlight('body { color: #fff; }', 'css')
```

## API

### `highlight(code, language, options?): string`

| 参数 | 类型 | 说明 |
|------|------|------|
| `code` | `string` | 源代码字符串 |
| `language` | `'javascript' \| 'typescript' \| 'html' \| 'css' \| 'json'` | 编程语言 |
| `options.classPrefix` | `string` | CSS 类名前缀，默认 `'lyt-hl'` |

返回高亮后的 HTML 字符串。

### `highlightBlock(code, language, options?): HighlightResult`

| 参数 | 类型 | 说明 |
|------|------|------|
| `code` | `string` | 源代码字符串 |
| `language` | `HighlightLanguage` | 编程语言 |
| `options.lineNumbers` | `boolean` | 是否显示行号，默认 `false` |
| `options.startLine` | `number` | 起始行号，默认 `1` |
| `options.theme` | `'light' \| 'dark'` | 主题，默认 `'light'` |

返回 `{ html, language, lines }` 对象。

### `injectStyles(theme?): void`

将高亮 CSS 样式注入到文档 `<head>` 中。

## License

MIT
