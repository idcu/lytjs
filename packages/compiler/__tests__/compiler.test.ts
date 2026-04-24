/**
 * Lyt.js 编译器 — 单元测试
 *
 * 使用 @lytjs/test-utils 统一测试框架。
 *
 * 测试覆盖：
 *   - 基础 HTML 解析（div/p/span）
 *   - 嵌套标签解析
 *   - 属性解析（静态属性）
 *   - 动态属性解析（:class/:style）
 *   - 事件绑定解析（@click/@input）
 *   - 表达式插值 {{ }}
 *   - 多个表达式插值
 *   - if 指令解析
 *   - each 指令解析
 *   - bind 指令解析
 *   - slot 指令解析
 *   - ref 指令解析
 *   - 自闭合标签
 *   - 注释节点
 *   - compile 完整流程
 *   - 静态节点标记
 *   - 空模板
 *   - 多根节点
 *   - 文本节点
 *   - 布尔属性
 */

import { describe, it, expect } from '../../test-utils/src/index'

import {
  parseHTML,
  transform,
  optimize,
  generate,
  compile,
  isStatic,
} from '../src/index'
import type { RootNode, ElementNode, TextNode, ASTNode } from '../src/index'

// ================================================================
//  辅助函数
// ================================================================

function getElements(root: RootNode): ElementNode[] {
  const elements: ElementNode[] = []
  function walk(node: ASTNode) {
    if (node.type === 'Element') {
      elements.push(node)
      for (const child of node.children) walk(child)
    }
  }
  for (const child of root.children) walk(child)
  return elements
}

function getTextNodes(root: RootNode): TextNode[] {
  const texts: TextNode[] = []
  function walk(node: ASTNode) {
    if (node.type === 'Text') texts.push(node)
    if (node.type === 'Element') {
      for (const child of node.children) walk(child)
    }
  }
  for (const child of root.children) walk(child)
  return texts
}

// ================================================================
//  HTML 解析测试
// ================================================================

describe('parseHTML', () => {
  it('基础 HTML 解析（div/p/span）', () => {
    const ast = parseHTML('<div class="app"><p>hello</p><span>world</span></div>')
    expect(ast.type).toBe('Root')
    expect(ast.children.length).toBe(1)
    const div = ast.children[0] as ElementNode
    expect(div.type).toBe('Element')
    expect(div.tag).toBe('div')
    expect(div.props.length).toBe(1)
    expect(div.props[0].name).toBe('class')
    expect(div.props[0].value).toBe('app')
    expect(div.children.length).toBe(2)
    const p = div.children[0] as ElementNode
    expect(p.tag).toBe('p')
    const span = div.children[1] as ElementNode
    expect(span.tag).toBe('span')
  })

  it('嵌套标签解析', () => {
    const ast = parseHTML('<div><ul><li>1</li><li>2</li></ul></div>')
    const div = ast.children[0] as ElementNode
    expect(div.tag).toBe('div')
    expect(div.children.length).toBe(1)
    const ul = div.children[0] as ElementNode
    expect(ul.tag).toBe('ul')
    expect(ul.children.length).toBe(2)
    const li1 = ul.children[0] as ElementNode
    const li2 = ul.children[1] as ElementNode
    expect(li1.tag).toBe('li')
    expect(li2.tag).toBe('li')
    expect((li1.children[0] as TextNode).content).toBe('1')
    expect((li2.children[0] as TextNode).content).toBe('2')
  })

  it('属性解析（静态属性）', () => {
    const ast = parseHTML('<div id="root" class="container" data-x="1"></div>')
    const div = ast.children[0] as ElementNode
    const staticProps = div.props.filter(p => !p.isDynamic && !p.isEvent)
    expect(staticProps.length).toBe(3)
    expect(staticProps.find(p => p.name === 'id')!.value).toBe('root')
    expect(staticProps.find(p => p.name === 'class')!.value).toBe('container')
    expect(staticProps.find(p => p.name === 'data-x')!.value).toBe('1')
  })

  it('动态属性解析（:class/:style）', () => {
    const ast = parseHTML('<div :class="cls" :style="sty" v-bind:title="tip"></div>')
    const div = ast.children[0] as ElementNode
    // :class, :style, v-bind:title 都被解析为 bind 指令
    const bindDirectives = div.directives.filter(d => d.name === 'bind')
    expect(bindDirectives.length).toBe(3)
    expect(bindDirectives.find(d => d.arg === 'class')!.value).toBe('cls')
    expect(bindDirectives.find(d => d.arg === 'style')!.value).toBe('sty')
    expect(bindDirectives.find(d => d.arg === 'title')!.value).toBe('tip')
  })

  it('事件绑定解析（@click/@input）', () => {
    const ast = parseHTML('<button @click="handleClick" @input="onInput" v-on:change="onChange"></button>')
    const btn = ast.children[0] as ElementNode
    // @click, @input, v-on:change 都被解析为 on 指令
    const onDirectives = btn.directives.filter(d => d.name === 'on')
    expect(onDirectives.length).toBe(3)
    expect(onDirectives.find(d => d.arg === 'click')!.value).toBe('handleClick')
    expect(onDirectives.find(d => d.arg === 'input')!.value).toBe('onInput')
    expect(onDirectives.find(d => d.arg === ':change')!.value).toBe('onChange')
  })

  it('表达式插值 {{ }}', () => {
    const ast = parseHTML('<div>Hello {{ name }}</div>')
    const div = ast.children[0] as ElementNode
    expect(div.children.length).toBe(1)
    const text = div.children[0] as TextNode
    expect(text.type).toBe('Text')
    expect(text.isExpression).toBe(true)
    expect(text.content).toContain('{{ name }}')
  })

  it('多个表达式插值', () => {
    const ast = parseHTML('<div>{{ a }} + {{ b }} = {{ c }}</div>')
    const div = ast.children[0] as ElementNode
    const text = div.children[0] as TextNode
    expect(text.isExpression).toBe(true)
    expect(text.content).toContain('{{ a }}')
    expect(text.content).toContain('{{ b }}')
    expect(text.content).toContain('{{ c }}')
  })

  it('if 指令解析', () => {
    const ast = parseHTML('<div v-if="show">content</div>')
    const div = ast.children[0] as ElementNode
    const ifDirective = div.directives.find(d => d.name === 'if')
    expect(ifDirective).not.toBe(undefined)
    expect(ifDirective!.value).toBe('show')
  })

  it('each 指令解析', () => {
    const ast = parseHTML('<li v-each="item in items">{{ item }}</li>')
    const li = ast.children[0] as ElementNode
    const eachDirective = li.directives.find(d => d.name === 'each')
    expect(eachDirective).not.toBe(undefined)
    expect(eachDirective!.value).toBe('item in items')
  })

  it('bind 指令解析', () => {
    const ast = parseHTML('<input v-bind:value="val" />')
    const input = ast.children[0] as ElementNode
    const bindDirective = input.directives.find(d => d.name === 'bind')
    expect(bindDirective).not.toBe(undefined)
    expect(bindDirective!.arg).toBe('value')
    expect(bindDirective!.value).toBe('val')
  })

  it('slot 指令解析', () => {
    const ast = parseHTML('<div v-slot:header="props">header</div>')
    const div = ast.children[0] as ElementNode
    const slotDirective = div.directives.find(d => d.name === 'slot')
    expect(slotDirective).not.toBe(undefined)
    expect(slotDirective!.arg).toBe('header')
    expect(slotDirective!.value).toBe('props')
  })

  it('ref 指令解析', () => {
    const ast = parseHTML('<input v-ref="myInput" />')
    const input = ast.children[0] as ElementNode
    const refDirective = input.directives.find(d => d.name === 'ref')
    expect(refDirective).not.toBe(undefined)
    expect(refDirective!.value).toBe('myInput')
  })

  it('自闭合标签', () => {
    const ast = parseHTML('<div><br /><img src="test.png" /><input type="text" /></div>')
    const div = ast.children[0] as ElementNode
    expect(div.children.length).toBe(3)
    const br = div.children[0] as ElementNode
    expect(br.tag).toBe('br')
    expect(br.isSelfClosing).toBe(true)
    const img = div.children[1] as ElementNode
    expect(img.tag).toBe('img')
    expect(img.isSelfClosing).toBe(true)
    expect(img.props[0].name).toBe('src')
    expect(img.props[0].value).toBe('test.png')
    const input = div.children[2] as ElementNode
    expect(input.tag).toBe('input')
    expect(input.isSelfClosing).toBe(true)
  })

  it('注释节点', () => {
    const ast = parseHTML('<div><!-- 这是一个注释 --><span>hello</span></div>')
    const div = ast.children[0] as ElementNode
    // 注释在解析器中被跳过，验证 span 存在
    expect(div.children.length >= 1).toBe(true)
    const span = div.children.find(c => (c as ElementNode).tag === 'span')
    expect(span).not.toBe(undefined)
  })

  it('空模板', () => {
    const ast = parseHTML('')
    expect(ast.type).toBe('Root')
    expect(ast.children.length).toBe(0)
  })

  it('多根节点', () => {
    const ast = parseHTML('<div>one</div><p>two</p><span>three</span>')
    expect(ast.children.length).toBe(3)
    expect((ast.children[0] as ElementNode).tag).toBe('div')
    expect((ast.children[1] as ElementNode).tag).toBe('p')
    expect((ast.children[2] as ElementNode).tag).toBe('span')
  })

  it('文本节点', () => {
    const ast = parseHTML('plain text')
    expect(ast.children.length).toBe(1)
    const text = ast.children[0] as TextNode
    expect(text.type).toBe('Text')
    expect(text.content).toBe('plain text')
    expect(text.isExpression).toBe(false)
  })

  it('布尔属性', () => {
    const ast = parseHTML('<input disabled readonly />')
    const input = ast.children[0] as ElementNode
    expect(input.tag).toBe('input')
    const disabled = input.props.find(p => p.name === 'disabled')
    const readonly = input.props.find(p => p.name === 'readonly')
    expect(disabled).not.toBe(undefined)
    expect(readonly).not.toBe(undefined)
    // 布尔属性的值为 null
    expect(disabled!.value).toBe(null)
    expect(readonly!.value).toBe(null)
  })
})

// ================================================================
//  compile 完整流程测试
// ================================================================

describe('compile', () => {
  it('完整流程（parse->transform->optimize->generate）', () => {
    const result = compile('<div class="app">{{ message }}</div>')
    expect(result.code).toContain('h(')
    expect(result.code).toContain('_ctx')
    expect(result.ast).not.toBe(null)
    expect(result.helpers).not.toBe(null)
    expect(Array.isArray(result.helpers)).toBe(true)
    expect(result.code).toContain("'div'")
    expect(result.code).toContain('app')
  })

  it('静态节点标记', () => {
    const ast = parseHTML('<div class="static"><span>hello</span></div>')
    const hoistResult = optimize(ast)
    const div = ast.children[0] as ElementNode
    expect(div.staticFlag).toBe(1)
    const span = div.children[0] as ElementNode
    expect(span.staticFlag).toBe(1)
    expect(isStatic(div)).toBe(true)
    expect(isStatic(span)).toBe(true)
  })
})
