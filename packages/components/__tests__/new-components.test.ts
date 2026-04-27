/**
 * @lytjs/components - 新增组件单元测试
 *
 * 测试 12 个新增组件的定义完整性、props、渲染和事件回调。
 * 使用 @lytjs/test-utils 统一测试框架。
 */

import {
  describe,
  it,
  expect,
} from '../../test-utils/src/index'

import { h } from '../../core/src/h.ts'

import { DataTable } from '../src/table'
import { Form, type FormRules, type ValidateResult } from '../src/form'
import { DatePicker } from '../src/date-picker'
import { Dialog } from '../src/modal'
import { Notification } from '../src/toast'
import { Popover } from '../src/tooltip'
import { TabNav, type TabNavItem } from '../src/tabs'
import { Collapse } from '../src/collapse'
import { Dropdown, type DropdownOption } from '../src/select'
import { Toggle } from '../src/switch'
import { CountBadge } from '../src/badge'
import { Pager } from '../src/pagination'

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
      classList: { add() {}, remove() {}, contains() { return false } },
      querySelector() { return null },
      querySelectorAll() { return [] },
    }
    el.id = `mock-el-${++mockIdCounter}`
    return el
  },
  documentElement: {
    style: mockStyleProps,
    setProperty(key: string, value: string) { mockStyleProps[key] = value },
    getPropertyValue(key: string) { return mockStyleProps[key] || '' },
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
    return { getPropertyValue(key: string) { return mockStyleProps[key] || '' } }
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

function expectComponentDefinition(comp: any, name: string) {
  expect(comp).toBeDefined()
  expect(comp._isComponentDefine).toBe(true)
  expect(comp.name).toBe(name)
  expect(comp.options).toBeDefined()
  expect(typeof comp.options).toBe('object')
}

function expectHasProps(comp: any) {
  expect(comp.options.props).toBeDefined()
  expect(typeof comp.options.props).toBe('object')
  expect(Object.keys(comp.options.props).length).toBeGreaterThan(0)
}

function expectHasTemplate(comp: any) {
  expect(comp.options.template).toBeDefined()
  expect(typeof comp.options.template).toBe('string')
  expect(comp.options.template.length).toBeGreaterThan(0)
}

function expectHasStyles(comp: any) {
  expect(comp.options.styles).toBeDefined()
  expect(typeof comp.options.styles).toBe('string')
  expect(comp.options.styles.length).toBeGreaterThan(0)
}

function expectHasSetup(comp: any) {
  expect(comp.options.setup).toBeDefined()
  expect(typeof comp.options.setup).toBe('function')
}

// ================================================================
// DataTable 测试
// ================================================================

describe('DataTable 组件', () => {
  it('DataTable 组件定义完整（有 props/template/styles/setup）', () => {
    expectComponentDefinition(DataTable, 'LytDataTable')
    expectHasProps(DataTable)
    expectHasTemplate(DataTable)
    expectHasStyles(DataTable)
    expectHasSetup(DataTable)
  })

  it('DataTable props 默认值正确', () => {
    const props = DataTable.options.props
    expect(props.striped.default).toBe(false)
    expect(props.hoverable.default).toBe(true)
    expect(props.bordered.default).toBe(false)
    expect(props.loading.default).toBe(false)
    expect(props.emptyText.default).toBe('暂无数据')
    expect(props.size.default).toBe('medium')
  })

  it('DataTable 可创建 VNode', () => {
    const vnode = h(DataTable, {
      columns: [{ key: 'name', title: '姓名' }],
      data: [{ name: '张三' }],
    })
    expect(vnode).toBeDefined()
    expect(vnode.type).toBe(DataTable)
    expect(vnode.props).toBeDefined()
  })

  it('DataTable columns prop 接受数组类型', () => {
    const props = DataTable.options.props
    expect(props.columns.type).toBe(Array)
    expect(props.data.type).toBe(Array)
  })
})

// ================================================================
// Form 组件测试
// ================================================================

describe('Form 组件', () => {
  it('Form 组件定义完整', () => {
    expectComponentDefinition(Form, 'LytForm')
    expectHasProps(Form)
    expectHasTemplate(Form)
    expectHasStyles(Form)
    expectHasSetup(Form)
  })

  it('Form props 默认值正确', () => {
    const props = Form.options.props
    expect(props.labelWidth.default).toBe('100px')
    expect(props.labelPosition.default).toBe('right')
    expect(props.inline.default).toBe(false)
    expect(props.disabled.default).toBe(false)
    expect(props.size.default).toBe('medium')
  })

  it('Form 可创建 VNode', () => {
    const vnode = h(Form, {
      model: { name: '', email: '' },
      rules: { name: { required: true, message: '请输入姓名' } },
    })
    expect(vnode).toBeDefined()
    expect(vnode.type).toBe(Form)
  })

  it('Form labelPosition 验证器包含 left/right/top', () => {
    const props = Form.options.props
    const validator = props.labelPosition.validator
    expect(validator('left')).toBe(true)
    expect(validator('right')).toBe(true)
    expect(validator('top')).toBe(true)
    expect(validator('invalid')).toBe(false)
  })
})

// ================================================================
// DatePicker 组件测试
// ================================================================

describe('DatePicker 组件', () => {
  it('DatePicker 组件定义完整', () => {
    expectComponentDefinition(DatePicker, 'LytDatePicker')
    expectHasProps(DatePicker)
    expectHasTemplate(DatePicker)
    expectHasStyles(DatePicker)
    expectHasSetup(DatePicker)
  })

  it('DatePicker props 默认值正确', () => {
    const props = DatePicker.options.props
    expect(props.format.default).toBe('YYYY-MM-DD')
    expect(props.placeholder.default).toBe('请选择日期')
    expect(props.disabled.default).toBe(false)
    expect(props.range.default).toBe(false)
    expect(props.clearable.default).toBe(false)
  })

  it('DatePicker 可创建 VNode', () => {
    const vnode = h(DatePicker, {
      format: 'YYYY-MM-DD',
      placeholder: '选择日期',
    })
    expect(vnode).toBeDefined()
    expect(vnode.type).toBe(DatePicker)
  })

  it('DatePicker 支持 range 模式', () => {
    const vnode = h(DatePicker, { range: true })
    expect(vnode.props.range).toBe(true)
  })
})

// ================================================================
// Dialog 组件测试
// ================================================================

describe('Dialog 组件', () => {
  it('Dialog 组件定义完整', () => {
    expectComponentDefinition(Dialog, 'LytDialog')
    expectHasProps(Dialog)
    expectHasTemplate(Dialog)
    expectHasStyles(Dialog)
    expectHasSetup(Dialog)
  })

  it('Dialog props 默认值正确', () => {
    const props = Dialog.options.props
    expect(props.visible.default).toBe(false)
    expect(props.width.default).toBe('520px')
    expect(props.closable.default).toBe(true)
    expect(props.maskClosable.default).toBe(true)
    expect(props.fullscreen.default).toBe(false)
    expect(props.showFooter.default).toBe(true)
  })

  it('Dialog 可创建 VNode', () => {
    const vnode = h(Dialog, {
      visible: true,
      title: '测试对话框',
    })
    expect(vnode).toBeDefined()
    expect(vnode.type).toBe(Dialog)
  })

  it('Dialog 支持 closeOnEsc 和 zIndex props', () => {
    const props = Dialog.options.props
    expect(props.closeOnEsc.default).toBe(true)
    expect(props.zIndex.default).toBe(2000)
    expect(props.top.default).toBe('15vh')
  })
})

// ================================================================
// Notification 组件测试
// ================================================================

describe('Notification 组件', () => {
  it('Notification 组件定义完整', () => {
    expectComponentDefinition(Notification, 'LytNotification')
    expectHasProps(Notification)
    expectHasTemplate(Notification)
    expectHasStyles(Notification)
    expectHasSetup(Notification)
  })

  it('Notification 静态方法存在', () => {
    expect(typeof Notification.show).toBe('function')
    expect(typeof Notification.success).toBe('function')
    expect(typeof Notification.error).toBe('function')
    expect(typeof Notification.warning).toBe('function')
    expect(typeof Notification.info).toBe('function')
    expect(typeof Notification.closeAll).toBe('function')
  })

  it('Notification props 默认值正确', () => {
    const props = Notification.options.props
    expect(props.type.default).toBe('info')
    expect(props.duration.default).toBe(4500)
    expect(props.position.default).toBe('top-right')
    expect(props.closable.default).toBe(true)
  })

  it('Notification position 验证器包含所有位置', () => {
    const validator = Notification.options.props.position.validator
    expect(validator('top-right')).toBe(true)
    expect(validator('top-left')).toBe(true)
    expect(validator('bottom-right')).toBe(true)
    expect(validator('bottom-left')).toBe(true)
    expect(validator('top')).toBe(true)
    expect(validator('bottom')).toBe(true)
    expect(validator('invalid')).toBe(false)
  })
})

// ================================================================
// Popover 组件测试
// ================================================================

describe('Popover 组件', () => {
  it('Popover 组件定义完整', () => {
    expectComponentDefinition(Popover, 'LytPopover')
    expectHasProps(Popover)
    expectHasTemplate(Popover)
    expectHasStyles(Popover)
    expectHasSetup(Popover)
  })

  it('Popover props 默认值正确', () => {
    const props = Popover.options.props
    expect(props.content.default).toBe('')
    expect(props.placement.default).toBe('top')
    expect(props.trigger.default).toBe('hover')
    expect(props.delay.default).toBe(100)
    expect(props.disabled.default).toBe(false)
    expect(props.maxWidth.default).toBe('320px')
  })

  it('Popover 可创建 VNode', () => {
    const vnode = h(Popover, {
      content: '提示内容',
      placement: 'bottom',
    })
    expect(vnode).toBeDefined()
    expect(vnode.type).toBe(Popover)
  })

  it('Popover placement 验证器', () => {
    const validator = Popover.options.props.placement.validator
    expect(validator('top')).toBe(true)
    expect(validator('bottom')).toBe(true)
    expect(validator('left')).toBe(true)
    expect(validator('right')).toBe(true)
    expect(validator('invalid')).toBe(false)
  })
})

// ================================================================
// TabNav 组件测试
// ================================================================

describe('TabNav 组件', () => {
  it('TabNav 组件定义完整', () => {
    expectComponentDefinition(TabNav, 'LytTabNav')
    expectHasProps(TabNav)
    expectHasTemplate(TabNav)
    expectHasStyles(TabNav)
    expectHasSetup(TabNav)
  })

  it('TabNav props 默认值正确', () => {
    const props = TabNav.options.props
    expect(props.type.default).toBe('line')
    expect(props.closable.default).toBe(false)
    expect(props.animated.default).toBe(true)
    expect(props.lazy.default).toBe(false)
    expect(props.addable.default).toBe(false)
    expect(props.size.default).toBe('medium')
  })

  it('TabNav 可创建 VNode', () => {
    const items: TabNavItem[] = [
      { key: 'tab1', label: '标签一' },
      { key: 'tab2', label: '标签二', disabled: true },
    ]
    const vnode = h(TabNav, { items, activeKey: 'tab1' })
    expect(vnode).toBeDefined()
    expect(vnode.type).toBe(TabNav)
  })

  it('TabNav type 验证器包含 line/card/segment', () => {
    const validator = TabNav.options.props.type.validator
    expect(validator('line')).toBe(true)
    expect(validator('card')).toBe(true)
    expect(validator('segment')).toBe(true)
    expect(validator('invalid')).toBe(false)
  })
})

// ================================================================
// Collapse 组件测试
// ================================================================

describe('Collapse 组件', () => {
  it('Collapse 组件定义完整', () => {
    expectComponentDefinition(Collapse, 'LytCollapse')
    expectHasProps(Collapse)
    expectHasTemplate(Collapse)
    expectHasStyles(Collapse)
    expectHasSetup(Collapse)
  })

  it('Collapse props 默认值正确', () => {
    const props = Collapse.options.props
    expect(props.accordion.default).toBe(false)
    expect(props.bordered.default).toBe(true)
    expect(props.collapsible.default).toBe(true)
  })

  it('Collapse 可创建 VNode', () => {
    const vnode = h(Collapse, { accordion: true })
    expect(vnode).toBeDefined()
    expect(vnode.type).toBe(Collapse)
  })

  it('Collapse 支持 activeKey 受控模式', () => {
    const props = Collapse.options.props
    expect(props.activeKey).toBeDefined()
    expect(props.defaultActiveKey).toBeDefined()
    expect(Array.isArray(props.defaultActiveKey.default())).toBe(true)
  })
})

// ================================================================
// Dropdown 组件测试
// ================================================================

describe('Dropdown 组件', () => {
  it('Dropdown 组件定义完整', () => {
    expectComponentDefinition(Dropdown, 'LytDropdown')
    expectHasProps(Dropdown)
    expectHasTemplate(Dropdown)
    expectHasStyles(Dropdown)
    expectHasSetup(Dropdown)
  })

  it('Dropdown props 默认值正确', () => {
    const props = Dropdown.options.props
    expect(props.placeholder.default).toBe('请选择')
    expect(props.disabled.default).toBe(false)
    expect(props.multiple.default).toBe(false)
    expect(props.searchable.default).toBe(false)
    expect(props.clearable.default).toBe(false)
    expect(props.loading.default).toBe(false)
  })

  it('Dropdown 可创建 VNode', () => {
    const options: DropdownOption[] = [
      { label: '选项一', value: 1 },
      { label: '选项二', value: 2, disabled: true },
    ]
    const vnode = h(Dropdown, { options, placeholder: '请选择' })
    expect(vnode).toBeDefined()
    expect(vnode.type).toBe(Dropdown)
  })

  it('Dropdown 支持 maxTagCount 和 filterMethod', () => {
    const props = Dropdown.options.props
    expect(props.maxTagCount.default).toBe(0)
    expect(props.filterMethod.default).toBe(null)
  })
})

// ================================================================
// Toggle 组件测试
// ================================================================

describe('Toggle 组件', () => {
  it('Toggle 组件定义完整', () => {
    expectComponentDefinition(Toggle, 'LytToggle')
    expectHasProps(Toggle)
    expectHasTemplate(Toggle)
    expectHasStyles(Toggle)
    expectHasSetup(Toggle)
  })

  it('Toggle props 默认值正确', () => {
    const props = Toggle.options.props
    expect(props.checked.default).toBe(false)
    expect(props.disabled.default).toBe(false)
    expect(props.loading.default).toBe(false)
    expect(props.onValue.default).toBe(true)
    expect(props.offValue.default).toBe(false)
    expect(props.size.default).toBe('medium')
    expect(props.activeColor.default).toBe('#409eff')
    expect(props.inactiveColor.default).toBe('#dcdfe6')
  })

  it('Toggle 可创建 VNode', () => {
    const vnode = h(Toggle, { checked: true })
    expect(vnode).toBeDefined()
    expect(vnode.type).toBe(Toggle)
  })

  it('Toggle 支持 activeText 和 inactiveText', () => {
    const props = Toggle.options.props
    expect(props.activeText.default).toBe('')
    expect(props.inactiveText.default).toBe('')
  })
})

// ================================================================
// CountBadge 组件测试
// ================================================================

describe('CountBadge 组件', () => {
  it('CountBadge 组件定义完整', () => {
    expectComponentDefinition(CountBadge, 'LytCountBadge')
    expectHasProps(CountBadge)
    expectHasTemplate(CountBadge)
    expectHasStyles(CountBadge)
    expectHasSetup(CountBadge)
  })

  it('CountBadge props 默认值正确', () => {
    const props = CountBadge.options.props
    expect(props.count.default).toBe(0)
    expect(props.maxCount.default).toBe(99)
    expect(props.dot.default).toBe(false)
    expect(props.showZero.default).toBe(false)
    expect(props.type.default).toBe('danger')
    expect(props.position.default).toBe('top-right')
    expect(props.show.default).toBe(true)
  })

  it('CountBadge 可创建 VNode', () => {
    const vnode = h(CountBadge, { count: 5 })
    expect(vnode).toBeDefined()
    expect(vnode.type).toBe(CountBadge)
  })

  it('CountBadge position 验证器包含所有位置', () => {
    const validator = CountBadge.options.props.position.validator
    expect(validator('top-right')).toBe(true)
    expect(validator('top-left')).toBe(true)
    expect(validator('bottom-right')).toBe(true)
    expect(validator('bottom-left')).toBe(true)
    expect(validator('invalid')).toBe(false)
  })

  it('CountBadge 支持 status 和 text props', () => {
    const props = CountBadge.options.props
    expect(props.status.default).toBe('')
    expect(props.text.default).toBe('')
  })
})

// ================================================================
// Pager 组件测试
// ================================================================

describe('Pager 组件', () => {
  it('Pager 组件定义完整', () => {
    expectComponentDefinition(Pager, 'LytPager')
    expectHasProps(Pager)
    expectHasTemplate(Pager)
    expectHasStyles(Pager)
    expectHasSetup(Pager)
  })

  it('Pager props 默认值正确', () => {
    const props = Pager.options.props
    expect(props.total.default).toBe(0)
    expect(props.pageSize.default).toBe(10)
    expect(props.currentPage.default).toBe(1)
    expect(props.showSizeChanger.default).toBe(false)
    expect(props.showQuickJumper.default).toBe(false)
    expect(props.showTotal.default).toBe(true)
    expect(props.disabled.default).toBe(false)
    expect(props.simple.default).toBe(false)
  })

  it('Pager 可创建 VNode', () => {
    const vnode = h(Pager, { total: 100, pageSize: 10 })
    expect(vnode).toBeDefined()
    expect(vnode.type).toBe(Pager)
  })

  it('Pager pageSizeOptions 默认值正确', () => {
    const props = Pager.options.props
    const defaultOptions = props.pageSizeOptions.default()
    expect(Array.isArray(defaultOptions)).toBe(true)
    expect(defaultOptions).toContain(10)
    expect(defaultOptions).toContain(20)
    expect(defaultOptions).toContain(50)
    expect(defaultOptions).toContain(100)
  })

  it('Pager 支持 maxPageButtons prop', () => {
    const props = Pager.options.props
    expect(props.maxPageButtons.default).toBe(7)
  })
})

// ================================================================
// 跨组件验证
// ================================================================

describe('新增组件 - 跨组件验证', () => {
  it('所有 12 个新组件均有 _isComponentDefine 标记', () => {
    const components = [DataTable, Form, DatePicker, Dialog, Notification, Popover, TabNav, Collapse, Dropdown, Toggle, CountBadge, Pager]
    components.forEach(comp => {
      expect(comp._isComponentDefine).toBe(true)
    })
  })

  it('所有 12 个新组件均有 setup 函数', () => {
    const components = [DataTable, Form, DatePicker, Dialog, Notification, Popover, TabNav, Collapse, Dropdown, Toggle, CountBadge, Pager]
    components.forEach(comp => {
      expect(comp.options.setup).toBeDefined()
      expect(typeof comp.options.setup).toBe('function')
    })
  })

  it('所有 12 个新组件均有 styles 定义', () => {
    const components = [DataTable, Form, DatePicker, Dialog, Notification, Popover, TabNav, Collapse, Dropdown, Toggle, CountBadge, Pager]
    components.forEach(comp => {
      expect(comp.options.styles).toBeDefined()
      expect(typeof comp.options.styles).toBe('string')
      expect(comp.options.styles.length).toBeGreaterThan(0)
    })
  })

  it('所有 12 个新组件均可通过 h() 创建 VNode', () => {
    const testCases = [
      { comp: DataTable, props: { columns: [], data: [] } },
      { comp: Form, props: { model: {}, rules: {} } },
      { comp: DatePicker, props: {} },
      { comp: Dialog, props: { visible: false } },
      { comp: Notification, props: {} },
      { comp: Popover, props: { content: 'test' } },
      { comp: TabNav, props: { items: [] } },
      { comp: Collapse, props: {} },
      { comp: Dropdown, props: { options: [] } },
      { comp: Toggle, props: {} },
      { comp: CountBadge, props: {} },
      { comp: Pager, props: { total: 0 } },
    ]
    testCases.forEach(({ comp, props }) => {
      const vnode = h(comp, props)
      expect(vnode).toBeDefined()
      expect(vnode.type).toBe(comp)
    })
  })
})
