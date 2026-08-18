# @lytjs/html-renderer

SSR HTML 渲染器

## 目录

- [HTMLRenderer](#htmlrenderer)
- [RendererConfig](#rendererconfig)
- [RenderResult](#renderresult)

## HTMLRenderer

**Class**

### 成员

| 名称         | 类型 | 描述 | 可选 |
| ------------ | ---- | ---- | ---- |
| render       | -    |      | 否   |
| generateHead | -    |      | 否   |
| generateBody | -    |      | 否   |
| generateHTML | -    |      | 否   |

## RendererConfig

**Interface**

### 成员

| 名称      | 类型                     | 描述 | 可选 |
| --------- | ------------------------ | ---- | ---- |
| template  | `string`                 |      | 是   |
| head      | `Record<string, string>` |      | 是   |
| bodyAttrs | `Record<string, string>` |      | 是   |

## RenderResult

**Interface**

### 成员

| 名称 | 类型     | 描述 | 可选 |
| ---- | -------- | ---- | ---- |
| html | `string` |      | 否   |
| head | `string` |      | 否   |
| body | `string` |      | 否   |
