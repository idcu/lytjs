/**
 * @lytjs/components - Lyt.js 官方组件库
 * 纯原生零依赖 TypeScript 实现
 */

// 基础组件 (base)
import { Button } from './base/button'
import { Icon } from './base/icon'
import { Link } from './base/link'
import { Container } from './base/container'
import { Divider } from './base/divider'

// 表单组件 (form)
import { Input } from './form/input'
import { Checkbox } from './form/checkbox'
import { Radio } from './form/radio'
import { Select } from './form/select'
import { Switch } from './form/switch'

// 反馈组件 (feedback)
import { Modal } from './feedback/modal'
import { Toast } from './feedback/toast'
import { Alert } from './feedback/alert'
import { Tooltip } from './feedback/tooltip'

// 导航组件 (navigation)
import { Tabs } from './navigation/tabs'
import { Breadcrumb } from './navigation/breadcrumb'
import { Pagination } from './navigation/pagination'

// 数据展示 (data-display)
import { Table } from './data-display/table'
import { Tag } from './data-display/tag'
import { Badge } from './data-display/badge'
import { Spin } from './data-display/spin'
import { Empty } from './data-display/empty'

// 扩展组件 (extended)
import { DataTable, type DataTableColumn } from './table'
import { Form, type FormRules, type ValidateResult } from './form'
import { DatePicker } from './date-picker'
import { Dialog } from './modal'
import { Notification } from './toast'
import { Popover } from './tooltip'
import { TabNav, type TabNavItem } from './tabs'
import { Collapse } from './collapse'
import { Dropdown, type DropdownOption } from './select'
import { Toggle } from './switch'
import { CountBadge } from './badge'
import { Pager } from './pagination'

// 样式
import { cssVariables, injectCSSVariables, generateCSSVariableString } from './styles/variables'
import { resetCSS, injectResetCSS } from './styles/reset'
import {
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
import {
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
import { ThemeProvider } from './theme-provider'

// Re-export 所有组件
export {
  Button, Icon, Link, Container, Divider,
  Input, Checkbox, Radio, Select, Switch,
  Modal, Toast, Alert, Tooltip,
  Tabs, Breadcrumb, Pagination,
  Table, Tag, Badge, Spin, Empty,
  DataTable, Form, DatePicker, Dialog, Notification, Popover,
  TabNav, Collapse, Dropdown, Toggle, CountBadge, Pager,
  cssVariables, injectCSSVariables, generateCSSVariableString,
  resetCSS, injectResetCSS,
  applyTheme, getTheme, resetTheme, createDarkTheme, getDefaultTheme,
  generateThemeCSS, mergeThemes,
  defaultLightTheme, defaultDarkTheme, createTheme,
  getActiveTheme, setActiveTheme, toggleDarkMode, isDarkMode,
  resetThemeToDefault, applyNewTheme, getCSSVar, setCSSVar,
  generateCSSVariables, useTheme, ThemeProvider,
}

export type {
  DataTableColumn, FormRules, ValidateResult,
  TabNavItem, DropdownOption, Theme, ThemeConfig,
}

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
