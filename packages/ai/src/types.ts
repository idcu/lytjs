/**
 * AI 辅助开发类型定义
 */

/**
 * 组件类型
 */
export type ComponentType =
  | 'functional'
  | 'button'
  | 'input'
  | 'form'
  | 'card'
  | 'list'
  | 'table'
  | 'modal'
  | 'dropdown'
  | 'tabs'
  | 'navigation'
  | 'custom'

/**
 * 组件配置
 */
export interface ComponentConfig {
  /** 组件名称 */
  name: string
  /** 组件类型 */
  type: ComponentType
  /** 是否使用 TypeScript */
  typescript?: boolean
  /** 是否使用 Composition API */
  composition?: boolean
  /** 是否使用 script setup */
  scriptSetup?: boolean
  /** 是否添加样式 */
  style?: boolean
  /** 是否添加测试 */
  test?: boolean
  /** 组件描述 */
  description?: string
  /** 属性定义 */
  props?: Array<{
    name: string
    type: string
    required?: boolean
    default?: any
  }>
  /** 事件定义 */
  emits?: string[]
  /** 插槽定义 */
  slots?: string[]
  /** 自定义模板 */
  template?: string
}

/**
 * 模板上下文
 */
export interface TemplateContext extends ComponentConfig {
  /** 组件名称（大驼峰） */
  pascalName: string
  /** 组件名称（小驼峰） */
  camelName: string
  /** 组件名称（短横线） */
  kebabName: string
}

/**
 * 生成结果
 */
export interface GenerateResult {
  /** 组件代码 */
  code: string
  /** 文件路径 */
  filePath?: string
  /** 提示信息 */
  messages: string[]
}
