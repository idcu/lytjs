/**
 * Lyt.js 编译器 — v-bind（双向绑定）指令处理器
 *
 * 将 v-bind/v-model 指令转换为双向绑定代码。
 * v-model 是 v-bind 的语法糖，用于表单元素的双向数据绑定。
 *
 * 支持的语法：
 *   - v-bind:value="expr"     — 单向绑定
 *   - v-model="value"         — 双向绑定（语法糖）
 *   - v-model.trim="value"    — 带修饰符的双向绑定
 *   - v-model.number="value"  — 数字转换修饰符
 *   - v-model.lazy="value"    — 懒更新修饰符（change 事件而非 input）
 *
 * 转换示例：
 *   <input v-model="message" />
 *   → model: { value: _ctx.message, callback: $event => _ctx.message = $event }
 *
 *   <input v-model.trim="message" />
 *   → model: { value: _ctx.message, callback: $event => _ctx.message = $event.trim() }
 */

import type { ASTNode, ElementNode, DirectiveNode } from '../ast/nodes'
import type { TransformContext } from '../transform/transform'

// ================================================================
//  类型定义
// ================================================================

/** 绑定信息 */
export interface BindingInfo {
  /** 绑定的属性名 */
  arg: string
  /** 绑定的表达式 */
  value: string
  /** 是否为双向绑定（v-model） */
  isModel: boolean
  /** 修饰符列表 */
  modifiers: string[]
}

/** 双向绑定模型信息 */
export interface ModelBinding {
  /** 绑定的值表达式 */
  value: string
  /** 回调表达式（赋值代码） */
  callback: string
  /** 修饰符列表 */
  modifiers: string[]
}

/** bind 指令转换结果 */
export interface BindTransformResult {
  /** 所有绑定信息 */
  bindings: BindingInfo[]
  /** 双向绑定模型信息（如果有 v-model） */
  model: ModelBinding | null
  /** 生成的代码 */
  code: string
}

// ================================================================
//  支持的修饰符
// ================================================================

/** v-model 支持的修饰符集合 */
const MODEL_MODIFIERS = new Set(['trim', 'number', 'lazy'])

// ================================================================
//  转换函数
// ================================================================

/**
 * 转换 v-bind 指令
 *
 * 将 v-bind 和 v-model 指令转换为绑定信息，存储在元素节点的 bindings 属性上。
 * v-model 会被转换为特殊的 model 绑定，包含 value 和 callback。
 *
 * 处理逻辑：
 *   1. 查找当前节点的所有 v-bind 指令
 *   2. 区分普通绑定和双向绑定（arg === 'model'）
 *   3. 解析修饰符
 *   4. 生成绑定代码
 *
 * @param node    当前 AST 节点
 * @param context 转换上下文
 */
export function transformBind(node: ASTNode, context: TransformContext): void {
  if (node.type !== 'Element') return

  // 查找所有 v-bind 指令
  const bindDirectives = (node as ElementNode).directives.filter(d => d.name === 'bind')
  if (bindDirectives.length === 0) return

  const bindings: BindingInfo[] = []
  let modelBinding: ModelBinding | null = null

  for (const bind of bindDirectives) {
    const isModel = bind.arg === 'model'
    const modifiers = bind.modifiers || []

    // 验证修饰符
    if (isModel) {
      for (const mod of modifiers) {
        if (!MODEL_MODIFIERS.has(mod)) {
          console.warn(`[lyt] 未知的 v-model 修饰符: "${mod}"`)
        }
      }
    }

    const binding: BindingInfo = {
      arg: bind.arg,
      value: bind.value,
      isModel,
      modifiers,
    }

    bindings.push(binding)

    // 如果是双向绑定，生成 model 信息
    if (isModel) {
      modelBinding = generateModelBinding(bind)
      context.root.helpers.add('createModelBinding')
    }
  }

  // 生成绑定代码
  const code = generateBindCode(bindings, modelBinding)

  // 将转换结果存储在节点上
  Object.assign(node, {
    bindings,
    modelBinding,
    bindCode: code,
  })

  // 从指令列表中移除所有 v-bind（已处理）
  ;(node as ElementNode).directives = (node as ElementNode).directives.filter(
    d => d.name !== 'bind'
  )
}

// ================================================================
//  双向绑定生成
// ================================================================

/**
 * 生成双向绑定（v-model）的模型信息
 *
 * 根据修饰符生成不同的回调代码：
 *   - 无修饰符: $event => value = $event
 *   - .trim:    $event => value = $event.trim()
 *   - .number:  $event => value = Number($event)
 *   - .lazy:    使用 change 事件而非 input 事件
 *
 * @param directive v-bind:model 指令节点
 * @returns 模型绑定信息
 */
export function generateModelBinding(directive: DirectiveNode): ModelBinding {
  const value = wrapContextAccess(directive.value)
  const modifiers = directive.modifiers || []

  // 构建回调表达式
  let eventValue = '$event'

  // 应用修饰符到事件值
  if (modifiers.includes('trim')) {
    eventValue = `$event.trim()`
  }
  if (modifiers.includes('number')) {
    eventValue = `Number($event)`
  }

  // 构建回调
  const callback = `$event => ${value} = ${eventValue}`

  return {
    value,
    callback,
    modifiers,
  }
}

// ================================================================
//  代码生成
// ================================================================

/**
 * 生成 v-bind 的代码
 *
 * 将绑定信息转换为 props 对象的代码片段：
 *   - 普通绑定: { 'value': _ctx.expr }
 *   - 双向绑定: { model: { value: _ctx.expr, callback: $event => _ctx.expr = $event } }
 *
 * @param bindings     绑定信息数组
 * @param modelBinding 双向绑定信息
 * @returns 生成的代码字符串
 */
export function generateBindCode(
  bindings: BindingInfo[],
  modelBinding: ModelBinding | null,
): string {
  const parts: string[] = []

  for (const binding of bindings) {
    if (binding.isModel) {
      // 双向绑定
      if (modelBinding) {
        parts.push(
          `model: { value: ${modelBinding.value}, callback: ${modelBinding.callback} }`
        )
      }
    } else {
      // 普通动态绑定
      const value = wrapContextAccess(binding.value)
      parts.push(`'${binding.arg}': ${value}`)
    }
  }

  return parts.length > 0 ? `{ ${parts.join(', ')} }` : ''
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
