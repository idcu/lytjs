#!/usr/bin/env node
/**
 * Lyt.js AI CLI 工具
 *
 * 提供智能组件生成功能
 */

import * as fs from 'fs'
import * as path from 'path'
import { AIGenerator } from '../ai-generator'
import { ConfigLoader } from '../config-loader'
import type { ComponentConfig, StoreConfig, PageConfig, APIConfig } from '../types'

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printHelp()
    return
  }

  const command = args[0]

  switch (command) {
    case 'component':
    case 'c':
      await handleComponentCommand(args.slice(1))
      break
    case 'store':
    case 's':
      await handleStoreCommand(args.slice(1))
      break
    case 'page':
    case 'p':
      await handlePageCommand(args.slice(1))
      break
    case 'api':
    case 'a':
      await handleAPICommand(args.slice(1))
      break
    case 'init':
      await handleInitCommand()
      break
    default:
      console.error(`Unknown command: ${command}`)
      printHelp()
  }
}

/**
 * 打印帮助
 */
function printHelp() {
  console.log(`
lyt-ai - Lyt.js AI 辅助开发工具

用法:
  lyt-ai <command> [options]

命令:
  component, c  <name>  生成组件
  store, s     <name>  生成 Store
  page, p      <name>  生成页面
  api, a       <name>  生成 API
  init                初始化配置文件

选项:
  -h, --help          显示帮助
  --ai                使用 AI 生成
  --no-ai             不使用 AI（模板生成）
  -t, --type <type>   组件类型 (button, input, form, card, list, table, modal, dropdown, tabs, navigation, custom)
  -o, --output <path> 输出文件路径
  --no-style          不添加样式
  --api-key <key>     AI API Key
  --model <model>     AI 模型名称
  --provider <name>   AI 提供商 (openai, anthropic, custom)
  --base-url <url>    AI API 基础 URL

示例:
  # 生成按钮组件（模板）
  lyt-ai component MyButton --type button

  # 生成按钮组件（AI）
  lyt-ai component MyButton --type button --ai

  # 生成 Store
  lyt-ai store counter --ai

  # 初始化配置
  lyt-ai init
`)
}

/**
 * 解析命令行参数
 */
function parseArgs(args: string[]): {
  name: string
  useAI: boolean
  type?: string
  output?: string
  style: boolean
  apiKey?: string
  model?: string
  provider?: string
  baseUrl?: string
  description?: string
} {
  let name = ''
  let useAI = false
  let type: string | undefined
  let output: string | undefined
  let style = true
  let apiKey: string | undefined
  let model: string | undefined
  let provider: string | undefined
  let baseUrl: string | undefined
  let description: string | undefined

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--ai') {
      useAI = true
    } else if (arg === '--no-ai') {
      useAI = false
    } else if (arg === '-t' || arg === '--type') {
      type = args[++i]
    } else if (arg === '-o' || arg === '--output') {
      output = args[++i]
    } else if (arg === '--no-style') {
      style = false
    } else if (arg === '--api-key') {
      apiKey = args[++i]
    } else if (arg === '--model') {
      model = args[++i]
    } else if (arg === '--provider') {
      provider = args[++i]
    } else if (arg === '--base-url') {
      baseUrl = args[++i]
    } else if (arg === '-d' || arg === '--description') {
      description = args[++i]
    } else if (!name && !arg.startsWith('-')) {
      name = arg
    }
  }

  return { name, useAI, type, output, style, apiKey, model, provider, baseUrl, description }
}

/**
 * 处理组件命令
 */
async function handleComponentCommand(args: string[]) {
  const { name, useAI, type, output, style, apiKey, model, provider, baseUrl, description } = parseArgs(args)

  if (!name) {
    console.error('Error: Please specify component name')
    process.exit(1)
  }

  const aiConfig: any = {}
  if (apiKey) aiConfig.apiKey = apiKey
  if (model) aiConfig.model = model
  if (provider) aiConfig.provider = provider
  if (baseUrl) aiConfig.baseUrl = baseUrl

  const generator = new AIGenerator(
    Object.keys(aiConfig).length > 0 ? aiConfig : undefined,
    useAI
  )

  const config: ComponentConfig = {
    name,
    type: (type || 'functional') as any,
    style,
    description,
    scriptSetup: true
  }

  console.log(`Generating component: ${name}`)
  console.log(`Using AI: ${useAI ? 'Yes' : 'No'}`)

  const result = await generator.generateComponent(config)

  for (const message of result.messages) {
    console.log(`- ${message}`)
  }

  const outputPath = output || `./${name}.lyt`
  const dir = path.dirname(outputPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(outputPath, result.code, 'utf-8')

  console.log(`Saved to: ${outputPath}`)
}

/**
 * 处理 Store 命令
 */
async function handleStoreCommand(args: string[]) {
  const { name, useAI, output, apiKey, model, provider, baseUrl, description } = parseArgs(args)

  if (!name) {
    console.error('Error: Please specify store name')
    process.exit(1)
  }

  const aiConfig: any = {}
  if (apiKey) aiConfig.apiKey = apiKey
  if (model) aiConfig.model = model
  if (provider) aiConfig.provider = provider
  if (baseUrl) aiConfig.baseUrl = baseUrl

  const generator = new AIGenerator(
    Object.keys(aiConfig).length > 0 ? aiConfig : undefined,
    useAI
  )

  const config: StoreConfig = {
    name,
    description,
    state: { count: 0 }
  }

  console.log(`Generating store: ${name}`)
  console.log(`Using AI: ${useAI ? 'Yes' : 'No'}`)

  const result = await generator.generateStore(config)

  for (const message of result.messages) {
    console.log(`- ${message}`)
  }

  const outputPath = output || `./${name}.js`
  const dir = path.dirname(outputPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(outputPath, result.code, 'utf-8')

  console.log(`Saved to: ${outputPath}`)
}

/**
 * 处理页面命令
 */
async function handlePageCommand(args: string[]) {
  const { name, useAI, output, apiKey, model, provider, baseUrl, description } = parseArgs(args)

  if (!name) {
    console.error('Error: Please specify page name')
    process.exit(1)
  }

  const aiConfig: any = {}
  if (apiKey) aiConfig.apiKey = apiKey
  if (model) aiConfig.model = model
  if (provider) aiConfig.provider = provider
  if (baseUrl) aiConfig.baseUrl = baseUrl

  const generator = new AIGenerator(
    Object.keys(aiConfig).length > 0 ? aiConfig : undefined,
    useAI
  )

  const config: PageConfig = {
    name,
    description
  }

  console.log(`Generating page: ${name}`)
  console.log(`Using AI: ${useAI ? 'Yes' : 'No'}`)

  const result = await generator.generatePage(config)

  for (const message of result.messages) {
    console.log(`- ${message}`)
  }

  const outputPath = output || `./${name}.lyt`
  const dir = path.dirname(outputPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(outputPath, result.code, 'utf-8')

  console.log(`Saved to: ${outputPath}`)
}

/**
 * 处理 API 命令
 */
async function handleAPICommand(args: string[]) {
  const { name, useAI, output, apiKey, model, provider, baseUrl, description } = parseArgs(args)

  if (!name) {
    console.error('Error: Please specify API name')
    process.exit(1)
  }

  const aiConfig: any = {}
  if (apiKey) aiConfig.apiKey = apiKey
  if (model) aiConfig.model = model
  if (provider) aiConfig.provider = provider
  if (baseUrl) aiConfig.baseUrl = baseUrl

  const generator = new AIGenerator(
    Object.keys(aiConfig).length > 0 ? aiConfig : undefined,
    useAI
  )

  const config: APIConfig = {
    name,
    description,
    method: 'GET'
  }

  console.log(`Generating API: ${name}`)
  console.log(`Using AI: ${useAI ? 'Yes' : 'No'}`)

  const result = await generator.generateAPI(config)

  for (const message of result.messages) {
    console.log(`- ${message}`)
  }

  const outputPath = output || `./${name}.js`
  const dir = path.dirname(outputPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(outputPath, result.code, 'utf-8')

  console.log(`Saved to: ${outputPath}`)
}

/**
 * 处理初始化命令
 */
async function handleInitCommand() {
  const configPath = path.join(process.cwd(), '.lytrc.json')

  if (fs.existsSync(configPath)) {
    console.log('Config file already exists:', configPath)
    return
  }

  const defaultConfig = {
    ai: {
      provider: 'openai',
      apiKey: 'your-api-key-here',
      model: 'gpt-4o',
      baseUrl: 'https://api.openai.com/v1',
      temperature: 0.7,
      maxTokens: 2000
    }
  }

  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8')
  console.log('Created config file:', configPath)
  console.log('Please update the API key in the config file.')
}

// 运行
main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
