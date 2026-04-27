# Single File Components (SFC)

Lyt.js supports the `.lyt` Single File Component format, which encapsulates template, script, and styles in a single file.

## File Format

A `.lyt` file consists of three blocks:

```html
<template>
  <div class="counter">
    <h2>{{ title }}</h2>
    <p>Count: {{ count }}</p>
    <button @click="increment">+1</button>
  </div>
</template>

<script>
export default {
  name: 'MyCounter',
  props: {
    title: { type: String, default: 'Counter' }
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

## Parsing SFC

Use `parseSFC` to parse `.lyt` file content:

```ts
import { parseSFC } from 'lyt/compiler'

const descriptor = parseSFC(sourceCode, 'Counter.lyt')

console.log(descriptor.filename)     // 'Counter.lyt'
console.log(descriptor.template)     // { type: 'template', content: '...', start: 0, end: 100 }
console.log(descriptor.script)       // { type: 'script', content: '...', start: 100, end: 200 }
console.log(descriptor.styles)       // [{ type: 'style', content: '...', scoped: true }]
```

### SFCDescriptor Type

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

## Compiling SFC

Use `compileSFC` to compile a `.lyt` file into an executable component:

```ts
import { compileSFC } from 'lyt/compiler'

const result = compileSFC(sourceCode, 'Counter.lyt')

console.log(result.renderCode)   // Render function code
console.log(result.scriptCode)   // Script code
console.log(result.styles)       // Style list
console.log(result.descriptor)   // SFC descriptor
```

### SFCCompileResult Type

```ts
interface SFCCompileResult {
  renderCode: string       // Compiled render function code
  scriptCode: string       // Processed script code
  styles: SFCStyleBlock[]  // Style block list
  descriptor: SFCDescriptor // SFC descriptor
}
```

## Scoped CSS

Use the `scoped` attribute for style isolation:

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

Manually add scope identifiers to CSS:

```ts
import { scopeCSS } from 'lyt/compiler'

const scopedCSS = scopeCSS(`
  .button { color: red; }
  .text { font-size: 14px; }
`, 'data-v-abc123')

// Output:
// .button[data-v-abc123] { color: red; }
// .text[data-v-abc123] { font-size: 14px; }
```

## Complete Compilation Pipeline

The compilation pipeline for `.lyt` files:

1. **Parse** -- `parseSFC` splits the file content into template, script, and style blocks
2. **Compile template** -- `compile` compiles the template into render function code
3. **Scope styles** -- `scopeCSS` adds scope identifiers to scoped styles
4. **Output** -- Generates the complete component definition

```ts
import { parseSFC, compile, scopeCSS } from 'lyt/compiler'

function compileLyFile(source: string, filename: string) {
  // 1. Parse SFC
  const descriptor = parseSFC(source, filename)

  // 2. Compile template
  let renderCode = ''
  if (descriptor.template) {
    const { code } = compile(descriptor.template.content)
    renderCode = code
  }

  // 3. Process styles
  const styles = descriptor.styles.map(style => ({
    ...style,
    content: style.scoped ? scopeCSS(style.content, `data-v-${hash}`) : style.content
  }))

  return { renderCode, styles, descriptor }
}
```

::: tip
In real projects, it is recommended to use the official Lyt.js build tool plugins (such as the Vite plugin) to automatically process `.lyt` files.
:::
