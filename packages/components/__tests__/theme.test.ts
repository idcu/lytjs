/**
 * @lytjs/components - 主题系统单元测试
 *
 * 测试主题创建、切换、CSS 变量生成、useTheme Hook、ThemeProvider 等。
 * 使用 @lytjs/test-utils 统一测试框架。
 */

import {
  describe,
  it,
  expect,
} from '../../test-utils/src/index'

import {
  defaultLightTheme,
  defaultDarkTheme,
  createTheme,
  getTheme,
  setTheme,
  toggleDarkMode,
  isDarkMode,
  resetThemeToDefault,
  applyTheme,
  getCSSVar,
  setCSSVar,
  generateCSSVariables,
  useTheme,
  type ThemeConfig,
} from '../src/theme'

// ================================================================
// DOM 模拟环境
// ================================================================

const mockStyleStore: Record<string, string> = {}

const mockRootElement: any = {
  style: {
    setProperty(key: string, value: string) {
      mockStyleStore[key] = value
    },
    getPropertyValue(key: string) {
      return mockStyleStore[key] || ''
    },
    removeProperty(key: string) {
      delete mockStyleStore[key]
      return ''
    },
  },
  classList: {
    add() {},
    remove() {},
  },
}

const mockDocument = {
  documentElement: mockRootElement,
  createElement(tag: string) {
    return { tagName: tag.toUpperCase(), style: {}, appendChild() {} }
  },
  createTextNode(text: string) {
    return { textContent: text }
  },
  addEventListener() {},
  removeEventListener() {},
}

// 保存原始全局引用（在模块加载时捕获，但 withMock 会在每次执行时重新捕获）
const _origDocument = (globalThis as any).document
const _origGetComputedStyle = (globalThis as any).getComputedStyle

/**
 * 在 mock 环境中执行测试，自动设置和恢复全局引用
 */
function withMock(fn: () => void) {
  return () => {
    // 每次执行时重新捕获当前全局引用（而非模块加载时）
    const origDoc = (globalThis as any).document
    const origGCS = (globalThis as any).getComputedStyle

    ;(globalThis as any).document = mockDocument
    ;(globalThis as any).getComputedStyle = (el: any) => ({
      getPropertyValue(key: string) {
        if (el === mockRootElement) return mockStyleStore[key] || ''
        return ''
      },
    })
    // 清理状态
    for (const key of Object.keys(mockStyleStore)) {
      delete mockStyleStore[key]
    }
    resetThemeToDefault()
    try {
      fn()
    } finally {
      ;(globalThis as any).document = origDoc
      ;(globalThis as any).getComputedStyle = origGCS
    }
  }
}

// ================================================================
// 测试用例
// ================================================================

describe('Theme 主题系统', () => {

  // ----------------------------------------------------------
  // 1. 默认亮色主题
  // ----------------------------------------------------------
  describe('默认亮色主题', () => {
    it('应包含完整的色彩定义', () => {
      expect(defaultLightTheme.colors.primary).toBe('#409eff')
      expect(defaultLightTheme.colors.success).toBe('#67c23a')
      expect(defaultLightTheme.colors.warning).toBe('#e6a23c')
      expect(defaultLightTheme.colors.danger).toBe('#f56c6c')
      expect(defaultLightTheme.colors.info).toBe('#909399')
    })

    it('应包含完整的字体定义', () => {
      expect(defaultLightTheme.font.sizeBase).toBe('14px')
      expect(defaultLightTheme.font.sizeSm).toBe('12px')
      expect(defaultLightTheme.font.sizeLg).toBe('16px')
      expect(defaultLightTheme.font.sizeXl).toBe('20px')
    })

    it('应包含完整的间距定义', () => {
      expect(defaultLightTheme.spacing.xs).toBe('4px')
      expect(defaultLightTheme.spacing.sm).toBe('8px')
      expect(defaultLightTheme.spacing.md).toBe('16px')
      expect(defaultLightTheme.spacing.lg).toBe('24px')
      expect(defaultLightTheme.spacing.xl).toBe('32px')
    })

    it('应包含完整的圆角定义', () => {
      expect(defaultLightTheme.radius.sm).toBe('4px')
      expect(defaultLightTheme.radius.md).toBe('8px')
      expect(defaultLightTheme.radius.lg).toBe('12px')
      expect(defaultLightTheme.radius.full).toBe('9999px')
    })

    it('应包含完整的阴影定义', () => {
      expect(defaultLightTheme.shadows.sm).toBe('0 1px 2px rgba(0, 0, 0, 0.05)')
      expect(defaultLightTheme.shadows.md).toBe('0 2px 12px rgba(0, 0, 0, 0.1)')
      expect(defaultLightTheme.shadows.lg).toBe('0 10px 15px rgba(0, 0, 0, 0.1)')
    })
  })

  // ----------------------------------------------------------
  // 2. 默认暗色主题
  // ----------------------------------------------------------
  describe('默认暗色主题', () => {
    it('应有暗色背景和亮色前景', () => {
      expect(defaultDarkTheme.colors.background).toBe('#1f2937')
      expect(defaultDarkTheme.colors.foreground).toBe('#f9fafb')
    })

    it('应有暗色模式的边框和卡片色', () => {
      expect(defaultDarkTheme.colors.border).toBe('#374151')
      expect(defaultDarkTheme.colors.card).toBe('#111827')
    })

    it('应有暗色模式的阴影（更深的阴影）', () => {
      expect(defaultDarkTheme.shadows.sm).toBe('0 1px 2px rgba(0, 0, 0, 0.2)')
      expect(defaultDarkTheme.shadows.md).toBe('0 2px 12px rgba(0, 0, 0, 0.3)')
      expect(defaultDarkTheme.shadows.lg).toBe('0 10px 15px rgba(0, 0, 0, 0.3)')
    })
  })

  // ----------------------------------------------------------
  // 3. createTheme 自定义主题
  // ----------------------------------------------------------
  describe('createTheme', () => {
    it('应基于默认主题创建自定义主题', () => {
      const custom = createTheme({
        colors: { primary: '#ff0000' },
      })
      expect(custom.colors.primary).toBe('#ff0000')
      expect(custom.colors.success).toBe('#67c23a')
    })

    it('应支持自定义字体', () => {
      const custom = createTheme({
        font: { family: 'Arial, sans-serif', sizeBase: '16px' },
      })
      expect(custom.font.family).toBe('Arial, sans-serif')
      expect(custom.font.sizeBase).toBe('16px')
      expect(custom.font.sizeSm).toBe('12px')
    })

    it('应支持自定义间距', () => {
      const custom = createTheme({
        spacing: { md: '20px' },
      })
      expect(custom.spacing.md).toBe('20px')
      expect(custom.spacing.sm).toBe('8px')
    })

    it('应支持自定义圆角', () => {
      const custom = createTheme({
        radius: { sm: '8px', md: '16px' },
      })
      expect(custom.radius.sm).toBe('8px')
      expect(custom.radius.md).toBe('16px')
      expect(custom.radius.lg).toBe('12px')
    })

    it('应支持自定义阴影', () => {
      const custom = createTheme({
        shadows: { md: '0 4px 20px rgba(0,0,0,0.15)' },
      })
      expect(custom.shadows.md).toBe('0 4px 20px rgba(0,0,0,0.15)')
      expect(custom.shadows.sm).toBe('0 1px 2px rgba(0, 0, 0, 0.05)')
    })

    it('空覆盖应返回与默认相同的主题', () => {
      const custom = createTheme({})
      expect(custom.colors.primary).toBe(defaultLightTheme.colors.primary)
      expect(custom.font.sizeBase).toBe(defaultLightTheme.font.sizeBase)
    })
  })

  // ----------------------------------------------------------
  // 4. getTheme / setTheme
  // ----------------------------------------------------------
  describe('getTheme / setTheme', () => {
    it('getTheme 应返回当前活跃主题', withMock(() => {
      const theme = getTheme()
      expect(theme).toBeDefined()
      expect(theme.colors).toBeDefined()
      expect(theme.font).toBeDefined()
    }))

    it('setTheme 应更新活跃主题', withMock(() => {
      const custom = createTheme({ colors: { primary: '#123456' } })
      setTheme(custom)
      const current = getTheme()
      expect(current.colors.primary).toBe('#123456')
    }))

    it('setTheme 应调用 applyTheme', withMock(() => {
      const custom = createTheme({ colors: { primary: '#abcdef' } })
      setTheme(custom)
      expect(mockStyleStore['--lyt-color-primary']).toBe('#abcdef')
    }))
  })

  // ----------------------------------------------------------
  // 5. toggleDarkMode / isDarkMode
  // ----------------------------------------------------------
  describe('toggleDarkMode / isDarkMode', () => {
    it('初始状态应为亮色模式', withMock(() => {
      expect(isDarkMode()).toBe(false)
    }))

    it('toggleDarkMode 应切换到暗色模式', withMock(() => {
      toggleDarkMode()
      expect(isDarkMode()).toBe(true)
      const theme = getTheme()
      expect(theme.colors.background).toBe('#1f2937')
    }))

    it('再次 toggleDarkMode 应切换回亮色模式', withMock(() => {
      toggleDarkMode()
      toggleDarkMode()
      expect(isDarkMode()).toBe(false)
      const theme = getTheme()
      expect(theme.colors.background).toBe('#ffffff')
    }))

    it('toggleDarkMode 应更新 CSS 变量', withMock(() => {
      toggleDarkMode()
      expect(mockStyleStore['--lyt-color-bg']).toBe('#1f2937')
      expect(mockStyleStore['--lyt-color-fg']).toBe('#f9fafb')
    }))
  })

  // ----------------------------------------------------------
  // 6. resetThemeToDefault
  // ----------------------------------------------------------
  describe('resetThemeToDefault', () => {
    it('应重置为默认亮色主题', withMock(() => {
      toggleDarkMode()
      resetThemeToDefault()
      expect(isDarkMode()).toBe(false)
      expect(getTheme().colors.primary).toBe('#409eff')
    }))
  })

  // ----------------------------------------------------------
  // 7. applyTheme
  // ----------------------------------------------------------
  describe('applyTheme', () => {
    it('应将主题 CSS 变量设置到 document root', withMock(() => {
      applyTheme(defaultLightTheme)
      expect(mockStyleStore['--lyt-color-primary']).toBe('#409eff')
      expect(mockStyleStore['--lyt-color-bg']).toBe('#ffffff')
      expect(mockStyleStore['--lyt-font-size-base']).toBe('14px')
    }))

    it('暗色主题应设置对应的 CSS 变量', withMock(() => {
      applyTheme(defaultDarkTheme)
      expect(mockStyleStore['--lyt-color-bg']).toBe('#1f2937')
      expect(mockStyleStore['--lyt-color-fg']).toBe('#f9fafb')
      expect(mockStyleStore['--lyt-color-border']).toBe('#374151')
    }))
  })

  // ----------------------------------------------------------
  // 8. generateCSSVariables
  // ----------------------------------------------------------
  describe('generateCSSVariables', () => {
    it('应生成所有色彩 CSS 变量', () => {
      const vars = generateCSSVariables(defaultLightTheme)
      expect(vars['--lyt-color-primary']).toBe('#409eff')
      expect(vars['--lyt-color-secondary']).toBe('#6366f1')
      expect(vars['--lyt-color-success']).toBe('#67c23a')
      expect(vars['--lyt-color-warning']).toBe('#e6a23c')
      expect(vars['--lyt-color-danger']).toBe('#f56c6c')
      expect(vars['--lyt-color-info']).toBe('#909399')
      expect(vars['--lyt-color-bg']).toBe('#ffffff')
      expect(vars['--lyt-color-fg']).toBe('#303133')
      expect(vars['--lyt-color-muted']).toBe('#606266')
      expect(vars['--lyt-color-border']).toBe('#dcdfe6')
      expect(vars['--lyt-color-card']).toBe('#ffffff')
    })

    it('应生成所有字体 CSS 变量', () => {
      const vars = generateCSSVariables(defaultLightTheme)
      expect(vars['--lyt-font-family']).toBe('inherit')
      expect(vars['--lyt-font-size-base']).toBe('14px')
      expect(vars['--lyt-font-size-sm']).toBe('12px')
      expect(vars['--lyt-font-size-lg']).toBe('16px')
      expect(vars['--lyt-font-size-xl']).toBe('20px')
    })

    it('应生成所有间距 CSS 变量', () => {
      const vars = generateCSSVariables(defaultLightTheme)
      expect(vars['--lyt-spacing-xs']).toBe('4px')
      expect(vars['--lyt-spacing-sm']).toBe('8px')
      expect(vars['--lyt-spacing-md']).toBe('16px')
      expect(vars['--lyt-spacing-lg']).toBe('24px')
      expect(vars['--lyt-spacing-xl']).toBe('32px')
    })

    it('应生成所有圆角 CSS 变量', () => {
      const vars = generateCSSVariables(defaultLightTheme)
      expect(vars['--lyt-radius-sm']).toBe('4px')
      expect(vars['--lyt-radius-md']).toBe('8px')
      expect(vars['--lyt-radius-lg']).toBe('12px')
      expect(vars['--lyt-radius-full']).toBe('9999px')
    })

    it('应生成所有阴影 CSS 变量', () => {
      const vars = generateCSSVariables(defaultLightTheme)
      expect(vars['--lyt-shadow-sm']).toBe('0 1px 2px rgba(0, 0, 0, 0.05)')
      expect(vars['--lyt-shadow-md']).toBe('0 2px 12px rgba(0, 0, 0, 0.1)')
      expect(vars['--lyt-shadow-lg']).toBe('0 10px 15px rgba(0, 0, 0, 0.1)')
    })

    it('暗色主题应生成对应的 CSS 变量', () => {
      const vars = generateCSSVariables(defaultDarkTheme)
      expect(vars['--lyt-color-bg']).toBe('#1f2937')
      expect(vars['--lyt-color-fg']).toBe('#f9fafb')
      expect(vars['--lyt-color-border']).toBe('#374151')
      expect(vars['--lyt-shadow-md']).toBe('0 2px 12px rgba(0, 0, 0, 0.3)')
    })

    it('自定义主题应正确生成 CSS 变量', () => {
      const custom = createTheme({ colors: { primary: '#ff0000', danger: '#000000' } })
      const vars = generateCSSVariables(custom)
      expect(vars['--lyt-color-primary']).toBe('#ff0000')
      expect(vars['--lyt-color-danger']).toBe('#000000')
      expect(vars['--lyt-color-success']).toBe('#67c23a')
    })
  })

  // ----------------------------------------------------------
  // 9. getCSSVar / setCSSVar
  // ----------------------------------------------------------
  describe('getCSSVar / setCSSVar', () => {
    it('setCSSVar 应设置 CSS 变量', withMock(() => {
      setCSSVar('--lyt-test', 'hello')
      expect(mockStyleStore['--lyt-test']).toBe('hello')
    }))

    it('getCSSVar 应读取 CSS 变量', withMock(() => {
      mockStyleStore['--lyt-test'] = 'world'
      const result = getCSSVar('--lyt-test')
      expect(result).toBe('world')
    }))

    it('getCSSVar 对不存在的变量应返回空字符串', withMock(() => {
      const result = getCSSVar('--lyt-nonexistent')
      expect(result).toBe('')
    }))
  })

  // ----------------------------------------------------------
  // 10. useTheme Hook
  // ----------------------------------------------------------
  describe('useTheme', () => {
    it('应返回当前主题对象', withMock(() => {
      const hook = useTheme()
      expect(hook.theme).toBeDefined()
      expect(hook.theme.colors.primary).toBe('#409eff')
    }))

    it('应返回暗色模式状态', withMock(() => {
      const hook = useTheme()
      expect(hook.isDark).toBe(false)
    }))

    it('应返回 toggle 函数', withMock(() => {
      const hook = useTheme()
      expect(typeof hook.toggle).toBe('function')
    }))

    it('应返回 set 函数', withMock(() => {
      const hook = useTheme()
      expect(typeof hook.set).toBe('function')
    }))

    it('应返回 cssVar 函数', withMock(() => {
      const hook = useTheme()
      expect(typeof hook.cssVar).toBe('function')
    }))

    it('应返回 setCSSVar 函数', withMock(() => {
      const hook = useTheme()
      expect(typeof hook.setCSSVar).toBe('function')
    }))

    it('toggle 应能切换暗色模式', withMock(() => {
      const hook = useTheme()
      expect(hook.isDark).toBe(false)
      hook.toggle()
      expect(isDarkMode()).toBe(true)
      hook.toggle()
      expect(isDarkMode()).toBe(false)
    }))
  })

  // ----------------------------------------------------------
  // 11. CSS 变量命名规范
  // ----------------------------------------------------------
  describe('CSS 变量命名规范', () => {
    it('所有变量应以 --lyt- 开头', () => {
      const vars = generateCSSVariables(defaultLightTheme)
      for (const key of Object.keys(vars)) {
        expect(key.startsWith('--lyt-')).toBe(true)
      }
    })

    it('色彩变量应以 --lyt-color- 开头', () => {
      const vars = generateCSSVariables(defaultLightTheme)
      const colorVars = Object.keys(vars).filter(k => k.startsWith('--lyt-color-'))
      expect(colorVars.length).toBe(11)
    })

    it('字体变量应以 --lyt-font- 开头', () => {
      const vars = generateCSSVariables(defaultLightTheme)
      const fontVars = Object.keys(vars).filter(k => k.startsWith('--lyt-font-'))
      expect(fontVars.length).toBe(5)
    })

    it('间距变量应以 --lyt-spacing- 开头', () => {
      const vars = generateCSSVariables(defaultLightTheme)
      const spacingVars = Object.keys(vars).filter(k => k.startsWith('--lyt-spacing-'))
      expect(spacingVars.length).toBe(5)
    })

    it('圆角变量应以 --lyt-radius- 开头', () => {
      const vars = generateCSSVariables(defaultLightTheme)
      const radiusVars = Object.keys(vars).filter(k => k.startsWith('--lyt-radius-'))
      expect(radiusVars.length).toBe(4)
    })

    it('阴影变量应以 --lyt-shadow- 开头', () => {
      const vars = generateCSSVariables(defaultLightTheme)
      const shadowVars = Object.keys(vars).filter(k => k.startsWith('--lyt-shadow-'))
      expect(shadowVars.length).toBe(3)
    })
  })

  // ----------------------------------------------------------
  // 12. 主题继承（子覆盖父）
  // ----------------------------------------------------------
  describe('主题继承', () => {
    it('子主题应覆盖父主题的颜色', () => {
      const child = createTheme({
        colors: { primary: '#ff0000', danger: '#000000' },
      })
      expect(child.colors.primary).toBe('#ff0000')
      expect(child.colors.danger).toBe('#000000')
      expect(child.colors.success).toBe('#67c23a')
    })

    it('嵌套覆盖应正确合并', () => {
      const child = createTheme({
        colors: { primary: '#222222' },
        spacing: { md: '24px' },
      })
      expect(child.colors.primary).toBe('#222222')
      expect(child.font.sizeBase).toBe('14px')
      expect(child.spacing.md).toBe('24px')
    })
  })

  // ----------------------------------------------------------
  // 13. 多主题实例
  // ----------------------------------------------------------
  describe('多主题实例', () => {
    it('应能创建多个独立主题', () => {
      const theme1 = createTheme({ colors: { primary: '#111111' } })
      const theme2 = createTheme({ colors: { primary: '#222222' } })
      expect(theme1.colors.primary).toBe('#111111')
      expect(theme2.colors.primary).toBe('#222222')
    })

    it('setTheme 应正确切换不同主题', withMock(() => {
      const theme1 = createTheme({ colors: { primary: '#aaaaaa' } })
      const theme2 = createTheme({ colors: { primary: '#bbbbbb' } })

      setTheme(theme1)
      expect(getTheme().colors.primary).toBe('#aaaaaa')

      setTheme(theme2)
      expect(getTheme().colors.primary).toBe('#bbbbbb')
    }))
  })

  // ----------------------------------------------------------
  // 14. 暗色模式 CSS 变量覆盖
  // ----------------------------------------------------------
  describe('暗色模式 CSS 变量覆盖', () => {
    it('暗色模式应覆盖背景色变量', withMock(() => {
      toggleDarkMode()
      expect(mockStyleStore['--lyt-color-bg']).toBe('#1f2937')
      expect(mockStyleStore['--lyt-color-card']).toBe('#111827')
    }))

    it('暗色模式应覆盖前景色变量', withMock(() => {
      toggleDarkMode()
      expect(mockStyleStore['--lyt-color-fg']).toBe('#f9fafb')
      expect(mockStyleStore['--lyt-color-muted']).toBe('#9ca3af')
    }))

    it('暗色模式应覆盖边框色变量', withMock(() => {
      toggleDarkMode()
      expect(mockStyleStore['--lyt-color-border']).toBe('#374151')
    }))

    it('暗色模式应覆盖阴影变量', withMock(() => {
      toggleDarkMode()
      expect(mockStyleStore['--lyt-shadow-md']).toBe('0 2px 12px rgba(0, 0, 0, 0.3)')
    }))
  })

  // ----------------------------------------------------------
  // 15. 主题重置
  // ----------------------------------------------------------
  describe('主题重置', () => {
    it('resetThemeToDefault 应恢复所有默认值', withMock(() => {
      const custom = createTheme({ colors: { primary: '#999999' } })
      setTheme(custom)
      toggleDarkMode()

      resetThemeToDefault()
      expect(isDarkMode()).toBe(false)
      expect(getTheme().colors.primary).toBe('#409eff')
      expect(getTheme().colors.background).toBe('#ffffff')
    }))
  })

  // ----------------------------------------------------------
  // 16. 自定义主题的完整性
  // ----------------------------------------------------------
  describe('自定义主题完整性', () => {
    it('自定义颜色不应影响其他配置', () => {
      const custom = createTheme({ colors: { primary: '#ff0000' } })
      expect(custom.font.sizeBase).toBe(defaultLightTheme.font.sizeBase)
      expect(custom.spacing.md).toBe(defaultLightTheme.spacing.md)
      expect(custom.radius.sm).toBe(defaultLightTheme.radius.sm)
      expect(custom.shadows.md).toBe(defaultLightTheme.shadows.md)
    })

    it('自定义字体不应影响颜色', () => {
      const custom = createTheme({ font: { family: 'monospace' } })
      expect(custom.colors.primary).toBe(defaultLightTheme.colors.primary)
      expect(custom.font.family).toBe('monospace')
      expect(custom.font.sizeBase).toBe(defaultLightTheme.font.sizeBase)
    })

    it('自定义间距不应影响其他配置', () => {
      const custom = createTheme({ spacing: { xs: '2px', xl: '64px' } })
      expect(custom.spacing.xs).toBe('2px')
      expect(custom.spacing.xl).toBe('64px')
      expect(custom.spacing.sm).toBe(defaultLightTheme.spacing.sm)
      expect(custom.colors.primary).toBe(defaultLightTheme.colors.primary)
    })

    it('自定义圆角不应影响其他配置', () => {
      const custom = createTheme({ radius: { full: '50%' } })
      expect(custom.radius.full).toBe('50%')
      expect(custom.radius.sm).toBe(defaultLightTheme.radius.sm)
      expect(custom.colors.primary).toBe(defaultLightTheme.colors.primary)
    })

    it('自定义阴影不应影响其他配置', () => {
      const custom = createTheme({ shadows: { lg: '0 20px 40px rgba(0,0,0,0.2)' } })
      expect(custom.shadows.lg).toBe('0 20px 40px rgba(0,0,0,0.2)')
      expect(custom.shadows.sm).toBe(defaultLightTheme.shadows.sm)
      expect(custom.colors.primary).toBe(defaultLightTheme.colors.primary)
    })
  })

  // ----------------------------------------------------------
  // 17. generateCSSVariables 变量总数
  // ----------------------------------------------------------
  describe('generateCSSVariables 变量总数', () => {
    it('应生成正确数量的 CSS 变量', () => {
      const vars = generateCSSVariables(defaultLightTheme)
      expect(Object.keys(vars).length).toBe(28)
    })
  })
})
