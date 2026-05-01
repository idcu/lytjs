/**
 * @lytjs/common-env
 * 环境检测工具 - 检测当前运行环境（浏览器/Node/SSR）
 */

/**
 * 环境信息接口
 */
export interface EnvInfo {
  /** 是否为浏览器环境 */
  isBrowser: boolean;
  /** 是否为 Node.js 环境 */
  isNode: boolean;
  /** 是否为 SSR 环境 */
  isSSR: boolean;
  /** 用户代理字符串 */
  userAgent: string;
}

/**
 * 检测当前是否为浏览器环境
 */
export function isBrowser(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    typeof navigator !== "undefined"
  );
}

/**
 * 检测当前是否为 Node.js 环境
 */
export function isNode(): boolean {
  return (
    typeof process !== "undefined" &&
    process.versions != null &&
    process.versions.node != null
  );
}

/**
 * 检测当前是否为未知环境（既不是浏览器也不是 Node.js）
 * 注意：此函数仅表示"无法识别当前运行环境"，并不等同于 SSR 环境。
 * SSR 通常指在 Node.js 环境中执行服务端渲染，此时 isNode() 应返回 true。
 */
export function isUnknownEnv(): boolean {
  return !isBrowser() && !isNode();
}

/**
 * 检测当前是否为 SSR（服务端渲染）环境
 *
 * SSR 环境定义为：运行在 Node.js 中且不在浏览器中。
 * 注意：Node.js 环境也可以运行非 SSR 代码（如 CLI 工具、构建脚本等），
 * 因此此函数仅表示"当前处于服务端渲染上下文"的合理推断。
 * 如果需要精确的 SSR 状态，建议通过框架级别的上下文注入来判断。
 */
export function isSSR(): boolean {
  return isNode() && !isBrowser();
}

/**
 * 获取完整的环境信息
 */
export function getEnvInfo(): EnvInfo {
  const browser = isBrowser();
  const node = isNode();

  return {
    isBrowser: browser,
    isNode: node,
    isSSR: isSSR(),
    userAgent: browser ? navigator.userAgent : "",
  };
}
