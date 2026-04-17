/**
 * @lytjs/components - 组件库单元测试
 *
 * 测试组件定义的完整性（props/state/methods/template），
 * 验证所有组件从 index.ts 正确导出，以及样式工具函数和主题系统。
 *
 * 使用 @lytjs/test-utils 统一测试框架。
 */

import {
  describe,
  it,
  expect,
} from '../../test-utils/src/index'

import {
  Button,
  Input,
  Checkbox,
  Radio,
  Select,
  Switch,
  Modal,
  Toast,
  Alert,
  Tooltip,
  Tabs,
  Table,
  Tag,
  Badge,
  Pagination,
  cssVariables,
  resetCSS,
  version,
  install,
  components,
  applyTheme,
  getTheme,
  resetTheme,
  createDarkTheme,
  getDefaultTheme,
  generateThemeCSS,
  mergeThemes,
  type Theme,
} from '../src/index'

// ================================================================
// DOM 模拟环境
// ================================================================

const mockStyleProps: Record<string, string> = {}
let mockIdCounter = 0

const mockDocument = {
  createElement(tag: string) {
    const el: any = {
      tagName: tag.toUpperCase(),
      className: '',
      innerHTML: '',
      textContent: '',
      style: { ...mockStyleProps },
      childNodes: [] as any[],
      children: [] as any[],
      parentNode: null as any,
      id: '',
      appendChild(child: any) {
        this.childNodes.push(child)
        this.children.push(child)
        child.parentNode = this
        return child
      },
      removeChild(child: any) {
        const idx = this.childNodes.indexOf(child)
        if (idx > -1) {
          this.childNodes.splice(idx, 1)
          this.children.splice(idx, 1)
          child.parentNode = null
        }
        return child
      },
      addEventListener() {},
      removeEventListener() {},
      setAttribute() {},
      getAttribute() { return null },
      classList: {
        add() {},
        remove() {},
        contains() { return false },
      },
      querySelector() { return null },
      querySelectorAll() { return [] },
    }
    el.id = `mock-el-${++mockIdCounter}`
    return el
  },
  documentElement: {
    style: mockStyleProps,
    setProperty(key: string, value: string) {
      mockStyleProps[key] = value
    },
    getPropertyValue(key: string) {
      return mockStyleProps[key] || ''
    },
  },
  body: null as any,
  head: null as any,
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() { return true },
}

mockDocument.body = mockDocument.createElement('body')
mockDocument.head = mockDocument.createElement('head')

;(globalThis as any).document = mockDocument
;(globalThis as any).window = {
  document: mockDocument,
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() { return true },
  getComputedStyle() {
    return {
      getPropertyValue(key: string) {
        return mockStyleProps[key] || ''
      },
    }
  },
  requestAnimationFrame(fn: Function) { return setTimeout(fn, 0) },
  cancelAnimationFrame() {},
  setTimeout,
  clearTimeout,
  console,
}

// ================================================================
// 辅助函数
// ================================================================

/**
 * 验证组件定义的基本结构
 */
function expectComponentDefinition(comp: any, name: string) {
  expect(comp).toBeDefined()
  expect(comp._isComponentDefine).toBe(true)
  expect(comp.name).toBe(name)
  expect(comp.options).toBeDefined()
  expect(typeof comp.options).toBe('object')
}

/**
 * 验证组件有 props 定义
 */
function expectHasProps(comp: any) {
  expect(comp.options.props).toBeDefined()
  expect(typeof comp.options.props).toBe('object')
  expect(Object.keys(comp.options.props).length).toBeGreaterThan(0)
}

/**
 * 验证组件有 template
 */
function expectHasTemplate(comp: any) {
  expect(comp.options.template).toBeDefined()
  expect(typeof comp.options.template).toBe('string')
  expect(comp.options.template.length).toBeGreaterThan(0)
}

/**
 * 验证组件有 styles
 */
function expectHasStyles(comp: any) {
  expect(comp.options.styles).toBeDefined()
  expect(typeof comp.options.styles).toBe('string')
  expect(comp.options.styles.length).toBeGreaterThan(0)
}

// ================================================================
// 测试套件
// ================================================================

describe('@lytjs/components - Button 组件', () => {
  it('Button 组件定义完整（有 props/template/styles）', () => {
    expectComponentDefinition(Button, 'LytButton')
    expectHasProps(Button)
    expectHasTemplate(Button)
    expectHasStyles(Button)
  })

  it('Button props 默认值正确', () => {
    const props = Button.options.props
    expect(props.type.default).toBe('default')
    expect(props.size.default).toBe('medium')
    expect(props.disabled.default).toBe(false)
    expect(props.loading.default).toBe(false)
    expect(props.block.default).toBe(false)
    expect(props.icon.default).toBe('')
  })

  it('Button 有 setup 函数', () => {
    expect(Button.options.setup).toBeDefined()
    expect(typeof Button.options.setup).toBe('function')
  })
})

describe('@lytjs/components - Input 组件', () => {
  it('Input 组件定义完整', () => {
    expectComponentDefinition(Input, 'LytInput')
    expectHasProps(Input)
    expectHasTemplate(Input)
    expectHasStyles(Input)
  })

  it('Input 支持 clearable prop', () => {
    const props = Input.options.props
    expect(props.clearable).toBeDefined()
    expect(props.clearable.type).toBe(Boolean)
    expect(props.clearable.default).toBe(false)
  })

  it('Input 有 setup 函数', () => {
    expect(Input.options.setup).toBeDefined()
    expect(typeof Input.options.setup).toBe('function')
  })
})

describe('@lytjs/components - Checkbox 组件', () => {
  it('Checkbox 组件定义完整', () => {
    expectComponentDefinition(Checkbox, 'LytCheckbox')
    expectHasProps(Checkbox)
    expectHasTemplate(Checkbox)
    expectHasStyles(Checkbox)
  })

  it('Checkbox 有 setup 函数', () => {
    expect(Checkbox.options.setup).toBeDefined()
    expect(typeof Checkbox.options.setup).toBe('function')
  })
})

describe('@lytjs/components - Radio 组件', () => {
  it('Radio 组件定义完整', () => {
    expectComponentDefinition(Radio, 'LytRadio')
    expectHasProps(Radio)
    expectHasTemplate(Radio)
    expectHasStyles(Radio)
  })

  it('Radio 有 setup 函数', () => {
    expect(Radio.options.setup).toBeDefined()
    expect(typeof Radio.options.setup).toBe('function')
  })
})

describe('@lytjs/components - Select 组件', () => {
  it('Select 组件定义完整', () => {
    expectComponentDefinition(Select, 'LytSelect')
    expectHasProps(Select)
    expectHasTemplate(Select)
    expectHasStyles(Select)
  })

  it('Select 有 setup 函数', () => {
    expect(Select.options.setup).toBeDefined()
    expect(typeof Select.options.setup).toBe('function')
  })
})

describe('@lytjs/components - Switch 组件', () => {
  it('Switch 组件定义完整', () => {
    expectComponentDefinition(Switch, 'LytSwitch')
    expectHasProps(Switch)
    expectHasTemplate(Switch)
    expectHasStyles(Switch)
  })

  it('Switch 有 setup 函数', () => {
    expect(Switch.options.setup).toBeDefined()
    expect(typeof Switch.options.setup).toBe('function')
  })
})

describe('@lytjs/components - Modal 组件', () => {
  it('Modal 组件定义完整', () => {
    expectComponentDefinition(Modal, 'LytModal')
    expectHasProps(Modal)
    expectHasTemplate(Modal)
    expectHasStyles(Modal)
  })

  it('Modal 有 setup 函数', () => {
    expect(Modal.options.setup).toBeDefined()
    expect(typeof Modal.options.setup).toBe('function')
  })
})

describe('@lytjs/components - Toast 组件', () => {
  it('Toast 组件定义完整', () => {
    expectComponentDefinition(Toast, 'LytToast')
    expectHasProps(Toast)
    expectHasTemplate(Toast)
    expectHasStyles(Toast)
  })

  it('Toast 静态方法存在（show/success/error/warning/info）', () => {
    expect(typeof Toast.show).toBe('function')
    expect(typeof Toast.success).toBe('function')
    expect(typeof Toast.error).toBe('function')
    expect(typeof Toast.warning).toBe('function')
    expect(typeof Toast.info).toBe('function')
  })

  it('Toast 有 closeAll 静态方法', () => {
    expect(typeof Toast.closeAll).toBe('function')
  })
})

describe('@lytjs/components - Alert 组件', () => {
  it('Alert 组件定义完整', () => {
    expectComponentDefinition(Alert, 'LytAlert')
    expectHasProps(Alert)
    expectHasTemplate(Alert)
    expectHasStyles(Alert)
  })

  it('Alert 有 setup 函数', () => {
    expect(Alert.options.setup).toBeDefined()
    expect(typeof Alert.options.setup).toBe('function')
  })
})

describe('@lytjs/components - Tooltip 组件', () => {
  it('Tooltip 组件定义完整', () => {
    expectComponentDefinition(Tooltip, 'LytTooltip')
    expectHasProps(Tooltip)
    expectHasTemplate(Tooltip)
    expectHasStyles(Tooltip)
  })

  it('Tooltip 有 setup 函数', () => {
    expect(Tooltip.options.setup).toBeDefined()
    expect(typeof Tooltip.options.setup).toBe('function')
  })
})

describe('@lytjs/components - Tabs 组件', () => {
  it('Tabs 组件定义完整', () => {
    expectComponentDefinition(Tabs, 'LytTabs')
    expectHasProps(Tabs)
    expectHasTemplate(Tabs)
    expectHasStyles(Tabs)
  })

  it('Tabs 有 setup 函数', () => {
    expect(Tabs.options.setup).toBeDefined()
    expect(typeof Tabs.options.setup).toBe('function')
  })
})

describe('@lytjs/components - Table 组件', () => {
  it('Table 组件定义完整', () => {
    expectComponentDefinition(Table, 'LytTable')
    expectHasProps(Table)
    expectHasTemplate(Table)
    expectHasStyles(Table)
  })

  it('Table 有 setup 函数', () => {
    expect(Table.options.setup).toBeDefined()
    expect(typeof Table.options.setup).toBe('function')
  })
})

describe('@lytjs/components - Tag 组件', () => {
  it('Tag 组件定义完整', () => {
    expectComponentDefinition(Tag, 'LytTag')
    expectHasProps(Tag)
    expectHasTemplate(Tag)
    expectHasStyles(Tag)
  })

  it('Tag 有 setup 函数', () => {
    expect(Tag.options.setup).toBeDefined()
    expect(typeof Tag.options.setup).toBe('function')
  })
})

describe('@lytjs/components - Badge 组件', () => {
  it('Badge 组件定义完整', () => {
    expectComponentDefinition(Badge, 'LytBadge')
    expectHasProps(Badge)
    expectHasTemplate(Badge)
    expectHasStyles(Badge)
  })

  it('Badge 有 setup 函数', () => {
    expect(Badge.options.setup).toBeDefined()
    expect(typeof Badge.options.setup).toBe('function')
  })
})

describe('@lytjs/components - Pagination 组件', () => {
  it('Pagination 组件定义完整', () => {
    expectComponentDefinition(Pagination, 'LytPagination')
    expectHasProps(Pagination)
    expectHasTemplate(Pagination)
    expectHasStyles(Pagination)
  })

  it('Pagination 有 setup 函数', () => {
    expect(Pagination.options.setup).toBeDefined()
    expect(typeof Pagination.options.setup).toBe('function')
  })
})

describe('@lytjs/components - 样式工具', () => {
  it('cssVariables 导出正确', () => {
    expect(cssVariables).toBeDefined()
    expect(typeof cssVariables).toBe('object')
    expect(cssVariables.primary).toBe('#409eff')
    expect(cssVariables.success).toBe('#67c23a')
    expect(cssVariables.warning).toBe('#e6a23c')
    expect(cssVariables.danger).toBe('#f56c6c')
    expect(cssVariables.info).toBe('#909399')
    expect(cssVariables.textColor).toBe('#303133')
    expect(cssVariables.borderColor).toBe('#dcdfe6')
    expect(cssVariables.backgroundColor).toBe('#ffffff')
    expect(cssVariables.fontSizeBase).toBe('14px')
    expect(cssVariables.borderRadius).toBe('4px')
  })

  it('resetCSS 导出为字符串', () => {
    expect(resetCSS).toBeDefined()
    expect(typeof resetCSS).toBe('string')
    expect(resetCSS.length).toBeGreaterThan(0)
    expect(resetCSS).toContain('.lyt-btn')
    expect(resetCSS).toContain('box-sizing: border-box')
  })
})

describe('@lytjs/components - 模块导出', () => {
  it('所有组件从 index.ts 正确导出', () => {
    // 基础组件
    expect(Button).toBeDefined()
    expect(components.Button).toBe(Button)
    // 表单组件
    expect(Input).toBeDefined()
    expect(Checkbox).toBeDefined()
    expect(Radio).toBeDefined()
    expect(Select).toBeDefined()
    expect(Switch).toBeDefined()
    // 反馈组件
    expect(Modal).toBeDefined()
    expect(Toast).toBeDefined()
    expect(Alert).toBeDefined()
    expect(Tooltip).toBeDefined()
    // 导航组件
    expect(Tabs).toBeDefined()
    expect(Pagination).toBeDefined()
    // 数据展示
    expect(Table).toBeDefined()
    expect(Tag).toBeDefined()
    expect(Badge).toBeDefined()
  })

  it('version 导出为字符串', () => {
    expect(version).toBeDefined()
    expect(typeof version).toBe('string')
  })

  it('install 导出为函数', () => {
    expect(install).toBeDefined()
    expect(typeof install).toBe('function')
  })

  it('components 导出为包含所有组件的对象', () => {
    expect(components).toBeDefined()
    expect(typeof components).toBe('object')
    expect(components.Button).toBe(Button)
    expect(components.Input).toBe(Input)
    expect(components.Modal).toBe(Modal)
    expect(components.Tabs).toBe(Tabs)
    expect(components.Table).toBe(Table)
    expect(components.Tag).toBe(Tag)
    expect(components.Badge).toBe(Badge)
    expect(components.Pagination).toBe(Pagination)
  })
})

// ================================================================
// 主题系统测试
// ================================================================

describe('@lytjs/components - 主题系统 applyTheme', () => {
  it('applyTheme 函数存在且可调用', () => {
    expect(applyTheme).toBeDefined()
    expect(typeof applyTheme).toBe('function')
  })

  it('applyTheme 将 CSS 变量设置到 document root', () => {
    // 清除之前的设置
    for (const key of Object.keys(mockStyleProps)) {
      delete mockStyleProps[key]
    }

    applyTheme()

    expect(mockStyleProps['--lyt-primary']).toBe('#4f46e5')
    expect(mockStyleProps['--lyt-success']).toBe('#22c55e')
    expect(mockStyleProps['--lyt-danger']).toBe('#ef4444')
    expect(mockStyleProps['--lyt-text']).toBe('#1f2937')
    expect(mockStyleProps['--lyt-bg']).toBe('#ffffff')
    expect(mockStyleProps['--lyt-radius']).toBe('8px')
    expect(mockStyleProps['--lyt-shadow']).toBe('0 1px 3px rgba(0,0,0,0.1)')
    expect(mockStyleProps['--lyt-font-size']).toBe('14px')
  })

  it('applyTheme 支持自定义主题覆盖', () => {
    for (const key of Object.keys(mockStyleProps)) {
      delete mockStyleProps[key]
    }

    applyTheme({ '--lyt-primary': '#ff0000' })

    expect(mockStyleProps['--lyt-primary']).toBe('#ff0000')
    // 其他变量保持默认值
    expect(mockStyleProps['--lyt-success']).toBe('#22c55e')
  })
})

describe('@lytjs/components - 主题系统 getTheme', () => {
  it('getTheme 函数存在且可调用', () => {
    expect(getTheme).toBeDefined()
    expect(typeof getTheme).toBe('function')
  })

  it('getTheme 返回当前主题对象', () => {
    // 先设置主题
    applyTheme()

    const theme = getTheme()
    expect(theme).toBeDefined()
    expect(typeof theme).toBe('object')
    expect(theme['--lyt-primary']).toBe('#4f46e5')
    expect(theme['--lyt-bg']).toBe('#ffffff')
  })
})

describe('@lytjs/components - 主题系统 resetTheme', () => {
  it('resetTheme 函数存在且可调用', () => {
    expect(resetTheme).toBeDefined()
    expect(typeof resetTheme).toBe('function')
  })

  it('resetTheme 重置为默认主题', () => {
    // 先设置自定义主题
    applyTheme({ '--lyt-primary': '#ff0000' })
    expect(mockStyleProps['--lyt-primary']).toBe('#ff0000')

    // 重置
    resetTheme()
    expect(mockStyleProps['--lyt-primary']).toBe('#4f46e5')
  })
})

describe('@lytjs/components - 主题系统 createDarkTheme', () => {
  it('createDarkTheme 函数存在且可调用', () => {
    expect(createDarkTheme).toBeDefined()
    expect(typeof createDarkTheme).toBe('function')
  })

  it('createDarkTheme 返回暗色主题变量', () => {
    const darkTheme = createDarkTheme()
    expect(darkTheme).toBeDefined()
    expect(typeof darkTheme).toBe('object')
    expect(darkTheme['--lyt-text']).toBe('#f9fafb')
    expect(darkTheme['--lyt-text-secondary']).toBe('#9ca3af')
    expect(darkTheme['--lyt-border']).toBe('#374151')
    expect(darkTheme['--lyt-bg']).toBe('#111827')
    expect(darkTheme['--lyt-bg-secondary']).toBe('#1f2937')
  })

  it('createDarkTheme 可以与 applyTheme 配合使用', () => {
    const darkTheme = createDarkTheme()
    applyTheme(darkTheme)

    expect(mockStyleProps['--lyt-text']).toBe('#f9fafb')
    expect(mockStyleProps['--lyt-bg']).toBe('#111827')
    // 品牌色保持默认
    expect(mockStyleProps['--lyt-primary']).toBe('#4f46e5')
  })
})

describe('@lytjs/components - 主题系统 getDefaultTheme', () => {
  it('getDefaultTheme 返回默认主题副本', () => {
    const defaultTheme = getDefaultTheme()
    expect(defaultTheme).toBeDefined()
    expect(typeof defaultTheme).toBe('object')
    expect(defaultTheme['--lyt-primary']).toBe('#4f46e5')
    expect(defaultTheme['--lyt-bg']).toBe('#ffffff')
  })

  it('getDefaultTheme 返回的是副本，修改不影响原始', () => {
    const theme1 = getDefaultTheme()
    const theme2 = getDefaultTheme()
    theme1['--lyt-primary'] = '#ff0000'
    expect(theme2['--lyt-primary']).toBe('#4f46e5')
  })
})

describe('@lytjs/components - 主题系统 generateThemeCSS', () => {
  it('generateThemeCSS 返回 CSS 字符串', () => {
    const css = generateThemeCSS()
    expect(typeof css).toBe('string')
    expect(css).toContain(':root')
    expect(css).toContain('--lyt-primary')
    expect(css).toContain('#4f46e5')
  })

  it('generateThemeCSS 支持自定义主题', () => {
    const css = generateThemeCSS({ '--lyt-primary': '#ff0000' })
    expect(css).toContain('--lyt-primary: #ff0000')
  })
})

describe('@lytjs/components - 主题系统 mergeThemes', () => {
  it('mergeThemes 合并多个主题', () => {
    const merged = mergeThemes(
      { '--lyt-primary': '#ff0000' },
      { '--lyt-success': '#00ff00' }
    )
    expect(merged['--lyt-primary']).toBe('#ff0000')
    expect(merged['--lyt-success']).toBe('#00ff00')
    // 默认值保留
    expect(merged['--lyt-danger']).toBe('#ef4444')
  })

  it('mergeThemes 后面的主题覆盖前面的', () => {
    const merged = mergeThemes(
      { '--lyt-primary': '#ff0000' },
      { '--lyt-primary': '#00ff00' }
    )
    expect(merged['--lyt-primary']).toBe('#00ff00')
  })
})

describe('@lytjs/components - CSS 变量完整性', () => {
  it('默认主题包含所有必需的 CSS 变量', () => {
    const defaultTheme = getDefaultTheme()
    // 品牌色
    expect(defaultTheme['--lyt-primary']).toBeDefined()
    expect(defaultTheme['--lyt-primary-light']).toBeDefined()
    expect(defaultTheme['--lyt-primary-dark']).toBeDefined()
    // 功能色
    expect(defaultTheme['--lyt-success']).toBeDefined()
    expect(defaultTheme['--lyt-warning']).toBeDefined()
    expect(defaultTheme['--lyt-danger']).toBeDefined()
    expect(defaultTheme['--lyt-info']).toBeDefined()
    // 中性色
    expect(defaultTheme['--lyt-text']).toBeDefined()
    expect(defaultTheme['--lyt-text-secondary']).toBeDefined()
    expect(defaultTheme['--lyt-border']).toBeDefined()
    expect(defaultTheme['--lyt-bg']).toBeDefined()
    expect(defaultTheme['--lyt-bg-secondary']).toBeDefined()
    // 圆角
    expect(defaultTheme['--lyt-radius-sm']).toBeDefined()
    expect(defaultTheme['--lyt-radius']).toBeDefined()
    expect(defaultTheme['--lyt-radius-lg']).toBeDefined()
    // 阴影
    expect(defaultTheme['--lyt-shadow-sm']).toBeDefined()
    expect(defaultTheme['--lyt-shadow']).toBeDefined()
    expect(defaultTheme['--lyt-shadow-lg']).toBeDefined()
    // 字体
    expect(defaultTheme['--lyt-font-size-sm']).toBeDefined()
    expect(defaultTheme['--lyt-font-size']).toBeDefined()
    expect(defaultTheme['--lyt-font-size-lg']).toBeDefined()
    expect(defaultTheme['--lyt-font-size-xl']).toBeDefined()
  })

  it('默认主题包含 20 个 CSS 变量', () => {
    const defaultTheme = getDefaultTheme()
    expect(Object.keys(defaultTheme).length).toBe(20)
  })
})
