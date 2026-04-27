# 编译器 API

Lyt.js 编译器提供完整的模板编译流程：parse → transform → optimize → generate。

## compile()

完整编译流程，将模板字符串编译为渲染函数代码。

```ts
function compile(template: string, options?: CompileOptions): CompileResult
```

| 参数 | 类型 | 说明 |
|------|------|------|
| template | `string` | 模板字符串 |
| options.transform | `TransformOptions` | 转换选项 |
| options.codegen | `CodegenOptions` | 代码生成选项 |

**返回值：** `CompileResult`

```ts
import { compile } from 'lyt/compiler'

const result = compile(`
  <div class="container">
    <h1 v-if="showTitle">{{ title }}</h1>
    <ul>
      <li v-each="item in items">{{ item.name }}</li>
    </ul>
    <input v-bind:model="inputValue" />
    <button @click="handleSubmit">Submit</button>
  </div>
`)

console.log(result.code)
// h('div', { 'class': 'container' }, [
//   (_ctx.showTitle ? h('h1', null, _ctx.title) : null),
//   h('ul', null, renderList(_ctx.items, (item) => h('li', null, item.name))),
//   h('input', { model: { value: _ctx.inputValue, callback: $event => _ctx.inputValue = $event } }),
//   h('button', { 'onClick': _ctx.handleSubmit }, 'Submit')
// ])

// 运行时使用
const renderFn = new Function('h', '_ctx', 'return ' + result.code)
const vnode = renderFn(h, proxy)
```

---

## CompileResult

```ts
interface CompileResult {
  code: string                          // 生成的渲染函数代码
  ast: RootNode                         // AST 根节点
  hoistResult: HoistResult              // 静态优化结果
  helpers: string[]                     // 需要导入的辅助函数列表
}
```

---

## parseHTML()

将模板字符串解析为 AST。

```ts
function parseHTML(template: string): RootNode
```

```ts
import { parseHTML } from 'lyt/compiler'

const ast = parseHTML('<div class="app"><span>{{ msg }}</span></div>')
console.log(ast.type)       // 'root'
console.log(ast.children)   // [ElementNode, ...]
```

---

## AST 节点类型

### RootNode

```ts
interface RootNode extends BaseNode {
  type: 'root'
  children: (ElementNode | TextNode)[]
}
```

### ElementNode

```ts
interface ElementNode extends BaseNode {
  type: 'element'
  tag: string
  attributes: AttributeNode[]
  directives: DirectiveNode[]
  children: (ElementNode | TextNode)[]
}
```

### TextNode

```ts
interface TextNode extends BaseNode {
  type: 'text'
  content: string
  isInterpolation: boolean
}
```

### AttributeNode

```ts
interface AttributeNode extends BaseNode {
  type: 'attribute'
  name: string
  value: string
}
```

### DirectiveNode

```ts
interface DirectiveNode extends BaseNode {
  type: 'directive'
  name: string
  arg: string
  modifiers: string[]
  expression: string
}
```

---

## transform()

对 AST 进行语义转换。

```ts
function transform(root: RootNode, options?: TransformOptions): void
```

```ts
interface TransformOptions {
  nodeTransforms?: NodeTransform[]
}

type NodeTransform = (node: ASTNode, context: TransformContext) => void | (() => void)
```

---

## optimize()

静态分析，标记静态子树，收集可提升节点。

```ts
function optimize(root: RootNode): HoistResult
```

```ts
interface HoistResult {
  staticNodes: ASTNode[]     // 静态节点列表
  hoisted: string[]           // 提升的静态内容
}
```

### isStatic()

```ts
function isStatic(node: ASTNode): boolean
```

判断节点是否为静态节点。

---

## generate()

将 AST 转换为渲染函数代码字符串。

```ts
function generate(root: RootNode, options?: CodegenOptions): CodegenResult
```

```ts
interface CodegenOptions {
  mode?: 'module' | 'function'
  filename?: string
}

interface CodegenResult {
  code: string
  helpers: string[]
}
```

---

## SFC 编译 API

### parseSFC()

解析 `.lyt` 单文件组件内容。

```ts
function parseSFC(source: string, filename?: string): SFCDescriptor
```

### compileSFC()

编译 `.lyt` 单文件组件。

```ts
function compileSFC(source: string, filename?: string): SFCCompileResult
```

### scopeCSS()

为 CSS 添加作用域标识。

```ts
function scopeCSS(css: string, scopeId: string): string
```

### SFCDescriptor

```ts
interface SFCDescriptor {
  filename: string
  template: SFCBlock | null
  script: SFCBlock | null
  styles: SFCStyleBlock[]
}
```

### SFCCompileResult

```ts
interface SFCCompileResult {
  renderCode: string
  scriptCode: string
  styles: SFCStyleBlock[]
  descriptor: SFCDescriptor
}
```

---

## AST 工厂函数

```ts
function createPosition(offset: number, line: number, column: number): Position
function createRootNode(children: ASTNode[]): RootNode
function createElementNode(tag: string, ...): ElementNode
function createTextNode(content: string, ...): TextNode
function createAttributeNode(name: string, value: string, ...): AttributeNode
function createDirectiveNode(name: string, ...): DirectiveNode
```
