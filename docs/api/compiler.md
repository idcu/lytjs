# @lytjs/compiler API 参考

`@lytjs/compiler` 是 LytJS 的模板编译器，负责将模板字符串解析为 AST、执行转换优化并生成渲染函数代码。支持 VNode 模式、Signal 模式和 SSR 模式三种代码生成策略。

---

## compile()

编译模板字符串，返回代码生成结果。这是编译器的核心入口函数，内部依次执行 parse -> transform -> generate 三个阶段。

### 签名

```ts
function compile(source: string, options?: CompilerOptions): CodegenResult
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `source` | `string` | 模板字符串 |
| `options` | `CompilerOptions` | 编译选项 |

### 返回值

```ts
interface CodegenResult {
  /** 生成的渲染函数代码 */
  code: string
  /** 前置代码（导入语句等） */
  preamble: string
  /** 编译后的 AST 根节点 */
  ast: RootNode
  /** Source map（RawSourceMap 格式） */
  map?: RawSourceMap
}
```

### 示例

```ts
import { compile } from '@lytjs/compiler'

// 默认 VNode 模式
const result = compile('<div class="container">{{ message }}</div>')
console.log(result.code)

// Signal 模式
const signalResult = compile('<div>{{ count }}</div>', {
  rendererMode: 'signal'
})

// SSR 模式
const ssrResult = compile('<div>{{ title }}</div>', {
  ssrMode: true
})
```

---

## parse()

将模板字符串解析为 AST（抽象语法树）。

### 签名

```ts
function parse(source: string, options?: ParserOptions): RootNode
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `source` | `string` | 模板字符串 |
| `options` | `ParserOptions` | 解析选项 |

### 返回值

返回 `RootNode`，即 AST 的根节点。

### 示例

```ts
import { parse } from '@lytjs/compiler'

const ast = parse('<div><span v-if="show">Hello</span></div>')
console.log(ast.children)
```

---

## transform()

对 AST 执行转换（指令转换、静态提升、Block 收集等）。

### 签名

```ts
function transform(root: RootNode, options: TransformOptions): void
```

---

## generate()

将转换后的 AST 生成为 VNode 模式的渲染函数代码。

### 签名

```ts
function generate(root: RootNode, options?: CodegenOptions): CodegenResult
```

---

## generateSignal()

将转换后的 AST 生成为 Signal 模式的渲染函数代码。

### 签名

```ts
function generateSignal(root: RootNode, options?: CodegenOptions): CodegenResult
```

---

## generateSSR()

将转换后的 AST 生成为 SSR 渲染函数代码。

### 签名

```ts
function generateSSR(root: RootNode, options?: CodegenOptions): CodegenResult
```

---

## optimize()

对 AST 执行优化（标记常量节点、静态提升等）。

### 签名

```ts
function optimize(root: RootNode, options: TransformOptions): void
```

---

## CompilerOptions

`CompilerOptions` 是编译器的完整配置接口，继承自 `ParserOptions`、`TransformOptions` 和 `CodegenOptions`。

```ts
interface CompilerOptions extends ParserOptions, TransformOptions, CodegenOptions {
  /** 空白处理策略：'condense'（压缩空白）或 'preserve'（保留空白） */
  whitespace?: 'condense' | 'preserve'

  /**
   * 渲染模式：
   * - 'vnode'：使用 VNode diff 算法（默认）
   * - 'signal'：使用 Signal + 直接 DOM 操作
   * - 'vapor'：'signal' 的别名
   */
  rendererMode?: 'vnode' | 'signal' | 'vapor'

  /**
   * SSR 编译模式：
   * 启用后跳过客户端专用指令（v-on, v-model, v-show），
   * 生成 renderToString 格式代码
   */
  ssrMode?: boolean
}
```

### ParserOptions

```ts
interface ParserOptions {
  /** 判断标签是否为自定义元素 */
  isCustomElement?: (tag: string) => boolean
  /** 判断标签是否为原生 HTML 标签 */
  isNativeTag?: (tag: string) => boolean
  /** 获取文本模式 */
  getTextMode?: (tag: string, ns: number) => TextModes
  /** 自定义 HTML 实体解码函数 */
  decodeEntities?: (text: string, strict: boolean) => string
  /** 解析错误回调 */
  onError?: (error: Error) => void
  /** 是否保留注释节点 */
  comments?: boolean
  /**
   * 是否启用裸指令名解析（"所见即所得"模式）。
   * 默认为 true。设为 false 时，所有裸指令名将被视为普通 HTML 属性。
   */
  bareDirectives?: boolean
}
```

### TransformOptions

```ts
interface TransformOptions {
  /** 自定义节点转换器 */
  nodeTransforms?: NodeTransform[]
  /** 自定义指令转换器 */
  directiveTransforms?: Record<string, DirectiveTransform>
  /** 判断是否为内置组件 */
  isBuiltInComponent?: (tag: string) => symbol | undefined
  /** 判断是否为自定义元素 */
  isCustomElement?: (tag: string) => boolean
  /** 表达式插件 */
  expressionPlugins?: string[]
  /** scoped ID */
  scopeId?: string | null
  /** 是否处理 slot */
  slotted?: boolean
  /** 是否为 SSR 模式 */
  ssr?: boolean
  /** 是否在 SSR 上下文中 */
  inSSR?: boolean
  /** SSR CSS 变量 */
  ssrCssVars?: string[]
  /** 绑定元数据 */
  bindingMetadata?: BindingMetadata
  /** 是否内联模式 */
  inline?: boolean
  /** 是否 TypeScript */
  isTS?: boolean
  /** 错误回调 */
  onError?: (error: Error) => void
  /** 警告回调 */
  onWarn?: (warning: string) => void
}
```

### CodegenOptions

```ts
interface CodegenOptions {
  /** 代码生成模式：'module'（ES Module）或 'function'（函数） */
  mode?: 'module' | 'function'
  /** 是否添加前缀标识符 */
  prefixIdentifiers?: boolean
  /** 是否生成 source map */
  sourceMap?: boolean
  /** 文件名（用于 source map） */
  filename?: string
  /** scoped ID */
  scopeId?: string | null
  /** 是否优化导入 */
  optimizeImports?: boolean
  /** 运行时全局变量名 */
  runtimeGlobalName?: string
  /** 运行时模块名 */
  runtimeModuleName?: string
  /** SSR 运行时模块名 */
  ssrRuntimeModuleName?: string
  /** 是否 SSR */
  ssr?: boolean
  /** 是否在 SSR 上下文中 */
  inSSR?: boolean
  /** 是否 TypeScript */
  isTS?: boolean
  /** 是否生成静态提升代码 */
  emitStatic?: boolean
}
```

---

## bareDirectives 选项说明

`bareDirectives` 控制编译器对"裸指令名"的处理方式。

- **`true`（默认）**：启用"所见即所得"模式。模板中直接使用 `v-if`、`v-for` 等指令名会被正确识别为指令。
- **`false`**：禁用裸指令名解析。所有 `v-` 前缀的名称将被视为普通 HTML 属性，不会触发指令转换。

```ts
// 默认行为（bareDirectives: true）
compile('<div v-if="show">Hello</div>')
// v-if 被正确解析为条件渲染指令

// 禁用裸指令（bareDirectives: false）
compile('<div v-if="show">Hello</div>', { bareDirectives: false })
// v-if 被视为普通属性
```

---

## rendererMode 选项说明

`rendererMode` 决定编译器生成哪种渲染模式的代码。

| 模式 | 说明 | 代码生成函数 |
|------|------|-------------|
| `'vnode'`（默认） | 生成 VNode 创建和 diff 代码 | `generate()` |
| `'signal'` | 生成 Signal + 直接 DOM 操作代码 | `generateSignal()` |
| `'vapor'` | `'signal'` 的别名 | `generateSignal()` |

```ts
// VNode 模式（默认）
compile('<div>{{ msg }}</div>')
// 生成: createVNode('div', null, msg)

// Signal 模式
compile('<div>{{ msg }}</div>', { rendererMode: 'signal' })
// 生成: setText(el, msg)
```

---

## SFC (单文件组件) API

### parseSFC()

解析单文件组件（.vue 文件）的内容。

```ts
function parseSFC(source: string, options?: SFCParseOptions): SFCDescriptor
```

### compileSFC()

编译单文件组件。

```ts
function compileSFC(source: string, options?: SFCCompileOptions): SFCCompileResult
```

### generateComponentTypes()

生成组件的类型声明。

```ts
function generateComponentTypes(descriptor: SFCDescriptor): ComponentTypeInfo
```

### 自定义 Block 处理

```ts
// 注册自定义 block 处理器
function registerCustomBlockProcessor(
  type: string,
  processor: CustomBlockProcessor
): void

// 获取已注册的处理器
function getCustomBlockProcessor(type: string): CustomBlockProcessor | undefined

// 注销处理器
function unregisterCustomBlockProcessor(type: string): void

// 获取所有已注册的处理器
function getRegisteredCustomBlockProcessors(): Map<string, CustomBlockProcessor>
```

---

## 内置 Transform 函数

以下转换函数可以直接在 `nodeTransforms` 或 `directiveTransforms` 中使用：

| 函数 | 类型 | 说明 |
|------|------|------|
| `transformElement` | NodeTransform | 元素节点转换 |
| `transformIf` | NodeTransform | v-if 指令转换 |
| `transformFor` | NodeTransform | v-for 指令转换 |
| `transformOnce` | NodeTransform | v-once 指令转换 |
| `transformSlot` | NodeTransform | 插槽转换 |
| `transformBind` | DirectiveTransform | v-bind 指令转换 |
| `transformOn` | DirectiveTransform | v-on 指令转换 |
| `transformModel` | DirectiveTransform | v-model 指令转换 |
| `transformShow` | DirectiveTransform | v-show 指令转换 |
| `transformVMemo` | DirectiveTransform | v-memo 指令转换 |

---

## WASM 编译器 API

`@lytjs/compiler` 还提供了基于 WASM 的编译接口：

| 函数 | 说明 |
|------|------|
| `wasmCompile(options)` | WASM 编译入口 |
| `serializeAST(ast)` | 序列化 AST |
| `tokenize(source)` | 词法分析 |
| `buildAST(tokens)` | 构建 AST |
| `parseInterpolation(source)` | 解析插值表达式 |
| `generateRenderCode(ast)` | 生成渲染代码 |
| `generateHoistedCode(ast)` | 生成静态提升代码 |
| `generatePatchFlags(ast)` | 生成 patch flags |

---

## 常量

| 常量 | 说明 |
|------|------|
| `NodeTypes` | AST 节点类型枚举 |
| `ElementTypes` | 元素类型枚举（Element/Component/Slot/Template） |
| `ConstantTypes` | 常量类型枚举 |
| `TagType` | 标签类型 |
| `TextModes` | 文本模式枚举 |
| `BindingTypes` | 绑定类型枚举（data/props/setup/const） |
| `PatchFlags` | VNode patch flags |
| `helperNameMap` | 辅助函数名称映射 |
