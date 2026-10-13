# @lytjs/html-renderer

SSR HTML 渲染器

## 目录

- [escapeHtml](#escapehtml)
- [escapeAttr](#escapeattr)
- [HTMLRenderer](#htmlrenderer)
- [RendererConfig](#rendererconfig)
- [RenderResult](#renderresult)

## escapeHtml

**Function**

HTML 文本节点转义

### 签名

```typescript
escapeHtml: string;
```

### 参数

| 参数  | 类型     | 描述 | 可选 | 默认值 |
| ----- | -------- | ---- | ---- | ------ |
| value | `string` |      | 否   | -      |

### 返回值

**类型:** `string`

## escapeAttr

**Function**

HTML 属性值转义

### 签名

```typescript
escapeAttr: string;
```

### 参数

| 参数  | 类型     | 描述 | 可选 | 默认值 |
| ----- | -------- | ---- | ---- | ------ |
| value | `string` |      | 否   | -      |

### 返回值

**类型:** `string`

## HTMLRenderer

**Class**

### 成员

| 名称         | 类型             | 描述                                           | 可选 |
| ------------ | ---------------- | ---------------------------------------------- | ---- |
| config       | `RendererConfig` |                                                | 否   |
| render       | -                |                                                | 否   |
| generateHead | -                | 由 `config.head` 生成 head 片段。键的语义见 。 | 否   |
| generateBody | -                |                                                | 否   |
| generateHTML | -                |                                                | 否   |

## RendererConfig

**Interface**

### 成员

| 名称      | 类型                     | 描述                                                                                                                                                                                                                                                                                                                                                                                                                         | 可选 |
| --------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| template  | `string`                 | 整页 HTML 模板；用 `{{appHtml}}`（或 `<!--app-html-->`）占位应用 HTML， `{{head}}` 占位 head 片段。 缺省时使用内置骨架 `<!DOCTYPE html><html><head>…</head><body>…</body></html>`。                                                                                                                                                                                                                                          | 是   |
| head      | `Record<string, string>` | head 内容。键的语义： &#124; 键 &#124; 产出 &#124; &#124;---&#124;---&#124; &#124; `title` &#124; `<title>值</title>` &#124; &#124; `charset` &#124; `<meta charset="值">` &#124; &#124; `meta:<name>` &#124; `<meta name="<name>" content="值">` &#124; &#124; `link:<rel>` &#124; `<link rel="<rel>" href="值">` &#124; &#124; 其它键 `k` &#124; `<meta name="k" content="值">` &#124; 值会被 HTML 转义（防止 SSR 注入）。 | 是   |
| bodyAttrs | `Record<string, string>` | `body` 标签上的属性，如 `{ class: 'app', 'data-theme': 'dark' }`                                                                                                                                                                                                                                                                                                                                                             | 是   |

## RenderResult

**Interface**

### 成员

| 名称 | 类型     | 描述              | 可选 |
| ---- | -------- | ----------------- | ---- |
| html | `string` | 完整 HTML 文档    | 否   |
| head | `string` | 生成的 head 片段  | 否   |
| body | `string` | body 内的应用内容 | 否   |
