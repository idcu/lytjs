// Lyt.js 主题切换插件
//
// 用法：
//   import { createTheme } from '@lytjs/plugin-theme'
//   const theme = createTheme({
//     default: 'light',
//     storageKey: 'lyt_theme',
//     themes: {
//       light: { '--bg': '#fff', '--text': '#333' },
//       dark: { '--bg': '#333', '--text': '#fff' },
//     },
//   })
//   app.use(theme)
//   // 使用：theme.toggle()
//   //        theme.set('dark')
//   //        theme.current // 当前主题
//
// ======================== 类型定义 ========================

/** 主题配置 */
interface ThemeConfig {
  /** CSS 变量键值对 */
  [key: string]: string
}

/** 主题插件配置选项 */
interface ThemeOptions {
  /** 默认主题，默认 'light' */
  default?: string
  /** localStorage 中存储主题的 key，默认 'lyt_theme' */
  storageKey?: string
  /** 主题配置对象 */
  themes?: {
    [themeName: string]: ThemeConfig
  }
  /** 主题切换时的回调 */
  onChange?: (newTheme: string, oldTheme: string) => void
  /** 是否自动检测系统主题偏好 */
  autoDetect?: boolean
  /** 是否添加 data-theme 属性到 html 标签 */
  useDataAttribute?: boolean
  /** 自定义 CSS 变量前缀，默认 '--lyt-' */
  cssPrefix?: string
  /** 是否开启调试模式 */
  debug?: boolean
}

/** 主题插件实例 */
interface ThemePlugin {
  /** 安装到 Lyt 应用 */
  install: (app: any, options?: any) => void
  /** 当前主题名称 */
  readonly current: string
  /** 切换到指定主题 */
  set(themeName: string): void
  /** 切换主题（在预设主题间循环） */
  toggle(): void
  /** 重置为默认主题 */
  reset(): void
  /** 获取所有可用主题列表 */
  list(): string[]
  /** 动态添加/更新主题 */
  addTheme(name: string, config: ThemeConfig): void
  /** 移除主题 */
  removeTheme(name: string): void
  /** 获取当前主题的 CSS 变量配置 */
  getConfig(): ThemeConfig | null
  /** 获取指定主题的 CSS 变量配置 */
  getConfigFor(themeName: string): ThemeConfig | null
  /** 动态设置 CSS 变量（不保存到持久化） */
  setVariable(key: string, value: string): void
  /** 清除动态设置的 CSS 变量 */
  clearVariable(key: string): void
  /** 清除所有动态变量 */
  clearVariables(): void
  /** 获取系统偏好主题（'light' 或 'dark'） */
  getSystemPreference(): 'light' | 'dark'
  /** 监听系统主题变化 */
  watchSystemPreference(callback: (theme: 'light' | 'dark') => void): () => void
}

// ======================== 内置主题 ========================

const BUILT_IN_THEMES: { [key: string]: ThemeConfig } = {
  light: {
    '--bg': '#ffffff',
    '--bg-secondary': '#f5f5f5',
    '--text': '#333333',
    '--text-secondary': '#666666',
    '--text-muted': '#999999',
    '--primary': '#42b883',
    '--primary-hover': '#3aa876',
    '--secondary': '#35495e',
    '--success': '#10b981',
    '--warning': '#f59e0b',
    '--error': '#ef4444',
    '--info': '#3b82f6',
    '--border': '#e5e7eb',
    '--shadow': 'rgba(0, 0, 0, 0.1)',
  },
  dark: {
    '--bg': '#1a1a1a',
    '--bg-secondary': '#2d2d2d',
    '--text': '#e5e5e5',
    '--text-secondary': '#a3a3a3',
    '--text-muted': '#737373',
    '--primary': '#42b883',
    '--primary-hover': '#3aa876',
    '--secondary': '#94a3b8',
    '--success': '#10b981',
    '--warning': '#f59e0b',
    '--error': '#ef4444',
    '--info': '#3b82f6',
    '--border': '#404040',
    '--shadow': 'rgba(0, 0, 0, 0.3)',
  },
}

// ======================== 工具函数 ========================

/**
 * 获取根元素（html）
 */
function getRootElement(): HTMLElement {
  return document.documentElement
}

/**
 * 日志函数
 */
function createLogger(debug: boolean) {
  return (...args: any[]) => {
    if (debug) {
      console.log('[Theme]', ...args)
    }
  }
}

// ======================== 核心实现 ========================

/**
 * 创建主题切换插件实例
 * @param options 主题配置
 * @returns ThemePlugin 插件实例
 */
function createTheme(options: ThemeOptions = {}): ThemePlugin {
  const {
    default: defaultTheme = 'light',
    storageKey = 'lyt_theme',
    themes: customThemes = {},
    onChange,
    autoDetect = true,
    useDataAttribute = true,
    cssPrefix = '--lyt-',
    debug = false,
  } = options

  const log = createLogger(debug)

  // 合并内置主题和自定义主题
  const themes = { ...BUILT_IN_THEMES, ...customThemes }
  let currentThemeName: string = defaultTheme
  const dynamicVariables: { [key: string]: string } = {}

  /**
   * 从存储加载主题
   */
  function loadFromStorage(): string | null {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved && themes[saved]) {
        return saved
      }
    } catch {
      // localStorage 不可用时忽略
    }
    return null
  }

  /**
   * 保存主题到存储
   */
  function saveToStorage(themeName: string): void {
    try {
      localStorage.setItem(storageKey, themeName)
    } catch {
      // localStorage 不可用时忽略
    }
  }

  /**
   * 获取系统偏好主题
   */
  function getSystemPreference(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  /**
   * 监听系统主题变化
   */
  function watchSystemPreference(callback: (theme: 'light' | 'dark') => void): () => void {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return () => {}
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    function handleChange(e: MediaQueryListEvent) {
      callback(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }

  /**
   * 应用主题的 CSS 变量
   */
  function applyThemeVariables(themeName: string): void {
    const root = getRootElement()
    const config = themes[themeName]

    if (!config) {
      log(`theme '${themeName}' not found`)
      return
    }

    log(`applying theme '${themeName}'`, config)

    // 应用主题变量
    Object.entries(config).forEach(([key, value]) => {
      const cssVar = key.startsWith('--') ? key : `${cssPrefix}${key}`
      root.style.setProperty(cssVar, value)
    })

    // 应用动态变量（优先级高于主题变量）
    Object.entries(dynamicVariables).forEach(([key, value]) => {
      const cssVar = key.startsWith('--') ? key : `${cssPrefix}${key}`
      root.style.setProperty(cssVar, value)
    })

    // 设置 data-theme 属性
    if (useDataAttribute) {
      root.setAttribute('data-theme', themeName)
    }

    // 设置 color-scheme
    root.style.setProperty('color-scheme', themeName === 'dark' ? 'dark' : 'light')
  }

  /**
   * 设置主题
   */
  function set(themeName: string): void {
    if (!themes[themeName]) {
      log(`theme '${themeName}' not found, available:`, Object.keys(themes))
      return
    }

    const oldTheme = currentThemeName
    if (oldTheme === themeName) return

    currentThemeName = themeName
    applyThemeVariables(themeName)
    saveToStorage(themeName)

    if (onChange) {
      onChange(themeName, oldTheme)
    }

    log(`theme changed from '${oldTheme}' to '${themeName}'`)
  }

  /**
   * 切换主题（在所有可用主题间循环）
   */
  function toggle(): void {
    const themeList = Object.keys(themes)
    const currentIndex = themeList.indexOf(currentThemeName)
    const nextIndex = (currentIndex + 1) % themeList.length
    set(themeList[nextIndex])
  }

  /**
   * 重置为默认主题
   */
  function reset(): void {
    set(defaultTheme)
  }

  /**
   * 获取所有可用主题列表
   */
  function list(): string[] {
    return Object.keys(themes)
  }

  /**
   * 添加/更新主题
   */
  function addTheme(name: string, config: ThemeConfig): void {
    themes[name] = config
    log(`added/updated theme '${name}'`, config)

    // 如果当前正在使用这个主题，重新应用
    if (currentThemeName === name) {
      applyThemeVariables(name)
    }
  }

  /**
   * 移除主题
   */
  function removeTheme(name: string): void {
    if (name === defaultTheme) {
      log('cannot remove default theme')
      return
    }

    delete themes[name]

    // 如果当前正在使用这个主题，切换到默认
    if (currentThemeName === name) {
      set(defaultTheme)
    }

    log(`removed theme '${name}'`)
  }

  /**
   * 获取当前主题的配置
   */
  function getConfig(): ThemeConfig | null {
    return themes[currentThemeName] || null
  }

  /**
   * 获取指定主题的配置
   */
  function getConfigFor(themeName: string): ThemeConfig | null {
    return themes[themeName] || null
  }

  /**
   * 设置动态 CSS 变量
   */
  function setVariable(key: string, value: string): void {
    const cssVar = key.startsWith('--') ? key : `${cssPrefix}${key}`
    dynamicVariables[cssVar] = value
    getRootElement().style.setProperty(cssVar, value)
    log(`set variable '${cssVar}' = '${value}'`)
  }

  /**
   * 清除动态 CSS 变量
   */
  function clearVariable(key: string): void {
    const cssVar = key.startsWith('--') ? key : `${cssPrefix}${key}`
    delete dynamicVariables[cssVar]
    getRootElement().style.removeProperty(cssVar)
    log(`cleared variable '${cssVar}'`)
  }

  /**
   * 清除所有动态 CSS 变量
   */
  function clearVariables(): void {
    Object.keys(dynamicVariables).forEach((key) => {
      getRootElement().style.removeProperty(key)
    })
    Object.keys(dynamicVariables).forEach((key) => delete dynamicVariables[key])
    // 重新应用主题变量，恢复覆盖的变量
    applyThemeVariables(currentThemeName)
    log('cleared all dynamic variables')
  }

  // 初始化
  function init(): void {
    // 尝试从存储加载
    let initialTheme = loadFromStorage()

    // 如果没有存储的主题且开启了自动检测，使用系统偏好
    if (!initialTheme && autoDetect) {
      const systemPref = getSystemPreference()
      // 确保系统偏好是我们支持的主题
      initialTheme = themes[systemPref] ? systemPref : defaultTheme
    }

    // 回退到默认主题
    if (!initialTheme) {
      initialTheme = defaultTheme
    }

    log(`initializing with theme '${initialTheme}'`)
    currentThemeName = initialTheme
    applyThemeVariables(initialTheme)
  }

  init()

  // 构造插件实例
  const themePlugin: ThemePlugin = {
    /**
     * 安装插件到 Lyt 应用
     * 向 app 注入 $theme 对象
     */
    install(app: any, _options?: any): void {
      // 注入全局属性 $theme
      app.config = app.config || {}
      app.config.globalProperties = app.config.globalProperties || {}

      app.config.globalProperties.$theme = themePlugin

      // 如果 app 提供 provide 方法，也通过 provide 注入
      if (typeof app.provide === 'function') {
        app.provide('theme', themePlugin)
      }
    },

    get current() {
      return currentThemeName
    },

    set,
    toggle,
    reset,
    list,
    addTheme,
    removeTheme,
    getConfig,
    getConfigFor,
    setVariable,
    clearVariable,
    clearVariables,
    getSystemPreference,
    watchSystemPreference,
  }

  return themePlugin
}

export { createTheme, BUILT_IN_THEMES }
export type { ThemeOptions, ThemePlugin, ThemeConfig }
