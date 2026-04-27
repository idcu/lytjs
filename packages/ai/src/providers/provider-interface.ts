/**
 * 统一 Provider 接口定义
 *
 * 所有 AI Provider 必须实现此接口
 */

import type { ChatMessage, AIResponse } from '../types'

/**
 * 完成请求选项
 */
export interface CompleteOptions {
  /** 温度参数（0-2，越低越确定） */
  temperature?: number
  /** 最大生成 token 数 */
  maxTokens?: number
  /** 停止序列 */
  stopSequences?: string[]
  /** 系统提示词 */
  systemPrompt?: string
  /** 请求超时（毫秒） */
  timeout?: number
}

/**
 * 流式响应块
 */
export interface StreamChunk {
  /** 响应内容片段 */
  content: string
  /** 是否为最后一个块 */
  done: boolean
  /** Token 使用信息（仅在最后一个块中） */
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}

/**
 * AI Provider 接口
 *
 * 所有 AI 提供商必须实现此接口
 */
export interface AIProviderInterface {
  /** Provider 名称 */
  readonly name: string

  /** Provider 支持的模型列表 */
  readonly models: string[]

  /** 当前使用的模型 */
  model: string

  /**
   * 非流式完成请求
   */
  complete(prompt: string, options?: CompleteOptions): Promise<AIResponse>

  /**
   * 基于聊天消息的完成请求
   */
  chat(messages: ChatMessage[], options?: CompleteOptions): Promise<AIResponse>

  /**
   * 流式完成请求
   */
  stream(prompt: string, options?: CompleteOptions): AsyncGenerator<StreamChunk>

  /**
   * 流式聊天请求
   */
  streamChat(messages: ChatMessage[], options?: CompleteOptions): AsyncGenerator<StreamChunk>

  /**
   * 验证 API Key 是否有效
   */
  validateApiKey(): Promise<boolean>
}

/**
 * Provider 配置
 */
export interface ProviderConfig {
  /** API Key */
  apiKey: string
  /** 模型名称 */
  model?: string
  /** API 基础 URL */
  baseUrl?: string
  /** 默认温度 */
  temperature?: number
  /** 默认最大 token 数 */
  maxTokens?: number
  /** 默认超时（毫秒） */
  timeout?: number
}

/**
 * Provider 注册表类型
 */
export type ProviderFactory<TConfig extends ProviderConfig = ProviderConfig> = (
  config: TConfig
) => AIProviderInterface
