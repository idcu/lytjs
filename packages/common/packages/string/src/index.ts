/**
 * @lytjs/common-string
 * 字符串处理工具函数集合
 */

/**
 * 首字母大写
 */
export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * 转换为 kebab-case
 */
export function kebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
}

/**
 * 转换为 camelCase
 */
export function camelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^[A-Z]/, (c) => c.toLowerCase())
}

/**
 * 转换为 PascalCase
 */
export function pascalCase(str: string): string {
  const camel = camelCase(str)
  return camel.charAt(0).toUpperCase() + camel.slice(1)
}

/**
 * camelCase 转 kebab-case
 */
export function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * kebab-case 转 camelCase
 */
export function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
}

/**
 * 转义正则表达式特殊字符
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 转义 HTML 特殊字符
 */
export function escapeHTML(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return str.replace(/[&<>"']/g, (c) => map[c] ?? c)
}

/**
 * 反转义 HTML 特殊字符
 */
export function unescapeHTML(str: string): string {
  const map: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
  }
  return str.replace(/&(?:amp|lt|gt|quot|#39|apos);/g, (entity) => map[entity] ?? entity)
}

/**
 * 去除首尾空白字符
 */
export function trim(str: string): string {
  return str.trim()
}

/**
 * 去除首尾指定字符
 */
export function trimChars(str: string, chars: string): string {
  const pattern = new RegExp(`^[${escapeRegExp(chars)}]+|[${escapeRegExp(chars)}]+$`, 'g')
  return str.replace(pattern, '')
}

/**
 * 重复字符串 n 次
 */
export function repeat(str: string, count: number): string {
  if (count <= 0) return ''
  return str.repeat(count)
}

/**
 * 在字符串开头填充
 */
export function padStart(str: string, length: number, fillStr: string = ' '): string {
  return str.padStart(length, fillStr)
}

/**
 * 在字符串末尾填充
 */
export function padEnd(str: string, length: number, fillStr: string = ' '): string {
  return str.padEnd(length, fillStr)
}

/**
 * 检查字符串是否以指定前缀开头
 */
export function startsWith(str: string, prefix: string, position: number = 0): boolean {
  return str.startsWith(prefix, position)
}

/**
 * 检查字符串是否以指定后缀结尾
 */
export function endsWith(str: string, suffix: string): boolean {
  return str.endsWith(suffix)
}

/**
 * 检查字符串是否包含子串
 */
export function includes(str: string, searchStr: string): boolean {
  return str.includes(searchStr)
}

/**
 * 分割字符串
 */
export function split(str: string, separator: string): string[] {
  return str.split(separator)
}

/**
 * 将字符串拆分为单词数组
 */
export function words(str: string): string[] {
  if (!str) return []
  return str.match(/[a-zA-Z0-9]+/g)?.flatMap((w) => {
    // Split camelCase boundaries: "helloWorld" -> ["hello", "World"]
    return w.match(/[a-z0-9]+|[A-Z][a-z0-9]*/g) ?? []
  }) ?? []
}

/**
 * 提取子串
 */
export function substring(str: string, start: number, end?: number): string {
  if (start < 0) {
    start = Math.max(0, str.length + start)
  }
  if (end === undefined) {
    return str.slice(start)
  }
  return str.slice(start, end)
}

/**
 * 截断字符串
 */
export function truncate(str: string, length: number, omission: string = '...'): string {
  if (str.length <= length) return str
  const truncatedLength = length - omission.length
  if (truncatedLength <= 0) return omission.slice(0, length)
  return str.slice(0, truncatedLength) + omission
}

/**
 * 简单模板引擎，使用 {key} 作为占位符
 */
export function template(
  str: string,
  data: Record<string, string | number | boolean>
): string {
  return str.replace(/\{(\w+)\}/g, (match, key) => {
    const value = data[key]
    return value !== undefined ? String(value) : match
  })
}

/**
 * 规范化 class 值
 */
export function normalizeClass(
  value: string | Record<string, any> | Array<any> | undefined | null | boolean | number
): string {
  if (!value) return ''
  if (typeof value === 'string') return value

  if (Array.isArray(value)) {
    return value.map(normalizeClass).filter(Boolean).join(' ')
  }

  if (typeof value === 'object') {
    const result: string[] = []
    for (const key in value) {
      if (value[key]) {
        result.push(key)
      }
    }
    return result.join(' ')
  }

  return ''
}

/**
 * 规范化 style 值
 */
export function normalizeStyle(
  value: string | Record<string, string | number> | Array<any> | undefined | null
): string {
  if (!value) return ''
  if (typeof value === 'string') return value

  if (Array.isArray(value)) {
    return value.map(normalizeStyle).filter(Boolean).join('; ')
  }

  if (typeof value === 'object') {
    const result: string[] = []
    for (const key in value) {
      const cssKey = camelToKebab(key)
      result.push(`${cssKey}: ${value[key]}`)
    }
    return result.join('; ')
  }

  return ''
}
