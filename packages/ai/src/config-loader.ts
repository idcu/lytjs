/**
 * 配置加载器
 *
 * 支持 .lytrc.json + 环境变量 + 命令行选项
 */

import * as fs from 'fs'
import * as path from 'path'
import type { LytConfig, AIConfig, AIProvider } from './types'

/**
 * 配置加载器类
 */
export class ConfigLoader {
  /**
   * 加载配置
   */
  static loadConfig(cwd: string = process.cwd()): LytConfig {
    let config: LytConfig = {}

    // 1. 从配置文件加载
    const configFile = this.findConfigFile(cwd)
    if (configFile) {
      try {
        const content = fs.readFileSync(configFile, 'utf-8')
        config = JSON.parse(content)
      } catch (error) {
        console.warn(`Failed to load config from ${configFile}:`, (error as Error).message)
      }
    }

    // 2. 从环境变量加载
    const envConfig = this.loadFromEnv()
    if (envConfig.ai) {
      config.ai = {
        ...config.ai,
        ...envConfig.ai
      }
    }

    return config
  }

  /**
   * 查找配置文件
   */
  private static findConfigFile(cwd: string): string | null {
    let currentDir = cwd

    while (currentDir !== path.dirname(currentDir)) {
      const configPath = path.join(currentDir, '.lytrc.json')
      if (fs.existsSync(configPath)) {
        return configPath
      }
      currentDir = path.dirname(currentDir)
    }

    return null
  }

  /**
   * 从环境变量加载
   */
  private static loadFromEnv(): LytConfig {
    const config: LytConfig = {
      ai: { provider: 'custom' as AIProvider }
    }

    const envPrefix = 'LYT_'

    for (const [key, value] of Object.entries(process.env)) {
      if (!key.startsWith(envPrefix)) continue

      const configKey = key.slice(envPrefix.length).toLowerCase()

      if (configKey.startsWith('ai_')) {
        const aiKey = configKey.slice(3)
        const mappedKey = this.mapEnvKey(aiKey)
        if (mappedKey && value !== undefined) {
          (config.ai as any)[mappedKey] = this.parseValue(value)
        }
      }
    }

    if (Object.keys(config.ai!).length === 1 && config.ai!.provider === 'custom') {
      delete config.ai
    }

    return config
  }

  /**
   * 映射环境变量键名
   */
  private static mapEnvKey(key: string): string | null {
    const map: Record<string, string> = {
      provider: 'provider',
      apikey: 'apiKey',
      api_key: 'apiKey',
      model: 'model',
      baseurl: 'baseUrl',
      base_url: 'baseUrl',
      temperature: 'temperature',
      maxtokens: 'maxTokens',
      max_tokens: 'maxTokens',
      timeout: 'timeout'
    }

    return map[key] || null
  }

  /**
   * 解析值类型
   */
  private static parseValue(value: string): any {
    if (value === 'true') return true
    if (value === 'false') return false
    if (value === 'null') return null
    if (value === 'undefined') return undefined

    const num = Number(value)
    if (!isNaN(num)) return num

    return value
  }

  /**
   * 合并配置
   */
  static mergeConfig(...configs: (LytConfig | undefined)[]): LytConfig {
    const result: LytConfig = {}

    for (const config of configs) {
      if (!config) continue

      for (const [key, value] of Object.entries(config)) {
        if (key === 'ai' && result.ai && typeof value === 'object') {
          result.ai = { ...result.ai, ...value }
        } else if (typeof value === 'object' && !Array.isArray(value) && result[key] && typeof result[key] === 'object') {
          result[key] = { ...result[key], ...value }
        } else {
          result[key] = value
        }
      }
    }

    return result
  }
}
