/**
 * Lyt.js 编译器 — v-on（事件绑定）指令处理器
 *
 * 将 v-on 指令转换为事件绑定代码。
 *
 * 支持的语法：
 *   - v-on:click="handler"           — 完整语法
 *   - @click="handler"               — 简写语法
 *   - @click.stop="handler"          — 带修饰符
 *   - @click.prevent.stop="handler"  — 多个修饰符
 *
 * 支持的修饰符：
 *   - .stop     — 调用 event.stopPropagation()
 *   - .prevent  — 调用 event.preventDefault()
 *   - .capture  — 使用捕获阶段
 *   - .once     — 只触发一次
 *   - .self     — 只在 event.target === el 时触发
 *   - .passive  — 添加 passive 选项
 *
 * 转换示例：
 *   <button @click="handleSubmit">Submit</button>
 *   → { 'onClick': _ctx.handleSubmit }
 *
 *   <button @click.stop.prevent="handleSubmit">Submit</button>
 *   → { 'onClick': ($event) => { $event.stopPropagation(); $event.preventDefault(); _ctx.handleSubmit($event) } }
 */

import type { ASTNode, ElementNode, DirectiveNode } from '../ast/nodes'
import type { TransformContext } from '../transform/transform'

// ================================================================
//  类型定义
// ================================================================

/** 事件绑定信息 */
export interface EventInfo {
  /** 事件名（原始，如 'click'） */
  name: string
  /** 规范化后的事件名（如 'onClick'） */
  key: string
  /** 事件处理函数表达式 */
  value: string
  /** 修饰符列表 */
  modifiers: string[]
  /** 是否为捕获阶段 */
  capture: boolean
  /** 是否为一次性事件 */
  once: boolean
  /** 是否为 passive 模式 */
  passive: boolean
}

/** on 指令转换结果 */
export interface OnTransformResult {
  /** 所有事件绑定信息 */
  events: EventInfo[]
  /** 生成的代码 */
  code: string
}

// ================================================================
//  支持的修饰符
// ================================================================

/** v-on 支持的事件修饰符集合 */
const EVENT_MODIFIERS = new Set([
  'stop', 'prevent', 'capture', 'once', 'self', 'passive',
])

/** 需要特殊键名的事件修饰符 */
const KEY_MODIFIERS = new Set([
  'enter', 'tab', 'delete', 'esc', 'space', 'up', 'down',
  'left', 'right', 'page-up', 'page-down', 'home', 'end',
])

/** 鼠标按钮修饰符 */
const MOUSE_MODIFIERS = new Set(['left', 'middle', 'right'])

// ================================================================
//  事件名映射
// ================================================================

/**
 * 需要特殊处理的事件名映射
 * 将 DOM 事件名转换为 React 风格的 onEventName
 */
const EVENT_NAME_MAP: Record<string, string> = {
  'click': 'onClick',
  'dblclick': 'onDblClick',
  'input': 'onInput',
  'change': 'onChange',
  'submit': 'onSubmit',
  'keydown': 'onKeyDown',
  'keyup': 'onKeyUp',
  'keypress': 'onKeyPress',
  'mousedown': 'onMouseDown',
  'mouseup': 'onMouseUp',
  'mouseover': 'onMouseOver',
  'mouseout': 'onMouseOut',
  'mousemove': 'onMouseMove',
  'mouseenter': 'onMouseEnter',
  'mouseleave': 'onMouseLeave',
  'focus': 'onFocus',
  'blur': 'onBlur',
  'scroll': 'onScroll',
  'wheel': 'onWheel',
  'touchstart': 'onTouchStart',
  'touchend': 'onTouchEnd',
  'touchmove': 'onTouchMove',
}

// ================================================================
//  转换函数
// ================================================================

/**
 * 转换 v-on 指令
 *
 * 将 v-on 指令转换为事件绑定信息，存储在元素节点的 events 属性上。
 *
 * 处理逻辑：
 *   1. 查找当前节点的所有 v-on 指令
 *   2. 规范化事件名
 *   3. 解析修饰符
 *   4. 生成事件处理代码
 *
 * @param node    当前 AST 节点
 * @param context 转换上下文
 */
export function transformOn(node: ASTNode, context: TransformContext): void {
  if (node.type !== 'Element') return

  // 查找所有 v-on 指令
  const onDirectives = (node as ElementNode).directives.filter(d => d.name === 'on')
  if (onDirectives.length === 0) return

  const events: EventInfo[] = []

  for (const on of onDirectives) {
    // 解析事件信息
    const eventInfo = parseEventDirective(on)

    if (eventInfo) {
      events.push(eventInfo)
    }
  }

  // 生成事件绑定代码
  const code = generateEventCode(events)

  // 将转换结果存储在节点上
  Object.assign(node, {
    events,
    eventCode: code,
  })

  // 收集辅助函数
  context.root.helpers.add('createEventHandler')

  // 从指令列表中移除所有 v-on（已处理）
  ;(node as ElementNode).directives = (node as ElementNode).directives.filter(
    d => d.name !== 'on'
  )
}

// ================================================================
//  事件解析
// ================================================================

/**
 * 解析 v-on 指令为事件信息
 *
 * 从指令节点中提取事件名、处理函数和修饰符。
 *
 * @param directive v-on 指令节点
 * @returns 事件信息，解析失败时返回 null
 */
export function parseEventDirective(directive: DirectiveNode): EventInfo | null {
  const rawName = directive.arg
  if (!rawName) {
    console.warn('[lyt] v-on 指令缺少事件名')
    return null
  }

  // 从原始名称中分离事件名和修饰符
  // 例如 "click.stop.prevent" → 事件名 "click"，修饰符 ["stop", "prevent"]
  const dotIndex = rawName.indexOf('.')
  let eventName = rawName
  const modifiers: string[] = []

  if (dotIndex !== -1) {
    eventName = rawName.slice(0, dotIndex)
    const modifierStr = rawName.slice(dotIndex + 1)
    modifiers.push(...modifierStr.split('.'))
  }

  // 合并指令节点上的修饰符
  if (directive.modifiers) {
    for (const mod of directive.modifiers) {
      if (!modifiers.includes(mod)) {
        modifiers.push(mod)
      }
    }
  }

  // 验证修饰符
  for (const mod of modifiers) {
    if (
      !EVENT_MODIFIERS.has(mod) &&
      !KEY_MODIFIERS.has(mod) &&
      !MOUSE_MODIFIERS.has(mod)
    ) {
      console.warn(`[lyt] 未知的事件修饰符: "${mod}"`)
    }
  }

  // 规范化事件名
  const normalizedKey = normalizeEventName(eventName)

  // 解析特殊修饰符
  const capture = modifiers.includes('capture')
  const once = modifiers.includes('once')
  const passive = modifiers.includes('passive')

  return {
    name: eventName,
    key: normalizedKey,
    value: directive.value,
    modifiers,
    capture,
    once,
    passive,
  }
}

/**
 * 规范化事件名
 *
 * 将 DOM 事件名转换为 onEventName 格式：
 *   - click → onClick
 *   - key-down → onKeyDown
 *   - custom-event → onCustomEvent
 *
 * @param name 原始事件名
 * @returns 规范化后的事件名
 */
export function normalizeEventName(name: string): string {
  // 检查预定义映射
  if (EVENT_NAME_MAP[name]) {
    return EVENT_NAME_MAP[name]
  }

  // 通用转换：将 kebab-case 转换为 camelCase，并添加 on 前缀
  const camelName = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
  return `on${camelName.charAt(0).toUpperCase()}${camelName.slice(1)}`
}

// ================================================================
//  代码生成
// ================================================================

/**
 * 生成事件绑定代码
 *
 * 将事件信息数组转换为 props 对象中的事件属性代码。
 * 如果有修饰符，会生成包装函数。
 *
 * @param events 事件信息数组
 * @returns 生成的代码字符串
 */
export function generateEventCode(events: EventInfo[]): string {
  const parts: string[] = []

  for (const event of events) {
    const handler = generateEventHandler(event)
    parts.push(`'${event.key}': ${handler}`)
  }

  return parts.length > 0 ? `{ ${parts.join(', ')} }` : ''
}

/**
 * 生成单个事件处理函数代码
 *
 * 根据修饰符生成不同的处理函数：
 *   - 无修饰符: _ctx.handler
 *   - 有修饰符: ($event) => { modifier1(); modifier2(); _ctx.handler($event) }
 *   - .self:    ($event) => { if ($event.target === $event.currentTarget) _ctx.handler($event) }
 *
 * @param event 事件信息
 * @returns 事件处理函数代码
 */
export function generateEventHandler(event: EventInfo): string {
  const handler = wrapContextAccess(event.value)
  const modifiers = event.modifiers

  // 没有修饰符，直接返回处理函数
  if (modifiers.length === 0) {
    return handler
  }

  // 收集修饰符对应的代码片段
  const modifierCodes: string[] = []

  for (const mod of modifiers) {
    switch (mod) {
      case 'stop':
        modifierCodes.push('$event.stopPropagation()')
        break
      case 'prevent':
        modifierCodes.push('$event.preventDefault()')
        break
      case 'self':
        // .self 需要条件判断，特殊处理
        modifierCodes.push('if ($event.target !== $event.currentTarget) return')
        break
      // capture、once、passive 在 addEventListener 选项中处理，不在函数体中
    }
  }

  // 如果没有需要生成代码的修饰符（只有 capture/once/passive）
  if (modifierCodes.length === 0) {
    return handler
  }

  // 生成包装函数
  const body = modifierCodes.join('; ') + '; ' + handler + '($event)'
  return `($event) => { ${body} }`
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
