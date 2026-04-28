/**
 * @lytjs/common-env
 * 环境检测工具 - 检测当前运行环境（浏览器/Node/SSR）
 */

/**
 * 环境信息接口
 */
export interface EnvInfo {
  /** 是否为浏览器环境 */
  isBrowser: boolean
  /** 是否为 Node.js 环境 */
  isNode: boolean
  /** 是否为 SSR 环境 */
  isSSR: boolean
  /** 用户代理字符串 */
  userAgent: string
}

/**
 * 检测当前是否为浏览器环境
 */
export function isBrowser(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    typeof navigator !== 'undefined'
  )
}

/**
 * 检测当前是否为 Node.js 环境
 */
export function isNode(): boolean {
  return (
    typeof process !== 'undefined' &&
    process.versions != null &&
    process.versions.node != null
  )
}

/**
 * 检测当前是否为 SSR 环境
 * SSR 环境既不是浏览器也不是 Node.js（或无法确定）
 */
export function isSSR(): boolean {
  return !isBrowser() && !isNode()
}

/**
 * 获取完整的环境信息
 */
export function getEnvInfo(): EnvInfo {
  const browser = isBrowser()
  const node = isNode()

  return {
    isBrowser: browser,
    isNode: node,
    isSSR: !browser && !node,
    userAgent: browser ? navigator.userAgent : '',
  }
}
