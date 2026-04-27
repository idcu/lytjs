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
import { Menu } from './base/menu'
import { DropdownMenu } from './base/dropdown-menu'

// 表单组件 (form)
import { Input } from './form/input'
import { Checkbox } from './form/checkbox'
import { Radio } from './form/radio'
import { Select } from './form/select'
import { Switch } from './form/switch'
import { InputNumber } from './form/input-number'
import { Cascader } from './form/cascader'
import { Rate } from './form/rate'
import { ColorPicker } from './form/color-picker'

// 反馈组件 (feedback)
import { Modal } from './feedback/modal'
import { Toast } from './feedback/toast'
import { Alert } from './feedback/alert'
import { Tooltip } from './feedback/tooltip'
import { Drawer } from './feedback/drawer'

// 导航组件 (navigation)
import { Tabs } from './navigation/tabs'
import { Breadcrumb } from './navigation/breadcrumb'
import { Pagination } from './navigation/pagination'
import { Steps } from './navigation/steps'

// 数据展示 (data-display)
import { Table } from './data-display/table'
import { Tag } from './data-display/tag'
import { Badge } from './data-display/badge'
import { Spin } from './data-display/spin'
import { Empty } from './data-display/empty'
import { Card } from './data-display/card'
import { Descriptions } from './data-display/descriptions'
import { Result } from './data-display/result'
import { ImagePreview } from './data-display/image-preview'
import { Skeleton } from './data-display/skeleton'
import { Timeline } from './data-display/timeline'
import { Statistic } from './data-display/statistic'

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
import { Progress } from './progress'
import { Slider } from './slider'
import { Upload, type UploadFile } from './upload'
import { Tree, type TreeData, type TreeNode } from './tree'
import { Avatar } from './avatar'
import { Carousel } from './carousel'
import { TimePicker } from './time-picker'
import { Calendar } from './calendar'

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

// Re-export 所有组件（50+）
export {
  // 基础组件
  Button, Icon, Link, Container, Divider, Menu, DropdownMenu,
  // 表单组件
  Input, Checkbox, Radio, Select, Switch, InputNumber, Cascader, Rate, ColorPicker,
  // 反馈组件
  Modal, Toast, Alert, Tooltip, Drawer,
  // 导航组件
  Tabs, Breadcrumb, Pagination, Steps,
  // 数据展示
  Table, Tag, Badge, Spin, Empty, Card, Descriptions, Result, ImagePreview, Skeleton, Timeline, Statistic,
  // 扩展组件
  DataTable, Form, DatePicker, Dialog, Notification, Popover,
  TabNav, Collapse, Dropdown, Toggle, CountBadge, Pager,
  Progress, Slider, Upload, Tree,
  Avatar, Carousel, TimePicker, Calendar,
  // 样式
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
  UploadFile, TreeData, TreeNode,
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
      app.component('LytMenu', Menu)
      app.component('LytDropdownMenu', DropdownMenu)

      // 表单组件
      app.component('LytInput', Input)
      app.component('LytCheckbox', Checkbox)
      app.component('LytRadio', Radio)
      app.component('LytSelect', Select)
      app.component('LytSwitch', Switch)
      app.component('LytInputNumber', InputNumber)
      app.component('LytCascader', Cascader)
      app.component('LytRate', Rate)
      app.component('LytColorPicker', ColorPicker)

      // 反馈组件
      app.component('LytModal', Modal)
      app.component('LytToast', Toast)
      app.component('LytAlert', Alert)
      app.component('LytTooltip', Tooltip)
      app.component('LytDrawer', Drawer)

      // 导航组件
      app.component('LytTabs', Tabs)
      app.component('LytBreadcrumb', Breadcrumb)
      app.component('LytPagination', Pagination)
      app.component('LytSteps', Steps)

      // 数据展示
      app.component('LytTable', Table)
      app.component('LytTag', Tag)
      app.component('LytBadge', Badge)
      app.component('LytSpin', Spin)
      app.component('LytEmpty', Empty)
      app.component('LytCard', Card)
      app.component('LytDescriptions', Descriptions)
      app.component('LytResult', Result)
      app.component('LytImagePreview', ImagePreview)
      app.component('LytSkeleton', Skeleton)
      app.component('LytTimeline', Timeline)
      app.component('LytStatistic', Statistic)

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
      app.component('LytProgress', Progress)
      app.component('LytSlider', Slider)
      app.component('LytUpload', Upload)
      app.component('LytTree', Tree)
      app.component('LytAvatar', Avatar)
      app.component('LytCarousel', Carousel)
      app.component('LytTimePicker', TimePicker)
      app.component('LytCalendar', Calendar)
    }

/**
 * 所有组件的映射表
 */
export const components = {
  // 基础组件
  Button,
  Icon,
  Link,
  Container,
  Divider,
  Menu,
  DropdownMenu,
  // 表单组件
  Input,
  Checkbox,
  Radio,
  Select,
  Switch,
  InputNumber,
  Cascader,
  Rate,
  ColorPicker,
  // 反馈组件
  Modal,
  Toast,
  Alert,
  Tooltip,
  Drawer,
  // 导航组件
  Tabs,
  Breadcrumb,
  Pagination,
  Steps,
  // 数据展示
  Table,
  Tag,
  Badge,
  Spin,
  Empty,
  Card,
  Descriptions,
  Result,
  ImagePreview,
  Skeleton,
  Timeline,
  Statistic,
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
  Progress,
  Slider,
  Upload,
  Tree,
  Avatar,
  Carousel,
  TimePicker,
  Calendar,
}

export default {
  version,
  install,
  components,
  cssVariables,
  resetCSS,
}
