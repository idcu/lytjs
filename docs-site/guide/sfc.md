# 单文件组件 (SFC)

Lyt.js 支持 `.lyt` 单文件组件格式，将模板、脚本和样式封装在一个文件中。

## 文件格式

一个 `.lyt` 文件由三个块组成：

```html
<template>
  <div class="counter">
    <h2>{{ title }}</h2>
    <p>计数: {{ count }}</p>
    <button @click="increment">+1</button>
  </div>
</template>

<script>
export default {
  name: 'MyCounter',
  props: {
    title: { type: String, default: '计数器' }
  },
  state() {
    return {
      count: 0
    }
  },
  methods: {
    increment() {
      this.count++
    }
  }
}
</script>

<style scoped>
.counter {
  padding: 16px;
  border: 1px solid #eee;
  border-radius: 8px;
}
</style>
```

## 解析 SFC

使用 `parseSFC` 解析 `.lyt` 文件内容：

```ts
import { parseSFC } from 'lyt/compiler'

const descriptor = parseSFC(sourceCode, 'Counter.lyt')

console.log(descriptor.filename)     // 'Counter.lyt'
console.log(descriptor.template)     // { type: 'template', content: '...', start: 0, end: 100 }
console.log(descriptor.script)       // { type: 'script', content: '...', start: 100, end: 200 }
console.log(descriptor.styles)       // [{ type: 'style', content: '...', scoped: true }]
```

### SFCDescriptor 类型

```ts
interface SFCDescriptor {
  filename: string
  template: SFCBlock | null
  script: SFCBlock | null
  styles: SFCStyleBlock[]
}

interface SFCBlock {
  type: 'template' | 'script'
  content: string
  start: number
  end: number
  attrs: Record<string, string>
}

interface SFCStyleBlock extends SFCBlock {
  type: 'style'
  scoped: boolean
}
```

## 编译 SFC

使用 `compileSFC` 将 `.lyt` 文件编译为可执行的组件：

```ts
import { compileSFC } from 'lyt/compiler'

const result = compileSFC(sourceCode, 'Counter.lyt')

console.log(result.renderCode)   // 渲染函数代码
console.log(result.scriptCode)   // 脚本代码
console.log(result.styles)       // 样式列表
console.log(result.descriptor)   // SFC 描述符
```

### SFCCompileResult 类型

```ts
interface SFCCompileResult {
  renderCode: string       // 编译后的渲染函数代码
  scriptCode: string       // 处理后的脚本代码
  styles: SFCStyleBlock[]  // 样式块列表
  descriptor: SFCDescriptor // SFC 描述符
}
```

## Scoped CSS

使用 `scoped` 属性实现样式隔离：

```html
<style scoped>
.button {
  background: #4f46e5;
  color: white;
  padding: 8px 16px;
}
</style>
```

### scopeCSS()

手动为 CSS 添加作用域：

```ts
import { scopeCSS } from 'lyt/compiler'

const scopedCSS = scopeCSS(`
  .button { color: red; }
  .text { font-size: 14px; }
`, 'data-v-abc123')

// 输出:
// .button[data-v-abc123] { color: red; }
// .text[data-v-abc123] { font-size: 14px; }
```

## 完整编译流程

`.lyt` 文件的编译流程：

1. **解析** — `parseSFC` 将文件内容拆分为 template、script、style 块
2. **编译模板** — `compile` 将 template 编译为渲染函数代码
3. **作用域样式** — `scopeCSS` 为 scoped 样式添加作用域标识
4. **输出** — 生成完整的组件定义

```ts
import { parseSFC, compile, scopeCSS } from 'lyt/compiler'

function compileLyFile(source: string, filename: string) {
  // 1. 解析 SFC
  const descriptor = parseSFC(source, filename)

  // 2. 编译模板
  let renderCode = ''
  if (descriptor.template) {
    const { code } = compile(descriptor.template.content)
    renderCode = code
  }

  // 3. 处理样式
  const styles = descriptor.styles.map(style => ({
    ...style,
    content: style.scoped ? scopeCSS(style.content, `data-v-${hash}`) : style.content
  }))

  return { renderCode, styles, descriptor }
}
```

::: tip 提示
在实际项目中，建议使用 Lyt.js 官方提供的构建工具插件（如 Vite 插件）来自动处理 `.lyt` 文件。
:::
