/**
 * Lyt.js 编译器 — v-ref（模板引用）指令处理器
 *
 * 将 v-ref 指令转换为模板引用注册代码。
 *
 * 支持的语法：
 *   - v-ref="myRef"     — 注册模板引用
 *   - ref="myRef"       — 简写形式（通过属性解析）
 *
 * 转换示例：
 *   <div v-ref="container">content</div>
 *   → { ref: 'container' }
 *
 *   <input v-ref="inputEl" />
 *   → { ref: 'inputEl' }
 *
 * 运行时行为：
 *   组件挂载后，通过 this.$refs.container 可以访问对应的 DOM 元素。
 */

import type { ASTNode, ElementNode, DirectiveNode } from '../ast/nodes'
import type { TransformContext } from '../transform/transform'

// ================================================================
//  类型定义
// ================================================================

/** ref 引用信息 */
export interface RefInfo {
  /** 引用名称 */
  name: string
  /** 是否为动态引用（表达式） */
  isDynamic: boolean
}

/** ref 指令转换结果 */
export interface RefTransformResult {
  /** 引用信息 */
  ref: RefInfo
  /** 生成的代码 */
  code: string
}

// ================================================================
//  转换函数
// ================================================================

/**
 * 转换 v-ref 指令
 *
 * 将 v-ref 指令转换为模板引用信息，存储在元素节点的 refInfo 属性上。
 *
 * 处理逻辑：
 *   1. 查找当前节点的 v-ref 指令
 *   2. 解析引用名称
 *   3. 判断是否为动态引用（表达式 vs 字符串）
 *   4. 生成 ref 注册代码
 *
 * @param node    当前 AST 节点
 * @param context 转换上下文
 */
export function transformRef(node: ASTNode, context: TransformContext): void {
  if (node.type !== 'Element') return

  // 查找 v-ref 指令
  const refDirective = (node as ElementNode).directives.find(d => d.name === 'ref')
  if (!refDirective) return

  // 解析 ref 信息
  const refInfo = parseRefDirective(refDirective)

  // 生成 ref 注册代码
  const code = generateRefCode(refInfo)

  // 将转换结果存储在节点上
  Object.assign(node, {
    refInfo,
    refCode: code,
  })

  // 收集辅助函数
  context.root.helpers.add('createRef')

  // 从指令列表中移除 v-ref（已处理）
  ;(node as ElementNode).directives = (node as ElementNode).directives.filter(
    d => d !== refDirective
  )
}

// ================================================================
//  ref 解析
// ================================================================

/**
 * 解析 v-ref 指令
 *
 * 从指令节点中提取引用名称，并判断是否为动态引用。
 *
 * @param directive v-ref 指令节点
 * @returns 引用信息
 */
export function parseRefDirective(directive: DirectiveNode): RefInfo {
  const value = directive.value || ''

  // 判断是否为动态引用
  // 动态引用：包含点号访问、方括号访问或函数调用
  const isDynamic = /\./.test(value) || /\[/.test(value) || /\(/.test(value)

  return {
    name: value,
    isDynamic,
  }
}

// ================================================================
//  代码生成
// ================================================================

/**
 * 生成 ref 注册代码
 *
 * 根据引用类型生成不同的代码：
 *   - 静态引用: ref: 'name'
 *   - 动态引用: ref: _ctx.expr
 *
 * @param refInfo 引用信息
 * @returns 生成的代码字符串
 */
export function generateRefCode(refInfo: RefInfo): string {
  if (refInfo.isDynamic) {
    // 动态引用：ref: _ctx.expr
    const value = wrapContextAccess(refInfo.name)
    return `ref: ${value}`
  }

  // 静态引用：ref: 'name'
  return `ref: '${refInfo.name}'`
}

// ================================================================
//  工具函数
// ================================================================

/**
 * 将表达式包装为上下文访问形式
 *
 * @param expr 表达式字符串
 * @returns 包装后的表达式
 */
function wrapContextAccess(expr: string): string {
  expr = expr.trim()

  if (expr.startsWith('_ctx.')) {
    return expr
  }

  if (expr.includes('(') || expr.includes('=>') || expr.includes('[')) {
    return expr
  }

  if (/^\w+(\.\w+)*$/.test(expr)) {
    return `_ctx.${expr}`
  }

  return expr
}
