/**
 * Lyt.js 主题系统
 * 基于 CSS 自定义属性实现主题切换，支持亮色/暗色模式
 */

// ================================================================
//  类型定义
// ================================================================

export interface ThemeConfig {
  // 色彩系统
  colors: {
    primary: string
    secondary: string
    success: string
    warning: string
    danger: string
    info: string
    background: string
    foreground: string
    muted: string
    border: string
    card: string
  }
  // 字体排版
  font: {
    family: string
    sizeBase: string
    sizeSm: string
    sizeLg: string
    sizeXl: string
  }
  // 间距系统
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
  }
  // 圆角
  radius: {
    sm: string
    md: string
    lg: string
    full: string
  }
  // 阴影
  shadows: {
    sm: string
    md: string
    lg: string
  }
  // 暗色模式覆盖
  dark?: Partial<ThemeConfig>
}

// ================================================================
//  默认主题
// ================================================================

/** 默认亮色主题 */
export const defaultLightTheme: ThemeConfig = {
  colors: {
    primary: '#409eff',
    secondary: '#6366f1',
    success: '#67c23a',
    warning: '#e6a23c',
    danger: '#f56c6c',
    info: '#909399',
    background: '#ffffff',
    foreground: '#303133',
    muted: '#606266',
    border: '#dcdfe6',
    card: '#ffffff',
  },
  font: {
    family: 'inherit',
    sizeBase: '14px',
    sizeSm: '12px',
    sizeLg: '16px',
    sizeXl: '20px',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 2px 12px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
  },
  dark: undefined,
}

/** 默认暗色主题 */
export const defaultDarkTheme: ThemeConfig = {
  colors: {
    primary: '#66b1ff',
    secondary: '#818cf8',
    success: '#85ce61',
    warning: '#ebb563',
    danger: '#f78989',
    info: '#a6a9ad',
    background: '#1f2937',
    foreground: '#f9fafb',
    muted: '#9ca3af',
    border: '#374151',
    card: '#111827',
  },
  font: {
    family: 'inherit',
    sizeBase: '14px',
    sizeSm: '12px',
    sizeLg: '16px',
    sizeXl: '20px',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.2)',
    md: '0 2px 12px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.3)',
  },
  dark: undefined,
}

// ================================================================
//  主题状态管理
// ================================================================

/** 当前活跃主题 */
let activeTheme: ThemeConfig = { ...defaultLightTheme }

/** 暗色模式状态 */
let darkMode = false

// ================================================================
//  深度合并工具
// ================================================================

function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target } as any
  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceVal = source[key]
    const targetVal = target[key]
    if (
      sourceVal !== null &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal !== null &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(targetVal, sourceVal)
    } else if (sourceVal !== undefined) {
      result[key] = sourceVal
    }
  }
  return result as T
}

// ================================================================
//  核心 API
// ================================================================

/**
 * 创建自定义主题
 * 基于默认亮色主题进行深度合并
 */
export function createTheme(overrides: Partial<ThemeConfig>): ThemeConfig {
  return deepMerge(defaultLightTheme, overrides)
}

/**
 * 获取当前活跃主题
 */
export function getTheme(): ThemeConfig {
  return { ...activeTheme }
}

/**
 * 设置当前活跃主题
 */
export function setTheme(theme: ThemeConfig): void {
  activeTheme = { ...theme }
  applyTheme(activeTheme)
}

/**
 * 切换暗色/亮色模式
 */
export function toggleDarkMode(): void {
  darkMode = !darkMode
  if (darkMode) {
    activeTheme = { ...defaultDarkTheme }
  } else {
    activeTheme = { ...defaultLightTheme }
  }
  applyTheme(activeTheme)
}

/**
 * 检查当前是否为暗色模式
 */
export function isDarkMode(): boolean {
  return darkMode
}

/**
 * 重置主题为默认亮色主题
 */
export function resetThemeToDefault(): void {
  darkMode = false
  activeTheme = { ...defaultLightTheme }
  applyTheme(activeTheme)
}

// ================================================================
//  CSS 变量操作
// ================================================================

/**
 * 将主题应用到 document（设置 CSS 自定义属性到 :root）
 */
export function applyTheme(theme: ThemeConfig): void {
  const vars = generateCSSVariables(theme)
  // 只要有 document 和 documentElement 就尝试应用（包括 mock 环境）
  if (typeof document !== 'undefined' && document.documentElement) {
    const root = document.documentElement
    // 即使 style.setProperty 不存在也尝试直接赋值，兼容 mock 环境
    if (root.style && typeof root.style.setProperty === 'function') {
      for (const [key, value] of Object.entries(vars)) {
        root.style.setProperty(key, value)
      }
    }
  }
}

/**
 * 获取 CSS 变量值
 */
export function getCSSVar(name: string): string {
  if (typeof document !== 'undefined' && document.documentElement) {
    if (typeof getComputedStyle === 'function') {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    }
    // 如果没有 getComputedStyle 但有 style.getPropertyValue，也尝试使用
    if (document.documentElement.style && typeof document.documentElement.style.getPropertyValue === 'function') {
      return document.documentElement.style.getPropertyValue(name).trim()
    }
  }
  return ''
}

/**
 * 设置 CSS 变量值
 */
export function setCSSVar(name: string, value: string): void {
  if (typeof document !== 'undefined' && document.documentElement && document.documentElement.style) {
    if (typeof document.documentElement.style.setProperty === 'function') {
      document.documentElement.style.setProperty(name, value)
    }
  }
}

/**
 * 从主题配置生成 CSS 变量映射
 * 按照 --lyt-* 命名规范
 */
export function generateCSSVariables(theme: ThemeConfig): Record<string, string> {
  const vars: Record<string, string> = {}

  // 色彩
  vars['--lyt-color-primary'] = theme.colors.primary
  vars['--lyt-color-secondary'] = theme.colors.secondary
  vars['--lyt-color-success'] = theme.colors.success
  vars['--lyt-color-warning'] = theme.colors.warning
  vars['--lyt-color-danger'] = theme.colors.danger
  vars['--lyt-color-info'] = theme.colors.info
  vars['--lyt-color-bg'] = theme.colors.background
  vars['--lyt-color-fg'] = theme.colors.foreground
  vars['--lyt-color-muted'] = theme.colors.muted
  vars['--lyt-color-border'] = theme.colors.border
  vars['--lyt-color-card'] = theme.colors.card

  // 字体
  vars['--lyt-font-family'] = theme.font.family
  vars['--lyt-font-size-base'] = theme.font.sizeBase
  vars['--lyt-font-size-sm'] = theme.font.sizeSm
  vars['--lyt-font-size-lg'] = theme.font.sizeLg
  vars['--lyt-font-size-xl'] = theme.font.sizeXl

  // 间距
  vars['--lyt-spacing-xs'] = theme.spacing.xs
  vars['--lyt-spacing-sm'] = theme.spacing.sm
  vars['--lyt-spacing-md'] = theme.spacing.md
  vars['--lyt-spacing-lg'] = theme.spacing.lg
  vars['--lyt-spacing-xl'] = theme.spacing.xl

  // 圆角
  vars['--lyt-radius-sm'] = theme.radius.sm
  vars['--lyt-radius-md'] = theme.radius.md
  vars['--lyt-radius-lg'] = theme.radius.lg
  vars['--lyt-radius-full'] = theme.radius.full

  // 阴影
  vars['--lyt-shadow-sm'] = theme.shadows.sm
  vars['--lyt-shadow-md'] = theme.shadows.md
  vars['--lyt-shadow-lg'] = theme.shadows.lg

  return vars
}

// ================================================================
//  useTheme Hook
// ================================================================

/**
 * 主题 Hook，供组件内部使用
 */
export function useTheme() {
  return {
    theme: getTheme(),
    isDark: isDarkMode(),
    toggle: toggleDarkMode,
    set: setTheme,
    cssVar: getCSSVar,
    setCSSVar: setCSSVar,
  }
}
