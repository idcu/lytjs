/**
 * E2E 测试: @lytjs/compiler 编译器测试
 *
 * 测试核心功能:
 * - compile() 基础模板编译
 * - v-if 条件渲染
 * - v-for 列表渲染
 * - v-bind 属性绑定
 * - v-on 事件绑定
 */

import { test, expect } from '@playwright/test'

// 从 dist 目录动态导入 compiler 模块
const compilerPath = new URL('../packages/compiler/dist/index.mjs', import.meta.url).href

let compiler: any

test.beforeAll(async () => {
  compiler = await import(compilerPath)
})

// ======================== compile 基础测试 ========================

test('compile - 基础模板编译返回 code 和 ast', () => {
  const result = compiler.compile('<div>Hello</div>')
  expect(result).toHaveProperty('code')
  expect(result).toHaveProperty('ast')
  expect(result).toHaveProperty('hoistResult')
  expect(result).toHaveProperty('helpers')
  expect(typeof result.code).toBe('string')
  expect(result.code.length).toBeGreaterThan(0)
})

test('compile - 简单文本节点', () => {
  const result = compiler.compile('Hello World')
  expect(result.code).toBeTruthy()
  expect(result.code.length).toBeGreaterThan(0)
})

test('compile - 带属性的元素', () => {
  const result = compiler.compile('<div class="container" id="app">content</div>')
  expect(result.code).toBeTruthy()
  // 编译结果应包含 class 和 id 相关信息
  expect(result.code).toContain('container')
  expect(result.code).toContain('app')
})

test('compile - 嵌套元素', () => {
  const result = compiler.compile('<div><span>inner</span></div>')
  expect(result.code).toBeTruthy()
  expect(result.code).toContain('span')
})

test('compile - 多子节点', () => {
  const result = compiler.compile('<ul><li>1</li><li>2</li><li>3</li></ul>')
  expect(result.code).toBeTruthy()
})

// ======================== v-if 条件渲染 ========================

test('compile - v-if 指令', () => {
  const result = compiler.compile('<div v-if="show">visible</div>')
  expect(result.code).toBeTruthy()
  // 编译结果应包含条件判断
  expect(result.code).toContain('show')
})

test('compile - v-if / v-else', () => {
  const result = compiler.compile(
    '<div v-if="show">A</div><div v-else>B</div>'
  )
  expect(result.code).toBeTruthy()
  expect(result.code).toContain('show')
})

test('compile - v-if / v-else-if / v-else', () => {
  const result = compiler.compile(
    '<div v-if="type === 1">A</div><div v-else-if="type === 2">B</div><div v-else>C</div>'
  )
  expect(result.code).toBeTruthy()
  expect(result.code).toContain('type')
})

// ======================== v-for 列表渲染 ========================

test('compile - v-for 基本列表', () => {
  const result = compiler.compile('<li v-each="item in items">{{ item }}</li>')
  expect(result.code).toBeTruthy()
  // 编译结果应包含 items 和 item
  expect(result.code).toContain('items')
  expect(result.code).toContain('item')
})

test('compile - v-for 带索引', () => {
  const result = compiler.compile(
    '<li v-each="(item, index) in list">{{ index }}: {{ item }}</li>'
  )
  expect(result.code).toBeTruthy()
  expect(result.code).toContain('list')
  expect(result.code).toContain('index')
})

// ======================== v-bind 属性绑定 ========================

test('compile - v-bind 基本绑定', () => {
  const result = compiler.compile('<div v-bind:class="className">text</div>')
  expect(result.code).toBeTruthy()
  expect(result.code).toContain('className')
})

test('compile - v-bind 缩写 :attr', () => {
  const result = compiler.compile('<div :id="dynamicId">text</div>')
  expect(result.code).toBeTruthy()
  expect(result.code).toContain('dynamicId')
})

test('compile - v-bind 多属性绑定', () => {
  const result = compiler.compile(
    '<div :class="cls" :style="styleObj" :data-id="id">text</div>'
  )
  expect(result.code).toBeTruthy()
  expect(result.code).toContain('cls')
  expect(result.code).toContain('styleObj')
  expect(result.code).toContain('id')
})

// ======================== v-on 事件绑定 ========================

test('compile - v-on 基本事件', () => {
  const result = compiler.compile('<button v-on:click="handleClick">Click</button>')
  expect(result.code).toBeTruthy()
  expect(result.code).toContain('handleClick')
})

test('compile - v-on 缩写 @event', () => {
  const result = compiler.compile('<button @click="onClick">Click</button>')
  expect(result.code).toBeTruthy()
  expect(result.code).toContain('onClick')
})

test('compile - v-on 多事件绑定', () => {
  const result = compiler.compile(
    '<input @input="onInput" @focus="onFocus" @blur="onBlur" />'
  )
  expect(result.code).toBeTruthy()
  expect(result.code).toContain('onInput')
  expect(result.code).toContain('onFocus')
  expect(result.code).toContain('onBlur')
})

// ======================== 插值表达式 ========================

test('compile - 文本插值 {{ }}', () => {
  const result = compiler.compile('<span>{{ message }}</span>')
  expect(result.code).toBeTruthy()
  expect(result.code).toContain('message')
})

test('compile - 复杂插值表达式', () => {
  const result = compiler.compile('<span>{{ count * 2 + offset }}</span>')
  expect(result.code).toBeTruthy()
  expect(result.code).toContain('count')
  expect(result.code).toContain('offset')
})

// ======================== parseHTML 测试 ========================

test('parseHTML - 解析 HTML 字符串', () => {
  const ast = compiler.parseHTML('<div class="test"><p>hello</p></div>')
  expect(ast).toBeTruthy()
  expect(ast.type).toBe('Root')
})

// ======================== transform 测试 ========================

test('transform - 转换 AST', () => {
  const ast = compiler.parseHTML('<div v-if="show">text</div>')
  expect(() => compiler.transform(ast)).not.toThrow()
})

// ======================== generate 测试 ========================

test('generate - 生成代码', () => {
  const ast = compiler.parseHTML('<div>hello</div>')
  const result = compiler.generate(ast)
  expect(result).toHaveProperty('code')
  expect(typeof result.code).toBe('string')
  expect(result.code.length).toBeGreaterThan(0)
})

// ======================== 完整编译流程测试 ========================

test('compile - 完整组件模板', () => {
  const template = `
    <div class="app">
      <h1 v-if="showTitle">{{ title }}</h1>
      <ul>
        <li v-each="item in items">{{ item.name }}</li>
      </ul>
      <input :value="inputValue" @input="handleInput" />
      <button @click="submit">Submit</button>
    </div>
  `
  const result = compiler.compile(template)
  expect(result.code).toBeTruthy()
  expect(result.code).toContain('showTitle')
  expect(result.code).toContain('title')
  expect(result.code).toContain('items')
  expect(result.code).toContain('item')
  expect(result.code).toContain('inputValue')
  expect(result.code).toContain('handleInput')
  expect(result.code).toContain('submit')
})

test('compile - 空模板', () => {
  const result = compiler.compile('')
  expect(result).toHaveProperty('code')
  expect(result).toHaveProperty('ast')
})

test('compile - helpers 数组', () => {
  const result = compiler.compile('<div>{{ msg }}</div>')
  expect(Array.isArray(result.helpers)).toBe(true)
})
