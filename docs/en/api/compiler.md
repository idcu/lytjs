# Compiler API

The Lyt.js compiler provides a complete template compilation pipeline: parse -> transform -> optimize -> generate.

## compile()

Full compilation pipeline that compiles a template string into render function code.

```ts
function compile(template: string, options?: CompileOptions): CompileResult
```

| Parameter | Type | Description |
|-----------|------|-------------|
| template | `string` | Template string |
| options.transform | `TransformOptions` | Transform options |
| options.codegen | `CodegenOptions` | Code generation options |

**Returns:** `CompileResult`

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

// Runtime usage
const renderFn = new Function('h', '_ctx', 'return ' + result.code)
const vnode = renderFn(h, proxy)
```

---

## CompileResult

```ts
interface CompileResult {
  code: string                          // Generated render function code
  ast: RootNode                         // AST root node
  hoistResult: HoistResult              // Static optimization result
  helpers: string[]                     // List of helper functions to import
}
```

---

## parseHTML()

Parses a template string into an AST.

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

## AST Node Types

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

Performs semantic transformations on the AST.

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

Static analysis that marks static subtrees and collects hoistable nodes.

```ts
function optimize(root: RootNode): HoistResult
```

```ts
interface HoistResult {
  staticNodes: ASTNode[]     // Static node list
  hoisted: string[]           // Hoisted static content
}
```

### isStatic()

```ts
function isStatic(node: ASTNode): boolean
```

Checks if a node is a static node.

---

## generate()

Converts the AST into a render function code string.

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

## SFC Compilation API

### parseSFC()

Parses `.lyt` Single File Component content.

```ts
function parseSFC(source: string, filename?: string): SFCDescriptor
```

### compileSFC()

Compiles a `.lyt` Single File Component.

```ts
function compileSFC(source: string, filename?: string): SFCCompileResult
```

### scopeCSS()

Adds scope identifiers to CSS.

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

## AST Factory Functions

```ts
function createPosition(offset: number, line: number, column: number): Position
function createRootNode(children: ASTNode[]): RootNode
function createElementNode(tag: string, ...): ElementNode
function createTextNode(content: string, ...): TextNode
function createAttributeNode(name: string, value: string, ...): AttributeNode
function createDirectiveNode(name: string, ...): DirectiveNode
```
