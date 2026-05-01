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
 * @deprecated 请使用 isUnknownEnv() 代替。保留此函数仅为向后兼容。
 * 检测当前是否为 SSR 环境（实际语义为"未知环境"）
 */
export const isSSR = isUnknownEnv;

/**
 * 获取完整的环境信息
 */
export function getEnvInfo(): EnvInfo {
  const browser = isBrowser();
  const node = isNode();

  return {
    isBrowser: browser,
    isNode: node,
    isSSR: !browser && !node,
    userAgent: browser ? navigator.userAgent : "",
  };
}
