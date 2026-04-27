/**
 * Anthropic Claude Provider
 *
 * 支持 Claude 3.5 Sonnet、Claude 3 Opus、Claude 3 Haiku 等模型
 */

import type { ChatMessage, AIResponse } from '../types'
import type {
  AIProviderInterface,
  ProviderConfig,
  CompleteOptions,
  StreamChunk,
} from './provider-interface'

/**
 * Claude Provider 配置
 */
export interface ClaudeProviderConfig extends ProviderConfig {
  /** API 基础 URL（默认 https://api.anthropic.com/v1） */
  baseUrl?: string
  /** Anthropic API 版本 */
  apiVersion?: string
}

/**
 * Claude API 请求体
 */
interface ClaudeRequest {
  model: string
  messages: Array<{ role: string; content: string }>
  system?: string
  max_tokens: number
  temperature?: number
  stop_sequences?: string[]
  stream?: boolean
}

/**
 * Claude API 响应体
 */
interface ClaudeResponse {
  content: Array<{ type: string; text: string }>
  stop_reason: string | null
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

/**
 * Claude 流式事件
 */
interface ClaudeStreamEvent {
  type: string
  delta?: { type: string; text?: string }
  message?: {
    usage: { input_tokens: number; output_tokens: number }
  }
}

/**
 * Anthropic Claude Provider 实现
 */
export class ClaudeProvider implements AIProviderInterface {
  readonly name = 'claude'
  readonly models = [
    'claude-sonnet-4-20250514',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-haiku-20240307',
  ]

  model: string
  private apiKey: string
  private baseUrl: string
  private apiVersion: string
  private defaultTemperature: number
  private defaultMaxTokens: number
  private defaultTimeout: number

  constructor(config: ClaudeProviderConfig) {
    if (!config.apiKey) {
      throw new Error('Anthropic API Key is required')
    }

    this.apiKey = config.apiKey
    this.model = config.model || 'claude-3-5-sonnet-20241022'
    this.baseUrl = (config.baseUrl || 'https://api.anthropic.com/v1').replace(/\/$/, '')
    this.apiVersion = config.apiVersion || '2023-06-01'
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
    // Claude 将 system 消息单独提取
    const systemMessage = messages.find(m => m.role === 'system')
    const nonSystemMessages = messages.filter(m => m.role !== 'system')

    const body: ClaudeRequest = {
      model: this.model,
      messages: nonSystemMessages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
      temperature: options?.temperature ?? this.defaultTemperature,
    }

    if (systemMessage) {
      body.system = systemMessage.content
    }

    if (options?.systemPrompt && !systemMessage) {
      body.system = options.systemPrompt
    }

    if (options?.stopSequences) {
      body.stop_sequences = options.stopSequences
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      options?.timeout ?? this.defaultTimeout
    )

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': this.apiVersion,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Claude API error (HTTP ${response.status}): ${errorText}`)
      }

      const data: ClaudeResponse = await response.json()

      return {
        content: data.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('\n'),
        usage: {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        },
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if ((error as Error).name === 'AbortError') {
        throw new Error(`Claude API request timed out after ${options?.timeout ?? this.defaultTimeout}ms`)
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
    const systemMessage = messages.find(m => m.role === 'system')
    const nonSystemMessages = messages.filter(m => m.role !== 'system')

    const body: ClaudeRequest = {
      model: this.model,
      messages: nonSystemMessages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
      temperature: options?.temperature ?? this.defaultTemperature,
      stream: true,
    }

    if (systemMessage) {
      body.system = systemMessage.content
    }

    if (options?.systemPrompt && !systemMessage) {
      body.system = options.systemPrompt
    }

    if (options?.stopSequences) {
      body.stop_sequences = options.stopSequences
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      options?.timeout ?? this.defaultTimeout
    )

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': this.apiVersion,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Claude API error (HTTP ${response.status}): ${errorText}`)
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
          if (!trimmed || !trimmed.startsWith('data: ')) continue

          try {
            const event: ClaudeStreamEvent = JSON.parse(trimmed.slice(6))

            if (event.type === 'content_block_delta' && event.delta?.text) {
              yield { content: event.delta.text, done: false }
            } else if (event.type === 'message_stop') {
              yield { content: '', done: true }
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if ((error as Error).name === 'AbortError') {
        throw new Error(`Claude API request timed out after ${options?.timeout ?? this.defaultTimeout}ms`)
      }
      throw error
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      // Claude 没有直接的 validate endpoint，发送一个最小请求
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': this.apiVersion,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 1,
        }),
        signal: AbortSignal.timeout(5000),
      })
      // 200 表示有效，400 可能是参数问题但 key 有效
      return response.ok || response.status === 400
    } catch {
      return false
    }
  }
}
