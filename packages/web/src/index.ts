/**
 * @lytjs/web - Web 平台工具包
 *
 * 提供 Web 平台特定的工具和功能支持
 *
 * @module @lytjs/web
 * @version 6.0.0
 */

// CSS 变量支持
export {
  // 类型
  type CSSVarValue,
  type CSSVarChangeCallback,
  type CSSVarOptions,
  type ThemeConfig,

  // 工具函数
  normalizeVarName,
  stripVarPrefix,

  // 核心函数
  setCSSVar,
  getCSSVar,
  setCSSVars,
  getCSSVars,
  removeCSSVar,
  removeCSSVars,

  // 高级功能
  hasCSSVar,
  getAllCSSVars,
  toggleCSSVar,

  // 类
  CSSVarObserver,
  ThemeManager,
} from './css-vars';
