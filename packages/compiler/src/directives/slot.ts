/**
 * Lyt.js 编译器 — v-slot（插槽）指令处理器
 *
 * 将 v-slot 指令转换为插槽分发代码。
 *
 * 支持的语法：
 *   - v-slot                   — 默认插槽
 *   - v-slot:default           — 默认插槽（显式命名）
 *   - v-slot:header            — 具名插槽
 *   - v-slot="{ item }"        — 作用域插槽（解构 props）
 *   - v-slot:header="{ title }"— 具名作用域插槽
 *   - #default                 — 默认插槽简写
 *   - #header="{ title }"      — 具名作用域插槽简写
 *
 * 转换示例：
 *   <template v-slot:header="{ title }">
 *     <h1>{{ title }}</h1>
 *   </template>
 *
 *   → renderSlot(slots, 'header', { title }, () => [h('h1', null, title)])
 */

import type { ASTNode, ElementNode, DirectiveNode } from '../ast/nodes'
import type { TransformContext } from '../transform/transform'

// ================================================================
//  类型定义
// ================================================================

/** 插槽信息 */
export interface SlotInfo {
  /** 插槽名称 */
  name: string
  /** 插槽 props 表达式（作用域插槽） */
  props: string
  /** 是否为作用域插槽 */
  isScoped: boolean
  /** 插槽内容节点 */
  node: ElementNode
}

/** slot 指令转换结果 */
export interface SlotTransformResult {
  /** 插槽信息 */
  slot: SlotInfo
  /** 生成的代码 */
  code: string
}

// ================================================================
//  转换函数
// ================================================================

/**
 * 转换 v-slot 指令
 *
 * 将 v-slot 指令转换为插槽分发信息，存储在元素节点的 slotInfo 属性上。
 *
 * 处理逻辑：
 *   1. 查找当前节点的 v-slot 指令
 *   2. 解析插槽名称和 props
 *   3. 区分默认插槽和具名插槽
 *   4. 区分普通插槽和作用域插槽
 *   5. 生成 renderSlot 调用代码
 *
 * @param node    当前 AST 节点
 * @param context 转换上下文
 */
export function transformSlot(node: ASTNode, context: TransformContext): void {
  if (node.type !== 'Element') return

  // 查找 v-slot 指令
  const slotDirective = (node as ElementNode).directives.find(d => d.name === 'slot')
  if (!slotDirective) return

  // 解析插槽信息
  const slotInfo = parseSlotDirective(slotDirective, node as ElementNode)

  // 生成插槽代码
  const code = generateSlotCode(slotInfo)

  // 将转换结果存储在节点上
  Object.assign(node, {
    slotInfo,
    slotCode: code,
  })

  // 收集辅助函数
  context.root.helpers.add('renderSlot')

  // 从指令列表中移除 v-slot（已处理）
  ;(node as ElementNode).directives = (node as ElementNode).directives.filter(
    d => d !== slotDirective
  )
}

// ================================================================
//  插槽解析
// ================================================================

/**
 * 解析 v-slot 指令
 *
 * 从指令节点中提取插槽名称和作用域 props。
 *
 * 支持的格式：
 *   - v-slot                   → name: 'default', props: ''
 *   - v-slot:header            → name: 'header', props: ''
 *   - v-slot="{ item }"        → name: 'default', props: '{ item }'
 *   - v-slot:header="{ item }" → name: 'header', props: '{ item }'
 *
 * @param directive v-slot 指令节点
 * @param node      元素节点
 * @returns 插槽信息
 */
export function parseSlotDirective(
  directive: DirectiveNode,
  node: ElementNode,
): SlotInfo {
  // 解析插槽名称
  const name = directive.arg || 'default'

  // 解析作用域 props
  const value = directive.value || ''
  const isScoped = value.length > 0

  return {
    name,
    props: value,
    isScoped,
    node,
  }
}

// ================================================================
//  代码生成
// ================================================================

/**
 * 生成插槽代码
 *
 * 根据插槽类型生成不同的代码：
 *   - 默认插槽: renderSlot(slots, 'default', null, () => [...children])
 *   - 具名插槽: renderSlot(slots, 'name', null, () => [...children])
 *   - 作用域插槽: renderSlot(slots, 'name', { prop1, prop2 }, (props) => [...children])
 *
 * @param slot 插槽信息
 * @returns 生成的代码字符串
 */
export function generateSlotCode(slot: SlotInfo): string {
  const { name, props, isScoped, node } = slot

  // 生成子节点渲染函数
  const childrenCode = generateSlotChildren(node)

  if (isScoped) {
    // 作用域插槽：renderSlot(slots, 'name', propsExpr, (props) => [...])
    return `renderSlot(slots, '${name}', ${props}, (${props}) => ${childrenCode})`
  }

  // 普通插槽：renderSlot(slots, 'name', null, () => [...])
  return `renderSlot(slots, '${name}', null, () => ${childrenCode})`
}

/**
 * 生成插槽子节点代码
 *
 * 将插槽内容节点的子节点转换为 VNode 创建代码。
 *
 * @param node 插槽元素节点
 * @returns 子节点代码
 */
function generateSlotChildren(node: ElementNode): string {
  if (node.children.length === 0) {
    return '[]'
  }

  if (node.children.length === 1) {
    const child = node.children[0]
    if (child.type === 'Text') {
      // 文本子节点
      if (child.isExpression) {
        return wrapContextAccess(child.content.replace(/\{\{|\}\}/g, '').trim())
      }
      return `'${escapeString(child.content)}'`
    }
    // 元素子节点
    return `_createVNode('${child.tag}')`
  }

  // 多个子节点
  const parts: string[] = []
  for (const child of node.children) {
    if (child.type === 'Text') {
      if (child.isExpression) {
        parts.push(wrapContextAccess(child.content.replace(/\{\{|\}\}/g, '').trim()))
      } else {
        parts.push(`'${escapeString(child.content)}'`)
      }
    } else if (child.type === 'Element') {
      parts.push(`_createVNode('${child.tag}')`)
    }
  }

  return `[${parts.join(', ')}]`
}

// ================================================================
//  工具函数
// ================================================================

/**
 * 将表达式包装为上下文访问形式
 */
function wrapContextAccess(expr: string): string {
  expr = expr.trim()
  if (expr.startsWith('_ctx.')) return expr
  if (expr.includes('(') || expr.includes('=>')) return expr
  if (/^\w+(\.\w+)*$/.test(expr)) return `_ctx.${expr}`
  return expr
}

/**
 * 转义字符串
 */
function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
}
