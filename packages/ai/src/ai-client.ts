/**
 * AI API 客户端
 *
 * 支持 OpenAI 兼容的 API
 */

import type { AIConfig, ChatMessage, AIResponse } from './types'

/**
 * AI 客户端类
 */
export class AIClient {
  private config: AIConfig

  constructor(config: AIConfig) {
    this.config = {
      provider: 'openai',
      model: 'gpt-4o',
      baseUrl: 'https://api.openai.com/v1',
      temperature: 0.7,
      maxTokens: 2000,
      timeout: 30000,
      ...config
    }
  }

  /**
   * 发送聊天请求
   */
  async chat(messages: ChatMessage[]): Promise<AIResponse> {
    const { provider, apiKey, model, baseUrl, temperature, maxTokens, timeout } = this.config

    if (!apiKey) {
      throw new Error('API Key is required')
    }

    try {
      if (provider === 'openai' || provider === 'custom') {
        return await this.chatOpenAI(messages)
      } else if (provider === 'anthropic') {
        return await this.chatAnthropic(messages)
      }

      throw new Error(`Unsupported provider: ${provider}`)
    } catch (error) {
      throw new Error(`AI API request failed: ${(error as Error).message}`)
    }
  }

  /**
   * OpenAI 兼容 API 调用
   */
  private async chatOpenAI(messages: ChatMessage[]): Promise<AIResponse> {
    const { apiKey, model, baseUrl, temperature, maxTokens, timeout } = this.config

    const url = `${baseUrl}/chat/completions`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()

      return {
        content: data.choices[0]?.message?.content || '',
        usage: {
          promptTokens: data.usage?.prompt_tokens,
          completionTokens: data.usage?.completion_tokens,
          totalTokens: data.usage?.total_tokens
        }
      }
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  /**
   * Anthropic (Claude) API 调用
   */
  private async chatAnthropic(messages: ChatMessage[]): Promise<AIResponse> {
    const { apiKey, model, baseUrl, temperature, maxTokens, timeout } = this.config

    const url = baseUrl || 'https://api.anthropic.com/v1/messages'
    const anthropicModel = model || 'claude-3-5-sonnet-20241022'

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const systemMessage = messages.find(m => m.role === 'system')
      const nonSystemMessages = messages.filter(m => m.role !== 'system')

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: anthropicModel,
          messages: nonSystemMessages,
          system: systemMessage?.content,
          max_tokens: maxTokens || 2000,
          temperature
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()

      return {
        content: data.content?.[0]?.text || '',
        usage: {
          promptTokens: data.usage?.input_tokens,
          completionTokens: data.usage?.output_tokens,
          totalTokens: data.usage?.input_tokens && data.usage?.output_tokens
            ? data.usage.input_tokens + data.usage.output_tokens
            : undefined
        }
      }
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }
}
