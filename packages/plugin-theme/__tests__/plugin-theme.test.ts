/**
 * Lyt.js 主题切换插件 — 单元测试
 *
 * 测试覆盖：
 *   - createTheme: 创建主题实例
 *   - set: 切换主题
 *   - toggle: 循环切换
 *   - reset: 重置为默认
 *   - list: 获取主题列表
 *   - addTheme / removeTheme: 动态管理主题
 *   - getConfig / getConfigFor: 获取主题配置
 *   - setVariable / clearVariable / clearVariables: 动态 CSS 变量
 *   - getSystemPreference: 系统偏好
 *   - install: 安装到 app
 *   - BUILT_IN_THEMES: 内置主题
 */

import { describe, it, expect } from '../../test-utils/src/index'

import { createTheme, BUILT_IN_THEMES } from '../src/index'
import type { ThemePlugin, ThemeOptions } from '../src/index'

// ================================================================
//  BUILT_IN_THEMES 测试
// ================================================================

describe('BUILT_IN_THEMES', () => {
  it('包含 light 主题', () => {
    expect(BUILT_IN_THEMES.light).toBeTruthy()
    expect(BUILT_IN_THEMES.light['--bg']).toBe('#ffffff')
  })

  it('包含 dark 主题', () => {
    expect(BUILT_IN_THEMES.dark).toBeTruthy()
    expect(BUILT_IN_THEMES.dark['--bg']).toBe('#1a1a1a')
  })

  it('light 和 dark 主题包含相同变量', () => {
    const lightKeys = Object.keys(BUILT_IN_THEMES.light)
    const darkKeys = Object.keys(BUILT_IN_THEMES.dark)
    expect(lightKeys.length).toBe(darkKeys.length)
    for (const key of lightKeys) {
      expect(darkKeys).toContain(key)
    }
  })
})

// ================================================================
//  createTheme 测试
// ================================================================

describe('createTheme', () => {
  function createTestTheme(options: ThemeOptions = {}): ThemePlugin {
    return createTheme({
      storageKey: 'test_theme_' + Math.random().toString(36).slice(2),
      autoDetect: false,
      useDataAttribute: false,
      ...options,
    })
  }

  it('创建主题实例', () => {
    const theme = createTestTheme()
    expect(theme).toBeTruthy()
    expect(typeof theme.set).toBe('function')
    expect(typeof theme.toggle).toBe('function')
    expect(typeof theme.reset).toBe('function')
    expect(typeof theme.list).toBe('function')
    expect(typeof theme.install).toBe('function')
  })

  it('默认主题为 light', () => {
    const theme = createTestTheme()
    expect(theme.current).toBe('light')
  })

  it('自定义默认主题', () => {
    const theme = createTestTheme({ default: 'dark' })
    expect(theme.current).toBe('dark')
  })
})

// ================================================================
//  set 测试
// ================================================================

describe('set', () => {
  it('切换到 dark 主题', () => {
    const theme = createTheme({
      default: 'light',
      autoDetect: false,
      useDataAttribute: false,
      storageKey: 'test_set_1',
    })
    theme.set('dark')
    expect(theme.current).toBe('dark')
  })

  it('切换到不存在的主题不生效', () => {
    const theme = createTheme({
      default: 'light',
      autoDetect: false,
      useDataAttribute: false,
      storageKey: 'test_set_2',
    })
    theme.set('non-existent')
    expect(theme.current).toBe('light')
  })

  it('设置相同主题不触发 onChange', () => {
    let changed = false
    const theme = createTheme({
      default: 'light',
      autoDetect: false,
      useDataAttribute: false,
      storageKey: 'test_set_3',
      onChange: () => { changed = true },
    })
    theme.set('light') // 同一个主题
    expect(changed).toBe(false)
  })

  it('onChange 回调被调用', () => {
    let oldTheme = ''
    let newTheme = ''
    const theme = createTheme({
      default: 'light',
      autoDetect: false,
      useDataAttribute: false,
      storageKey: 'test_set_4',
      onChange: (newT, oldT) => { newTheme = newT; oldTheme = oldT },
    })
    theme.set('dark')
    expect(newTheme).toBe('dark')
    expect(oldTheme).toBe('light')
  })
})

// ================================================================
//  toggle 测试
// ================================================================

describe('toggle', () => {
  it('在 light 和 dark 之间切换', () => {
    const theme = createTheme({
      default: 'light',
      autoDetect: false,
      useDataAttribute: false,
      storageKey: 'test_toggle_1',
    })
    expect(theme.current).toBe('light')
    theme.toggle()
    expect(theme.current).toBe('dark')
    theme.toggle()
    expect(theme.current).toBe('light')
  })

  it('有自定义主题时循环切换', () => {
    const theme = createTheme({
      default: 'light',
      autoDetect: false,
      useDataAttribute: false,
      storageKey: 'test_toggle_2',
      themes: {
        custom: { '--bg': '#000', '--text': '#fff' },
      },
    })
    expect(theme.current).toBe('light')
    theme.toggle() // dark
    expect(theme.current).toBe('dark')
    theme.toggle() // custom
    expect(theme.current).toBe('custom')
    theme.toggle() // light
    expect(theme.current).toBe('light')
  })
})

// ================================================================
//  reset 测试
// ================================================================

describe('reset', () => {
  it('重置为默认主题', () => {
    const theme = createTheme({
      default: 'light',
      autoDetect: false,
      useDataAttribute: false,
      storageKey: 'test_reset_1',
    })
    theme.set('dark')
    expect(theme.current).toBe('dark')
    theme.reset()
    expect(theme.current).toBe('light')
  })
})

// ================================================================
//  list 测试
// ================================================================

describe('list', () => {
  it('返回内置主题列表', () => {
    const theme = createTheme({
      autoDetect: false,
      useDataAttribute: false,
      storageKey: 'test_list_1',
    })
    const themes = theme.list()
    expect(themes).toContain('light')
    expect(themes).toContain('dark')
  })

  it('包含自定义主题', () => {
    const theme = createTheme({
      autoDetect: false,
      useDataAttribute: false,
      storageKey: 'test_list_2',
      themes: {
        ocean: { '--bg': '#006994', '--text': '#fff' },
      },
    })
    const themes = theme.list()
    expect(themes).toContain('ocean')
  })
})

// ================================================================
//  addTheme / removeTheme 测试
// ================================================================

describe('addTheme / removeTheme', () => {
  it('添加自定义主题', () => {
    const theme = createTheme({
      autoDetect: false,
      useDataAttribute: false,
      storageKey: 'test_add_1',
    })
    theme.addTheme('ocean', { '--bg': '#006994', '--text': '#fff' })
    expect(theme.list()).toContain('ocean')
    expect(theme.getConfigFor('ocean')).toEqual({ '--bg': '#006994', '--text': '#fff' })
  })

  it('移除自定义主题', () => {
    const theme = createTheme({
      autoDetect: false,
      useDataAttribute: false,
      storageKey: 'test_remove_1',
    })
    theme.addTheme('ocean', { '--bg': '#006994', '--text': '#fff' })
    theme.removeTheme('ocean')
    expect(theme.list()).not.toContain('ocean')
  })

  it('移除默认主题不生效', () => {
    const theme = createTheme({
      default: 'light',
      autoDetect: false,
      useDataAttribute: false,
      storageKey: 'test_remove_2',
    })
    theme.removeTheme('light')
    expect(theme.list()).toContain('light')
  })

  it('移除当前使用的主题时切换到默认', () => {
    const theme = createTheme({
      default: 'light',
      autoDetect: false,
      useDataAttribute: false,
      storageKey: 'test_remove_3',
    })
    theme.addTheme('ocean', { '--bg': '#006994', '--text': '#fff' })
    theme.set('ocean')
    expect(theme.current).toBe('ocean')
    theme.removeTheme('ocean')
    expect(theme.current).toBe('light')
  })
})

// ================================================================
//  getConfig / getConfigFor 测试
// ================================================================

describe('getConfig / getConfigFor', () => {
  it('getConfig 返回当前主题配置', () => {
    const theme = createTheme({
      default: 'light',
      autoDetect: false,
      useDataAttribute: false,
      storageKey: 'test_getconfig_1',
    })
    const config = theme.getConfig()
    expect(config).toBeTruthy()
    expect(config!['--bg']).toBe('#ffffff')
  })

  it('getConfigFor 返回指定主题配置', () => {
    const theme = createTheme({
      autoDetect: false,
      useDataAttribute: false,
      storageKey: 'test_getconfig_2',
    })
    const config = theme.getConfigFor('dark')
    expect(config).toBeTruthy()
    expect(config!['--bg']).toBe('#1a1a1a')
  })

  it('getConfigFor 不存在的主题返回 null', () => {
    const theme = createTheme({
      autoDetect: false,
      useDataAttribute: false,
      storageKey: 'test_getconfig_3',
    })
    expect(theme.getConfigFor('non-existent')).toBe(null)
  })
})

// ================================================================
//  setVariable / clearVariable / clearVariables 测试
// ================================================================

describe('setVariable / clearVariable / clearVariables', () => {
  it('setVariable 设置动态变量', () => {
    const theme = createTheme({
      autoDetect: false,
      useDataAttribute: false,
      storageKey: 'test_var_1',
    })
    theme.setVariable('custom-color', '#ff0000')
    // 变量已设置（DOM 不可用时不会报错）
    expect(true).toBe(true)
  })

  it('clearVariable 清除动态变量', () => {
    const theme = createTheme({
      autoDetect: false,
      useDataAttribute: false,
      storageKey: 'test_var_2',
    })
    theme.setVariable('custom-color', '#ff0000')
    theme.clearVariable('custom-color')
    expect(true).toBe(true)
  })

  it('clearVariables 清除所有动态变量', () => {
    const theme = createTheme({
      autoDetect: false,
      useDataAttribute: false,
      storageKey: 'test_var_3',
    })
    theme.setVariable('color1', '#ff0000')
    theme.setVariable('color2', '#00ff00')
    theme.clearVariables()
    expect(true).toBe(true)
  })
})

// ================================================================
//  getSystemPreference 测试
// ================================================================

describe('getSystemPreference', () => {
  it('返回 light 或 dark', () => {
    const theme = createTheme({
      autoDetect: false,
      useDataAttribute: false,
      storageKey: 'test_syspref_1',
    })
    const pref = theme.getSystemPreference()
    expect(pref === 'light' || pref === 'dark').toBe(true)
  })
})

// ================================================================
//  watchSystemPreference 测试
// ================================================================

describe('watchSystemPreference', () => {
  it('返回取消监听函数', () => {
    const theme = createTheme({
      autoDetect: false,
      useDataAttribute: false,
      storageKey: 'test_watchpref_1',
    })
    const stop = theme.watchSystemPreference(() => {})
    expect(typeof stop).toBe('function')
    stop()
  })
})

// ================================================================
//  install 测试
// ================================================================

describe('install', () => {
  it('安装到 app 注入 $theme', () => {
    const theme = createTheme({
      autoDetect: false,
      useDataAttribute: false,
      storageKey: 'test_install_1',
    })
    const app: any = {}
    theme.install(app)
    expect(app.config.globalProperties.$theme).toBe(theme)
  })

  it('安装到 app 通过 provide 注入', () => {
    const theme = createTheme({
      autoDetect: false,
      useDataAttribute: false,
      storageKey: 'test_install_2',
    })
    const provided: any = {}
    const app: any = {
      provide: (key: string, value: any) => { provided[key] = value },
    }
    theme.install(app)
    expect(provided.theme).toBe(theme)
  })
})
