/**
 * AI 生成器
 *
 * 使用 AI 生成组件、Store、页面、API 等
 */

import { AIClient } from './ai-client'
import { ComponentGenerator } from './component-generator'
import { ConfigLoader } from './config-loader'
import { SYSTEM_PROMPT, generateComponentPrompt, generateStorePrompt, generatePagePrompt, generateAPIPrompt } from './prompts'
import type { AIConfig, ComponentConfig, StoreConfig, PageConfig, APIConfig, GenerateResult, ChatMessage } from './types'

/**
 * AI 生成器类
 */
export class AIGenerator {
  private aiClient: AIClient | null = null
  private componentGenerator: ComponentGenerator
  private useAI: boolean

  constructor(config?: AIConfig, useAI: boolean = true) {
    const loadedConfig = ConfigLoader.loadConfig()
    const mergedConfig = ConfigLoader.mergeConfig(loadedConfig.ai, config)

    this.componentGenerator = new ComponentGenerator()
    this.useAI = useAI

    if (useAI && mergedConfig) {
      this.aiClient = new AIClient(mergedConfig as AIConfig)
    }
  }

  /**
   * 生成组件
   */
  async generateComponent(config: ComponentConfig): Promise<GenerateResult> {
    const messages: string[] = []

    if (this.useAI && this.aiClient) {
      try {
        const prompt = generateComponentPrompt(config)
        const response = await this.aiClient.chat([
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ])

        const code = this.extractCode(response.content)

        messages.push(`AI 成功生成组件: ${config.name}`)
        if (response.usage) {
          messages.push(`Token 使用: ${response.usage.totalTokens}`)
        }

        return {
          code,
          messages,
          usedAI: true
        }
      } catch (error) {
        messages.push(`AI 生成失败，使用模板生成: ${(error as Error).message}`)
        // Fallback 到模板生成
      }
    }

    // 使用模板生成
    const result = this.componentGenerator.generate(config)
    result.usedAI = false

    return {
      ...result,
      messages: [...messages, ...result.messages]
    }
  }

  /**
   * 生成 Store
   */
  async generateStore(config: StoreConfig): Promise<GenerateResult> {
    const messages: string[] = []

    if (this.useAI && this.aiClient) {
      try {
        const prompt = generateStorePrompt(config)
        const response = await this.aiClient.chat([
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ])

        const code = this.extractCode(response.content)

        messages.push(`AI 成功生成 Store: ${config.name}`)
        if (response.usage) {
          messages.push(`Token 使用: ${response.usage.totalTokens}`)
        }

        return {
          code,
          messages,
          usedAI: true
        }
      } catch (error) {
        messages.push(`AI 生成失败，使用模板生成: ${(error as Error).message}`)
      }
    }

    // 使用模板生成
    const code = this.generateStoreTemplate(config)
    messages.push(`模板生成 Store: ${config.name}`)

    return {
      code,
      messages,
      usedAI: false
    }
  }

  /**
   * 生成页面
   */
  async generatePage(config: PageConfig): Promise<GenerateResult> {
    const messages: string[] = []

    if (this.useAI && this.aiClient) {
      try {
        const prompt = generatePagePrompt(config)
        const response = await this.aiClient.chat([
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ])

        const code = this.extractCode(response.content)

        messages.push(`AI 成功生成页面: ${config.name}`)
        if (response.usage) {
          messages.push(`Token 使用: ${response.usage.totalTokens}`)
        }

        return {
          code,
          messages,
          usedAI: true
        }
      } catch (error) {
        messages.push(`AI 生成失败，使用模板生成: ${(error as Error).message}`)
      }
    }

    // 使用模板生成
    const code = this.generatePageTemplate(config)
    messages.push(`模板生成页面: ${config.name}`)

    return {
      code,
      messages,
      usedAI: false
    }
  }

  /**
   * 生成 API
   */
  async generateAPI(config: APIConfig): Promise<GenerateResult> {
    const messages: string[] = []

    if (this.useAI && this.aiClient) {
      try {
        const prompt = generateAPIPrompt(config)
        const response = await this.aiClient.chat([
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ])

        const code = this.extractCode(response.content)

        messages.push(`AI 成功生成 API: ${config.name}`)
        if (response.usage) {
          messages.push(`Token 使用: ${response.usage.totalTokens}`)
        }

        return {
          code,
          messages,
          usedAI: true
        }
      } catch (error) {
        messages.push(`AI 生成失败，使用模板生成: ${(error as Error).message}`)
      }
    }

    // 使用模板生成
    const code = this.generateAPITemplate(config)
    messages.push(`模板生成 API: ${config.name}`)

    return {
      code,
      messages,
      usedAI: false
    }
  }

  /**
   * 从响应中提取代码
   */
  private extractCode(content: string): string {
    // 尝试提取代码块
    const codeBlockMatch = content.match(/```(?:[\w]*)\n([\s\S]*?)\n```/)
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim()
    }

    // 如果没有代码块，返回整个内容
    return content.trim()
  }

  /**
   * Store 模板生成
   */
  private generateStoreTemplate(config: StoreConfig): string {
    const { name, state = {}, getters = {}, actions = [] } = config

    const pascalName = name.charAt(0).toUpperCase() + name.slice(1)
    const camelName = name.charAt(0).toLowerCase() + name.slice(1)

    let code = `import { createStore } from '@lytjs/store'

export const ${camelName}Store = createStore('${name}', {
  state: ${JSON.stringify(state, null, 2).replace(/\n/g, '\n  ')},
`

    if (Object.keys(getters).length > 0) {
      code += `  getters: {\n`
      for (const [key, value] of Object.entries(getters)) {
        code += `    ${key}: (state) => ${value},\n`
      }
      code += `  },\n`
    }

    if (actions.length > 0) {
      code += `  actions: {\n`
      for (const action of actions) {
        code += `    ${action}(state) {\n      // TODO\n    },\n`
      }
      code += `  }\n`
    }

    code += `})\n`

    return code
  }

  /**
   * 页面模板生成
   */
  private generatePageTemplate(config: PageConfig): string {
    const { name } = config

    const pascalName = name.charAt(0).toUpperCase() + name.slice(1)

    return `<!-- ${pascalName} Page -->
<template>
  <div class="${pascalName.toLowerCase()}-page">
    <h1>${pascalName}</h1>
    <slot></slot>
  </div>
</template>

<script setup>
import { ref, computed } from '@lytjs/reactivity'
</script>

<style scoped>
.${pascalName.toLowerCase()}-page {
  padding: 20px;
}
</style>
`
  }

  /**
   * API 模板生成
   */
  private generateAPITemplate(config: APIConfig): string {
    const { name, path = `/${name.toLowerCase()}`, method = 'GET' } = config

    return `/**
 * ${name} API
 */

export default async function handler(req, res) {
  if (req.method === '${method}') {
    // TODO: 实现 ${name} 逻辑
    res.json({
      success: true,
      message: '${name} API'
    })
  } else {
    res.status(405).json({
      success: false,
      message: 'Method not allowed'
    })
  }
}
`
  }
}
