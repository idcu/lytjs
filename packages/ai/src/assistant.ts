/**
 * LytAIAssistant — AI 助手统一 API
 *
 * 提供组件生成、代码补全、错误修复、对话等高级 AI 功能
 */

import type { ChatMessage, AIResponse, ComponentConfig } from './types'
import type {
  AIProviderInterface,
  CompleteOptions,
  StreamChunk,
} from './providers/provider-interface'
import { OpenAIProvider, type OpenAIProviderConfig } from './providers/openai-provider'
import { ClaudeProvider, type ClaudeProviderConfig } from './providers/claude-provider'
import { OllamaProvider, type OllamaProviderConfig } from './providers/ollama-provider'
import { parseComponentCode, validateComponentCode } from './parser'
import type { ParsedComponent, ValidationResult } from './parser'
import { getComponentPrompt } from './prompts/component-prompts'
import { smartCompletionPrompt } from './prompts/code-prompts'
import { autoFixPrompt } from './prompts/fix-prompts'
import { SYSTEM_PROMPT } from './prompts'
import { ConfigLoader } from './config-loader'

// ============================================================
//  类型定义
// ============================================================

/**
 * 组件生成选项
 */
export interface GenerateOptions {
  /** 温度参数 */
  temperature?: number
  /** 最大 token 数 */
  maxTokens?: number
  /** 是否验证生成的代码 */
  validate?: boolean
  /** 是否使用流式输出 */
  stream?: boolean
  /** 自定义系统提示词 */
  systemPrompt?: string
}

/**
 * 生成的组件结果
 */
export interface GeneratedComponent {
  /** 解析后的组件 */
  parsed: ParsedComponent
  /** 验证结果（如果启用了验证） */
  validation?: ValidationResult
  /** 原始 AI 响应 */
  raw: string
  /** 是否通过验证 */
  valid: boolean
}

/**
 * 错误修复建议
 */
export interface FixSuggestion {
  /** 修复后的代码 */
  fixedCode: string
  /** 修复说明 */
  explanation: string
  /** 验证结果 */
  validation?: ValidationResult
}

/**
 * 聊天响应
 */
export interface ChatResponse {
  /** 响应内容 */
  content: string
  /** 是否完成 */
  done: boolean
  /** Token 使用信息 */
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}

/**
 * 助手配置
 */
export interface AssistantConfig {
  /** Provider 类型 */
  provider?: 'openai' | 'claude' | 'ollama'
  /** OpenAI 配置 */
  openai?: OpenAIProviderConfig
  /** Claude 配置 */
  claude?: ClaudeProviderConfig
  /** Ollama 配置 */
  ollama?: OllamaProviderConfig
  /** 自定义 Provider */
  customProvider?: AIProviderInterface
  /** 默认系统提示词 */
  defaultSystemPrompt?: string
}

// ============================================================
//  LytAIAssistant 类
// ============================================================

/**
 * Lyt.js AI 助手
 *
 * 统一的 AI 功能入口，支持多 Provider、组件生成、代码补全、错误修复和对话
 */
export class LytAIAssistant {
  private provider: AIProviderInterface
  private defaultSystemPrompt: string
  private chatHistory: ChatMessage[] = []

  constructor(config?: AssistantConfig) {
    // 尝试从配置文件加载
    const fileConfig = ConfigLoader.loadConfig()

    this.provider = this.createProvider(config, fileConfig)
    this.defaultSystemPrompt = config?.defaultSystemPrompt || SYSTEM_PROMPT
  }

  /**
   * 创建 Provider 实例
   */
  private createProvider(
    config?: AssistantConfig,
    fileConfig?: { ai?: any }
  ): AIProviderInterface {
    // 1. 使用自定义 Provider
    if (config?.customProvider) {
      return config.customProvider
    }

    // 2. 确定使用的 provider 类型
    const providerType = config?.provider || fileConfig?.ai?.provider || 'openai'

    // 3. 合并配置
    const baseConfig = {
      apiKey: config?.openai?.apiKey || fileConfig?.ai?.apiKey || '',
      model: fileConfig?.ai?.model,
      temperature: fileConfig?.ai?.temperature,
      maxTokens: fileConfig?.ai?.maxTokens,
      timeout: fileConfig?.ai?.timeout,
    }

    switch (providerType) {
      case 'claude':
        return new ClaudeProvider({
          ...baseConfig,
          ...config?.claude,
          apiKey: config?.claude?.apiKey || baseConfig.apiKey,
        })

      case 'ollama':
        return new OllamaProvider({
          ...baseConfig,
          ...config?.ollama,
        })

      case 'openai':
      default:
        return new OpenAIProvider({
          ...baseConfig,
          ...config?.openai,
          apiKey: config?.openai?.apiKey || baseConfig.apiKey,
        })
    }
  }

  // ============================================================
  //  组件生成
  // ============================================================

  /**
   * 根据描述生成组件
   */
  async generateComponent(
    description: string,
    options?: GenerateOptions & Partial<ComponentConfig>
  ): Promise<GeneratedComponent> {
    const componentConfig: ComponentConfig = {
      name: options?.name || this.inferComponentName(description),
      type: options?.type || 'custom',
      description,
      props: options?.props,
      emits: options?.emits,
      slots: options?.slots,
      style: options?.style !== false,
      scriptSetup: true,
    }

    return this.generateComponentFromConfig(componentConfig, options)
  }

  /**
   * 根据组件配置生成组件
   */
  async generateComponentFromConfig(
    config: ComponentConfig,
    options?: GenerateOptions
  ): Promise<GeneratedComponent> {
    const prompt = getComponentPrompt(config)
    const systemPrompt = options?.systemPrompt || this.defaultSystemPrompt

    const response = await this.provider.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      {
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
      }
    )

    const raw = response.content
    const parsed = parseComponentCode(raw)

    let validation: ValidationResult | undefined
    if (options?.validate !== false) {
      validation = validateComponentCode(raw)
    }

    return {
      parsed,
      validation,
      raw,
      valid: validation ? validation.valid : true,
    }
  }

  /**
   * 流式生成组件
   */
  async *streamGenerateComponent(
    description: string,
    options?: GenerateOptions & Partial<ComponentConfig>
  ): AsyncGenerator<ChatResponse> {
    const componentConfig: ComponentConfig = {
      name: options?.name || this.inferComponentName(description),
      type: options?.type || 'custom',
      description,
      style: options?.style !== false,
      scriptSetup: true,
    }

    const prompt = getComponentPrompt(componentConfig)
    const systemPrompt = options?.systemPrompt || this.defaultSystemPrompt

    const stream = this.provider.streamChat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      {
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
      }
    )

    for await (const chunk of stream) {
      yield {
        content: chunk.content,
        done: chunk.done,
        usage: chunk.usage,
      }
    }
  }

  // ============================================================
  //  代码补全
  // ============================================================

  /**
   * 智能代码补全
   */
  async completeCode(
    context: string,
    options?: CompleteOptions & {
      /** 光标后的代码 */
      afterCursor?: string
      /** 文件路径 */
      filePath?: string
    }
  ): Promise<string> {
    const prompt = smartCompletionPrompt({
      beforeCursor: context,
      afterCursor: options?.afterCursor,
      filePath: options?.filePath,
    })

    const response = await this.provider.complete(prompt, {
      ...options,
      systemPrompt: undefined, // code-prompts.ts 已包含系统上下文
    })

    return response.content
  }

  /**
   * 流式代码补全
   */
  async *streamCompleteCode(
    context: string,
    options?: CompleteOptions & {
      afterCursor?: string
      filePath?: string
    }
  ): AsyncGenerator<ChatResponse> {
    const prompt = smartCompletionPrompt({
      beforeCursor: context,
      afterCursor: options?.afterCursor,
      filePath: options?.filePath,
    })

    const stream = this.provider.stream(prompt, {
      ...options,
      systemPrompt: undefined,
    })

    for await (const chunk of stream) {
      yield {
        content: chunk.content,
        done: chunk.done,
        usage: chunk.usage,
      }
    }
  }

  // ============================================================
  //  错误修复
  // ============================================================

  /**
   * 修复错误
   */
  async fixError(
    error: string,
    code: string,
    options?: {
      /** 文件路径 */
      filePath?: string
      /** 错误堆栈 */
      stackTrace?: string
      /** 额外上下文 */
      extraContext?: string
      /** 验证修复后的代码 */
      validate?: boolean
    }
  ): Promise<FixSuggestion> {
    const prompt = autoFixPrompt({
      errorMessage: error,
      code,
      filePath: options?.filePath,
      stackTrace: options?.stackTrace,
      extraContext: options?.extraContext,
    })

    const response = await this.provider.chat([
      { role: 'system', content: this.defaultSystemPrompt },
      { role: 'user', content: prompt },
    ])

    // 提取修复后的代码
    const fixedCode = this.extractCode(response.content)

    let validation: ValidationResult | undefined
    if (options?.validate !== false) {
      validation = validateComponentCode(fixedCode)
    }

    return {
      fixedCode,
      explanation: response.content,
      validation,
    }
  }

  // ============================================================
  //  对话
  // ============================================================

  /**
   * 对话式交互
   */
  async *chat(messages: ChatMessage[]): AsyncGenerator<ChatResponse> {
    // 合并历史消息
    const allMessages: ChatMessage[] = [
      { role: 'system', content: this.defaultSystemPrompt },
      ...this.chatHistory,
      ...messages,
    ]

    const stream = this.provider.streamChat(allMessages)

    let fullContent = ''

    for await (const chunk of stream) {
      fullContent += chunk.content
      yield {
        content: chunk.content,
        done: chunk.done,
        usage: chunk.usage,
      }
    }

    // 保存到历史
    for (const msg of messages) {
      this.chatHistory.push(msg)
    }
    this.chatHistory.push({ role: 'assistant', content: fullContent })
  }

  /**
   * 非流式对话
   */
  async chatSync(messages: ChatMessage[]): Promise<AIResponse> {
    const allMessages: ChatMessage[] = [
      { role: 'system', content: this.defaultSystemPrompt },
      ...this.chatHistory,
      ...messages,
    ]

    const response = await this.provider.chat(allMessages)

    // 保存到历史
    for (const msg of messages) {
      this.chatHistory.push(msg)
    }
    this.chatHistory.push({ role: 'assistant', content: response.content })

    return response
  }

  /**
   * 清除对话历史
   */
  clearHistory(): void {
    this.chatHistory = []
  }

  /**
   * 获取对话历史
   */
  getHistory(): ChatMessage[] {
    return [...this.chatHistory]
  }

  // ============================================================
  //  Provider 管理
  // ============================================================

  /**
   * 获取当前 Provider
   */
  getProvider(): AIProviderInterface {
    return this.provider
  }

  /**
   * 切换 Provider
   */
  switchProvider(provider: AIProviderInterface): void {
    this.provider = provider
    this.clearHistory()
  }

  /**
   * 验证当前 Provider 连接
   */
  async validateConnection(): Promise<boolean> {
    return this.provider.validateApiKey()
  }

  // ============================================================
  //  内部辅助
  // ============================================================

  /**
   * 从描述中推断组件名称
   */
  private inferComponentName(description: string): string {
    // 尝试提取中文描述中的关键词
    const chineseMatch = description.match(/([\u4e00-\u9fa5]{2,4})(组件|按钮|表单|表格|弹窗|对话框|列表|卡片|导航|菜单|输入框|选择器)/)
    if (chineseMatch) {
      // 简单的中文到英文映射
      const map: Record<string, string> = {
        '按钮': 'Button',
        '表单': 'Form',
        '表格': 'Table',
        '弹窗': 'Modal',
        '对话框': 'Dialog',
        '列表': 'List',
        '卡片': 'Card',
        '导航': 'Navigation',
        '菜单': 'Menu',
        '输入框': 'Input',
        '选择器': 'Select',
      }
      const suffix = map[chineseMatch[2]] || 'Component'
      return `Lyt${suffix}`
    }

    // 尝试提取英文单词
    const englishMatch = description.match(/\b([A-Z][a-zA-Z]+)\b/)
    if (englishMatch) {
      return englishMatch[1]
    }

    return 'LytComponent'
  }

  /**
   * 从 AI 响应中提取代码
   */
  private extractCode(content: string): string {
    // 尝试提取代码块
    const codeBlockMatch = content.match(/```(?:[\w]*)\n([\s\S]*?)\n```/)
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim()
    }

    // 尝试提取 <template> 开头的 SFC 代码
    const sfcMatch = content.match(/(<template>[\s\S]*<\/template>(?:\s*<script[\s\S]*?<\/script>)?(?:\s*<style[\s\S]*?<\/style>)?)/)
    if (sfcMatch) {
      return sfcMatch[1].trim()
    }

    return content.trim()
  }
}
