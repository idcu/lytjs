# @lytjs/compiler — 编译器 API

Lyt.js 模板编译器提供完整的模板编译流程：parse -> transform -> optimize -> generate。将模板字符串编译为渲染函数代码。纯原生零依赖实现。

## 安装与导入

```typescript
import {
  compile,
  parseHTML,
  transform,
  optimize,
  isStatic,
  generate,
  createPosition,
  createRootNode,
  createElementNode,
  createTextNode,
  createAttributeNode,
  createDirectiveNode,
  TransformContext,
} from '@lytjs/compiler'
```

---

## compile

完整编译流程。将模板字符串编译为渲染函数代码，经过四个阶段：parse -> transform -> optimize -> generate。

### 签名

```typescript
function compile(
  template: string,
  options?: CompileOptions
): CompileResult
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `template` | `string` | 模板字符串 |
| `options` | `CompileOptions` | 编译选项（可选） |

### CompileOptions

| 属性 | 类型 | 说明 |
|------|------|------|
| `transform` | `TransformOptions` | 转换选项 |
| `codegen` | `CodegenOptions` | 代码生成选项 |

### 返回值

`CompileResult`

| 属性 | 类型 | 说明 |
|------|------|------|
| `code` | `string` | 生成的渲染函数代码 |
| `ast` | `RootNode` | AST 根节点（用于调试和高级用法） |
| `hoistResult` | `HoistResult` | 静态优化结果 |
| `helpers` | `string[]` | 需要导入的辅助函数列表 |

### 示例

```typescript
const result = compile(`
  <div class="container">
    <h1 if="showTitle">{{ title }}</h1>
    <ul>
      <li each="item in items">{{ item.name }}</li>
    </ul>
    <input bind="inputValue" />
    <button @click="handleSubmit">Submit</button>
  </div>
`)

console.log(result.code)
// function render(_ctx) {
//   const { h, renderList } = Lyt;
//   return h('div', { 'class': 'container' }, [
//     (_ctx.showTitle ? h('h1', null, _ctx.title) : null),
//     h('ul', null, renderList(_ctx.items, (item) => h('li', null, _ctx.item.name))),
//     h('input', { model: { value: _ctx.inputValue, callback: $event => _ctx.inputValue = $event } }),
//     h('button', { 'onClick': _ctx.handleSubmit }, 'Submit')
//   ]);
// }
```

---

## parseHTML

将模板字符串解析为 AST（抽象语法树）。

### 签名

```typescript
function parseHTML(template: string): RootNode
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `template` | `string` | 模板字符串 |

### 返回值

`RootNode` — AST 根节点。

### 示例

```typescript
const ast = parseHTML('<div class="app"><span>{{ msg }}</span></div>')
```

---

## transform

对 AST 进行语义转换，处理指令、标记动态节点。

### 签名

```typescript
function transform(
  root: RootNode,
  options?: TransformOptions
): void
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `root` | `RootNode` | AST 根节点 |
| `options` | `TransformOptions` | 转换选项 |

### TransformOptions

转换阶段的配置选项，控制指令处理行为。

---

## optimize / isStatic

静态分析与优化。标记静态子树，收集可提升节点。

### 签名

```typescript
function optimize(root: RootNode): HoistResult
function isStatic(node: ASTNode): boolean
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `root` | `RootNode` | AST 根节点 |
| `node` | `ASTNode` | AST 节点 |

### 返回值

`optimize` 返回 `HoistResult`，包含可提升的静态节点信息。

---

## generate

将 AST 转换为渲染函数代码字符串。

### 签名

```typescript
function generate(
  root: RootNode,
  options?: CodegenOptions
): CodegenResult
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `root` | `RootNode` | AST 根节点 |
| `options` | `CodegenOptions` | 代码生成选项 |

### 返回值

`CodegenResult`

| 属性 | 类型 | 说明 |
|------|------|------|
| `code` | `string` | 生成的渲染函数代码字符串 |
| `helpers` | `string[]` | 需要导入的辅助函数列表 |

---

## AST 节点工厂函数

用于手动创建 AST 节点（高级用法）。

### 签名

```typescript
function createPosition(offset: number, line: number, column: number): Position
function createRootNode(children: ASTNode[], source?: string): RootNode
function createElementNode(
  tag: string,
  props: AttributeNode[],
  children: ASTNode[],
  loc?: Position
): ElementNode
function createTextNode(text: string, loc?: Position): TextNode
function createAttributeNode(
  name: string,
  value: string | null,
  loc?: Position
): AttributeNode
function createDirectiveNode(
  name: string,
  value: string,
  loc?: Position
): DirectiveNode
```

---

## TransformContext

转换上下文类，在 AST 转换过程中维护状态和提供辅助方法。

```typescript
class TransformContext {
  constructor(root: RootNode, options?: TransformOptions)
  // 内部方法用于节点转换和指令处理
}
```

---

## AST 类型

| 类型 | 说明 |
|------|------|
| `ASTNode` | AST 节点联合类型 |
| `BaseNode` | 所有节点的基类 |
| `RootNode` | 根节点 |
| `ElementNode` | 元素节点 |
| `TextNode` | 文本节点 |
| `AttributeNode` | 属性节点 |
| `DirectiveNode` | 指令节点 |
| `Position` | 源码位置信息 |

---

## 编译器指令

编译器内置以下指令处理器（在 transform 阶段自动处理）：

| 指令 | 说明 | 示例 |
|------|------|------|
| `if` | 条件渲染 | `if="show"` |
| `each` | 列表渲染 | `each="item in list"` |
| `bind` | 双向绑定 | `bind="value"` |
| `on` | 事件绑定 | `@click="handleClick"` |
| `ref` | 模板引用 | `ref="el"` |
| `slot` | 插槽 | `<template slot="header">` |
