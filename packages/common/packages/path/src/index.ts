/**
 * @lytjs/common-path
 * 路径处理工具函数集合
 */

/**
 * 规范化路径：统一使用正斜杠，去除重复斜杠和末尾斜杠
 */
export function normalizePath(path: string): string {
  if (!path) return ''
  return path
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '')
    || '/'
}

/**
 * 拼接路径段
 */
export function joinPath(...segments: string[]): string {
  return normalizePath(
    segments
      .filter(Boolean)
      .join('/')
  )
}

/**
 * 获取目录名
 */
export function dirname(path: string): string {
  if (!path) return '.'
  const normalized = normalizePath(path)
  const lastSlash = normalized.lastIndexOf('/')
  if (lastSlash === -1) return '.'
  if (lastSlash === 0) return '/'
  return normalized.slice(0, lastSlash)
}

/**
 * 获取文件名（含扩展名）
 */
export function basename(path: string): string {
  if (!path) return ''
  const normalized = normalizePath(path)
  const lastSlash = normalized.lastIndexOf('/')
  return lastSlash === -1 ? normalized : normalized.slice(lastSlash + 1)
}

/**
 * 获取文件扩展名（含点号）
 */
export function extname(path: string): string {
  const base = basename(path)
  const lastDot = base.lastIndexOf('.')
  if (lastDot <= 0) return ''
  return base.slice(lastDot)
}

/**
 * 将路径模式转换为正则表达式
 * 支持 :param 参数、* 通配符、? 可选段
 */
export function pathToRegex(pattern: string): RegExp {
  const normalized = normalizePath(pattern)
  const regexStr = normalized
    .replace(/\/\*/g, '/(.*)')              // 通配符
    .replace(/\/:(\w+)\?/g, '(?:/([^/]+))?') // 可选参数（含前面的斜杠）
    .replace(/:(\w+)/g, '([^/]+)')           // 命名参数
  return new RegExp(`^${regexStr}$`)
}

/**
 * 路径匹配结果
 */
export interface PathMatchResult {
  params: Record<string, string>
}

/**
 * 匹配路径并提取参数
 */
export function matchPath(pattern: string, path: string): PathMatchResult | null {
  const normalized = normalizePath(path)
  const regex = pathToRegex(pattern)
  const match = normalized.match(regex)
  if (!match) return null

  const params: Record<string, string> = {}
  const normalizedPattern = normalizePath(pattern)

  // 提取参数名
  const paramNames: string[] = []
  const optionalParamRegex = /:(\w+)\?/g
  let m: RegExpExecArray | null
  while ((m = optionalParamRegex.exec(normalizedPattern)) !== null) {
    paramNames.push(m[1]!)
  }
  const requiredParamRegex = /:(\w+)(?!\?)/g
  while ((m = requiredParamRegex.exec(normalizedPattern)) !== null) {
    paramNames.push(m[1]!)
  }
  if (normalizedPattern.includes('*')) {
    paramNames.push('*')
  }

  for (let i = 0; i < paramNames.length; i++) {
    const value = match[i + 1]
    if (value !== undefined) {
      params[paramNames[i]!] = value
    }
  }

  return { params }
}

/**
 * 检查是否为绝对路径
 */
export function isAbsolute(path: string): boolean {
  return path.startsWith('/')
}

/**
 * 检查是否为相对路径
 */
export function isRelative(path: string): boolean {
  return !isAbsolute(path)
}

/**
 * 路径解析结果
 */
export interface ParsedPath {
  dir: string
  base: string
  name: string
  ext: string
}

/**
 * 解析路径
 */
export function parsePath(path: string): ParsedPath {
  const dir = dirname(path)
  const base = basename(path)
  const ext = extname(path)
  const name = ext ? base.slice(0, base.length - ext.length) : base
  return { dir, base, name, ext }
}

/**
 * 从基准路径解析目标路径
 */
export function resolvePath(from: string, to: string): string {
  if (isAbsolute(to)) return normalizePath(to)

  const normalizedFrom = normalizePath(from)
  const segments = normalizedFrom.split('/')

  const toSegments = to.split('/').filter(Boolean)
  for (const seg of toSegments) {
    if (seg === '..') {
      segments.pop()
    } else if (seg !== '.') {
      segments.push(seg)
    }
  }

  return normalizePath(segments.join('/'))
}
