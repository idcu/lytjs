/**
 * Lyt.js SFC 单文件组件 — 单元测试
 *
 * 使用 @lytjs/test-utils 统一测试框架。
 *
 * 测试覆盖：
 *   - 基本 SFC 解析（template + script + style）
 *   - 只有 template 的 SFC
 *   - 只有 script 的 SFC
 *   - 多个 style 块
 *   - scoped style 属性识别
 *   - style 选择器改写（.class → .class[data-v-xxx]）
 *   - 嵌套选择器改写（.parent .child → .parent .child[data-v-xxx]）
 *   - 媒体查询中的选择器改写
 *   - 空 SFC 文件处理
 *   - 注释忽略
 *   - script 中 export default 提取
 *   - compileSFC 输出格式验证
 *   - scopedId 唯一性
 *   - 特殊字符转义
 *   - 伪元素和伪类选择器改写
 *   - 多选择器逗号分隔改写
 */

import { describe, it, expect } from '../../test-utils/src/index'

import {
  parseSFC,
  compileSFC,
  scopeCSS,
} from '../src/index'
import type { SFCDescriptor, SFCCompileResult } from '../src/index'
import { extractExportDefault } from '../src/sfc/parse-sfc'

// ================================================================
//  parseSFC 测试
// ================================================================

describe('parseSFC', () => {
  it('基本 SFC 解析（template + script + style）', () => {
    const source = `
<template>
  <div class="app">{{ message }}</div>
</template>

<script>
export default {
  data() { return { message: 'hello' } }
}
</script>

<style scoped>
.app { color: red; }
</style>
`
    const descriptor = parseSFC(source, 'App.lyt')

    expect(descriptor.filename).toBe('App.lyt')
    expect(descriptor.template).not.toBe(null)
    expect(descriptor.template!.type).toBe('template')
    expect(descriptor.template!.content).toContain('{{ message }}')
    expect(descriptor.script).not.toBe(null)
    expect(descriptor.script!.type).toBe('script')
    expect(descriptor.script!.content).toContain('export default')
    expect(descriptor.styles.length).toBe(1)
    expect(descriptor.styles[0].type).toBe('style')
    expect(descriptor.styles[0].scoped).toBe(true)
    expect(descriptor.styles[0].content).toContain('.app')
  })

  it('只有 template 的 SFC', () => {
    const source = `
<template>
  <span>only template</span>
</template>
`
    const descriptor = parseSFC(source, 'OnlyTemplate.lyt')

    expect(descriptor.template).not.toBe(null)
    expect(descriptor.template!.content).toContain('only template')
    expect(descriptor.script).toBe(null)
    expect(descriptor.styles.length).toBe(0)
  })

  it('只有 script 的 SFC', () => {
    const source = `
<script>
export default {
  name: 'OnlyScript'
}
</script>
`
    const descriptor = parseSFC(source, 'OnlyScript.lyt')

    expect(descriptor.template).toBe(null)
    expect(descriptor.script).not.toBe(null)
    expect(descriptor.script!.content).toContain('OnlyScript')
    expect(descriptor.styles.length).toBe(0)
  })

  it('多个 style 块', () => {
    const source = `
<template>
  <div>multi styles</div>
</template>

<style>
.base { margin: 0; }
</style>

<style scoped>
.specific { padding: 10px; }
</style>

<style scoped>
.extra { border: 1px solid; }
</style>
`
    const descriptor = parseSFC(source, 'MultiStyle.lyt')

    expect(descriptor.styles.length).toBe(3)
    expect(descriptor.styles[0].scoped).toBe(false)
    expect(descriptor.styles[0].content).toContain('.base')
    expect(descriptor.styles[1].scoped).toBe(true)
    expect(descriptor.styles[1].content).toContain('.specific')
    expect(descriptor.styles[2].scoped).toBe(true)
    expect(descriptor.styles[2].content).toContain('.extra')
  })

  it('scoped style 属性识别', () => {
    const source = `
<template><div></div></template>
<style scoped>
.scoped-style { color: blue; }
</style>
<style>
.global-style { color: black; }
</style>
`
    const descriptor = parseSFC(source, 'ScopedTest.lyt')

    expect(descriptor.styles.length).toBe(2)
    expect(descriptor.styles[0].scoped).toBe(true)
    expect(descriptor.styles[1].scoped).toBe(false)
  })

  it('空 SFC 文件处理', () => {
    const descriptor = parseSFC('', 'Empty.lyt')

    expect(descriptor.filename).toBe('Empty.lyt')
    expect(descriptor.template).toBe(null)
    expect(descriptor.script).toBe(null)
    expect(descriptor.styles.length).toBe(0)
  })

  it('注释忽略', () => {
    const source = `
<!-- 这是一个注释，应该被忽略 -->
<template>
  <div>content</div>
</template>
<!-- 另一个注释 -->
<script>
// JS 注释
export default { name: 'test' }
</script>
<!-- style 注释 -->
<style>
.foo { color: red; }
</style>
`
    const descriptor = parseSFC(source, 'CommentTest.lyt')

    expect(descriptor.template).not.toBe(null)
    expect(descriptor.template!.content).toContain('content')
    expect(descriptor.script).not.toBe(null)
    expect(descriptor.script!.content).toContain('name')
    expect(descriptor.styles.length).toBe(1)
  })

  it('script 中 export default 提取', () => {
    const scriptContent = `
export default {
  name: 'MyComponent',
  data() {
    return { count: 0 }
  },
  methods: {
    increment() { this.count++ }
  }
}
`
    const result = extractExportDefault(scriptContent)

    expect(result).not.toBe(null)
    expect(result).toContain("name: 'MyComponent'")
    expect(result).toContain('data()')
    expect(result).toContain('increment()')
  })

  it('没有 export default 时返回 null', () => {
    const scriptContent = `
const x = 1
function foo() { return x }
`
    const result = extractExportDefault(scriptContent)

    expect(result).toBe(null)
  })

  it('块的 start 和 end 位置正确', () => {
    const source = `<template><div>hi</div></template>`
    const descriptor = parseSFC(source, 'PositionTest.lyt')

    expect(descriptor.template).not.toBe(null)
    expect(descriptor.template!.start).toBe(0)
    expect(descriptor.template!.end).toBe(source.length)
  })
})

// ================================================================
//  scopeCSS 测试
// ================================================================

describe('scopeCSS', () => {
  it('style 选择器改写（.class → .class[data-v-xxx]）', () => {
    const css = `.counter { color: red; }`
    const result = scopeCSS(css, 'data-v-abc123')

    expect(result).toContain('.counter[data-v-abc123]')
    expect(result).toContain('color: red')
  })

  it('嵌套选择器改写（.parent .child → .parent .child[data-v-xxx]）', () => {
    const css = `.parent .child { font-size: 14px; }`
    const result = scopeCSS(css, 'data-v-abc123')

    expect(result).toContain('.parent .child[data-v-abc123]')
  })

  it('媒体查询中的选择器改写', () => {
    const css = `@media (max-width: 768px) { .container { width: 100%; } }`
    const result = scopeCSS(css, 'data-v-abc123')

    expect(result).toContain('.container[data-v-abc123]')
    expect(result).toContain('@media')
  })

  it('多选择器逗号分隔改写', () => {
    const css = `.a, .b, .c { margin: 0; }`
    const result = scopeCSS(css, 'data-v-abc123')

    expect(result).toContain('.a[data-v-abc123]')
    expect(result).toContain('.b[data-v-abc123]')
    expect(result).toContain('.c[data-v-abc123]')
  })

  it('伪元素选择器改写（::before）', () => {
    const css = `.icon::before { content: '*'; }`
    const result = scopeCSS(css, 'data-v-abc123')

    expect(result).toContain('.icon[data-v-abc123]::before')
  })

  it('伪类选择器改写（:hover）', () => {
    const css = `.button:hover { background: blue; }`
    const result = scopeCSS(css, 'data-v-abc123')

    expect(result).toContain('.button[data-v-abc123]:hover')
  })

  it('特殊字符转义', () => {
    const css = `.btn[data-type="primary"] { color: red; }`
    const result = scopeCSS(css, 'data-v-abc123')

    // 选择器应被改写，属性选择器保留
    expect(result).toContain('[data-v-abc123]')
    expect(result).toContain('color: red')
  })

  it('@keyframes 不被改写', () => {
    const css = `@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`
    const result = scopeCSS(css, 'data-v-abc123')

    expect(result).toContain('@keyframes fadeIn')
    // 不应包含 scopedId
    expect(result).not.toContain('[data-v-abc123]')
  })
})

// ================================================================
//  compileSFC 测试
// ================================================================

describe('compileSFC', () => {
  it('compileSFC 输出格式验证', () => {
    const source = `
<template>
  <div class="app">hello</div>
</template>

<script>
export default {
  name: 'TestApp'
}
</script>

<style scoped>
.app { color: red; }
</style>
`
    const descriptor = parseSFC(source, 'TestApp.lyt')
    const result = compileSFC(descriptor)

    // 验证返回结构
    expect(result.code).toBeDefined()
    expect(typeof result.code).toBe('string')
    expect(Array.isArray(result.styles)).toBe(true)
    expect(typeof result.scopedId).toBe('string')

    // 验证 code 包含关键内容
    expect(result.code).toContain('export default')
    expect(result.code).toContain('render:')
    expect(result.code).toContain("name: 'TestApp'")
    expect(result.code).toContain('__sfcId')

    // 验证 scopedId 格式
    expect(result.scopedId.startsWith('data-v-')).toBe(true)

    // 验证样式
    expect(result.styles.length).toBe(1)
    expect(result.styles[0]).toContain('[data-v-')
  })

  it('scopedId 唯一性', () => {
    const sourceA = `
<template><div>A</div></template>
<script>export default { name: 'A' }</script>
<style scoped>.a { color: red; }</style>
`
    const sourceB = `
<template><div>B</div></template>
<script>export default { name: 'B' }</script>
<style scoped>.b { color: blue; }</style>
`
    const descriptorA = parseSFC(sourceA, 'ComponentA.lyt')
    const descriptorB = parseSFC(sourceB, 'ComponentB.lyt')

    const resultA = compileSFC(descriptorA)
    const resultB = compileSFC(descriptorB)

    expect(resultA.scopedId).not.toBe(resultB.scopedId)
  })

  it('没有 template 时 render 为 null', () => {
    const source = `
<script>
export default { name: 'NoTemplate' }
</script>
`
    const descriptor = parseSFC(source, 'NoTemplate.lyt')
    const result = compileSFC(descriptor)

    expect(result.code).toContain('render: null')
  })

  it('没有 style 时不生成样式注入代码', () => {
    const source = `
<template><div>no style</div></template>
<script>export default { name: 'NoStyle' }</script>
`
    const descriptor = parseSFC(source, 'NoStyle.lyt')
    const result = compileSFC(descriptor)

    expect(result.code).not.toContain('_injectStyles')
    expect(result.styles.length).toBe(0)
  })

  it('非 scoped 样式不被改写', () => {
    const source = `
<template><div>test</div></template>
<style>
.global { color: black; }
</style>
`
    const descriptor = parseSFC(source, 'NonScoped.lyt')
    const result = compileSFC(descriptor)

    expect(result.styles.length).toBe(1)
    expect(result.styles[0]).toContain('.global { color: black; }')
    expect(result.styles[0]).not.toContain('[data-v-')
  })

  it('完整 SFC 编译输出包含样式注入', () => {
    const source = `
<template>
  <div class="counter">{{ count }}</div>
</template>

<script>
export default {
  data() { return { count: 0 } }
}
</script>

<style scoped>
.counter { font-size: 24px; color: green; }
</style>
`
    const descriptor = parseSFC(source, 'Counter.lyt')
    const result = compileSFC(descriptor)

    // 验证样式注入代码
    expect(result.code).toContain('_injectStyles')
    expect(result.code).toContain('document.createElement')
    expect(result.code).toContain('document.head.appendChild')

    // 验证 scopedId 被使用
    expect(result.code).toContain(`const _sfcId = '${result.scopedId}'`)

    // 验证样式被 scoped 改写
    expect(result.styles[0]).toContain(`[data-v-`)
    expect(result.styles[0]).toContain('font-size: 24px')
  })
})
