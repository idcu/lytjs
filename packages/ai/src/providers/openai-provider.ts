/**
 * OpenAI GPT Provider
 *
 * 支持 OpenAI GPT-4、GPT-4o、GPT-3.5 等模型
 * 同时兼容所有 OpenAI API 兼容的服务（如 Azure OpenAI、DeepSeek 等）
 */

import type { ChatMessage, AIResponse } from '../types'
import type {
  AIProviderInterface,
  ProviderConfig,
  CompleteOptions,
  StreamChunk,
} from './provider-interface'

/**
 * OpenAI Provider 配置
 */
export interface OpenAIProviderConfig extends ProviderConfig {
  /** API 基础 URL（默认 https://api.openai.com/v1） */
  baseUrl?: string
  /** 组织 ID（可选） */
  organizationId?: string
}

/**
 * OpenAI API 请求体
 */
interface OpenAIRequest {
  model: string
  messages: Array<{ role: string; content: string }>
  temperature?: number
  max_tokens?: number
  stop?: string[]
  stream?: boolean
}

/**
 * OpenAI API 响应体
 */
interface OpenAIResponse {
  choices: Array<{
    message?: { content: string }
    delta?: { content: string }
    finish_reason: string | null
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * OpenAI Provider 实现
 */
export class OpenAIProvider implements AIProviderInterface {
  readonly name = 'openai'
  readonly models = [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-4-32k',
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-16k',
  ]

  model: string
  private apiKey: string
  private baseUrl: string
  private organizationId?: string
  private defaultTemperature: number
  private defaultMaxTokens: number
  private defaultTimeout: number

  constructor(config: OpenAIProviderConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API Key is required')
    }

    this.apiKey = config.apiKey
    this.model = config.model || 'gpt-4o'
    this.baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')
    this.organizationId = config.organizationId
    this.defaultTemperature = config.temperature ?? 0.7
    this.defaultMaxTokens = config.maxTokens ?? 2000
    this.defaultTimeout = config.timeout ?? 30000
  }

  async complete(prompt: string, options?: CompleteOptions): Promise<AIResponse> {
    const messages: ChatMessage[] = []
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })
    return this.chat(messages, options)
  }

  async chat(messages: ChatMessage[], options?: CompleteOptions): Promise<AIResponse> {
    const body: OpenAIRequest = {
      model: this.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? this.defaultTemperature,
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
    }

    if (options?.stopSequences) {
      body.stop = options.stopSequences
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    }

    if (this.organizationId) {
      headers['OpenAI-Organization'] = this.organizationId
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      options?.timeout ?? this.defaultTimeout
    )

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenAI API error (HTTP ${response.status}): ${errorText}`)
      }

      const data: OpenAIResponse = await response.json()

      return {
        content: data.choices[0]?.message?.content || '',
        usage: data.usage
          ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
          : undefined,
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if ((error as Error).name === 'AbortError') {
        throw new Error(`OpenAI API request timed out after ${options?.timeout ?? this.defaultTimeout}ms`, { cause: error })
      }
      throw error
    }
  }

  async *stream(prompt: string, options?: CompleteOptions): AsyncGenerator<StreamChunk> {
    const messages: ChatMessage[] = []
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })
    yield* this.streamChat(messages, options)
  }

  async *streamChat(messages: ChatMessage[], options?: CompleteOptions): AsyncGenerator<StreamChunk> {
    const body: OpenAIRequest = {
      model: this.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? this.defaultTemperature,
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
      stream: true,
    }

    if (options?.stopSequences) {
      body.stop = options.stopSequences
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    }

    if (this.organizationId) {
      headers['OpenAI-Organization'] = this.organizationId
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      options?.timeout ?? this.defaultTimeout
    )

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenAI API error (HTTP ${response.status}): ${errorText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Response body is not readable')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed === 'data: [DONE]') {
            if (trimmed === 'data: [DONE]') {
              yield { content: '', done: true }
            }
            continue
          }

          if (!trimmed.startsWith('data: ')) continue

          try {
            const data: OpenAIResponse = JSON.parse(trimmed.slice(6))
            const content = data.choices[0]?.delta?.content || ''
            if (content) {
              yield { content, done: false }
            }
          } catch {
            // 忽略解析错误
          }
        }
      }

      // 处理 buffer 中剩余的数据
      if (buffer.trim() && buffer.trim() !== 'data: [DONE]') {
        if (buffer.trim().startsWith('data: ')) {
          try {
            const data: OpenAIResponse = JSON.parse(buffer.trim().slice(6))
            const content = data.choices[0]?.delta?.content || ''
            if (content) {
              yield { content, done: false }
            }
          } catch {
            // 忽略
          }
        }
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if ((error as Error).name === 'AbortError') {
        throw new Error(`OpenAI API request timed out after ${options?.timeout ?? this.defaultTimeout}ms`, { cause: error })
      }
      throw error
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(5000),
      })
      return response.ok
    } catch {
      return false
    }
  }
}
