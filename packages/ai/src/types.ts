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
 * Store 配置
 */
export interface StoreConfig {
  /** Store 名称 */
  name: string
  /** 初始状态 */
  state?: Record<string, any>
  /** Getters */
  getters?: Record<string, string>
  /** Actions */
  actions?: string[]
  /** 描述 */
  description?: string
}

/**
 * 页面配置
 */
export interface PageConfig {
  /** 页面名称 */
  name: string
  /** 路由路径 */
  path?: string
  /** 布局 */
  layout?: string
  /** 描述 */
  description?: string
}

/**
 * API 配置
 */
export interface APIConfig {
  /** API 名称 */
  name: string
  /** 路由路径 */
  path?: string
  /** HTTP 方法 */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  /** 描述 */
  description?: string
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
  /** 生成的代码 */
  code: string
  /** 文件路径 */
  filePath?: string
  /** 提示信息 */
  messages: string[]
  /** 是否使用 AI 生成 */
  usedAI?: boolean
}

/**
 * AI 提供商类型
 */
export type AIProvider = 'openai' | 'anthropic' | 'custom'

/**
 * AI 配置
 */
export interface AIConfig {
  /** AI 提供商 */
  provider: AIProvider
  /** API Key */
  apiKey?: string
  /** 模型名称 */
  model?: string
  /** API 基础 URL */
  baseUrl?: string
  /** 温度参数 */
  temperature?: number
  /** 最大 token 数 */
  maxTokens?: number
  /** 超时时间（毫秒） */
  timeout?: number
}

/**
 * Chat 消息
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * AI 响应
 */
export interface AIResponse {
  content: string
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}

/**
 * 配置文件类型
 */
export interface LytConfig {
  ai?: AIConfig
  [key: string]: any
}
