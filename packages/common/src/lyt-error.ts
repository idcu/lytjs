/**
 * Lyt.js LytError 错误类
 *
 * 统一的错误类，包含错误码、分类、详情信息。
 * 提供工厂函数用于创建特定模块的错误。
 * 纯原生零依赖 TypeScript 实现。
 */

import {
  LytErrorCodes,
  getErrorMessage,
  getCategory,
} from './error-codes';

// ============================================================
// 源位置信息接口
// ============================================================

/** 源代码位置 */
export interface SourceLocation {
  /** 文件名 */
  file?: string;
  /** 行号（从 1 开始） */
  line?: number;
  /** 列号（从 1 开始） */
  column?: number;
  /** 源代码片段 */
  source?: string;
}

// ============================================================
// LytError 类
// ============================================================

export class LytError extends Error {
  /** 错误码 */
  code: LytErrorCodes;
  /** 错误分类 */
  category: string;
  /** 附加详情 */
  details?: any;
  /** 源代码位置 */
  loc?: SourceLocation;

  constructor(code: LytErrorCodes, message?: string, details?: any) {
    super(message || getErrorMessage(code));
    this.name = 'LytError';
    this.code = code;
    this.category = getCategory(code);
    this.details = details;
  }
}

// ============================================================
// 工厂函数
// ============================================================

/**
 * 创建编译器错误（带源位置信息）
 *
 * @param code  错误码
 * @param loc   源代码位置
 * @param message 自定义消息（可选）
 */
export function createCompilerError(
  code: LytErrorCodes,
  loc?: SourceLocation,
  message?: string,
): LytError {
  const err = new LytError(code, message);
  err.loc = loc;
  return err;
}

/**
 * 创建渲染器错误（带 VNode 上下文）
 *
 * @param code   错误码
 * @param vnode  相关的 VNode（可选）
 * @param message 自定义消息（可选）
 */
export function createRendererError(
  code: LytErrorCodes,
  vnode?: any,
  message?: string,
): LytError {
  const err = new LytError(code, message);
  err.details = { vnode };
  return err;
}

/**
 * 创建组件错误（带组件名称）
 *
 * @param code      错误码
 * @param component 组件名称或组件实例（可选）
 * @param message   自定义消息（可选）
 */
export function createComponentError(
  code: LytErrorCodes,
  component?: string | { name?: string },
  message?: string,
): LytError {
  const componentName = typeof component === 'string'
    ? component
    : component?.name;
  const err = new LytError(code, message);
  err.details = { component: componentName };
  return err;
}
