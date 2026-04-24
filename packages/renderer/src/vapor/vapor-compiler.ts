/**
 * Lyt.js Vapor Mode - 模板编译器
 *
 * 将 HTML 模板编译为直接 DOM 操作的渲染函数。
 * 编译后的函数直接创建 DOM 元素并绑定信号，无需 VDOM 中间层。
 *
 * 支持的语法：
 *   - 文本插值: {{ expression }}
 *   - 事件绑定: on:event="handler"
 *   - 属性绑定: :prop="expression"
 *   - 条件渲染: v-if="expression"
 *   - 列表渲染: v-each="item in expression"
 */

import type { VaporElement } from './vapor-reactive'
import type { VaporNode } from './vapor-renderer'
import { setVaporDOMFactory, getVaporDOMFactory } from './vapor-renderer'
import {
  bindText,
  bindProp,
  bindAttr,
  bindClass,
  bindEvent,
  bindIf,
  bindEach,
} from './vapor-reactive'

// ================================================================
//  类型定义
// ================================================================

/** 编译后的渲染函数 */
export type VaporRenderFunction = (ctx: Record<string, any>) => VaporElement

/** AST 节点类型 */
type ASTNodeType = 'element' | 'text' | 'interpolation' | 'fragment'

/** AST 节点 */
interface ASTNode {
  type: ASTNodeType
  tag?: string
  text?: string
  expression?: string
  props?: Record<string, string>
  events?: Record<string, string>
  directives?: {
    if?: string
    each?: { item: string; expression: string }
  }
  children?: ASTNode[]
}

/** 编译结果 */
export interface VaporCompileResult {
  /** 渲染函数 */
  render: VaporRenderFunction
  /** AST（调试用） */
  ast: ASTNode
}

// ================================================================
//  HTML 解析
// ================================================================

/**
 * 简单的 HTML 模板解析器
 *
 * 将模板字符串解析为 AST 树。
 */
function parseTemplate(template: string): ASTNode {
  const root: ASTNode = { type: 'fragment', children: [] }
  let remaining = template.trim()

  while (remaining.length > 0) {
    // 尝试匹配开始标签
    const tagMatch = remaining.match(/^<([a-zA-Z][a-zA-Z0-9-]*)([\s\S]*?)(\/?)>/)
    if (tagMatch) {
      const tagName = tagMatch[1]
      const attrsStr = tagMatch[2]
      const selfClosing = tagMatch[3] === '/'

      // 解析属性
      const { props, events, directives } = parseAttributes(attrsStr)

      const node: ASTNode = {
        type: 'element',
        tag: tagName,
        props,
        events,
        directives,
        children: [],
      }

      remaining = remaining.slice(tagMatch[0].length)

      if (selfClosing) {
        root.children!.push(node)
        continue
      }

      // 查找匹配的结束标签
      const endTag = `</${tagName}>`
      const endIdx = findClosingTag(remaining, tagName)

      if (endIdx === -1) {
        throw new Error(`[lyt:vapor:compiler] 未找到闭合标签: </${tagName}>`)
      }

      const innerContent = remaining.slice(0, endIdx)
      remaining = remaining.slice(endIdx + endTag.length)

      // 递归解析子节点
      const innerAST = parseTemplate(innerContent)
      node.children = innerAST.children || []

      root.children!.push(node)
    } else {
      // 文本内容
      const nextTagIdx = remaining.indexOf('<')
      let textContent: string
      if (nextTagIdx === -1) {
        textContent = remaining
        remaining = ''
      } else {
        textContent = remaining.slice(0, nextTagIdx)
        remaining = remaining.slice(nextTagIdx)
      }

      if (textContent.trim()) {
        // 检查是否包含插值
        if (textContent.includes('{{')) {
          const parts = parseTextInterpolation(textContent)
          for (const part of parts) {
            if (part.type === 'text') {
              root.children!.push({ type: 'text', text: part.value })
            } else {
              root.children!.push({ type: 'interpolation', expression: part.value })
            }
          }
        } else {
          root.children!.push({ type: 'text', text: textContent })
        }
      }
    }
  }

  return root
}

/**
 * 查找闭合标签的位置（处理嵌套标签）
 */
function findClosingTag(content: string, tagName: string): number {
  let depth = 1
  let pos = 0
  const openTag = `<${tagName}`
  const closeTag = `</${tagName}>`

  while (pos < content.length && depth > 0) {
    const nextOpen = content.indexOf(openTag, pos)
    const nextClose = content.indexOf(closeTag, pos)

    if (nextClose === -1) return -1

    if (nextOpen !== -1 && nextOpen < nextClose) {
      // 检查是否是真正的开始标签（不是闭合标签的一部分）
      const charAfterOpen = content[nextOpen + openTag.length]
      if (charAfterOpen === '>' || charAfterOpen === ' ' || charAfterOpen === '/') {
        depth++
        pos = nextOpen + openTag.length
      } else {
        pos = nextClose + closeTag.length
        depth--
      }
    } else {
      pos = nextClose + closeTag.length
      depth--
    }
  }

  return depth === 0 ? pos - closeTag.length : -1
}

/**
 * 解析属性字符串
 */
function parseAttributes(attrsStr: string): {
  props: Record<string, string>
  events: Record<string, string>
  directives: { if?: string; each?: { item: string; expression: string } }
} {
  const props: Record<string, string> = {}
  const events: Record<string, string> = {}
  const directives: { if?: string; each?: { item: string; expression: string } } = {}

  // 匹配属性
  const attrRegex = /([a-zA-Z@:][a-zA-Z0-9@:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
  let match: RegExpExecArray | null

  while ((match = attrRegex.exec(attrsStr)) !== null) {
    const attrName = match[1]
    const attrValue = match[2] || match[3]

    if (attrName.startsWith('on:')) {
      // 事件绑定
      const eventName = attrName.slice(3)
      events[eventName] = attrValue
    } else if (attrName.startsWith(':')) {
      // 动态属性绑定
      const propName = attrName.slice(1)
      props[propName] = attrValue
    } else if (attrName === 'v-if') {
      directives.if = attrValue
    } else if (attrName === 'v-each') {
      // 格式: "item in expression"
      const eachParts = attrValue.match(/^\s*(\w+)\s+in\s+(.+)\s*$/)
      if (eachParts) {
        directives.each = { item: eachParts[1], expression: eachParts[2] }
      }
    } else {
      // 静态属性
      props[attrName] = attrValue
    }
  }

  return { props, events, directives }
}

/**
 * 解析文本插值
 */
function parseTextInterpolation(text: string): Array<{ type: 'text' | 'interpolation'; value: string }> {
  const parts: Array<{ type: 'text' | 'interpolation'; value: string }> = []
  const regex = /\{\{([\s\S]*?)\}\}/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'interpolation', value: match[1].trim() })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return parts
}

// ================================================================
//  代码生成
// ================================================================

/**
 * 将 AST 节点编译为渲染函数
 *
 * @param template  HTML 模板字符串
 * @returns 编译结果
 */
export function compileToVapor(template: string): VaporCompileResult {
  const ast = parseTemplate(template)
  const render = generateRenderFunction(ast)
  return { render, ast }
}

/**
 * 从 AST 生成渲染函数
 */
function generateRenderFunction(ast: ASTNode): VaporRenderFunction {
  return function vaporRender(ctx: Record<string, any>): VaporElement {
    const factory = getVaporDOMFactory()
    return renderASTNode(ast, ctx, factory)
  }
}

/**
 * 递归渲染 AST 节点为 DOM 元素
 */
function renderASTNode(
  node: ASTNode,
  ctx: Record<string, any>,
  factory: (tag: string) => VaporElement
): VaporElement {
  if (node.type === 'fragment') {
    // 片段节点：如果只有一个子节点，直接返回该子节点
    if (node.children && node.children.length === 1) {
      return renderASTNode(node.children[0], ctx, factory)
    }
    // 多个子节点：创建一个容器
    const container = factory('div') as any
    container.nodeType = 11 // DocumentFragment
    if (node.children) {
      for (const child of node.children) {
        const childEl = renderASTNode(child, ctx, factory)
        container.appendChild(childEl)
      }
    }
    return container
  }

  if (node.type === 'text') {
    const el = factory('#text') as any
    el.textContent = node.text || ''
    el.nodeType = 3
    return el
  }

  if (node.type === 'interpolation') {
    const el = factory('span') as any
    const expression = node.expression || ''
    // 尝试从上下文中获取值
    const value = resolveExpression(ctx, expression)
    el.textContent = value !== null && value !== undefined ? String(value) : ''
    return el
  }

  if (node.type === 'element') {
    // 处理 v-each 指令（v-each 元素自身被重复，不创建外层元素）
    if (node.directives?.each) {
      const { item, expression } = node.directives.each
      const array = resolveExpression(ctx, expression)
      // 创建一个容器来承载所有重复的元素
      const container = factory('#fragment') as any
      container.childNodes = []
      container.nodeType = 11
      if (Array.isArray(array)) {
        for (let i = 0; i < array.length; i++) {
          const itemCtx = { ...ctx, [item]: array[i], index: i }
          // 为每个 item 创建一个新的元素实例
          const itemEl = factory(node.tag!)
          // 复制静态属性
          if (node.props) {
            for (const [key, value] of Object.entries(node.props)) {
              if (key === 'class' || key === 'className') {
                itemEl.className = value
              } else {
                (itemEl as any)[key] = value
              }
            }
          }
          // 渲染子节点
          if (node.children) {
            for (const child of node.children) {
              const childEl = renderASTNode(child, itemCtx, factory)
              itemEl.appendChild(childEl)
            }
          }
          container.appendChild(itemEl)
        }
      }
      return container
    }

    const el = factory(node.tag!)

    // 处理 v-if 指令
    if (node.directives?.if) {
      const condition = resolveExpression(ctx, node.directives.if)
      if (!condition) {
        (el as any).style = (el as any).style || {}
        ;(el as any).style.display = 'none'
        ;(el as any).hidden = true
      }
    }

    // 应用静态属性
    if (node.props) {
      for (const [key, value] of Object.entries(node.props)) {
        if (key.startsWith(':')) {
          // 动态属性绑定
          const propName = key.slice(1)
          const propValue = resolveExpression(ctx, value)
          ;(el as any)[propName] = propValue
        } else if (key === 'class' || key === 'className') {
          el.className = value
        } else {
          (el as any)[key] = value
        }
      }
    }

    // 绑定事件
    if (node.events) {
      for (const [eventName, handlerName] of Object.entries(node.events)) {
        const handler = resolveExpression(ctx, handlerName)
        if (typeof handler === 'function') {
          el.addEventListener(eventName, handler)
        }
      }
    }

    // 渲染子节点
    if (node.children) {
      for (const child of node.children) {
        const childEl = renderASTNode(child, ctx, factory)
        // 如果子节点是片段（nodeType 11），将其子元素展开到当前元素
        if ((childEl as any).nodeType === 11 && (childEl as any).childNodes) {
          for (const fragmentChild of (childEl as any).childNodes) {
            el.appendChild(fragmentChild)
          }
        } else {
          el.appendChild(childEl)
        }
      }
    }

    return el
  }

  // 默认返回空 div
  return factory('div')
}

/**
 * 从上下文中解析表达式
 *
 * 支持简单属性访问和点号路径。
 */
function resolveExpression(ctx: Record<string, any>, expression: string): any {
  const trimmed = expression.trim()

  // 处理简单标识符
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(trimmed)) {
    const value = ctx[trimmed]
    // 如果值是 Signal，调用它获取当前值
    if (typeof value === 'function' && !value.prototype) {
      return value()
    }
    return value
  }

  // 处理点号路径: a.b.c
  const parts = trimmed.split('.')
  let current: any = ctx
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    current = current[part]
    if (typeof current === 'function' && !current.prototype && parts.indexOf(part) < parts.length - 1) {
      current = current()
    }
  }
  return current
}

// ================================================================
//  导出
// ================================================================

export { parseTemplate, renderASTNode, resolveExpression }
