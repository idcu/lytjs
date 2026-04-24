/**
 * Lyt.js 编译器 — v-each 指令处理器
 *
 * 将 v-each 指令转换为循环渲染代码。
 *
 * 支持的语法：
 *   - v-each="item in items"           — 基本遍历
 *   - v-each="(item, index) in items"  — 带索引的遍历
 *   - v-each="item of items"           — of 作为 in 的别名
 *
 * 转换示例：
 *   <li v-each="item in items">{{ item.name }}</li>
 *
 *   → renderList(items, (item) => h('li', null, item.name))
 *
 *   <li v-each="(item, index) in items">{{ index }}: {{ item }}</li>
 *
 *   → renderList(items, (item, index) => h('li', null, [index, ': ', item]))
 */

import type { ASTNode, ElementNode } from '../ast/nodes'
import type { TransformContext } from '../transform/transform'

// ================================================================
//  类型定义
// ================================================================

/** each 指令解析结果 */
export interface EachExpression {
  /** 迭代变量名 */
  item: string
  /** 索引变量名（可能为空字符串） */
  index: string
  /** 集合表达式 */
  collection: string
}

/** each 指令转换结果 */
export interface EachTransformResult {
  /** 解析后的表达式信息 */
  expr: EachExpression
  /** 生成的循环代码 */
  code: string
}

// ================================================================
//  转换函数
// ================================================================

/**
 * 转换 v-each 指令
 *
 * 将 v-each 指令转换为循环渲染信息，存储在元素节点的 eachInfo 属性上。
 *
 * 处理逻辑：
 *   1. 查找当前节点的 v-each 指令
 *   2. 解析表达式语法（item in items / (item, index) in items）
 *   3. 将解析结果存储在节点上
 *   4. 生成 renderList 调用代码
 *
 * @param node    当前 AST 节点
 * @param context 转换上下文
 */
export function transformEach(node: ASTNode, context: TransformContext): void {
  if (node.type !== 'Element') return

  // 查找 v-each 指令
  const eachDirective = (node as ElementNode).directives.find(d => d.name === 'each')
  if (!eachDirective) return

  // 解析 each 表达式
  const expr = parseEachExpression(eachDirective.value)
  if (!expr) {
    console.warn(`[lyt] 无效的 v-each 表达式: "${eachDirective.value}"`)
    return
  }

  // 生成 renderList 调用代码
  const code = generateEachCode(expr, node as ElementNode)

  // 将转换结果存储在节点上
  Object.assign(node, {
    eachInfo: expr,
    eachCode: code,
  })

  // 收集辅助函数
  context.root.helpers.add('renderList')

  // 从指令列表中移除 v-each（已处理）
  ;(node as ElementNode).directives = (node as ElementNode).directives.filter(
    d => d !== eachDirective
  )
}

// ================================================================
//  表达式解析
// ================================================================

/**
 * 解析 v-each 指令的表达式
 *
 * 支持的语法格式：
 *   - "item in items"           → { item: 'item', index: '', collection: 'items' }
 *   - "(item, index) in items"  → { item: 'item', index: 'index', collection: 'items' }
 *   - "item of items"           → { item: 'item', index: '', collection: 'items' }
 *   - "(item, index) of items"  → { item: 'item', index: 'index', collection: 'items' }
 *
 * @param expr 指令值表达式
 * @returns 解析结果，格式不正确时返回 null
 */
export function parseEachExpression(expr: string): EachExpression | null {
  // 匹配 "(item, index) in/of collection" 或 "item in/of collection"
  const match = expr.match(
    /^\s*(?:\((\w+)\s*,\s*(\w+)\)|(\w+))\s+(?:in|of)\s+(\S+)\s*$/
  )

  if (!match) return null

  return {
    // 第 1 组是括号内的 item，第 3 组是无括号的 item
    item: match[1] || match[3],
    // 第 2 组是括号内的 index
    index: match[2] || '',
    // 第 4 组是集合表达式
    collection: match[4],
  }
}

// ================================================================
//  代码生成
// ================================================================

/**
 * 生成 v-each 的循环渲染代码
 *
 * 将 each 表达式转换为 renderList 调用代码：
 *   - renderList(collection, (item) => h('tag', props, children))
 *   - renderList(collection, (item, index) => h('tag', props, children))
 *
 * @param expr 每个表达式解析结果
 * @param node 元素节点
 * @returns 生成的代码字符串
 */
export function generateEachCode(expr: EachExpression, node: ElementNode): string {
  // 构建 renderList 调用
  const collection = wrapContextAccess(expr.collection)

  // 构建迭代器函数参数
  const iteratorArgs = expr.index
    ? `(${expr.item}, ${expr.index})`
    : `(${expr.item})`

  // 构建函数体（创建 VNode）
  const body = `_createVNode('${node.tag}')`

  return `renderList(${collection}, ${iteratorArgs} => ${body})`
}

/**
 * 将表达式包装为上下文访问形式
 *
 * 如果表达式不是以 _ctx. 开头，自动添加 _ctx. 前缀。
 *
 * @param expr 表达式字符串
 * @returns 包装后的表达式
 */
function wrapContextAccess(expr: string): string {
  expr = expr.trim()

  // 已经是上下文访问形式
  if (expr.startsWith('_ctx.')) {
    return expr
  }

  // 包含函数调用或复杂表达式，直接返回
  if (expr.includes('(') || expr.includes('=>') || expr.includes('[')) {
    return expr
  }

  // 简单标识符，添加 _ctx. 前缀
  if (/^\w+(\.\w+)*$/.test(expr)) {
    return `_ctx.${expr}`
  }

  return expr
}
