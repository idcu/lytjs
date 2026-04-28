/**
 * Ollama Provider
 *
 * 支持本地 Ollama 运行的模型（如 llama3、qwen2、codellama 等）
 * Ollama 提供 OpenAI 兼容的 API，因此实现类似
 */

import type { ChatMessage, AIResponse } from '../types'
import type {
  AIProviderInterface,
  ProviderConfig,
  CompleteOptions,
  StreamChunk,
} from './provider-interface'

/**
 * Ollama Provider 配置
 */
export interface OllamaProviderConfig extends ProviderConfig {
  /** API 基础 URL（默认 http://localhost:11434） */
  baseUrl?: string
}

/**
 * Ollama API 请求体
 */
interface OllamaRequest {
  model: string
  messages: Array<{ role: string; content: string }>
  stream?: boolean
  options?: {
    temperature?: number
    num_predict?: number
    stop?: string[]
  }
}

/**
 * Ollama API 响应体
 */
interface OllamaResponse {
  message: { role: string; content: string }
  done: boolean
  total_duration?: number
  eval_count?: number
  prompt_eval_count?: number
}

/**
 * Ollama Provider 实现
 */
export class OllamaProvider implements AIProviderInterface {
  readonly name = 'ollama'
  readonly models: string[] = [] // 动态获取

  model: string
  private baseUrl: string
  private defaultTemperature: number
  private defaultMaxTokens: number
  private defaultTimeout: number
  private _availableModels: string[] | null = null

  constructor(config: OllamaProviderConfig) {
    this.model = config.model || 'llama3'
    this.baseUrl = (config.baseUrl || 'http://localhost:11434').replace(/\/$/, '')
    this.defaultTemperature = config.temperature ?? 0.7
    this.defaultMaxTokens = config.maxTokens ?? 2000
    this.defaultTimeout = config.timeout ?? 60000 // Ollama 本地推理可能较慢
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
    const body: OllamaRequest = {
      model: this.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: false,
      options: {
        temperature: options?.temperature ?? this.defaultTemperature,
        num_predict: options?.maxTokens ?? this.defaultMaxTokens,
      },
    }

    if (options?.stopSequences) {
      body.options!.stop = options.stopSequences
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      options?.timeout ?? this.defaultTimeout
    )

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Ollama API error (HTTP ${response.status}): ${errorText}`)
      }

      const data: OllamaResponse = await response.json()

      return {
        content: data.message?.content || '',
        usage: {
          promptTokens: data.prompt_eval_count,
          completionTokens: data.eval_count,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if ((error as Error).name === 'AbortError') {
        throw new Error(`Ollama API request timed out after ${options?.timeout ?? this.defaultTimeout}ms`, { cause: error })
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
    const body: OllamaRequest = {
      model: this.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: true,
      options: {
        temperature: options?.temperature ?? this.defaultTemperature,
        num_predict: options?.maxTokens ?? this.defaultMaxTokens,
      },
    }

    if (options?.stopSequences) {
      body.options!.stop = options.stopSequences
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      options?.timeout ?? this.defaultTimeout
    )

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Ollama API error (HTTP ${response.status}): ${errorText}`)
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
          if (!trimmed) continue

          try {
            const data: OllamaResponse = JSON.parse(trimmed)
            if (data.message?.content) {
              yield { content: data.message.content, done: false }
            }
            if (data.done) {
              yield {
                content: '',
                done: true,
                usage: {
                  promptTokens: data.prompt_eval_count,
                  completionTokens: data.eval_count,
                  totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
                },
              }
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if ((error as Error).name === 'AbortError') {
        throw new Error(`Ollama API request timed out after ${options?.timeout ?? this.defaultTimeout}ms`, { cause: error })
      }
      throw error
    }
  }

  async validateApiKey(): Promise<boolean> {
    // Ollama 不需要 API Key，只需检查服务是否运行
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * 获取本地可用的模型列表
   */
  async getAvailableModels(): Promise<string[]> {
    if (this._availableModels) {
      return this._availableModels
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })

      if (!response.ok) return []

      const data = await response.json()
      this._availableModels = ((data.models || []) as Array<{ name: string }>).map((m) => m.name) || []
      return this._availableModels
    } catch {
      return []
    }
  }

  /**
   * 拉取模型（如果本地不存在）
   */
  async pullModel(modelName: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: false }),
      signal: AbortSignal.timeout(300000), // 拉取模型可能需要较长时间
    })

    if (!response.ok) {
      throw new Error(`Failed to pull model ${modelName}`)
    }
  }
}
