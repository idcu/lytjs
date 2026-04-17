/**
 * @lytjs/components - Lyt.js 官方组件库
 * 纯原生零依赖 TypeScript 实现
 */

// 基础组件 (base)
export { Button } from './base/button'
export { Icon } from './base/icon'
export { Link } from './base/link'
export { Container } from './base/container'
export { Divider } from './base/divider'

// 表单组件 (form)
export { Input } from './form/input'
export { Checkbox } from './form/checkbox'
export { Radio } from './form/radio'
export { Select } from './form/select'
export { Switch } from './form/switch'

// 反馈组件 (feedback)
export { Modal } from './feedback/modal'
export { Toast } from './feedback/toast'
export { Alert } from './feedback/alert'
export { Tooltip } from './feedback/tooltip'

// 导航组件 (navigation)
export { Tabs } from './navigation/tabs'
export { Breadcrumb } from './navigation/breadcrumb'
export { Pagination } from './navigation/pagination'

// 数据展示 (data-display)
export { Table } from './data-display/table'
export { Tag } from './data-display/tag'
export { Badge } from './data-display/badge'
export { Spin } from './data-display/spin'
export { Empty } from './data-display/empty'

// 扩展组件 (extended)
export { DataTable, type DataTableColumn } from './table'
export { Form, type FormRules, type ValidateResult } from './form'
export { DatePicker } from './date-picker'
export { Dialog } from './modal'
export { Notification } from './toast'
export { Popover } from './tooltip'
export { TabNav, type TabNavItem } from './tabs'
export { Collapse } from './collapse'
export { Dropdown, type DropdownOption } from './select'
export { Toggle } from './switch'
export { CountBadge } from './badge'
export { Pager } from './pagination'

// 样式
export { cssVariables, injectCSSVariables, generateCSSVariableString } from './styles/variables'
export { resetCSS, injectResetCSS } from './styles/reset'
export {
  applyTheme,
  getTheme,
  resetTheme,
  createDarkTheme,
  getDefaultTheme,
  generateThemeCSS,
  mergeThemes,
  type Theme,
} from './styles/theme'

// 新主题系统
export {
  defaultLightTheme,
  defaultDarkTheme,
  createTheme,
  getTheme as getActiveTheme,
  setTheme as setActiveTheme,
  toggleDarkMode,
  isDarkMode,
  resetThemeToDefault,
  applyTheme as applyNewTheme,
  getCSSVar,
  setCSSVar,
  generateCSSVariables,
  useTheme,
  type ThemeConfig,
} from './theme'
export { ThemeProvider } from './theme-provider'

/**
 * 组件版本号
 */
export const version = '0.0.1'

/**
 * 安装所有组件（将所有组件注册到应用中）
 */
export function install(app: any): void {
  // 基础组件
  app.component('LytButton', Button)
  app.component('LytIcon', Icon)
  app.component('LytLink', Link)
  app.component('LytContainer', Container)
  app.component('LytDivider', Divider)

  // 表单组件
  app.component('LytInput', Input)
  app.component('LytCheckbox', Checkbox)
  app.component('LytRadio', Radio)
  app.component('LytSelect', Select)
  app.component('LytSwitch', Switch)

  // 反馈组件
  app.component('LytModal', Modal)
  app.component('LytToast', Toast)
  app.component('LytAlert', Alert)
  app.component('LytTooltip', Tooltip)

  // 导航组件
  app.component('LytTabs', Tabs)
  app.component('LytBreadcrumb', Breadcrumb)
  app.component('LytPagination', Pagination)

  // 数据展示
  app.component('LytTable', Table)
  app.component('LytTag', Tag)
  app.component('LytBadge', Badge)
  app.component('LytSpin', Spin)
  app.component('LytEmpty', Empty)

  // 扩展组件
  app.component('LytDataTable', DataTable)
  app.component('LytForm', Form)
  app.component('LytDatePicker', DatePicker)
  app.component('LytDialog', Dialog)
  app.component('LytNotification', Notification)
  app.component('LytPopover', Popover)
  app.component('LytTabNav', TabNav)
  app.component('LytCollapse', Collapse)
  app.component('LytDropdown', Dropdown)
  app.component('LytToggle', Toggle)
  app.component('LytCountBadge', CountBadge)
  app.component('LytPager', Pager)
}

/**
 * 所有组件的映射表
 */
export const components = {
  Button,
  Icon,
  Link,
  Container,
  Divider,
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
  Breadcrumb,
  Pagination,
  Table,
  Tag,
  Badge,
  Spin,
  Empty,
  // 扩展组件
  DataTable,
  Form,
  DatePicker,
  Dialog,
  Notification,
  Popover,
  TabNav,
  Collapse,
  Dropdown,
  Toggle,
  CountBadge,
  Pager,
}

export default {
  version,
  install,
  components,
  cssVariables,
  resetCSS,
}
