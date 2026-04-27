/**
 * Lyt.js AI 辅助开发工具
 *
 * 提供智能组件生成、代码补全功能
 */

// 导出核心类
export { AIGenerator } from './ai-generator'
export { AIClient } from './ai-client'
export { ComponentGenerator, createComponent } from './component-generator'
export { TemplateEngine } from './template-engine'
export { CodeCompleter } from './code-completer'
export { ConfigLoader } from './config-loader'

// 导出提示词
export {
  SYSTEM_PROMPT,
  generateComponentPrompt,
  generateStorePrompt,
  generatePagePrompt,
  generateAPIPrompt
} from './prompts'

// 导出类型
export type {
  ComponentConfig,
  ComponentType,
  StoreConfig,
  PageConfig,
  APIConfig,
  TemplateContext,
  GenerateResult,
  AIConfig,
  AIProvider,
  ChatMessage,
  AIResponse,
  LytConfig
} from './types'
