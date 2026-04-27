/**
 * miniapp/shared-constants.ts - 小程序共享常量
 *
 * 提取小程序渲染器和编译器共用的常量映射，
 * 避免在 miniapp-renderer.ts 和 miniapp-compiler.ts 中重复定义。
 */

/* ================================================================
 *  HTML 标签到小程序组件的映射
 * ================================================================ */

/**
 * HTML 标签到小程序组件名的映射
 *
 * 小程序使用自定义组件而非 HTML 标签：
 *   - div / section / header 等 → view
 *   - span / p / h1-h6 → text
 *   - img → image
 *   - a → navigator
 *   - input → input
 *   - scroll → scroll-view
 *   - list → （小程序无直接对应，使用 view + wx:for）
 */
export const MINIAPP_COMPONENT_MAP: Record<string, string> = {
  'div': 'view',
  'span': 'text',
  'p': 'text',
  'h1': 'text', 'h2': 'text', 'h3': 'text',
  'h4': 'text', 'h5': 'text', 'h6': 'text',
  'img': 'image',
  'input': 'input',
  'textarea': 'textarea',
  'button': 'button',
  'scroll': 'scroll-view',
  'list': 'view',
  'a': 'navigator',
  'ul': 'view', 'ol': 'view', 'li': 'view',
  'form': 'form',
  'header': 'view', 'footer': 'view', 'nav': 'view',
  'main': 'view', 'section': 'view',
  'article': 'view', 'aside': 'view',
};

/* ================================================================
 *  事件映射
 * ================================================================ */

/**
 * DOM 事件名到小程序事件名的映射
 *
 * 小程序使用 bind/catch 前缀绑定事件，事件名与 Web 略有不同：
 *   - click → tap（微信/支付宝/字节通用）
 *   - input / change / submit 等保持一致
 */
export const EVENT_PREFIX_MAP: Record<string, string> = {
  'click': 'tap',
  'input': 'input',
  'change': 'change',
  'submit': 'submit',
  'focus': 'focus',
  'blur': 'blur',
  'touchstart': 'touchstart',
  'touchend': 'touchend',
  'touchmove': 'touchmove',
  'scroll': 'scroll',
  'longpress': 'longpress',
};
