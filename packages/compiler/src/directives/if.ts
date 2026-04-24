/**
 * Lyt.js 编译器 — v-if 指令处理器
 *
 * 将 v-if/v-else-if/v-else 指令转换为条件渲染代码（三元表达式）。
 *
 * 支持的语法：
 *   - v-if="condition"          — 条件为真时渲染
 *   - v-else-if="condition"     — 前一个条件不满足时，检查此条件
 *   - v-else                    — 前面所有条件都不满足时渲染
 *
 * 转换示例：
 *   <div v-if="show">A</div>
 *   <div v-else-if="other">B</div>
 *   <div v-else>C</div>
 *
 *   → (show ? h('div', null, 'A') : (other ? h('div', null, 'B') : h('div', null, 'C')))
 */

import type { ASTNode, ElementNode } from '../ast/nodes'
import type { TransformContext } from '../transform/transform'

// ================================================================
//  类型定义
// ================================================================

/** if 分支信息 */
export interface IfBranch {
  /** 条件表达式（v-else 时为空字符串） */
  condition: string
  /** 对应的元素节点 */
  node: ElementNode
  /** 分支类型 */
  type: 'if' | 'else-if' | 'else'
}

/** if 指令转换结果 */
export interface IfTransformResult {
  /** 所有分支 */
  branches: IfBranch[]
  /** 生成的条件表达式代码 */
  code: string
}

// ================================================================
//  转换函数
// ================================================================

/**
 * 转换 v-if 指令
 *
 * 将 v-if/v-else-if/v-else 指令链转换为三元条件表达式。
 * 转换后的信息存储在元素节点的 ifCondition 和 ifBranches 属性上。
 *
 * 处理逻辑：
 *   1. 查找当前节点的 v-if 指令
 *   2. 在兄弟节点中查找连续的 v-else-if 和 v-else 节点
 *   3. 将整个 if 链收集为 IfBranch 数组
 *   4. 生成嵌套的三元表达式代码
 *
 * @param node    当前 AST 节点
 * @param context 转换上下文
 */
export function transformIf(node: ASTNode, context: TransformContext): void {
  if (node.type !== 'Element') return

  // 查找 v-if 指令
  const ifDirective = (node as ElementNode).directives.find(d => d.name === 'if')
  if (!ifDirective) return

  // 收集 if 链的所有分支
  const branches = collectIfBranches(node as ElementNode, context)

  if (branches.length === 0) return

  // 生成条件表达式代码
  const code = generateConditionalCode(branches)

  // 将转换结果存储在节点上
  Object.assign(node, {
    ifCondition: ifDirective.value,
    ifBranches: branches,
    ifCode: code,
  })

  // 收集辅助函数
  context.root.helpers.add('createConditionalVNode')

  // 从指令列表中移除 v-if（已处理）
  ;(node as ElementNode).directives = (node as ElementNode).directives.filter(
    d => d !== ifDirective
  )
}

// ================================================================
//  分支收集
// ================================================================

/**
 * 收集 if 链的所有分支
 *
 * 从当前 v-if 节点开始，向后查找兄弟节点中的 v-else-if 和 v-else 节点。
 *
 * @param startNode 起始节点（v-if 所在的节点）
 * @param context   转换上下文
 * @returns if 分支数组
 */
function collectIfBranches(
  startNode: ElementNode,
  context: TransformContext,
): IfBranch[] {
  const branches: IfBranch[] = []

  // 添加 v-if 分支
  const ifDirective = startNode.directives.find(d => d.name === 'if')
  if (!ifDirective) return branches

  branches.push({
    condition: ifDirective.value,
    node: startNode,
    type: 'if',
  })

  // 查找后续的 v-else-if 和 v-else 分支
  const siblings = getSiblingNodes(startNode, context)
  const startIndex = siblings.indexOf(startNode)

  for (let i = startIndex + 1; i < siblings.length; i++) {
    const sibling = siblings[i]
    if (sibling.type !== 'Element') break

    const elseIfDirective = sibling.directives.find(d => d.name === 'if')
    if (elseIfDirective) {
      // 检查是否有 else-if 或 else 修饰符
      // 在 Lyt.js 中，v-else-if 和 v-else 通过 v-if 指令的 arg 区分
      if (elseIfDirective.arg === 'else-if') {
        branches.push({
          condition: elseIfDirective.value,
          node: sibling,
          type: 'else-if',
        })
        // 从指令列表中移除
        sibling.directives = sibling.directives.filter(d => d !== elseIfDirective)
        continue
      } else if (elseIfDirective.arg === 'else') {
        branches.push({
          condition: '',
          node: sibling,
          type: 'else',
        })
        // 从指令列表中移除
        sibling.directives = sibling.directives.filter(d => d !== elseIfDirective)
        break
      }
    }

    // 遇到非 if 指令的节点，停止收集
    break
  }

  return branches
}

/**
 * 获取节点的兄弟节点列表
 *
 * @param node    当前节点
 * @param context 转换上下文
 * @returns 兄弟节点数组
 */
function getSiblingNodes(node: ElementNode, context: TransformContext): ASTNode[] {
  // 从父节点获取兄弟节点
  const parent = context.parent
  if (!parent) return [node]

  if (parent.type === 'Root') {
    return parent.children
  }

  if (parent.type === 'Element') {
    return parent.children
  }

  return [node]
}

// ================================================================
//  代码生成
// ================================================================

/**
 * 生成条件渲染的三元表达式代码
 *
 * 将 if 链转换为嵌套的三元表达式：
 *   - 单个 v-if: condition ? vnode : null
 *   - v-if + v-else: condition ? vnodeA : vnodeB
 *   - v-if + v-else-if + v-else: condition1 ? vnodeA : (condition2 ? vnodeB : vnodeC)
 *
 * @param branches if 分支数组
 * @returns 生成的条件表达式代码字符串
 */
export function generateConditionalCode(branches: IfBranch[]): string {
  if (branches.length === 0) return 'null'
  if (branches.length === 1) {
    // 只有 v-if，没有 v-else
    const branch = branches[0]
    return `(${branch.condition} ? _createVNode(${branch.node.tag}) : null)`
  }

  // 构建嵌套三元表达式
  let code = ''

  for (let i = 0; i < branches.length; i++) {
    const branch = branches[i]

    if (i === 0) {
      // 第一个分支（v-if）
      code = `(${branch.condition} ? _createVNode(${branch.node.tag}) : `
    } else if (i === branches.length - 1) {
      // 最后一个分支（v-else 或最后一个 v-else-if）
      if (branch.type === 'else') {
        code += `_createVNode(${branch.node.tag}))`
      } else {
        code += `(${branch.condition} ? _createVNode(${branch.node.tag}) : null))`
      }
    } else {
      // 中间分支（v-else-if）
      code += `(${branch.condition} ? _createVNode(${branch.node.tag}) : `
    }
  }

  return code
}
