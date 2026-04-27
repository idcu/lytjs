/**
 * Lyt.js AI 辅助开发工具
 *
 * 提供智能组件生成、代码补全、错误修复、多模型支持等功能
 */

// 导出核心类
export { AIGenerator } from './ai-generator'
export { AIClient } from './ai-client'
export { ComponentGenerator, createComponent } from './component-generator'
export { TemplateEngine } from './template-engine'
export { CodeCompleter } from './code-completer'
export { ConfigLoader } from './config-loader'

// 导出 AI 助手
export { LytAIAssistant } from './assistant'
export type {
  GenerateOptions,
  GeneratedComponent,
  FixSuggestion,
  ChatResponse,
  AssistantConfig,
} from './assistant'

// 导出解析器
export {
  parseComponentCode,
  validateComponentCode,
  extractTemplate,
  extractScript,
  extractStyle,
} from './parser'
export type {
  ParsedComponent,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ExtractedProp,
} from './parser'

// 导出 Provider
export {
  OpenAIProvider,
  ClaudeProvider,
  OllamaProvider,
} from './providers'
export type {
  AIProviderInterface,
  ProviderConfig,
  ProviderFactory,
  CompleteOptions,
  StreamChunk,
  OpenAIProviderConfig,
  ClaudeProviderConfig,
  OllamaProviderConfig,
} from './providers'

// 导出提示词（原有）
export {
  SYSTEM_PROMPT,
  generateComponentPrompt,
  generateStorePrompt,
  generatePagePrompt,
  generateAPIPrompt,
} from './prompts'

// 导出增强提示词
export {
  buttonComponentPrompt,
  inputComponentPrompt,
  selectComponentPrompt,
  basicComponentPrompt,
  formComponentPrompt,
  tableComponentPrompt,
  modalComponentPrompt,
  compositeComponentPrompt,
  customComponentPrompt,
  getComponentPrompt,
  inlineCompletionPrompt,
  functionCompletionPrompt,
  componentCompletionPrompt,
  smartCompletionPrompt,
  compileErrorFixPrompt,
  runtimeErrorFixPrompt,
  typeErrorFixPrompt,
  autoFixPrompt,
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
  LytConfig,
} from './types'
