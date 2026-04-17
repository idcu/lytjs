/**
 * CSS 变量导出（JS 对象形式，方便运行时使用）
 */

export const cssVariables = {
  primary: '#409eff',
  success: '#67c23a',
  warning: '#e6a23c',
  danger: '#f56c6c',
  info: '#909399',
  textColor: '#303133',
  textColorSecondary: '#606266',
  borderColor: '#dcdfe6',
  backgroundColor: '#ffffff',
  fontSizeSmall: '12px',
  fontSizeBase: '14px',
  fontSizeLarge: '16px',
  borderRadius: '4px',
  borderRadiusRound: '20px',
  shadow: '0 2px 12px 0 rgba(0, 0, 0, 0.1)',
  transitionDuration: '0.3s',
}

/**
 * 将 CSS 变量注入到 document root
 */
export function injectCSSVariables(custom?: Partial<typeof cssVariables>): void {
  const vars = { ...cssVariables, ...custom }
  const root = document.documentElement
  Object.entries(vars).forEach(([key, value]) => {
    const cssKey = `--lyt-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
    root.style.setProperty(cssKey, value)
  })
}

/**
 * 生成 CSS 自定义属性字符串
 */
export function generateCSSVariableString(custom?: Partial<typeof cssVariables>): string {
  const vars = { ...cssVariables, ...custom }
  return `:root {\n${Object.entries(vars)
    .map(
      ([key, value]) =>
        `  --lyt-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value};`
    )
    .join('\n')}\n}`
}
