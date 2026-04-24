/**
 * Lyt.js SFC 编译器
 *
 * 将 SFC 描述符编译为 JS 模块代码。
 *
 * 编译流程：
 *   1. <template> 块 → 使用 compile() 编译为 render 函数代码
 *   2. <script> 块 → 提取 export default 内容，与 render 函数合并
 *   3. <style scoped> 块 → 生成 scopedId，改写 CSS 选择器，收集样式
 *   4. 输出完整的 JS 模块字符串
 */

import { compile } from '../index'
import type { SFCDescriptor, SFCStyleBlock } from './parse-sfc'
import { extractExportDefault } from './parse-sfc'

// ============================================================
// 类型定义
// ============================================================

/** SFC 编译结果 */
export interface SFCCompileResult {
  /** 生成的 JS 代码 */
  code: string
  /** 提取的 CSS 样式（经过 scoped 改写） */
  styles: string[]
  /** scoped 属性标识（如 data-v-abc123） */
  scopedId: string
}

// ============================================================
// 常量
// ============================================================

/** scopedId 前缀 */
const SCOPED_ID_PREFIX = 'data-v-'

// ============================================================
// 辅助函数
// ============================================================

/**
 * 生成唯一的 scopedId
 *
 * 基于文件名和内容生成短哈希。
 *
 * @param filename 文件名
 * @param content 文件内容（用于哈希）
 * @returns scopedId（如 data-v-3f2a1b）
 */
function generateScopedId(filename: string, content: string): string {
  // 简单哈希算法（djb2 变体）
  let hash = 5381
  const seed = filename + '\x00' + content
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) & 0xffffffff
  }
  // 转为 6 位十六进制
  return SCOPED_ID_PREFIX + (hash >>> 0).toString(16).slice(0, 6)
}

/**
 * 改写 CSS 选择器，添加 scoped 属性选择器
 *
 * 规则：
 *   - 最后一个选择器添加 [data-v-xxx] 属性
 *   - .counter → .counter[data-v-xxx]
 *   - .parent .child → .parent .child[data-v-xxx]
 *   - div > span → div > span[data-v-xxx]
 *   - .a, .b → .a[data-v-xxx], .b[data-v-xxx]
 *   - 媒体查询中的选择器同样改写
 *   - @keyframes、@font-face 等规则不改写
 *   - ::before、::after 等伪元素在属性选择器之前
 *     .btn::before → .btn[data-v-xxx]::before
 *
 * @param css CSS 内容
 * @param scopedId scoped 属性标识
 * @returns 改写后的 CSS
 */
export function scopeCSS(css: string, scopedId: string): string {
  // 使用状态机方式处理，正确跳过 @keyframes 等嵌套块
  let result = ''
  let i = 0
  const len = css.length

  while (i < len) {
    // 检查是否是 @ 规则
    if (css[i] === '@') {
      // 读取 @ 规则名称
      const atRuleMatch = css.slice(i).match(/^@([\w-]+)/)
      if (atRuleMatch) {
        const atRuleName = atRuleMatch[1]

        // 需要跳过整个块的规则（不改写内部选择器）
        if (['keyframes', '-webkit-keyframes', '-moz-keyframes', 'font-face'].includes(atRuleName)) {
          // 找到 @ 规则的起始大括号
          const openBrace = css.indexOf('{', i + atRuleMatch[0].length)
          if (openBrace !== -1) {
            const blockEnd = findMatchingBrace(css, openBrace + 1)
            if (blockEnd !== -1) {
              result += css.slice(i, blockEnd)
              i = blockEnd
              continue
            }
          }
        }

        // @media, @supports 等包含选择器的块：保留 @ 规则头部，递归处理内部内容
        if (['media', 'supports', 'document'].includes(atRuleName)) {
          const openBrace = css.indexOf('{', i + atRuleMatch[0].length)
          if (openBrace !== -1) {
            const blockEnd = findMatchingBrace(css, openBrace + 1)
            if (blockEnd !== -1) {
              // @ 规则头部（如 @media (max-width: 768px)）保持不变
              const header = css.slice(i, openBrace + 1)
              // 内部内容递归处理
              const innerContent = css.slice(openBrace + 1, blockEnd - 1)
              const scopedInner = scopeCSS(innerContent, scopedId)
              result += header + scopedInner + '}'
              i = blockEnd
              continue
            }
          }
        }

        // 其他 @ 规则（@import, @charset 等）：直接保留到行尾或分号
        const semicolonIndex = css.indexOf(';', i)
        if (semicolonIndex !== -1) {
          result += css.slice(i, semicolonIndex + 1)
          i = semicolonIndex + 1
          continue
        }
      }
    }

    // 普通选择器：读取到 { 为止
    const braceIndex = css.indexOf('{', i)
    if (braceIndex === -1) {
      // 没有更多规则
      result += css.slice(i)
      break
    }

    const selector = css.slice(i, braceIndex).trim()

    // 跳过空选择器
    if (!selector) {
      result += css.slice(i, braceIndex + 1)
      i = braceIndex + 1
      continue
    }

    // 找到匹配的闭合大括号
    const blockEnd = findMatchingBrace(css, braceIndex + 1)
    if (blockEnd === -1) {
      result += css.slice(i)
      break
    }

    // 改写选择器
    const scopedSelector = rewriteSelector(selector, scopedId)
    result += scopedSelector + css.slice(braceIndex, blockEnd)

    i = blockEnd
  }

  return result
}

/**
 * 找到匹配的闭合大括号位置
 *
 * @param css CSS 字符串
 * @param startIndex 从这个位置开始搜索（应在开括号之后）
 * @returns 闭合大括号之后的位置，未找到返回 -1
 */
function findMatchingBrace(css: string, startIndex: number): number {
  let depth = 1
  let i = startIndex

  while (i < css.length && depth > 0) {
    if (css[i] === '{') {
      depth++
    } else if (css[i] === '}') {
      depth--
    }
    i++
  }

  return depth === 0 ? i : -1
}

/**
 * 改写单个选择器组（可能包含逗号分隔的多个选择器）
 *
 * @param selector 选择器字符串（可能包含逗号）
 * @param scopedId scoped 属性标识
 * @returns 改写后的选择器
 */
function rewriteSelector(selector: string, scopedId: string): string {
  // 按逗号分割选择器（注意不要分割括号内的逗号）
  const selectors = splitSelectorList(selector)

  return selectors
    .map(s => rewriteSingleSelector(s.trim(), scopedId))
    .join(', ')
}

/**
 * 分割逗号分隔的选择器列表（忽略括号内的逗号）
 *
 * @param selectorList 选择器列表字符串
 * @returns 分割后的选择器数组
 */
function splitSelectorList(selectorList: string): string[] {
  const result: string[] = []
  let depth = 0
  let current = ''

  for (let i = 0; i < selectorList.length; i++) {
    const ch = selectorList[i]
    if (ch === '(') {
      depth++
      current += ch
    } else if (ch === ')') {
      depth--
      current += ch
    } else if (ch === ',' && depth === 0) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }

  if (current.trim()) {
    result.push(current)
  }

  return result
}

/**
 * 改写单个选择器
 *
 * 将 scoped 属性选择器添加到最后一个简单选择器上。
 * 伪元素（::before, ::after 等）需要放在属性选择器之后。
 *
 * @param selector 单个选择器
 * @param scopedId scoped 属性标识
 * @returns 改写后的选择器
 */
function rewriteSingleSelector(selector: string, scopedId: string): string {
  // 匹配末尾的伪元素（::before, ::after, ::first-line, ::first-letter, ::selection, ::placeholder 等）
  const pseudoElementRe = /(::(?:before|after|first-line|first-letter|selection|placeholder|backdrop|marker|spelling-error|grammar-error)[\s\S]*)$/
  const pseudoMatch = selector.match(pseudoElementRe)

  let baseSelector = selector
  let pseudoElement = ''

  if (pseudoMatch) {
    baseSelector = selector.slice(0, selector.length - pseudoMatch[0].length)
    pseudoElement = pseudoMatch[0]
  }

  // 匹配末尾的伪类（:hover, :focus, :active 等）
  const pseudoClassRe = /(:(?:hover|focus|active|visited|link|first-child|last-child|nth-child\([^)]*\)|nth-of-type\([^)]*\)|not\([^)]*\)|root|empty|checked|disabled|enabled|valid|invalid|required|optional|read-only|read-write)[\s\S]*)$/
  const pseudoClassMatch = baseSelector.match(pseudoClassRe)

  let selectorBeforePseudo = baseSelector
  let pseudoClass = ''

  if (pseudoClassMatch) {
    selectorBeforePseudo = baseSelector.slice(0, baseSelector.length - pseudoClassMatch[0].length)
    pseudoClass = pseudoClassMatch[0]
  }

  // 去除末尾空白
  selectorBeforePseudo = selectorBeforePseudo.replace(/\s+$/, '')

  // 组装：baseSelector[scopedId]pseudoClass::pseudoElement
  return `${selectorBeforePseudo}[${scopedId}]${pseudoClass}${pseudoElement}`
}

// ============================================================
// 主编译函数
// ============================================================

/**
 * 编译 SFC 描述符为 JS 模块
 *
 * @param descriptor SFC 描述符
 * @returns 编译结果
 *
 * @example
 *   const descriptor = parseSFC(source, 'App.lyt')
 *   const result = compileSFC(descriptor)
 *   console.log(result.code)    // JS 模块代码
 *   console.log(result.styles)  // CSS 样式数组
 *   console.log(result.scopedId) // data-v-abc123
 */
export function compileSFC(descriptor: SFCDescriptor): SFCCompileResult {
  const { template, script, styles, filename } = descriptor

  // 生成 scopedId（基于文件名和完整源内容）
  const fullContent = [
    template?.content || '',
    script?.content || '',
    ...styles.map(s => s.content),
  ].join('\x00')

  const scopedId = generateScopedId(filename, fullContent)

  // 1. 编译 template → render 函数代码
  let renderCode = 'null'
  if (template) {
    const compileResult = compile(template.content)
    renderCode = `function(_ctx) { return ${compileResult.code} }`
  }

  // 2. 提取 script 中的 export default 内容
  let scriptOptions = '{}'
  if (script) {
    const exported = extractExportDefault(script.content)
    if (exported) {
      scriptOptions = `{ ${exported} }`
    }
  }

  // 3. 处理样式
  const processedStyles: string[] = []
  for (const style of styles) {
    let css = style.content
    if (style.scoped) {
      css = scopeCSS(css, scopedId)
    }
    processedStyles.push(css)
  }

  // 4. 生成 JS 模块代码
  const code = generateModuleCode(renderCode, scriptOptions, scopedId, processedStyles)

  return {
    code,
    styles: processedStyles,
    scopedId,
  }
}

/**
 * 生成 JS 模块代码字符串
 *
 * @param renderCode render 函数代码
 * @param scriptOptions 组件选项对象代码
 * @param scopedId scoped 属性标识
 * @param styles 样式数组
 * @returns JS 模块代码字符串
 */
function generateModuleCode(
  renderCode: string,
  scriptOptions: string,
  scopedId: string,
  styles: string[]
): string {
  const lines: string[] = []

  lines.push('// Generated by Lyt.js SFC Compiler')
  lines.push('')
  lines.push(`const _sfcId = '${scopedId}'`)
  lines.push('')

  // 样式注入代码
  if (styles.length > 0) {
    lines.push('const _styles = [')
    for (const style of styles) {
      lines.push(`  ${JSON.stringify(style)},`)
    }
    lines.push(']')
    lines.push('')
    lines.push('function _injectStyles() {')
    lines.push('  for (const css of _styles) {')
    lines.push('    const style = document.createElement("style")')
    lines.push('    style.setAttribute("data-sfc-id", _sfcId)')
    lines.push('    style.textContent = css')
    lines.push('    document.head.appendChild(style)')
    lines.push('  }')
    lines.push('}')
    lines.push('')
    lines.push('_injectStyles()')
    lines.push('')
  }

  // 组件定义
  lines.push('export default {')
  lines.push(`  __sfcId: _sfcId,`)
  lines.push(`  render: ${renderCode},`)
  lines.push(`  ...${scriptOptions},`)
  lines.push('}')

  return lines.join('\n')
}
