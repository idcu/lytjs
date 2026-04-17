/**
 * Lyt.js 编译器优化 — 单元测试
 *
 * 测试覆盖：
 *   - 静态节点检测（各种模式）
 *   - 静态子树检测
 *   - 提升节点生成
 *   - 补丁标记生成（text/class/style/props/event）
 *   - 块树创建与动态子节点追踪
 *   - 树摇友好代码生成
 *   - 混合静态/动态模板
 *   - 嵌套静态子树
 *   - 全动态模板（无提升）
 *   - 全静态模板（完全提升）
 *   - 编译输出大小对比
 *   - 编译性能
 */

import { describe, it, expect } from '../../test-utils/src/index'

import {
  parseHTML,
  transform,
  optimize,
  generate,
  compile,
  isStatic,
  // 静态提升
  analyzeStatic,
  isHoistableNode,
  generateHoistedDecls,
  // 补丁标记
  CompilerPatchFlags,
  getPatchFlag,
  hasPatchFlag,
  describePatchFlag,
  // 块树
  createBlock,
  createVNode,
  enterBlock,
  exitBlock,
  getCurrentBlock,
  trackDynamicChild,
  traverseBlockChildren,
  countDynamicChildren,
  // 优化输出
  optimizeOutput,
  generateImportDeclarations,
  getHelperImportName,
  getAllHelperNames,
} from '../src/index'
import type { RootNode, ElementNode, TextNode, ASTNode, Block, VNode } from '../src/index'

// ================================================================
//  辅助函数
// ================================================================

/** 编译模板并返回完整结果 */
function compileFull(template: string) {
  return compile(template)
}

/** 解析并转换模板，返回 AST */
function parseAndTransform(template: string): RootNode {
  const ast = parseHTML(template)
  transform(ast)
  return ast
}

/** 获取 AST 中所有元素节点 */
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

// ================================================================
//  静态节点检测测试
// ================================================================

describe('静态节点检测', () => {
  it('纯文本节点是静态的', () => {
    const ast = parseAndTransform('hello world')
    const textNode = ast.children[0] as TextNode
    expect(isStatic(textNode)).toBe(true)
    expect(isHoistableNode(textNode)).toBe(true)
  })

  it('包含插值的文本节点不是静态的', () => {
    const ast = parseAndTransform('{{ message }}')
    const textNode = ast.children[0] as TextNode
    expect(isStatic(textNode)).toBe(false)
    expect(isHoistableNode(textNode)).toBe(false)
  })

  it('只有静态属性的元素是静态的', () => {
    const ast = parseAndTransform('<div class="app" id="main">hello</div>')
    const div = ast.children[0] as ElementNode
    expect(isStatic(div)).toBe(true)
    expect(isHoistableNode(div)).toBe(true)
  })

  it('有动态 class 绑定的元素不是静态的', () => {
    const ast = parseAndTransform('<div :class="activeClass">hello</div>')
    const div = ast.children[0] as ElementNode
    expect(isStatic(div)).toBe(false)
    expect(isHoistableNode(div)).toBe(false)
  })

  it('有事件绑定的元素不是静态的', () => {
    const ast = parseAndTransform('<button @click="handleClick">Click</button>')
    const btn = ast.children[0] as ElementNode
    expect(isStatic(btn)).toBe(false)
    expect(isHoistableNode(btn)).toBe(false)
  })

  it('有 v-if 指令的元素不是静态的', () => {
    const ast = parseAndTransform('<div v-if="show">content</div>')
    const div = ast.children[0] as ElementNode
    expect(isStatic(div)).toBe(false)
    expect(isHoistableNode(div)).toBe(false)
  })

  it('有 v-each 指令的元素不是静态的', () => {
    const ast = parseAndTransform('<li v-each="item in items">{{ item }}</li>')
    const li = ast.children[0] as ElementNode
    expect(isStatic(li)).toBe(false)
    expect(isHoistableNode(li)).toBe(false)
  })

  it('有 v-bind 的元素不是静态的', () => {
    const ast = parseAndTransform('<input v-bind:value="val" />')
    const input = ast.children[0] as ElementNode
    expect(isStatic(input)).toBe(false)
    expect(isHoistableNode(input)).toBe(false)
  })

  it('有 v-ref 的元素不是静态的', () => {
    const ast = parseAndTransform('<div v-ref="myEl">content</div>')
    const div = ast.children[0] as ElementNode
    expect(isStatic(div)).toBe(false)
    expect(isHoistableNode(div)).toBe(false)
  })
})

// ================================================================
//  静态子树检测测试
// ================================================================

describe('静态子树检测', () => {
  it('嵌套的纯静态元素构成静态子树', () => {
    const ast = parseAndTransform('<div><span><p>deep text</p></span></div>')
    const div = ast.children[0] as ElementNode
    expect(isStatic(div)).toBe(true)
    expect(isHoistableNode(div)).toBe(true)
  })

  it('子节点中有动态内容则整个子树不是静态的', () => {
    const ast = parseAndTransform('<div><span>static</span><p>{{ dynamic }}</p></div>')
    const div = ast.children[0] as ElementNode
    expect(isStatic(div)).toBe(false)
    expect(isHoistableNode(div)).toBe(false)
  })

  it('深层嵌套中的动态内容使整棵树非静态', () => {
    const ast = parseAndTransform('<div><span><p>{{ msg }}</p></span></div>')
    const div = ast.children[0] as ElementNode
    expect(isStatic(div)).toBe(false)
  })

  it('混合文本和插值的节点不是静态的', () => {
    const ast = parseAndTransform('hello {{ name }}')
    const textNode = ast.children[0] as TextNode
    expect(isStatic(textNode)).toBe(false)
    expect(isHoistableNode(textNode)).toBe(false)
  })
})

// ================================================================
//  静态提升测试
// ================================================================

describe('静态提升 (analyzeStatic)', () => {
  it('全静态模板应被完全提升', () => {
    const ast = parseAndTransform('<div class="app"><span>hello</span><p>world</p></div>')
    const result = analyzeStatic(ast)
    expect(result.hoistedNodes.length).toBeGreaterThan(0)
    expect(result.hoistedNames.length).toBe(result.hoistedNodes.length)
  })

  it('全动态模板不应有任何提升', () => {
    const ast = parseAndTransform('<div :class="cls">{{ msg }}</div>')
    const result = analyzeStatic(ast)
    // 根节点是动态的，不应被提升
    expect(result.hoistedNodes.length).toBe(0)
  })

  it('混合模板应正确分离静态和动态节点', () => {
    const ast = parseAndTransform(
      '<div><span class="static">fixed</span><p>{{ dynamic }}</p></div>'
    )
    const result = analyzeStatic(ast)
    // 应该有一些节点被提升
    expect(result.hoistedNames.length).toBeGreaterThan(0)
  })

  it('提升变量名格式正确', () => {
    const ast = parseAndTransform('<div><span>a</span><p>b</p></div>')
    const result = analyzeStatic(ast)
    for (const name of result.hoistedNames) {
      expect(name.startsWith('_hoisted_')).toBe(true)
      // 验证后缀是数字
      const numPart = name.replace('_hoisted_', '')
      expect(Number(numPart)).toBeGreaterThan(0)
    }
  })

  it('嵌套静态子树应被整体提升', () => {
    const ast = parseAndTransform(
      '<div><section><article><span>deep</span></article></section></div>'
    )
    const result = analyzeStatic(ast)
    expect(result.hoistedNodes.length).toBeGreaterThan(0)
  })

  it('generateHoistedDecls 生成正确的声明代码', () => {
    const ast = parseAndTransform('<div class="app"><span>hello</span></div>')
    const result = analyzeStatic(ast)
    const decls = generateHoistedDecls(result.hoistedNodes, result.hoistedNames)
    expect(decls.length).toBeGreaterThan(0)
    for (const decl of decls) {
      expect(decl.startsWith('const _hoisted_')).toBe(true)
      expect(decl.includes('= ')).toBe(true)
    }
  })
})

// ================================================================
//  补丁标记测试
// ================================================================

describe('补丁标记 (Patch Flags)', () => {
  it('动态文本节点应标记为 TEXT', () => {
    const ast = parseAndTransform('{{ message }}')
    const textNode = ast.children[0] as TextNode
    const flag = getPatchFlag(textNode)
    expect(flag).toBe(CompilerPatchFlags.TEXT)
  })

  it('静态文本节点应标记为 HOISTED', () => {
    const ast = parseAndTransform('static text')
    const textNode = ast.children[0] as TextNode
    const flag = getPatchFlag(textNode)
    expect(flag).toBe(CompilerPatchFlags.HOISTED)
  })

  it('动态 class 绑定应标记为 CLASS', () => {
    const ast = parseAndTransform('<div :class="cls">text</div>')
    const div = ast.children[0] as ElementNode
    const flag = getPatchFlag(div)
    expect(hasPatchFlag(flag, CompilerPatchFlags.CLASS)).toBe(true)
  })

  it('动态 style 绑定应标记为 STYLE', () => {
    const ast = parseAndTransform('<div :style="styleObj">text</div>')
    const div = ast.children[0] as ElementNode
    const flag = getPatchFlag(div)
    expect(hasPatchFlag(flag, CompilerPatchFlags.STYLE)).toBe(true)
  })

  it('动态 props 绑定应标记为 PROPS', () => {
    const ast = parseAndTransform('<div :id="myId">text</div>')
    const div = ast.children[0] as ElementNode
    const flag = getPatchFlag(div)
    expect(hasPatchFlag(flag, CompilerPatchFlags.PROPS)).toBe(true)
  })

  it('事件绑定应标记为 EVENT', () => {
    const ast = parseAndTransform('<button @click="handler">Click</button>')
    const btn = ast.children[0] as ElementNode
    const flag = getPatchFlag(btn)
    expect(hasPatchFlag(flag, CompilerPatchFlags.EVENT)).toBe(true)
  })

  it('v-if 条件渲染应标记为 BAIL', () => {
    const ast = parseAndTransform('<div v-if="show">content</div>')
    const div = ast.children[0] as ElementNode
    const flag = getPatchFlag(div)
    expect(flag).toBe(CompilerPatchFlags.BAIL)
  })

  it('v-each 循环应标记为 NEED_PATCH', () => {
    const ast = parseAndTransform('<li v-each="item in items">{{ item }}</li>')
    const li = ast.children[0] as ElementNode
    const flag = getPatchFlag(li)
    expect(flag).toBe(CompilerPatchFlags.NEED_PATCH)
  })

  it('多个动态特征应组合标记', () => {
    const ast = parseAndTransform('<div :class="cls" @click="handler">text</div>')
    const div = ast.children[0] as ElementNode
    const flag = getPatchFlag(div)
    expect(hasPatchFlag(flag, CompilerPatchFlags.CLASS)).toBe(true)
    expect(hasPatchFlag(flag, CompilerPatchFlags.EVENT)).toBe(true)
  })

  it('describePatchFlag 返回正确的描述', () => {
    expect(describePatchFlag(CompilerPatchFlags.TEXT)).toBe('TEXT')
    expect(describePatchFlag(CompilerPatchFlags.HOISTED)).toBe('HOISTED')
    expect(describePatchFlag(CompilerPatchFlags.BAIL)).toBe('BAIL')
    expect(describePatchFlag(CompilerPatchFlags.CLASS | CompilerPatchFlags.STYLE)).toBe('CLASS | STYLE')
  })

  it('hasPatchFlag 正确检测组合标记', () => {
    const flag = CompilerPatchFlags.TEXT | CompilerPatchFlags.CLASS
    expect(hasPatchFlag(flag, CompilerPatchFlags.TEXT)).toBe(true)
    expect(hasPatchFlag(flag, CompilerPatchFlags.CLASS)).toBe(true)
    expect(hasPatchFlag(flag, CompilerPatchFlags.STYLE)).toBe(false)
  })
})

// ================================================================
//  块树测试
// ================================================================

describe('块树 (Block Tree)', () => {
  it('createBlock 创建正确的 Block 结构', () => {
    const block = createBlock('div', { class: 'app' }, 'hello')
    expect(block.vnode).toBeDefined()
    expect(block.vnode.tag).toBe('div')
    expect(block.vnode.isBlock).toBe(true)
    expect(block.dynamicChildren).toEqual([])
  })

  it('createVNode 创建正确的 VNode', () => {
    const vnode = createVNode('span', null, 'text')
    expect(vnode.tag).toBe('span')
    expect(vnode.isBlock).toBeUndefined()
  })

  it('enterBlock/exitBlock 正确管理当前 Block', () => {
    expect(getCurrentBlock()).toBe(null)

    const block = createBlock('div')
    enterBlock(block)
    expect(getCurrentBlock()).toBe(block)

    exitBlock()
    expect(getCurrentBlock()).toBe(null)
  })

  it('trackDynamicChild 将动态节点注册到当前 Block', () => {
    const block = createBlock('div')
    enterBlock(block)

    const dynamicVNode = createVNode('span', null, 'text')
    dynamicVNode.patchFlag = CompilerPatchFlags.TEXT
    trackDynamicChild(dynamicVNode)

    expect(block.dynamicChildren.length).toBe(1)
    expect(block.dynamicChildren[0]).toBe(dynamicVNode)

    exitBlock()
  })

  it('trackDynamicChild 不追踪无 patchFlag 的节点', () => {
    const block = createBlock('div')
    enterBlock(block)

    const staticVNode = createVNode('span', null, 'text')
    // 没有 patchFlag，不应被追踪
    trackDynamicChild(staticVNode)

    expect(block.dynamicChildren.length).toBe(0)

    exitBlock()
  })

  it('trackDynamicChild 不追踪 HOISTED 节点', () => {
    const block = createBlock('div')
    enterBlock(block)

    const hoistedVNode = createVNode('span', null, 'text')
    hoistedVNode.patchFlag = CompilerPatchFlags.HOISTED
    trackDynamicChild(hoistedVNode)

    expect(block.dynamicChildren.length).toBe(0)

    exitBlock()
  })

  it('traverseBlockChildren 遍历所有动态子节点', () => {
    const block = createBlock('div')
    enterBlock(block)

    const v1 = createVNode('span', null, 'a')
    v1.patchFlag = CompilerPatchFlags.TEXT
    const v2 = createVNode('p', null, 'b')
    v2.patchFlag = CompilerPatchFlags.CLASS
    trackDynamicChild(v1)
    trackDynamicChild(v2)

    const visited: string[] = []
    traverseBlockChildren(block, (vnode) => {
      visited.push(vnode.tag!)
    })

    expect(visited.length).toBe(2)
    expect(visited).toContain('span')
    expect(visited).toContain('p')

    exitBlock()
  })

  it('countDynamicChildren 正确统计动态子节点数量', () => {
    const block = createBlock('div')
    enterBlock(block)

    for (let i = 0; i < 5; i++) {
      const v = createVNode('span', null, `text${i}`)
      v.patchFlag = CompilerPatchFlags.TEXT
      trackDynamicChild(v)
    }

    expect(countDynamicChildren(block)).toBe(5)

    exitBlock()
  })
})

// ================================================================
//  优化输出测试
// ================================================================

describe('优化输出 (optimizeOutput)', () => {
  it('生成正确的导入声明', () => {
    const decls = generateImportDeclarations(['h', 'createBlock', 'openBlock'], 'lyt')
    expect(decls.length).toBe(1)
    expect(decls[0]).toBe("import { createBlock, h, openBlock } from 'lyt'")
  })

  it('空辅助函数列表不生成导入', () => {
    const decls = generateImportDeclarations([])
    expect(decls.length).toBe(0)
  })

  it('getHelperImportName 返回正确的导入名', () => {
    expect(getHelperImportName('h')).toBe('h')
    expect(getHelperImportName('createBlock')).toBe('createBlock')
    expect(getHelperImportName('nonExistent')).toBe(null)
  })

  it('getAllHelperNames 返回所有辅助函数', () => {
    const names = getAllHelperNames()
    expect(names.length).toBeGreaterThan(0)
    expect(names).toContain('h')
    expect(names).toContain('createBlock')
    expect(names).toContain('openBlock')
    expect(names).toContain('createTextVNode')
  })

  it('optimizeOutput 生成包含 openBlock 的代码', () => {
    const ast = parseAndTransform('<div>{{ msg }}</div>')
    const rawCode = "h('div', null, _ctx.msg)"
    const result = optimizeOutput(ast, rawCode)
    expect(result.code).toContain('openBlock')
    expect(result.code).toContain('createBlock')
  })

  it('optimizeOutput 收集正确的辅助函数', () => {
    const ast = parseAndTransform('<div>{{ msg }}</div>')
    const rawCode = "h('div', null, _ctx.msg)"
    const result = optimizeOutput(ast, rawCode)
    expect(result.imports).toContain('h')
    expect(result.imports).toContain('openBlock')
    expect(result.imports).toContain('createBlock')
  })

  it('optimizeOutput 生成正确的导入声明', () => {
    const ast = parseAndTransform('<div>{{ msg }}</div>')
    const rawCode = "h('div', null, _ctx.msg)"
    const result = optimizeOutput(ast, rawCode)
    expect(result.importDeclarations.length).toBeGreaterThan(0)
    expect(result.importDeclarations[0]).toContain("from 'lyt'")
  })
})

// ================================================================
//  完整编译流程测试
// ================================================================

describe('编译优化集成', () => {
  it('混合模板编译后代码包含 h() 调用', () => {
    const result = compileFull('<div class="app"><span>{{ msg }}</span></div>')
    expect(result.code).toContain("h('div'")
    expect(result.code).toContain("_ctx.msg")
  })

  it('静态模板编译后代码不包含 _ctx 引用', () => {
    const result = compileFull('<div class="app"><span>hello</span></div>')
    expect(result.code).not.toContain('_ctx')
  })

  it('编译结果包含辅助函数列表', () => {
    const result = compileFull('<div>{{ msg }}</div>')
    expect(result.helpers).toBeDefined()
    expect(Array.isArray(result.helpers)).toBe(true)
  })

  it('编译结果包含 hoistResult', () => {
    const result = compileFull('<div><span>static</span></div>')
    expect(result.hoistResult).toBeDefined()
    expect(result.hoistResult.hoistedNodes).toBeDefined()
    expect(result.hoistResult.hoistedNames).toBeDefined()
  })

  it('复杂模板编译性能 < 10ms', () => {
    const complexTemplate = `
      <div class="container">
        <header class="header">
          <h1 class="title">App Title</h1>
          <nav class="nav">
            <a href="/home">Home</a>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
          </nav>
        </header>
        <main class="main">
          <section class="hero">
            <h2>{{ heroTitle }}</h2>
            <p>{{ heroDescription }}</p>
            <button @click="handleAction">{{ buttonText }}</button>
          </section>
          <section class="features">
            <div class="feature" v-each="feature in features">
              <h3>{{ feature.name }}</h3>
              <p>{{ feature.description }}</p>
            </div>
          </section>
          <section class="content" v-if="showContent">
            <p>{{ content }}</p>
          </section>
        </main>
        <footer class="footer">
          <p>Copyright 2024</p>
        </footer>
      </div>
    `

    const start = performance.now()
    const result = compileFull(complexTemplate)
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(10)
    expect(result.code).toBeDefined()
    expect(result.code.length).toBeGreaterThan(0)
  })

  it('优化后代码大小应合理', () => {
    const template = '<div class="app"><span>static</span><p>{{ dynamic }}</p></div>'
    const result = compileFull(template)
    // 代码不应为空且不应过大
    expect(result.code.length).toBeGreaterThan(10)
    expect(result.code.length).toBeLessThan(500)
  })
})
