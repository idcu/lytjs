/**
 * Lyt.js 开发模式错误增强
 *
 * 提供开发模式下的错误格式化、组件栈追踪和错误覆盖层。
 * 纯原生零依赖 TypeScript 实现。
 */

import { LytError } from './lyt-error'
import { getDevMode } from './warn'
import { getCategory } from '@lytjs/common'

// ============================================================
// 错误格式化
// ============================================================

/**
 * 格式化错误信息，包含源位置、组件栈和修复建议
 *
 * @param err 错误对象
 * @returns 格式化后的错误信息字符串
 */
export function formatError(err: Error): string {
  const lines: string[] = []

  // 错误标题
  if (err instanceof LytError) {
    lines.push(`[Lyt Error] [${err.category}] Code: ${err.code}`)
    lines.push(`  Message: ${err.message}`)
  } else {
    lines.push(`[Lyt Error] ${err.message}`)
  }

  // 源位置信息
  if (err instanceof LytError && err.loc) {
    const loc = err.loc
    let locStr = ''
    if (loc.file) locStr += loc.file
    if (loc.line !== null && loc.line !== undefined) locStr += `:${loc.line}`
    if (loc.column !== null && loc.column !== undefined) locStr += `:${loc.column}`
    if (locStr) {
      lines.push(`  Location: ${locStr}`)
    }
    if (loc.source) {
      lines.push(`  Source: ${loc.source}`)
    }
  }

  // 组件上下文
  if (err instanceof LytError && err.details) {
    if (err.details.component) {
      lines.push(`  Component: ${err.details.component}`)
    }
  }

  // 堆栈信息
  if (err.stack) {
    lines.push('')
    lines.push('  Stack:')
    const stackLines = err.stack.split('\n').slice(1)
    for (const line of stackLines) {
      lines.push(`    ${line.trim()}`)
    }
  }

  // 修复建议
  const suggestion = getFixSuggestion(err)
  if (suggestion) {
    lines.push('')
    lines.push(`  Suggestion: ${suggestion}`)
  }

  return lines.join('\n')
}

// ============================================================
// 组件栈追踪
// ============================================================

/**
 * 获取组件栈信息
 *
 * 沿组件树向上遍历，构建组件调用栈。
 *
 * @param instance 当前组件实例（需包含 parent 引用）
 * @returns 组件栈字符串
 */
export function getComponentStack(instance?: any): string {
  if (!instance) return ''

  const stack: string[] = []
  let current = instance

  while (current) {
    const name = current.name || current.$name || 'Anonymous'
    stack.push(name)
    current = current.parent || current.$parent
  }

  return stack.join(' > ')
}

// ============================================================
// 修复建议
// ============================================================

/**
 * 根据错误类型提供修复建议
 */
function getFixSuggestion(err: Error): string | null {
  if (!(err instanceof LytError)) {
    return '请检查代码逻辑，确保没有运行时异常。'
  }

  const code = err.code
  const category = getCategory(code)

  // 编译器错误建议
  if (category === 'COMPILER') {
    return '请检查模板语法是否正确，参考 Lyt.js 模板语法文档。'
  }

  // 渲染器错误建议
  if (category === 'RENDERER') {
    if (code === 2003) {
      return '水合不匹配通常由服务端和客户端渲染结果不一致引起。请确保服务端和客户端使用相同的数据和组件版本。'
    }
    return '请检查 VNode 结构和 DOM 容器是否正确。'
  }

  // 组件错误建议
  if (category === 'COMPONENT') {
    if (code === 3001) {
      return '请检查传入的 props 是否符合组件定义中的 props 声明。'
    }
    if (code === 3002) {
      return '请确保组件定义中包含 template 字符串或 render 方法。'
    }
    return '请检查组件定义和生命周期钩子函数。'
  }

  // 路由错误建议
  if (category === 'ROUTER') {
    return '请检查路由配置，确保路由路径已正确注册。'
  }

  // Store 错误建议
  if (category === 'STORE') {
    return '请检查 Store 的创建和使用，确保 ID 唯一且 Store 未被销毁。'
  }

  // 响应式错误建议
  if (category === 'REACTIVITY') {
    if (code === 6004 || code === 6006) {
      return '请检查 computed 函数是否引用了自身，移除循环依赖。'
    }
    return '请检查响应式数据的读写操作。'
  }

  // 核心错误建议
  if (category === 'CORE') {
    if (code === 7002) {
      return '请确保挂载目标容器在调用 mount() 之前已存在于 DOM 中。'
    }
    if (code === 7003) {
      return '应用已挂载，如需重新挂载请先调用 unmount()。'
    }
    return '请检查应用配置和参数。'
  }

  // SSR 错误建议
  if (category === 'SSR') {
    return '请检查服务端渲染配置，确保服务端和客户端渲染结果一致。'
  }

  return null
}

// ============================================================
// 开发模式错误覆盖层
// ============================================================

/**
 * 生成开发模式错误覆盖层 HTML
 *
 * 可以注入到页面中显示错误详情。
 *
 * @param err 错误对象
 * @returns HTML 字符串
 */
export function createErrorOverlay(err: Error): string {
  if (!getDevMode()) return ''

  const formatted = formatError(err)
  const escapedMessage = err.message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  const escapedFormatted = formatted
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return `<div style="
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 999999;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: monospace;
  ">
    <div style="
      background: #1e1e1e;
      color: #d4d4d4;
      border-radius: 8px;
      max-width: 640px;
      width: 90%;
      max-height: 80vh;
      overflow: auto;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    ">
      <div style="
        color: #f44747;
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 12px;
        border-bottom: 1px solid #333;
        padding-bottom: 8px;
      ">Lyt.js Runtime Error</div>
      <div style="
        color: #ce9178;
        font-size: 14px;
        margin-bottom: 16px;
      ">${escapedMessage}</div>
      <pre style="
        color: #d4d4d4;
        font-size: 12px;
        background: #2d2d2d;
        padding: 12px;
        border-radius: 4px;
        overflow-x: auto;
        white-space: pre-wrap;
        word-break: break-all;
      ">${escapedFormatted}</pre>
    </div>
  </div>`
}
